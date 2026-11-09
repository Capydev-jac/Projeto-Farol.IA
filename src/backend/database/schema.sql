CREATE TABLE IF NOT EXISTS turmas (
    id UUID PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    turno VARCHAR(30) NOT NULL,
    escola VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alunos (
    id VARCHAR(20) PRIMARY KEY,
    school VARCHAR(150) NOT NULL,
    turma_id UUID NOT NULL REFERENCES turmas(id),
    shift VARCHAR(30) NOT NULL,

    freq NUMERIC(5,2) NOT NULL
        CHECK (freq >= 0 AND freq <= 100),

    renda INTEGER NOT NULL,
    esc INTEGER NOT NULL,
    infra INTEGER NOT NULL,

    enem NUMERIC(6,2),
    lo NUMERIC(6,2),
    hi NUMERIC(6,2),

    risk VARCHAR(30) DEFAULT 'Pendente',
    has_plan BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planos_intervencao (
    id SERIAL PRIMARY KEY,
    aluno_id VARCHAR(20) NOT NULL UNIQUE
        REFERENCES alunos(id) ON DELETE CASCADE,

    status VARCHAR(50),
    owners JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alunos_turma
    ON alunos(turma_id);

CREATE INDEX IF NOT EXISTS idx_alunos_risco
    ON alunos(risk);

CREATE INDEX IF NOT EXISTS idx_planos_aluno
    ON planos_intervencao(aluno_id);
