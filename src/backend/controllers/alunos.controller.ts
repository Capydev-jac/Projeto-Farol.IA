
import { type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../config/database.js";

// ========================================
// LISTAR ALUNOS
// ========================================

export const listarAlunos = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let sql = `
      SELECT
        a.id,
        a.numero_matricula,
        a.nome,
        a.turma_id,
        t.identificador AS turma,
        t.turno,

        a.tp_faixa_etaria,
        a.tp_sexo,

        a.q001_escolaridade_pai,
        a.q002_escolaridade_mae,
        a.q003_ocupacao_pai,
        a.q004_ocupacao_mae,
        a.q005_tamanho_familia,
        a.q006_renda_familiar,

        a.q009_quartos,
        a.q014_maquina_lavar,
        a.q019_televisores,
        a.q022_celulares,

        a.veiculo_proprio,
        a.refrigeracao,
        a.conectividade,

        a.ia_risco_defasagem,
        a.ia_probabilidade_risco::float8
          AS ia_probabilidade_risco,
        a.ia_nivel_alerta,
        a.ia_recomendacao,
        a.ia_data_predicao,
        a.ia_versao_modelo,

        a.data_cadastro

      FROM alunos a
      LEFT JOIN turmas t ON t.id = a.turma_id
    `;

    const conditions: string[] = [];
    const values: unknown[] = [];

    // Filtrar por turma
    if (req.query.turmaId) {
      values.push(Number(req.query.turmaId));
      conditions.push(`a.turma_id = $${values.length}`);
    }

    // Filtrar por nível de alerta
    if (req.query.risco) {
      values.push(String(req.query.risco).toUpperCase());
      conditions.push(`a.ia_nivel_alerta = $${values.length}`);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY a.nome ASC";

    const result = await pool.query(sql, values);

    res.status(200).json({
      sucesso: true,
      total: result.rows.length,
      alunos: result.rows,
    });
  } catch (error: unknown) {
    console.error("Erro ao listar alunos:", error);

    res.status(500).json({
      erro: "Erro ao listar alunos.",
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
    const {
      numero_matricula,
      nome,
      turma_id,
      tp_faixa_etaria,
      tp_sexo,
      q001_escolaridade_pai,
      q002_escolaridade_mae,
      q003_ocupacao_pai,
      q004_ocupacao_mae,
      q005_tamanho_familia,
      q006_renda_familiar,
      q009_quartos,
      q014_maquina_lavar,
      q019_televisores,
      q022_celulares,
      veiculo_proprio,
      refrigeracao,
      conectividade,
    } = req.body;

    // Validação dos dados básicos
    if (
      !numero_matricula ||
      !nome ||
      String(numero_matricula).trim() === "" ||
      String(nome).trim() === ""
    ) {
      res.status(400).json({
        erro: "RA e nome do aluno são obrigatórios.",
      });
      return;
    }

    // Validação opcional da turma
    if (turma_id !== undefined && turma_id !== null) {
      const turmaResult = await pool.query(
        "SELECT id FROM turmas WHERE id = $1",
        [turma_id]
      );

      if (turmaResult.rows.length === 0) {
        res.status(400).json({
          erro: "Turma não encontrada.",
        });
        return;
      }
    }

    const result = await pool.query(
      `
      INSERT INTO alunos (
        numero_matricula,
        nome,
        turma_id,
        tp_faixa_etaria,
        tp_sexo,
        q001_escolaridade_pai,
        q002_escolaridade_mae,
        q003_ocupacao_pai,
        q004_ocupacao_mae,
        q005_tamanho_familia,
        q006_renda_familiar,
        q009_quartos,
        q014_maquina_lavar,
        q019_televisores,
        q022_celulares,
        veiculo_proprio,
        refrigeracao,
        conectividade
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      RETURNING *
      `,
      [
        String(numero_matricula).trim(),
        String(nome).trim(),
        turma_id ?? null,
        tp_faixa_etaria ?? null,
        tp_sexo ?? null,
        q001_escolaridade_pai ?? null,
        q002_escolaridade_mae ?? null,
        q003_ocupacao_pai ?? null,
        q004_ocupacao_mae ?? null,
        q005_tamanho_familia ?? null,
        q006_renda_familiar ?? null,
        q009_quartos ?? null,
        q014_maquina_lavar ?? null,
        q019_televisores ?? null,
        q022_celulares ?? null,
        veiculo_proprio ?? null,
        refrigeracao ?? null,
        conectividade ?? null,
      ]
    );

    const aluno = result.rows[0];

    res.status(201).json({
      sucesso: true,
      mensagem: "Aluno cadastrado com sucesso.",
      aluno,
    });
  } catch (error: unknown) {
    console.error("Erro ao cadastrar aluno:", error);

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
        t.identificador AS turma,
        t.turno,
        p.status AS plan_status,
        p.owners AS plan_owners
      FROM alunos a
      LEFT JOIN turmas t ON t.id = a.turma_id
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

    res.status(200).json({
      sucesso: true,
      aluno: {
        ...aluno,
        plan: aluno.plan_status
          ? {
              status: aluno.plan_status,
              owners: aluno.plan_owners,
            }
          : null,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao consultar estudante:", error);

    res.status(500).json({
      erro: "Erro ao consultar estudante.",
    });
  }
};
