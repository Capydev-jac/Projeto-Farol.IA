
import React from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useStore } from '../store'

import {
  decodificarEscolaridade,
  decodificarOcupacao,
  decodificarRenda,
  decodificarBens,
  decodificarFaixaEtaria
} from '../features/cadastro/formOptions'

const BADGE_RISCO: Record<string, { label: string; classe: string }> = {
  CRITICO: { label: 'Crítico', classe: 'Elevado' },
  ATENCAO: { label: 'Atenção', classe: 'Atenção' },
  REGULAR: { label: 'Regular', classe: 'Menor' }
}

export default function AlunoDetalhe() {
  const { id } = useParams()
  const { alunosCadastrados, loading } = useStore()

  const aluno = alunosCadastrados.find(
    a => String(a.id) === id
  )

  if (loading) {
    return (
      <main className="page">
        <div className="empty">Carregando dados do estudante...</div>
      </main>
    )
  }

  if (!aluno) {
    return (
      <main className="page">
        <div className="back">
          <Link to="/cadastro">
            <Icon name="back" size={12} />
            Cadastro de Alunos
          </Link>
        </div>

        <section className="card">
          <h1>Estudante não encontrado</h1>
          <p className="sub">
            Não foi possível localizar este cadastro no banco de dados.
          </p>
          <Link to="/cadastro" className="link">
            Voltar para Cadastro de Alunos
          </Link>
        </section>
      </main>
    )
  }

  const badge = aluno.ia_nivel_alerta
    ? BADGE_RISCO[aluno.ia_nivel_alerta]
    : null

  const riscoClasse =
    aluno.ia_nivel_alerta === 'CRITICO'
      ? 'red'
      : aluno.ia_nivel_alerta === 'ATENCAO'
        ? 'amber'
        : aluno.ia_nivel_alerta === 'REGULAR'
          ? 'green'
          : ''

  const simNao = (valor: unknown) => {
    if (valor == null || valor === '') return 'Não informado'
    return Number(valor) === 1 ? 'Sim' : 'Não'
  }

  return (
    <main className="page">

      {/* Navegação */}
      <div className="back">
        <Link to="/cadastro">
          <Icon name="back" size={12} />
          Cadastro de Alunos
        </Link>
        <span className="muted"> / {aluno.nome}</span>
      </div>

      {/* Cabeçalho */}
      <div className="student-head">
        <span className="avatar">
          <Icon name="user" size={22} />
        </span>

        <div>
          <h1>{aluno.nome}</h1>

          <p className="sub">
            {aluno.turma || 'Turma não informada'} ·{' '}
            {aluno.turno || 'Turno não informado'}
          </p>

          <p className="muted small">
            <Icon name="shieldsmall" size={12} />
            Cadastro individual · PostgreSQL · Farol.IA
          </p>
        </div>
      </div>

      {/* Indicadores */}
      <section className="card stat-strip">
        <div>
          <span className="muted small">RA / Matrícula</span>
          <b>{aluno.numero_matricula || '—'}</b>
          <span className="muted small">Identificação escolar</span>
        </div>

        <div>
          <span className="muted small">Turma</span>
          <b>{aluno.turma || '—'}</b>
          <span className="muted small">Vínculo escolar</span>
        </div>

        <div>
          <span className="muted small">Avaliação IA</span>
          {badge ? (
            <b className={
              aluno.ia_nivel_alerta === 'CRITICO'
                ? 'red'
                : aluno.ia_nivel_alerta === 'ATENCAO'
                  ? 'amber'
                  : 'teal'
            }>
              {badge.label}
            </b>
          ) : (
            <b className="muted">Pendente</b>
          )}
          <span className="muted small">Classificação de risco</span>
        </div>

        <div>
          <span className="muted small">Probabilidade</span>
          <b>
            {aluno.ia_probabilidade_risco != null
              ? `${Number(aluno.ia_probabilidade_risco).toFixed(1)}%`
              : '—'}
          </b>
          <span className="muted small">Resultado da IA</span>
        </div>
      </section>

      {/* Identificação e perfil */}
      <div className="grid-detail">

        <section className="card">
          <div className="card-head">
            <h3>Identificação escolar</h3>
            <Icon name="user" />
          </div>

          <div className="form-grid">
            <div>
              <span className="muted small">Nome completo</span>
              <b>{aluno.nome}</b>
            </div>

            <div>
              <span className="muted small">RA / Matrícula</span>
              <b>{aluno.numero_matricula || '—'}</b>
            </div>

            <div>
              <span className="muted small">Turma</span>
              <b>{aluno.turma || 'Não informada'}</b>
            </div>

            <div>
              <span className="muted small">Turno</span>
              <b>{aluno.turno || 'Não informado'}</b>
            </div>

            <div>
              <span className="muted small">Data do cadastro</span>
              <b>
                {aluno.data_cadastro
                  ? new Date(aluno.data_cadastro).toLocaleDateString('pt-BR')
                  : 'Não informada'}
              </b>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Perfil demográfico</h3>
            <Icon name="users" />
          </div>

          <div className="form-grid">
            <div>
              <span className="muted small">Faixa etária</span>
              <b>{decodificarFaixaEtaria(aluno.tp_faixa_etaria)}</b>
            </div>

            <div>
              <span className="muted small">Sexo</span>
              <b>
                {aluno.tp_sexo === 'F'
                  ? 'Feminino'
                  : aluno.tp_sexo === 'M'
                    ? 'Masculino'
                    : 'Não informado'}
              </b>
            </div>
          </div>
        </section>
      </div>

      {/* Contexto familiar */}
      <section className="card">
        <div className="card-head">
          <div>
            <h3>Contexto familiar e renda</h3>
            <p className="muted small">
              Informações socioeconômicas registradas no cadastro.
            </p>
          </div>
          <Icon name="users" />
        </div>

        <div className="form-grid">
          <div>
            <span className="muted small">Escolaridade do pai</span>
            <b>{decodificarEscolaridade(aluno.q001_escolaridade_pai)}</b>
          </div>

          <div>
            <span className="muted small">Escolaridade da mãe</span>
            <b>{decodificarEscolaridade(aluno.q002_escolaridade_mae)}</b>
          </div>

          <div>
            <span className="muted small">Ocupação do pai</span>
            <b>{decodificarOcupacao(aluno.q003_ocupacao_pai)}</b>
          </div>

          <div>
            <span className="muted small">Ocupação da mãe</span>
            <b>{decodificarOcupacao(aluno.q004_ocupacao_mae)}</b>
          </div>

          <div>
            <span className="muted small">Tamanho da família</span>
            <b>
              {aluno.q005_tamanho_familia != null
                ? `${aluno.q005_tamanho_familia} pessoa(s)`
                : 'Não informado'}
            </b>
          </div>

          <div>
            <span className="muted small">Renda familiar</span>
            <b>{decodificarRenda(aluno.q006_renda_familiar)}</b>
          </div>
        </div>
      </section>

      {/* Infraestrutura */}
      <section className="card">
        <div className="card-head">
          <div>
            <h3>Infraestrutura, bens e conectividade</h3>
            <p className="muted small">
              Condições de infraestrutura domiciliar informadas.
            </p>
          </div>
          <Icon name="home" />
        </div>

        <div className="form-grid">
          <div>
            <span className="muted small">Quartos para dormir</span>
            <b>{decodificarBens(aluno.q009_quartos)}</b>
          </div>

          <div>
            <span className="muted small">Máquinas de lavar</span>
            <b>{decodificarBens(aluno.q014_maquina_lavar)}</b>
          </div>

          <div>
            <span className="muted small">Televisores</span>
            <b>{decodificarBens(aluno.q019_televisores)}</b>
          </div>

          <div>
            <span className="muted small">Celulares</span>
            <b>{decodificarBens(aluno.q022_celulares)}</b>
          </div>

          <div>
            <span className="muted small">Veículo próprio</span>
            <b>{simNao(aluno.veiculo_proprio)}</b>
          </div>

          <div>
            <span className="muted small">Refrigeração</span>
            <b>{simNao(aluno.refrigeracao)}</b>
          </div>

          <div>
            <span className="muted small">Conectividade</span>
            <b>{simNao(aluno.conectividade)}</b>
          </div>
        </div>
      </section>

      {/* Avaliação da IA */}
      <section className="card">
        <div className="card-head">
          <div>
            <h3>Avaliação da inteligência artificial</h3>
            <p className="muted small">
              Resultado da análise de risco do estudante.
            </p>
          </div>
          <Icon name="spark" />
        </div>

        {badge ? (
          <div className={`risk-card ${riscoClasse}`}>
            <div>
              <span className="risk-label">Classificação de risco</span>
              <span className="risk-pct">{badge.label}</span>
            </div>

            <div>
              <span className={`tag big ${badge.classe}`}>
                {badge.label}
              </span>

              <p>
                {aluno.ia_recomendacao ||
                  'Nenhuma recomendação registrada.'}
              </p>

              <span className="risk-model">
                Modelo: {aluno.ia_versao_modelo || 'Não informado'}
                {' · '}
                Data da avaliação:{' '}
                {aluno.ia_data_predicao
                  ? new Date(aluno.ia_data_predicao).toLocaleString('pt-BR')
                  : 'Não informada'}
              </span>
            </div>
          </div>
        ) : (
          <div className="ia-hint">
            <Icon name="spark" size={24} />
            <div style={{ flex: 1 }}>
              <b>Classificação de IA pendente</b>
              <p className="muted small">
                Ainda não existe uma avaliação de risco registrada
                para este estudante.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Aviso */}
      <div className="notice">
        <Icon name="info" />
        Esta ficha apresenta informações efetivamente registradas
        no banco de dados do Farol.IA. Notas do ENEM, frequência
        escolar e outros indicadores não cadastrados não são
        presumidos nem substituídos por valores demonstrativos.
      </div>

      <footer className="foot">
        <span>Cadastro individual · PostgreSQL</span>
        <span>Farol.IA · FATEC Jacareí</span>
      </footer>

    </main>
  )
}
