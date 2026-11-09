
import { Router } from "express";
import { pool } from "../config/database.js";

const router = Router();

// Converte notas do CSV para números.
// Valores vazios são ignorados.
const notaSQL = (coluna) => `
  CASE
    WHEN TRIM("${coluna}") ~ '^[0-9]+([.,][0-9]+)?$'
    THEN REPLACE(TRIM("${coluna}"), ',', '.')::numeric
    ELSE NULL
  END
`;

// Resumo para os cards do dashboard.
router.get("/resumo", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        COUNT(*)::int AS total_participantes,
        ROUND(AVG(${notaSQL("NU_NOTA_CN")}), 2) AS media_cn,
        ROUND(AVG(${notaSQL("NU_NOTA_CH")}), 2) AS media_ch,
        ROUND(AVG(${notaSQL("NU_NOTA_LC")}), 2) AS media_lc,
        ROUND(AVG(${notaSQL("NU_NOTA_MT")}), 2) AS media_mt,
        ROUND(AVG(${notaSQL("NU_NOTA_REDACAO")}), 2)
          AS media_redacao
      FROM dados_enem_2023
    `);

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error("Erro no resumo ENEM:", erro);
    res.status(500).json({
      erro: "Erro ao consultar resumo do ENEM"
    });
  }
});

// Distribuições para gráficos.
router.get("/estatisticas", async (req, res) => {
  try {
    const [sexo, faixaEtaria, escola, estados] =
      await Promise.all([
        pool.query(`
          SELECT "TP_SEXO" AS categoria,
                 COUNT(*)::int AS total
          FROM dados_enem_2023
          GROUP BY "TP_SEXO"
          ORDER BY total DESC
        `),
        pool.query(`
          SELECT "TP_FAIXA_ETARIA" AS categoria,
                 COUNT(*)::int AS total
          FROM dados_enem_2023
          GROUP BY "TP_FAIXA_ETARIA"
          ORDER BY categoria
        `),
        pool.query(`
          SELECT "TP_ESCOLA" AS categoria,
                 COUNT(*)::int AS total
          FROM dados_enem_2023
          GROUP BY "TP_ESCOLA"
          ORDER BY categoria
        `),
        pool.query(`
          SELECT "SG_UF_PROVA" AS categoria,
                 COUNT(*)::int AS total
          FROM dados_enem_2023
          GROUP BY "SG_UF_PROVA"
          ORDER BY total DESC
        `)
      ]);

    res.json({
      sexo: sexo.rows,
      faixa_etaria: faixaEtaria.rows,
      tipo_escola: escola.rows,
      estados: estados.rows
    });
  } catch (erro) {
    console.error("Erro nas estatísticas ENEM:", erro);
    res.status(500).json({
      erro: "Erro ao consultar estatísticas"
    });
  }
});

// Lista paginada de participantes.
// Não retorna dados do questionário socioeconômico
// nem informações usadas futuramente pelo modelo.
router.get("/participantes", async (req, res) => {
  try {
    const pagina = Math.max(
      1,
      Number.parseInt(req.query.pagina, 10) || 1
    );

    const limite = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limite, 10) || 20
      )
    );

    const offset = (pagina - 1) * limite;

    const resultado = await pool.query(`
      SELECT
        "NU_INSCRICAO" AS inscricao,
        "NU_ANO" AS ano,
        "TP_FAIXA_ETARIA" AS faixa_etaria,
        "TP_SEXO" AS sexo,
        "TP_ESCOLA" AS tipo_escola,
        "SG_UF_PROVA" AS uf_prova,
        "NU_NOTA_CN" AS nota_cn,
        "NU_NOTA_CH" AS nota_ch,
        "NU_NOTA_LC" AS nota_lc,
        "NU_NOTA_MT" AS nota_mt,
        "NU_NOTA_REDACAO" AS nota_redacao
      FROM dados_enem_2023
      ORDER BY "NU_INSCRICAO"
      LIMIT $1 OFFSET $2
    `, [limite, offset]);

    res.json({
      pagina,
      limite,
      participantes: resultado.rows
    });
  } catch (erro) {
    console.error("Erro ao listar participantes:", erro);
    res.status(500).json({
      erro: "Erro ao consultar participantes"
    });
  }
});

export default router;
