import 'dotenv/config';
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD
} = process.env;

async function initDatabase() {
    let adminClient;
    let dbClient;

    try {
        // Verifica as configurações
        if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
            throw new Error('Confira as configurações do arquivo .env.');
        }

        // Evita injeção SQL no identificador do banco
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(DB_NAME)) {
            throw new Error('Nome do banco de dados inválido.');
        }

        console.log('\nIniciando configuração do Farol.IA...\n');

        // Conecta ao banco administrativo do PostgreSQL
        adminClient = new Client({
            host: DB_HOST,
            port: Number(DB_PORT || 5432),
            user: DB_USER,
            password: DB_PASSWORD,
            database: 'postgres'
        });

        await adminClient.connect();

        console.log('Conexão com PostgreSQL estabelecida.');

        // Verifica se o banco já existe
        const result = await adminClient.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [DB_NAME]
        );

        if (result.rowCount === 0) {
            await adminClient.query(
                `CREATE DATABASE "${DB_NAME}"`
            );

            console.log(`Banco "${DB_NAME}" criado com sucesso.`);
        } else {
            console.log(`Banco "${DB_NAME}" já existe.`);
        }

        await adminClient.end();
        adminClient = null;

        // Conecta ao banco do projeto
        dbClient = new Client({
            host: DB_HOST,
            port: Number(DB_PORT || 5432),
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME
        });

        await dbClient.connect();

        // Lê e executa a estrutura SQL
        const schemaPath = path.join(
            __dirname,
            '../database/schema.sql'
        );

        const schema = await fs.readFile(schemaPath, 'utf8');

        await dbClient.query(schema);

        console.log('Tabelas e índices configurados com sucesso.');
        console.log('\nFarol.IA: banco inicializado corretamente!\n');

    } catch (error) {
        console.error('\nErro ao inicializar o banco:');
        console.error(error.message);
        process.exitCode = 1;

    } finally {
        if (adminClient) await adminClient.end().catch(() => {});
        if (dbClient) await dbClient.end().catch(() => {});
    }
}

initDatabase();
