
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../config/database.js";

// ========================================
// LISTAR TURMAS
// ========================================

export async function listarTurmas(
    req: Request,
    res: Response
) {
    try {
        const result = await pool.query(`
            SELECT
                t.*,
                COUNT(a.id)::int AS total_alunos,
                json_build_object(
                    'alunos',
                    COUNT(a.id)::int
                ) AS _count
            FROM turmas t
            LEFT JOIN alunos a ON a.turma_id = t.id
            GROUP BY t.id
            ORDER BY t.nome
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            erro: "Erro ao listar turmas."
        });
    }
}

// ========================================
// CADASTRAR TURMA
// ========================================

export async function cadastrarTurma(
    req: Request,
    res: Response
) {
    try {
        const nome = String(req.body.nome || "").trim();
        const turno = String(req.body.turno || "").trim();

        const escola = String(
            req.body.escola || "Escola não informada"
        ).trim();

        if (!nome || !turno) {
            res.status(400).json({
                erro: "Informe nome e turno."
            });

            return;
        }

        const result = await pool.query(`
            INSERT INTO turmas (id, nome, turno, escola)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [
            randomUUID(),
            nome,
            turno,
            escola
        ]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23505"
        ) {
            res.status(409).json({
                erro: "Esta turma já existe."
            });

            return;
        }

        console.error(error);

        res.status(500).json({
            erro: "Erro ao cadastrar turma."
        });
    }
}

// ========================================
// CONSULTAR TURMA ESPECÍFICA
// ========================================

export async function consultarTurma(
    req: Request,
    res: Response
) {
    try {
        const result = await pool.query(`
            SELECT * FROM turmas WHERE id = $1
        `, [req.params.id]);

        if (!result.rowCount) {
            res.status(404).json({
                erro: "Turma não encontrada."
            });

            return;
        }

        const alunos = await pool.query(`
            SELECT * FROM alunos WHERE turma_id = $1
        `, [req.params.id]);

        res.json({
            ...result.rows[0],
            alunos: alunos.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            erro: "Erro ao consultar turma."
        });
    }
}
