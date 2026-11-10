
import { type Request, type Response } from "express";
import { pool } from "../config/database.js";

export const consultarDashboard = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS "totalAlunos",
        COUNT(*) FILTER (WHERE risk = 'Elevado')::int AS "riscoElevado",
        COUNT(*) FILTER (WHERE risk = 'Atenção')::int AS "riscoAtencao",
        COUNT(*) FILTER (WHERE risk = 'Menor')::int AS "riscoMenor",
        COUNT(*) FILTER (WHERE enem IS NULL)::int AS "predicoesPendentes"
      FROM alunos
    `);

    const turmas = await pool.query(
      "SELECT COUNT(*)::int AS total FROM turmas"
    );

    res.json({
      ...result.rows[0],
      totalTurmas: turmas.rows[0].total,
    });
  } catch (error: unknown) {
    console.error(error);

    res.status(500).json({
      erro: "Erro ao carregar dashboard.",
    });
  }
};
