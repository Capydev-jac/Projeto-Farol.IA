
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { pool } from "./config/database.js";
import enemRoutes from "./routes/enem.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

// ========================================
// VERIFICAR CONEXÃO
// ========================================

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT NOW()");
        res.json({
            status: "ok",
            database: "connected",
            projeto: "Farol.IA"
        });
    } catch (error) {
        res.status(500).json({
            erro: "Não foi possível conectar ao banco."
        });
    }
});

// ========================================
// TURMAS
// ========================================

// Listar turmas
app.get("/api/turmas", async (req, res) => {
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
        res.status(500).json({ erro: "Erro ao listar turmas." });
    }
});

// Cadastrar turma
app.post("/api/turmas", async (req, res) => {
    try {
        const nome = String(req.body.nome || "").trim();
        const turno = String(req.body.turno || "").trim();
        const escola = String(
            req.body.escola || "Escola não informada"
        ).trim();

        if (!nome || !turno) {
            return res.status(400).json({
                erro: "Informe nome e turno."
            });
        }

        const result = await pool.query(`
            INSERT INTO turmas (id, nome, turno, escola)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [randomUUID(), nome, turno, escola]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                erro: "Esta turma já existe."
            });
        }

        console.error(error);
        res.status(500).json({ erro: "Erro ao cadastrar turma." });
    }
});

// Consultar turma específica
app.get("/api/turmas/:id", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM turmas WHERE id = $1
        `, [req.params.id]);

        if (!result.rowCount) {
            return res.status(404).json({
                erro: "Turma não encontrada."
            });
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
        res.status(500).json({ erro: "Erro ao consultar turma." });
    }
});

// ========================================
// ESTUDANTES
// ========================================

// Listar estudantes
app.get("/api/alunos", async (req, res) => {
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

        const conditions = [];
        const values = [];

        if (req.query.turmaId) {
            values.push(req.query.turmaId);
            conditions.push(`a.turma_id = $${values.length}`);
        }

        if (req.query.risco) {
            values.push(req.query.risco);
            conditions.push(`a.risk = $${values.length}`);
        }

        if (conditions.length) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += " ORDER BY a.created_at DESC";

        const result = await pool.query(sql, values);

        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "Erro ao listar estudantes." });
    }
});

// Cadastrar estudante
app.post("/api/alunos", async (req, res) => {
    try {
        const {
            school,
            turmaId,
            freq,
            renda,
            esc,
            infra
        } = req.body;

        const frequency = Number(freq);

        if (
            !school ||
            !turmaId ||
            !Number.isFinite(frequency) ||
            frequency < 0 ||
            frequency > 100 ||
            ![renda, esc, infra].every(
                value => Number.isInteger(Number(value))
            )
        ) {
            return res.status(400).json({
                erro: "Confira os dados do estudante."
            });
        }

        const turmaResult = await pool.query(
            "SELECT * FROM turmas WHERE id = $1",
            [turmaId]
        );

        if (!turmaResult.rowCount) {
            return res.status(400).json({
                erro: "Turma não encontrada."
            });
        }

        const turma = turmaResult.rows[0];
        const id = `E-${randomUUID().slice(0, 8)}`;

        const result = await pool.query(`
            INSERT INTO alunos (
                id, school, turma_id, shift,
                freq, renda, esc, infra
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            id,
            String(school).trim(),
            turmaId,
            turma.turno,
            frequency,
            Number(renda),
            Number(esc),
            Number(infra)
        ]);

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
            hasPlan: aluno.has_plan
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "Erro ao cadastrar estudante." });
    }
});

// Consultar estudante específico
app.get("/api/alunos/:id", async (req, res) => {
    try {
        const result = await pool.query(`
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
        `, [req.params.id]);

        if (!result.rowCount) {
            return res.status(404).json({
                erro: "Estudante não encontrado."
            });
        }

        const a = result.rows[0];

        res.json({
            ...a,
            freq: Number(a.freq),
            enem: a.enem === null ? null : Number(a.enem),
            lo: a.lo === null ? null : Number(a.lo),
            hi: a.hi === null ? null : Number(a.hi),
            plan: a.plan_status ? {
                status: a.plan_status,
                owners: a.plan_owners
            } : null
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "Erro ao consultar estudante." });
    }
});

// ========================================
// DASHBOARD
// ========================================

app.get("/api/dashboard", async (req, res) => {
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
            totalTurmas: turmas.rows[0].total
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "Erro ao carregar dashboard." });
    }
});

// ========================================
// PLANOS DE INTERVENÇÃO
// ========================================

// Listar planos
app.get("/api/intervencoes", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT aluno_id, status, owners
            FROM planos_intervencao
        `);

        const planos = {};

        result.rows.forEach(p => {
            planos[p.aluno_id] = {
                status: p.status,
                owners: p.owners
            };
        });

        res.json(planos);

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "Erro ao listar planos." });
    }
});

// Criar ou atualizar plano
app.put("/api/intervencoes/:id", async (req, res) => {
    try {
        const { status, owners = [] } = req.body;

        const result = await pool.query(`
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
        `, [
            req.params.id,
            status || null,
            JSON.stringify(owners)
        ]);

        await pool.query(`
            UPDATE alunos
            SET has_plan = TRUE
            WHERE id = $1
        `, [req.params.id]);

        res.json({
            status: result.rows[0].status,
            owners: result.rows[0].owners
        });

    } catch (error) {
        if (error.code === "23503") {
            return res.status(404).json({
                erro: "Estudante não encontrado."
            });
        }

        console.error(error);
        res.status(500).json({ erro: "Erro ao salvar plano." });
    }
});

// ========================================
// INICIALIZAÇÃO
// ========================================

app.listen(PORT, () => {
    console.log(`Farol.IA API disponível em http://localhost:${PORT}`);
});


app.use("/api/enem", enemRoutes);