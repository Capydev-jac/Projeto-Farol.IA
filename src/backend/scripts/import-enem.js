import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { pipeline } from "node:stream/promises";
import { from as copyFrom } from "pg-copy-streams";
import { pool } from "../config/database.js";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const arquivo = path.resolve(
  process.env.ENEM_CSV_PATH ||
  path.join(__dirname, "../data/enem_2023.csv")
);

// Codificação utilizada na leitura do CSV pelo PostgreSQL.
const CODIFICACAO_CSV = "WIN1252";

async function obterColunas() {
  const stream = fs.createReadStream(arquivo);

  const leitor = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  try {
    for await (const linha of leitor) {
      const colunas = linha
        .replace(/^\uFEFF/, "")
        .split(";")
        .map((coluna) => coluna.trim());

      if (
        colunas.length === 0 ||
        colunas.some((coluna) => !/^[A-Z][A-Z0-9_]*$/.test(coluna)) ||
        new Set(colunas).size !== colunas.length
      ) {
        throw new Error("Cabeçalho CSV inválido.");
      }

      return colunas;
    }

    throw new Error("O CSV está vazio.");
  } finally {
    leitor.close();
    stream.destroy();
  }
}

async function importar() {
  if (!fs.existsSync(arquivo)) {
    throw new Error(`Arquivo não encontrado: ${arquivo}`);
  }

  const colunas = await obterColunas();

  console.log(`Arquivo: ${arquivo}`);
  console.log(`Colunas encontradas: ${colunas.length}`);
  console.log(`Codificação do CSV: ${CODIFICACAO_CSV}`);

  const nomesSQL = colunas
    .map((coluna) => `"${coluna}"`)
    .join(", ");

  const definicoesSQL = colunas
    .map((coluna) => `"${coluna}" TEXT`)
    .join(", ");

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    await cliente.query(`
      CREATE TABLE IF NOT EXISTS dados_enem_2023 (
        ${definicoesSQL}
      )
    `);

    // Verifica se a estrutura existente é compatível.
    const estrutura = await cliente.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'dados_enem_2023'
      ORDER BY ordinal_position
    `);

    const existentes = estrutura.rows.map(
      (linha) => linha.column_name
    );

    if (
      existentes.length !== colunas.length ||
      existentes.some((coluna, i) => coluna !== colunas[i])
    ) {
      throw new Error(
        "A tabela existente possui colunas diferentes do CSV."
      );
    }

    // Reimportações substituem os dados anteriores.
    await cliente.query("TRUNCATE TABLE dados_enem_2023");

    const comando = `
      COPY dados_enem_2023 (${nomesSQL})
      FROM STDIN
      WITH (
        FORMAT CSV,
        HEADER TRUE,
        DELIMITER ';',
        QUOTE '"',
        ENCODING '${CODIFICACAO_CSV}'
      )
    `;

    console.log("Iniciando importação...");
    console.log("Aguarde, o arquivo pode levar alguns minutos.");

    const origem = fs.createReadStream(arquivo);
    const destino = cliente.query(copyFrom(comando));

    await pipeline(origem, destino);

    await cliente.query("COMMIT");

    console.log("Importação concluída com sucesso!");
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }

  const resultado = await pool.query(
    "SELECT COUNT(*) AS total FROM dados_enem_2023"
  );

  console.log(
    `Total de registros: ${resultado.rows[0].total}`
  );
}

importar()
  .catch((erro) => {
    console.error("Erro na importação:", erro.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
