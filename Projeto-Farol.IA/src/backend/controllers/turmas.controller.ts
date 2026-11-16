import type { Request, Response } from "express";
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
                t.id,
                t.identificador,
                t.identificador AS nome,
                t.turno,
                t.data_criacao,
                COUNT(a.id)::int AS total_alunos,
                json_build_object(
                    'alunos',
                    COUNT(a.id)::int
                ) AS _count
            FROM turmas t
            LEFT JOIN alunos a ON a.turma_id = t.id
            GROUP BY t.id
            ORDER BY t.identificador ASC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error("Erro ao listar turmas:", error);

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
        const identificador = String(req.body.identificador || req.body.nome || "").trim();
        const turnoBruto = String(req.body.turno || "").trim();

        if (!identificador || !turnoBruto) {
            res.status(400).json({
                erro: "Informe identificador e turno da turma."
            });
            return;
        }

        let turno: string = turnoBruto;
        const tLower = turnoBruto.toLowerCase();
        if (tLower === "manhã" || tLower === "manha") turno = "Manhã";
        else if (tLower === "tarde") turno = "Tarde";
        else if (tLower === "noite") turno = "Noite";
        else {
            res.status(400).json({
                erro: "Turno inválido. Escolha entre Manhã, Tarde ou Noite."
            });
            return;
        }

        const result = await pool.query(`
            INSERT INTO turmas (identificador, turno)
            VALUES ($1, $2)
            RETURNING id, identificador, identificador AS nome, turno, data_criacao
        `, [
            identificador,
            turno
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

        console.error("Erro ao cadastrar turma:", error);

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
            SELECT
                t.id,
                t.identificador,
                t.identificador AS nome,
                t.turno,
                t.data_criacao
            FROM turmas t
            WHERE t.id = $1
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
        console.error("Erro ao consultar turma:", error);

        res.status(500).json({
            erro: "Erro ao consultar turma."
        });
    }
}

// ========================================
// EXCLUIR TURMA
// ========================================

export async function excluirTurma(
    req: Request,
    res: Response
) {
    try {
        const result = await pool.query(`
            DELETE FROM turmas WHERE id = $1 RETURNING id
        `, [req.params.id]);

        if (result.rowCount === 0) {
            res.status(404).json({
                erro: "Turma não encontrada."
            });
            return;
        }

        res.status(200).json({
            sucesso: true,
            mensagem: "Turma excluída com sucesso."
        });
    } catch (error) {
        console.error("Erro ao excluir turma:", error);

        res.status(500).json({
            erro: "Erro ao excluir turma."
        });
    }
}
