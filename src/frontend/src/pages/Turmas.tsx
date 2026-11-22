import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { NovaTurma } from '../features/cadastro/Cadastro'
import { useStore } from '../store'
import { downloadCSV, pct } from '../lib/utils'
import type { AlunoApi } from '../services/api'
import type { Turma } from '../types'

const slug = (t: string) => t.replace(/\s+/g, '').replace('ª', 'a')

const NIVEL: Record<string, string> = {
  CRITICO: 'Crítico',
  ATENCAO: 'Atenção',
  REGULAR: 'Regular'
}

const nivelDe = (a: AlunoApi) => (a.ia_nivel_alerta ? NIVEL[a.ia_nivel_alerta] : 'Pendente')

const probabilidade = (a: AlunoApi) =>
  a.ia_probabilidade_risco != null ? Number(a.ia_probabilidade_risco) : null

export default function Turmas() {
  const { alunosCadastrados, turmas, plans } = useStore()
  const [novaTurma, setNovaTurma] = useState(false)

  const alunosDa = (t: Turma) =>
    alunosCadastrados.filter((a) => a.turma_id != null && String(a.turma_id) === String(t.id))

  const stats = (t: Turma) => {
    const ts = alunosDa(t)
    const conta = (nivel: string) => ts.filter((a) => a.ia_nivel_alerta === nivel).length
    return {
      ts,
      criticos: conta('CRITICO'),
      atencao: conta('ATENCAO'),
      regulares: conta('REGULAR'),
      pendentes: ts.filter((a) => !a.ia_nivel_alerta).length
    }
  }

  // Colunas reais da API. O estudante é identificado pelo RA, sem nome (LGPD).
  const CABECALHO = [
    'RA', 'Turma', 'Turno', 'Nível de alerta', 'Probabilidade de risco (%)', 'Recomendação', 'Plano de apoio'
  ]

  const linha = (a: AlunoApi) => {
    const p = probabilidade(a)
    return [
      a.numero_matricula,
      a.turma || 'Sem turma',
      a.turno || '',
      nivelDe(a),
      p != null ? p.toFixed(1) : '',
      (a.ia_recomendacao || '').replace(/[\r\n]+/g, ' '),
      plans[String(a.id)] ? 'Sim' : 'Não'
    ]
  }

  // Relatório gerencial por turma: resumo e estudantes prioritários (risco crítico).
  const relatorio = (t: Turma) => {
    const { ts, criticos, atencao, regulares, pendentes } = stats(t)
    const prioritarios = ts
      .filter((a) => a.ia_nivel_alerta === 'CRITICO')
      .sort((a, b) => (probabilidade(b) ?? 0) - (probabilidade(a) ?? 0))

    downloadCSV(`relatorio-turma-${slug(t.nome)}.csv`, [
      ['Relatório pedagógico', `Turma ${t.nome} (${t.turno})`],
      ['Estudantes', ts.length],
      ['Risco crítico', criticos],
      ['Atenção', atencao],
      ['Regular', regulares],
      ['Predição pendente', pendentes],
      ['Com plano de apoio', ts.filter((a) => plans[String(a.id)]).length],
      [],
      ['Estudantes prioritários (risco crítico)'],
      CABECALHO,
      ...prioritarios.map(linha)
    ])
  }

  const predicoes = (t: Turma | null) => {
    const lista = t ? alunosDa(t) : alunosCadastrados
    downloadCSV(
      t ? `predicoes-turma-${slug(t.nome)}.csv` : 'predicoes-todas-as-turmas.csv',
      [CABECALHO, ...lista.map(linha)]
    )
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">GESTÃO DE TURMAS</div>
          <h1>Turmas e acompanhamento.</h1>
          <p className="sub">Crie turmas, acompanhe o risco de cada uma e baixe relatórios pedagógicos.</p>
        </div>
      </div>

      <div className="toolbar" style={{ justifyContent: 'flex-start' }}>
        <div className="actions">
          <button className="btn" type="button" onClick={() => setNovaTurma(true)}>
            <Icon name="plus" /> Nova turma
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => predicoes(null)}
            disabled={!alunosCadastrados.length}
          >
            <Icon name="download" /> Exportar Predições
          </button>
        </div>
      </div>

      <div className="turma-grid">
        {turmas.length === 0 && (
          <section className="card">
            <p className="muted small">Nenhuma turma criada ainda. Use “Nova turma” para começar.</p>
          </section>
        )}

        {turmas.map((t) => {
          const { ts, criticos, atencao, regulares, pendentes } = stats(t)
          return (
            <section className="card turma" key={t.id}>
              <div className="turma-head">
                <span className="turma-icon" aria-hidden="true">
                  <Icon name="class" size={18} />
                </span>
                <div>
                  <h3>{t.nome.replace('ª ', 'ª Série ')}</h3>
                  <p className="muted small">{t.turno}</p>
                </div>
              </div>

              <div className="turma-stats">
                <div>
                  <b>{ts.length}</b>
                  <small>estudantes</small>
                </div>
                <div>
                  <b className={criticos ? 'red' : ''}>{criticos}</b>
                  <small>risco crítico · {pct(criticos, ts.length)}%</small>
                </div>
                <div>
                  <b className={atencao ? 'amber' : ''}>{atencao}</b>
                  <small>em atenção</small>
                </div>
              </div>

              {ts.length > 0 && (
                <div
                  className="turma-bar"
                  role="img"
                  aria-label={`${criticos} críticos, ${atencao} em atenção, ${regulares} regulares, ${pendentes} pendentes`}
                >
                  <i className="c" style={{ flex: criticos }} />
                  <i className="a" style={{ flex: atencao }} />
                  <i className="r" style={{ flex: regulares }} />
                  <i className="p" style={{ flex: pendentes }} />
                </div>
              )}

              <p className="turma-note">
                {ts.length
                  ? `${regulares} regular(es) · ${pendentes} com predição pendente`
                  : 'Sem estudantes cadastrados nesta turma.'}
              </p>

              <div className="turma-actions">
                <Link
                  className="link turma-open"
                  to={`/cadastro?turma=${encodeURIComponent(String(t.id))}`}
                >
                  Ver estudantes
                </Link>
                <div className="turma-dl">
                  <button type="button" onClick={() => relatorio(t)} disabled={!ts.length}>
                    <Icon name="download" size={13} /> Relatório
                  </button>
                  <button type="button" onClick={() => predicoes(t)} disabled={!ts.length}>
                    <Icon name="download" size={13} /> Predições
                  </button>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {novaTurma && <NovaTurma onClose={() => setNovaTurma(false)} />}

      <div className="notice">
        <Icon name="info" /> Relatórios e predições são estimativas de apoio à decisão. Compartilhe apenas com a equipe pedagógica e sem associar códigos a nomes fora do sistema (LGPD).
      </div>
    </main>
  )
}