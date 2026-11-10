import { type Request, type Response } from "express";
import { pool } from "../config/database.js";

export const verificarSaude = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      database: "connected",
      projeto: "Farol.IA",
    });
  } catch (error: unknown) {
    console.error("Erro ao verificar conexão:", error);

    res.status(500).json({
      erro: "Não foi possível conectar ao banco.",
    });
  }
};
