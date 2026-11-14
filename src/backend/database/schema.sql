
-- =======================================================================
-- FAROL.IA - Estrutura inicial do banco PostgreSQL
-- Modelo: ENEM 2023 - LightGBM Top 15
-- Fluxo: Gestor cadastra -> IA classifica -> Gestor organiza turmas
-- =======================================================================


-- =======================================================================
-- TABELA 1: USUARIOS
-- Administradores e gestores do sistema
-- =======================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,

    papel VARCHAR(20) NOT NULL DEFAULT 'gestor'
        CHECK (papel IN ('admin', 'gestor')),

    status_ativo BOOLEAN NOT NULL DEFAULT TRUE,

    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =======================================================================
-- TABELA 2: TURMAS
-- Criadas e organizadas pelo gestor.
-- Não possuem vínculo com professores.
-- =======================================================================

CREATE TABLE IF NOT EXISTS turmas (
    id SERIAL PRIMARY KEY,

    identificador VARCHAR(50) NOT NULL UNIQUE,

    turno VARCHAR(20)
        CHECK (turno IN ('Manhã', 'Tarde', 'Noite')),

    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =======================================================================
-- TABELA 3: ALUNOS
-- Cadastro, dados socioeconômicos e resultado da predição.
-- O aluno pode existir sem turma inicialmente.
-- =======================================================================

CREATE TABLE IF NOT EXISTS alunos (
    id SERIAL PRIMARY KEY,

    numero_matricula VARCHAR(50) UNIQUE NOT NULL,

    nome VARCHAR(150) NOT NULL,

    -- Vínculo opcional com a turma
    turma_id INTEGER
        REFERENCES turmas(id) ON DELETE SET NULL,


    -- -------------------------------------------------------------------
    -- 1. Perfil demográfico (índices do modelo: 0 e 1)
    -- -------------------------------------------------------------------

    tp_faixa_etaria INTEGER
        CHECK (tp_faixa_etaria BETWEEN 1 AND 20),

    tp_sexo CHAR(1)
        CHECK (tp_sexo IN ('M', 'F')),


    -- -------------------------------------------------------------------
    -- 2. Contexto familiar e renda (índices do modelo: 2 a 7)
    -- -------------------------------------------------------------------

    q001_escolaridade_pai CHAR(1)
        CHECK (q001_escolaridade_pai IN ('A','B','C','D','E','F','G','H')),

    q002_escolaridade_mae CHAR(1)
        CHECK (q002_escolaridade_mae IN ('A','B','C','D','E','F','G','H')),

    q003_ocupacao_pai CHAR(1)
        CHECK (q003_ocupacao_pai IN ('A','B','C','D','E','F')),

    q004_ocupacao_mae CHAR(1)
        CHECK (q004_ocupacao_mae IN ('A','B','C','D','E','F')),

    q005_tamanho_familia INTEGER
        CHECK (q005_tamanho_familia BETWEEN 1 AND 20),

    q006_renda_familiar CHAR(1)
        CHECK (q006_renda_familiar IN
            ('A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q')),


    -- -------------------------------------------------------------------
    -- 3. Infraestrutura e bens (índices do modelo: 8 a 11)
    -- -------------------------------------------------------------------

    q009_quartos CHAR(1)
        CHECK (q009_quartos IN ('A','B','C','D','E')),

    q014_maquina_lavar CHAR(1)
        CHECK (q014_maquina_lavar IN ('A','B','C','D','E')),

    q019_televisores CHAR(1)
        CHECK (q019_televisores IN ('A','B','C','D','E')),

    q022_celulares CHAR(1)
        CHECK (q022_celulares IN ('A','B','C','D','E')),


    -- -------------------------------------------------------------------
    -- 4. Atributos consolidados (índices do modelo: 12 a 14)
    -- -------------------------------------------------------------------

    veiculo_proprio SMALLINT
        CHECK (veiculo_proprio IN (0, 1)),

    refrigeracao SMALLINT
        CHECK (refrigeracao IN (0, 1)),

    conectividade SMALLINT
        CHECK (conectividade IN (0, 1)),


    -- -------------------------------------------------------------------
    -- 5. Resultado atual da IA
    -- -------------------------------------------------------------------

    ia_risco_defasagem SMALLINT
        CHECK (ia_risco_defasagem IN (0, 1)),

    ia_probabilidade_risco NUMERIC(5,2)
        CHECK (ia_probabilidade_risco BETWEEN 0 AND 100),

    ia_nivel_alerta VARCHAR(10)
        CHECK (ia_nivel_alerta IN ('REGULAR', 'ATENCAO', 'CRITICO')),

    ia_recomendacao TEXT,

    ia_data_predicao TIMESTAMP,

    ia_versao_modelo VARCHAR(50),


    -- -------------------------------------------------------------------
    -- 6. Cadastro
    -- -------------------------------------------------------------------

    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =======================================================================
-- TABELA 4: PLANOS DE INTERVENCAO
-- =======================================================================

CREATE TABLE IF NOT EXISTS planos_intervencao (
    id SERIAL PRIMARY KEY,

    aluno_id INTEGER NOT NULL UNIQUE
        REFERENCES alunos(id) ON DELETE CASCADE,

    status VARCHAR(50),

    owners JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =======================================================================
-- ÍNDICES
-- =======================================================================

CREATE INDEX IF NOT EXISTS idx_alunos_turma_id
    ON alunos(turma_id);

CREATE INDEX IF NOT EXISTS idx_alunos_nivel_alerta
    ON alunos(ia_nivel_alerta);

CREATE INDEX IF NOT EXISTS idx_alunos_risco
    ON alunos(ia_risco_defasagem);

CREATE INDEX IF NOT EXISTS idx_planos_intervencao_aluno
    ON planos_intervencao(aluno_id);


-- =======================================================================
-- FIM DO SCHEMA FAROL.IA
-- =======================================================================
