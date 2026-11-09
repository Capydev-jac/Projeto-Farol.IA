
import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../Icon.jsx'
import { downloadCSV } from '../utils.js'
import { useStore } from '../store.jsx'

const formatar = valor =>
  Number(valor || 0).toLocaleString('pt-BR')

const nota = valor =>
  valor == null ? '—' : Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })

const AREAS = [
  { key: 'media_cn', name: 'Natureza' },
  { key: 'media_ch', name: 'Humanas' },
  { key: 'media_lc', name: 'Linguagens' },
  { key: 'media_mt', name: 'Matemática' }
]

function BarChart({ data }) {
  const W = 600, H = 190, L = 40, B = 24, T = 10
  const min = 0, max = 1000
  const y = v => T + (H - T - B) *
    (1 - Math.max(min, Math.min(max, v)) / max)
  const slot = (W - L) / data.length

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="chart"
      role="img"
      aria-label="Médias reais das notas do ENEM por área"
    >
      {[0, 250, 500, 750, 1000].map(t => (
        <g key={t}>
          <line
            x1={L} x2={W}
            y1={y(t)} y2={y(t)}
            className="grid-line"
          />
          <text
            x={L - 8}
            y={y(t) + 4}
            textAnchor="end"
            className="axis"
          >
            {t}
          </text>
        </g>
      ))}

      {data.map((a, i) => {
        const cx = L + slot * i + slot / 2
        const value = Number(a.value)

        return (
          <g key={a.key}>
            {a.value != null && (
              <>
                <rect
                  x={cx - 15}
                  y={y(value)}
                  width="30"
                  height={y(0) - y(value)}
                  rx="3"
                  className="bar-current"
                />
                <text
                  x={cx}
                  y={Math.max(12, y(value) - 5)}
                  textAnchor="middle"
                  className="bar-label"
                >
                  {Math.round(value)}
                </text>
              </>
            )}
            <text
              x={cx}
              y={H - 6}
              textAnchor="middle"
              className="axis"
            >
              {a.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Donut({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = 62
  const c = 2 * Math.PI * r
  let acc = 0

  return (
    <svg
      viewBox="0 0 160 160"
      className="donut"
      role="img"
      aria-label="Distribuição por tipo de escola"
    >
      <circle
        cx="80" cy="80" r={r}
        fill="none"
        stroke="#eef2f4"
        strokeWidth="18"
      />

      {total > 0 && data.map(d => {
        const len = d.value / total * c
        const el = (
          <circle
            key={d.label}
            cx="80" cy="80" r={r}
            fill="none"
            stroke={d.color}
            strokeWidth="18"
            strokeDasharray={`${Math.max(0, len - 2)} ${c - len + 2}`}
            strokeDashoffset={-acc}
            transform="rotate(-90 80 80)"
          />
        )
        acc += len
        return el
      })}

      <text
        x="80" y="82"
        textAnchor="middle"
        className="donut-total"
      >
        {formatar(total)}
      </text>
      <text
        x="80" y="98"
        textAnchor="middle"
        className="axis"
      >
        inscrições
      </text>
    </svg>
  )
}

export default function Overview() {
  const {
    enemResumo,
    enemEstatisticas,
    loading,
    error
  } = useStore()

  const total = Number(
    enemResumo?.total_participantes || 0
  )

  const areas = useMemo(() =>
    AREAS.map(a => ({
      ...a,
      value: enemResumo?.[a.key] ?? null
    })),
    [enemResumo]
  )

  const escolas = useMemo(() => {
    const cores = [
      '#0d7c78',
      '#d4a54a',
      '#c0504d',
      '#7695ae',
      '#a6a6a6'
    ]

    // Códigos de TP_ESCOLA do ENEM:
    // 1 = não respondeu, 2 = pública, 3 = privada.
    const nomes = {
      '1': 'Não respondeu',
      '2': 'Pública',
      '3': 'Privada'
    }

    return (enemEstatisticas?.tipo_escola || [])
      .map((item, i) => ({
        label: nomes[item.categoria] ||
          `Código ${item.categoria ?? 'não informado'}`,
        value: Number(item.total),
        color: cores[i % cores.length]
      }))
  }, [enemEstatisticas])

  const estados = enemEstatisticas?.estados || []

  const exportSummary = () => {
    downloadCSV('resumo-enem-farol-ia.csv', [
      ['Indicador', 'Valor'],
      ['Inscrições ENEM 2023', total],
      ['Média Ciências da Natureza', nota(enemResumo?.media_cn)],
      ['Média Ciências Humanas', nota(enemResumo?.media_ch)],
      ['Média Linguagens', nota(enemResumo?.media_lc)],
      ['Média Matemática', nota(enemResumo?.media_mt)],
      ['Média Redação', nota(enemResumo?.media_redacao)],
      [],
      ['Tipo de escola', 'Inscrições'],
      ...escolas.map(e => [e.label, e.value]),
      [],
      ['UF da prova', 'Inscrições'],
      ...estados.map(e => [e.categoria, e.total])
    ])
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">PANORAMA DA REDE</div>
          <h1>Enxergar cedo. Apoiar melhor.</h1>
          <p className="sub">
            Análise dos dados reais do ENEM 2023,
            armazenados no PostgreSQL.
          </p>
        </div>
        <button
          className="btn"
          type="button"
          onClick={exportSummary}
          disabled={!enemResumo}
        >
          <Icon name="download" /> Exportar resumo
        </button>
      </div>

      <div className="filters-row">
        <select aria-label="Período" defaultValue="2023">
          <option value="2023">ENEM · 2023</option>
        </select>
        <select aria-label="Base de dados" defaultValue="enem">
          <option value="enem">Microdados ENEM</option>
        </select>
        <select aria-label="Abrangência" defaultValue="brasil">
          <option value="brasil">Brasil</option>
        </select>
        <span className="muted right small">
          Fonte: PostgreSQL · ENEM 2023
        </span>
      </div>

      {error && (
        <div className="notice">
          <Icon name="info" /> Erro ao consultar API: {error}
        </div>
      )}

      <div className="grid-2">
        <section className="card kpi">
          <div className="kpi-top">
            Inscrições do ENEM <Icon name="users" />
          </div>
          <div className="kpi-value">
            {loading ? '...' : formatar(total)}
          </div>
          <div className="muted small">
            Registros importados no PostgreSQL
          </div>
        </section>

        <section className="card kpi">
          <div className="kpi-top">
            Média da redação
            <Icon name="book" />
          </div>
          <div className="kpi-value">
            {loading ? '...' : nota(enemResumo?.media_redacao)}
          </div>
          <div className="muted small">
            Média das notas disponíveis · ENEM 2023
          </div>
        </section>
      </div>

      <div className="grid-chart">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Desempenho no ENEM</h3>
              <p className="muted small">
                Médias reais por área · escala de pontos
              </p>
            </div>
            <Link className="link" to="/modelo">
              Sobre o modelo ↗
            </Link>
          </div>

          <div className="legend small muted">
            <span>
              <i className="sw teal" /> Média observada no ENEM
            </span>
          </div>

          {enemResumo ? (
            <BarChart data={areas} />
          ) : (
            <p className="empty">
              {loading
                ? 'Carregando dados do ENEM...'
                : 'Dados não disponíveis.'}
            </p>
          )}

          <p className="muted small">
            Notas observadas na base. Não são previsões
            de Machine Learning.
          </p>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>Distribuição por tipo de escola</h3>
              <p className="muted small">
                Classificação informada nos microdados
              </p>
            </div>
          </div>

          <div className="donut-wrap">
            <Donut data={escolas} />
            <ul className="risk-list">
              {escolas.map(e => (
                <li key={e.label}>
                  <i
                    className="dot"
                    style={{ background: e.color }}
                  />
                  <span>
                    {e.label}
                    <b>{formatar(e.value)}</b>
                  </span>
                  <em>
                    {total
                      ? (e.value / total * 100).toFixed(1)
                      : 0}%
                  </em>
                </li>
              ))}
            </ul>
          </div>

          <p className="muted small">
            Distribuição dos registros conforme a variável
            TP_ESCOLA.
          </p>
        </section>
      </div>

      <div className="grid-bottom">
        <section className="card">
          <h3>Onde agir agora</h3>
          <p className="muted small">
            Indicadores de acompanhamento
          </p>

          <div className="action">
            <div className="action-title amber">
              <Icon name="calendar" />
              Frequência escolar indisponível
            </div>
            <p className="muted small">
              A base do ENEM não contém frequência escolar
              individual. Este indicador será integrado
              quando houver dados apropriados.
            </p>
          </div>

          <div className="action">
            <div className="action-title">
              <Icon name="book" />
              Previsões ainda não disponíveis
            </div>
            <p className="muted small">
              A classificação de risco e as estimativas
              individuais serão implementadas na etapa
              de Machine Learning.
            </p>
            <Link className="link" to="/modelo">
              Conhecer a próxima etapa →
            </Link>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>Participantes por estado</h3>
              <p className="muted small">
                Local de realização da prova
              </p>
            </div>
            <Link className="link" to="/estudantes">
              Ver participantes ↗
            </Link>
          </div>

          <table className="mini-table">
            <thead>
              <tr>
                <th>UF</th>
                <th>Inscrições</th>
                <th>% da base</th>
              </tr>
            </thead>
            <tbody>
              {estados.slice(0, 8).map(e => (
                <tr key={e.categoria}>
                  <td>{e.categoria || 'Não informada'}</td>
                  <td>{formatar(e.total)}</td>
                  <td>
                    <b>
                      {total
                        ? (Number(e.total) / total * 100).toFixed(1)
                        : 0}%
                    </b>
                  </td>
                </tr>
              ))}
              {!estados.length && (
                <tr>
                  <td colSpan="3" className="empty">
                    Aguardando dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="muted small">
            Distribuição pela UF de realização do ENEM.
          </p>
        </section>
      </div>

      <div className="notice">
        <Icon name="info" />
        Os indicadores apresentados são estatísticas
        observadas no ENEM 2023. O sistema ainda não
        produz classificações de risco ou previsões.
      </div>

      <footer className="foot">
        <span>Dados reais do ENEM 2023 · PostgreSQL</span>
        <span>Farol.IA · FATEC Jacareí</span>
      </footer>
    </main>
  )
}
