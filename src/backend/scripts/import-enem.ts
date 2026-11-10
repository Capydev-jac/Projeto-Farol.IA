
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import pgCopyStreams from "pg-copy-streams";
import type { PoolClient } from "pg";
import {pool} from "../config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CSV_PATH =
  process.env.ENEM_CSV_PATH ||
  path.join(__dirname, "../data/enem_2023.csv");


async function importarEnem(): Promise<void> {
  let client: PoolClient | null = null;

  try {
    console.log("\nIniciando importação dos dados do ENEM...\n");

    if (!fs.existsSync(CSV_PATH)) {
      throw new Error(`Arquivo CSV não encontrado: ${CSV_PATH}`);
    }

   const arquivo = fs.createReadStream(CSV_PATH);

    const leitor = readline.createInterface({
      input: arquivo,
      crlfDelay: Infinity,
    });

    const primeiraLinha = await new Promise<string>((resolve, reject) => {
      leitor.once("line", resolve);
      leitor.once("error", reject);
      arquivo.once("error", reject);
    });

    leitor.close();
    arquivo.destroy();

    const colunas = primeiraLinha
      .replace(/^\uFEFF/, "")
      .split(";")
      .map((coluna) => coluna.trim().replace(/^"|"$/g, ""));

    if (colunas.length === 0 || colunas.some((coluna) => !coluna)) {
      throw new Error("Cabeçalho do CSV inválido.");
    }

    if (colunas.some((coluna) => !/^[A-Z0-9_]+$/.test(coluna))) {
      throw new Error("O cabeçalho contém nomes de colunas inválidos.");
    }

    if (new Set(colunas).size !== colunas.length) {
      throw new Error("O cabeçalho contém colunas duplicadas.");
    }

    const definicoes = colunas
      .map((coluna) => `"${coluna}" TEXT`)
      .join(", ");

    client = await pool.connect();

    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS data_enem_2023 (
        ${definicoes}
      )
    `);

    const resultadoColunas = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'data_enem_2023'
      ORDER BY ordinal_position
    `);

    const colunasExistentes = resultadoColunas.rows.map(
      (row: { column_name: string }) => row.column_name
    );

    if (
      colunasExistentes.length !== colunas.length ||
      !colunasExistentes.every(
        (coluna: string, index: number) => coluna === colunas[index]
      )
    ) {
      throw new Error(
        "A estrutura da tabela data_enem_2023 não corresponde ao CSV."
      );
    }

    await client.query("TRUNCATE TABLE data_enem_2023");

    const comandoCopy = `
      COPY data_enem_2023
      FROM STDIN
      WITH (
        FORMAT CSV,
        HEADER TRUE,
        DELIMITER ';',
        QUOTE '"',
        ENCODING 'WIN1252'
      )
    `;

    const destino = client.query(pgCopyStreams.from(comandoCopy));

    const origem = fs.createReadStream(CSV_PATH);

    await pipeline(origem, destino);

    await client.query("COMMIT");

    const resultado = await client.query(
      "SELECT COUNT(*) AS total FROM data_enem_2023"
    );

    console.log(
      `Importação concluída! Total de registros: ${resultado.rows[0].total}`
    );
  } catch (error: unknown) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("\nErro ao importar dados do ENEM:");
    console.error(error instanceof Error ? error.message : String(error));

    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
}

importarEnem();
