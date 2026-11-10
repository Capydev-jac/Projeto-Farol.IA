
import { type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../config/database.js";

// ========================================
// LISTAR ESTUDANTES
// ========================================

export const listarAlunos = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let sql = `
      SELECT
        a.id,
        a.school,
        a.turma_id AS "turmaId",
        t.nome AS turma,
        a.shift,
        a.freq::float8 AS freq,
        a.renda,
        a.esc,
        a.infra,
        a.enem::float8 AS enem,
        a.lo::float8 AS lo,
        a.hi::float8 AS hi,
        a.risk,
        a.has_plan AS "hasPlan"
      FROM alunos a
      JOIN turmas t ON t.id = a.turma_id
    `;

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (req.query.turmaId) {
      values.push(String(req.query.turmaId));
      conditions.push(`a.turma_id = $${values.length}`);
    }

    if (req.query.risco) {
      values.push(String(req.query.risco));
      conditions.push(`a.risk = $${values.length}`);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY a.created_at DESC";

    const result = await pool.query(sql, values);

    res.json(result.rows);
  } catch (error: unknown) {
    console.error(error);
    res.status(500).json({
      erro: "Erro ao listar estudantes.",
    });
  }
};

// ========================================
// CADASTRAR ESTUDANTE
// ========================================

export const cadastrarAluno = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { school, turmaId, freq, renda, esc, infra } = req.body;

    const frequency = Number(freq);

    if (
      !school ||
      !turmaId ||
      !Number.isFinite(frequency) ||
      frequency < 0 ||
      frequency > 100 ||
      ![renda, esc, infra].every((value) =>
        Number.isInteger(Number(value))
      )
    ) {
      res.status(400).json({
        erro: "Confira os dados do estudante.",
      });
      return;
    }

    const turmaResult = await pool.query(
      "SELECT * FROM turmas WHERE id = $1",
      [turmaId]
    );

    if (turmaResult.rows.length === 0) {
      res.status(400).json({
        erro: "Turma não encontrada.",
      });
      return;
    }

    const turma = turmaResult.rows[0];
    const id = `E-${randomUUID().slice(0, 8)}`;

    const result = await pool.query(
      `
      INSERT INTO alunos (
        id, school, turma_id, shift,
        freq, renda, esc, infra
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        id,
        String(school).trim(),
        turmaId,
        turma.turno,
        frequency,
        Number(renda),
        Number(esc),
        Number(infra),
      ]
    );

    const aluno = result.rows[0];

    res.status(201).json({
      id: aluno.id,
      school: aluno.school,
      turma: turma.nome,
      turmaId: aluno.turma_id,
      shift: aluno.shift,
      freq: Number(aluno.freq),
      renda: aluno.renda,
      esc: aluno.esc,
      infra: aluno.infra,
      enem: null,
      lo: null,
      hi: null,
      risk: aluno.risk,
      hasPlan: aluno.has_plan,
    });
  } catch (error: unknown) {
    console.error(error);

    res.status(500).json({
      erro: "Erro ao cadastrar estudante.",
    });
  }
};

// ========================================
// CONSULTAR ESTUDANTE
// ========================================

export const consultarAluno = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await pool.query(
      `
      SELECT
        a.*,
        t.nome AS turma,
        t.turno AS shift,
        p.status AS plan_status,
        p.owners AS plan_owners
      FROM alunos a
      JOIN turmas t ON t.id = a.turma_id
      LEFT JOIN planos_intervencao p ON p.aluno_id = a.id
      WHERE a.id = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        erro: "Estudante não encontrado.",
      });
      return;
    }

    const aluno = result.rows[0];

    res.json({
      ...aluno,
      freq: Number(aluno.freq),
      enem: aluno.enem === null ? null : Number(aluno.enem),
      lo: aluno.lo === null ? null : Number(aluno.lo),
      hi: aluno.hi === null ? null : Number(aluno.hi),
      plan: aluno.plan_status
        ? {
            status: aluno.plan_status,
            owners: aluno.plan_owners,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error(error);

    res.status(500).json({
      erro: "Erro ao consultar estudante.",
    });
  }
};
