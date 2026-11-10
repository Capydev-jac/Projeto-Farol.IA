
import { type Request, type Response } from "express";
import { pool } from "../config/database.js";

// ========================================
// LISTAR PLANOS DE INTERVENÇÃO
// ========================================

export const listarIntervencoes = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT aluno_id, status, owners
      FROM planos_intervencao
    `);

    const planos: Record<
      string,
      {
        status: string | null;
        owners: unknown;
      }
    > = {};

    result.rows.forEach((plano) => {
      planos[plano.aluno_id] = {
        status: plano.status,
        owners: plano.owners,
      };
    });

    res.json(planos);
  } catch (error: unknown) {
    console.error(error);

    res.status(500).json({
      erro: "Erro ao listar planos.",
    });
  }
};

// ========================================
// CRIAR OU ATUALIZAR PLANO
// ========================================

export const salvarIntervencao = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, owners = [] } = req.body;

    const result = await pool.query(
      `
      INSERT INTO planos_intervencao (
        aluno_id, status, owners
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (aluno_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        owners = EXCLUDED.owners,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [
        req.params.id,
        status || null,
        JSON.stringify(owners),
      ]
    );

    await pool.query(
      `
      UPDATE alunos
      SET has_plan = TRUE
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      status: result.rows[0].status,
      owners: result.rows[0].owners,
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503"
    ) {
      res.status(404).json({
        erro: "Estudante não encontrado.",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      erro: "Erro ao salvar plano.",
    });
  }
};
