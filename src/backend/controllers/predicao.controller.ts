
import { type Request, type Response } from "express";
import { pool } from "../config/database.js";
import {
  preverRiscoAluno,
  type AlunoPayload,
} from "../services/predicao.service.js";

// ========================================
// REALIZAR PREDIÇÃO E SALVAR NO BANCO
// ========================================

export const preverRisco = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const payload = req.body as AlunoPayload;

    const {
      matricula_ra,
      TP_FAIXA_ETARIA,
      TP_SEXO,
      Q001,
      Q002,
      Q003,
      Q004,
      Q005,
      Q006,
      Q009,
      Q014,
      Q019,
      Q022,
      VEICULO_PROPRIO,
      REFRIGERACAO,
      CONECTIVIDADE,
    } = payload;

    // ========================================
    // VALIDAÇÃO DOS DADOS
    // ========================================

    if (!matricula_ra || String(matricula_ra).trim() === "") {
      res.status(400).json({
        erro: "A matrícula do aluno é obrigatória.",
      });
      return;
    }

    const camposObrigatorios = [
      TP_FAIXA_ETARIA,
      TP_SEXO,
      Q001,
      Q002,
      Q003,
      Q004,
      Q005,
      Q006,
      Q009,
      Q014,
      Q019,
      Q022,
      VEICULO_PROPRIO,
      REFRIGERACAO,
      CONECTIVIDADE,
    ];

    if (
      camposObrigatorios.some(
        (campo) => campo === undefined || campo === null
      )
    ) {
      res.status(400).json({
        erro: "Todos os 15 atributos do modelo são obrigatórios.",
      });
      return;
    }

    // ========================================
    // VERIFICAR SE O ALUNO ESTÁ CADASTRADO
    // ========================================

    const alunoResult = await pool.query(
      `
      SELECT id, numero_matricula, nome
      FROM alunos
      WHERE numero_matricula = $1
      `,
      [String(matricula_ra).trim()]
    );

    if (alunoResult.rows.length === 0) {
      res.status(404).json({
        erro: "Aluno não encontrado. Cadastre o estudante antes de realizar a predição.",
      });
      return;
    }

    const aluno = alunoResult.rows[0];

    // ========================================
    // EXECUTAR PREDIÇÃO DO LIGHTGBM
    // ========================================

    const resultado = preverRiscoAluno(payload);

    // ========================================
    // SALVAR RESULTADO DA IA NO POSTGRESQL
    // ========================================

    const updateResult = await pool.query(
      `
      UPDATE alunos
      SET
        ia_risco_defasagem = $1,
        ia_probabilidade_risco = $2,
        ia_nivel_alerta = $3,
        ia_recomendacao = $4,
        ia_data_predicao = CURRENT_TIMESTAMP,
        ia_versao_modelo = $5
      WHERE numero_matricula = $6
      RETURNING
        id,
        numero_matricula,
        nome,
        ia_risco_defasagem,
        ia_probabilidade_risco,
        ia_nivel_alerta,
        ia_recomendacao,
        ia_data_predicao,
        ia_versao_modelo
      `,
      [
        resultado.risco_binario,
        resultado.probabilidade_percentual,
        resultado.nivel_alerta,
        resultado.recomendacao,
        resultado.versao_modelo,
        String(matricula_ra).trim(),
      ]
    );

    const alunoAtualizado = updateResult.rows[0];

    // ========================================
    // RETORNAR RESPOSTA
    // ========================================

    res.status(200).json({
      sucesso: true,
      mensagem: "Predição realizada e salva com sucesso.",
      resultado,
      aluno: alunoAtualizado,
    });
  } catch (error: unknown) {
    console.error("Erro ao realizar predição:", error);

    res.status(500).json({
      erro: "Erro ao realizar ou salvar a predição.",
    });
  }
};
