
import React, { useEffect, useState } from 'react'
import Icon from '../Icon.jsx'
import { useStore } from '../store.jsx'
import { api } from '../services/api.js'
import { downloadCSV } from '../utils.js'

const PER_PAGE = 8

const formatar = valor =>
  Number(valor || 0).toLocaleString('pt-BR')

const nota = valor => {
  if (valor == null || String(valor).trim() === '') {
    return '—'
  }

  const numero = Number(String(valor).replace(',', '.'))

  return Number.isFinite(numero)
    ? numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })
    : '—'
}

export default function Students() {
  const {
    enemResumo,
    enemParticipantes,
    loading: loadingStore
  } = useStore()

  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [busca, setBusca] = useState('')

  const total = Number(
    enemResumo?.total_participantes || 0
  )

  const pages = Math.max(
    1,
    Math.ceil(total / PER_PAGE)
  )

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setLoading(true)
      setError('')

      try {
        const resposta = await api.enemParticipantes(
          page,
          PER_PAGE
        )

        if (ativo) {
          setRows(resposta.participantes || [])
        }
      } catch (e) {
        if (ativo) {
          setRows([])
          setError(e.message)
        }
      } finally {
        if (ativo) setLoading(false)
      }
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [page])

  const filtrados = rows.filter(p =>
    !busca ||
    String(p.inscricao || '').includes(busca)
  )

  const toggle = id => {
    setSelected(current => {
      const novo = new Set(current)
      novo.has(id) ? novo.delete(id) : novo.add(id)
      return novo
    })
  }

  const allChecked =
    filtrados.length > 0 &&
    filtrados.every(p => selected.has(p.inscricao))

  const toggleAll = () => {
    setSelected(current => {
      const novo = new Set(current)

      filtrados.forEach(p => {
        if (allChecked) novo.delete(p.inscricao)
        else novo.add(p.inscricao)
      })

      return novo
    })
  }

  const exportList = () => {
    const selecionados = filtrados.filter(p =>
      selected.has(p.inscricao)
    )

    const lista = selecionados.length
      ? selecionados
      : filtrados

    downloadCSV('participantes-enem-2023.csv', [
      [
        'Inscricao',
        'Ano',
        'Faixa etaria',
        'Sexo',
        'Tipo escola',
        'UF prova',
        'Nota CN',
        'Nota CH',
        'Nota LC',
        'Nota MT',
        'Nota Redacao'
      ],
      ...lista.map(p => [
        p.inscricao,
        p.ano,
        p.faixa_etaria,
        p.sexo,
        p.tipo_escola,
        p.uf_prova,
        p.nota_cn,
        p.nota_ch,
        p.nota_lc,
        p.nota_mt,
        p.nota_redacao
      ])
    ])
  }

  const tipoEscola = codigo => ({
    '1': 'Não respondeu',
    '2': 'Pública',
    '3': 'Privada'
  }[codigo] || 'Não informada')

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            ACOMPANHAMENTO INDIVIDUAL
          </div>
          <h1>Estudantes, não apenas indicadores.</h1>
          <p className="sub">
            Registros reais de participantes do ENEM 2023,
            consultados diretamente no PostgreSQL.
          </p>
        </div>

        <button
          className="btn"
          type="button"
          onClick={exportList}
          disabled={!filtrados.length}
        >
          <Icon name="download" />
          Exportar página
          {selected.size ? ` (${selected.size} selecionados)` : ''}
        </button>
      </div>

      <section className="card stat-strip">
        <div>
          <b>
            {loadingStore ? '...' : formatar(total)}
          </b>
          <span>inscrições na base</span>
        </div>

        <div>
          <b>2023</b>
          <span>ano do ENEM</span>
        </div>

        <div>
          <b>—</b>
          <span>risco ainda não calculado</span>
        </div>
      </section>

      <div className="toolbar">
        <span className="muted small">
          Base de dados: ENEM 2023 · PostgreSQL
        </span>
      </div>

      <div className="filters-row">
        <label className="search">
          <Icon name="search" />
          <input
            placeholder="Buscar inscrição nesta página"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </label>

        <select
          aria-label="Fonte"
          defaultValue="enem"
        >
          <option value="enem">Microdados ENEM</option>
        </select>

        <select
          aria-label="Período"
          defaultValue="2023"
        >
          <option value="2023">ENEM · 2023</option>
        </select>
      </div>

      <div className="chips-row">
        <div>
          <span className="chip">
            Dados reais · ENEM 2023
          </span>
          <span className="chip">
            Sem previsões de risco
          </span>
        </div>

        <span className="muted small">
          <Icon name="shieldsmall" size={12} />
          Dados para análise acadêmica
        </span>
      </div>

      {error && (
        <div className="notice">
          <Icon name="info" />
          Erro ao consultar participantes: {error}
        </div>
      )}

      <section className="card table-card">
        <div className="tabs">
          <button type="button" className="on">
            Participantes
            <em>{formatar(total)}</em>
          </button>

          <span className="muted small">
            Notas observadas · sem estimativas
          </span>
        </div>

        <table className="students">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
              <th>Inscrição</th>
              <th>Escola</th>
              <th>UF</th>
              <th>Matemática</th>
              <th>Redação</th>
              <th>Risco</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {filtrados.map(p => (
              <tr key={p.inscricao}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(p.inscricao)}
                    onChange={() => toggle(p.inscricao)}
                    aria-label={`Selecionar ${p.inscricao}`}
                  />
                </td>

                <td>
                  <span className="id">
                    {p.inscricao}
                  </span>
                  <div className="muted small">
                    Inscrição ENEM
                  </div>
                </td>

                <td>
                  {tipoEscola(p.tipo_escola)}
                </td>

                <td>
                  {p.uf_prova || '—'}
                </td>

                <td>
                  <b>{nota(p.nota_mt)}</b>
                  <div className="muted small">
                    Nota observada
                  </div>
                </td>

                <td>
                  <b>{nota(p.nota_redacao)}</b>
                  <div className="muted small">
                    Nota observada
                  </div>
                </td>

                <td>
                  <span className="muted">
                    Pendente
                  </span>
                </td>

                <td className="go">
                  <Icon name="chev" size={14} />
                </td>
              </tr>
            ))}

            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan="8" className="empty">
                  Nenhum registro encontrado nesta página.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan="8" className="empty">
                  Carregando participantes...
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="table-foot">
          <span className="muted small">
            {total === 0
              ? 'Nenhuma inscrição carregada'
              : `Exibindo ${formatar((page - 1) * PER_PAGE + 1)}–${formatar(Math.min(page * PER_PAGE, total))} de ${formatar(total)} inscrições`}
          </span>

          <div className="pager">
            <span className="muted small">
              {PER_PAGE} por página
            </span>

            <button
              className="btn sm"
              type="button"
              disabled={page === 1 || loading}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </button>

            <span className="page-num">
              {page}
            </span>

            <button
              className="btn sm"
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      </section>

      <section className="cta">
        <span className="cta-icon">
          <Icon name="chat" size={18} />
        </span>

        <div>
          <strong>
            O próximo passo é uma conversa, não um rótulo.
          </strong>
          <p>
            As informações do ENEM já estão disponíveis
            para análise. A classificação de risco e os
            planos de apoio serão integrados futuramente.
          </p>
        </div>

        <button
          className="btn teal"
          type="button"
          disabled
        >
          <Icon name="arrow" />
          Modelo pendente
        </button>
      </section>

      <div className="notice">
        <Icon name="info" />
        As notas exibidas são resultados observados no ENEM.
        Nenhuma previsão ou classificação de risco foi gerada.
      </div>

      <footer className="foot">
        <span>
          Microdados ENEM 2023 · PostgreSQL
        </span>
        <span>
          Farol.IA · FATEC Jacareí
        </span>
      </footer>
    </main>
  )
}
