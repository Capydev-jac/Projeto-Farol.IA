import React, { useState, useMemo, useEffect } from 'react'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { api, type AlunoApi } from '../services/api'
import { alunoApiParaPredicao } from '../features/cadastro/alunoMapper'
import { downloadCSV } from '../lib/utils'
import CadastroActions from '../features/cadastro/Cadastro'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

// Visual styling helper for AI alerts
const BADGE_RISCO: Record<string, { label: string; classe: string }> = {
  CRITICO: { label: 'Crítico', classe: 'Elevado' },
  ATENCAO: { label: 'Atenção', classe: 'Atenção' },
  REGULAR: { label: 'Regular', classe: 'Menor' }
}

// Prioridade na listagem: crítico primeiro, pendente por último
const ORDEM_RISCO: Record<string, number> = { CRITICO: 0, ATENCAO: 1, REGULAR: 2 }

// Recortes que a Visão geral abre via /cadastro?foco=...
const FOCOS: Record<string, string> = {
  semplano: 'Risco crítico sem plano de apoio',
  atencaosemplano: 'Em atenção, sem plano de apoio',
  semconectividade: 'Em risco, sem computador ou internet'
}

export default function CadastroAlunos() {
  const { alunosCadastrados, turmas, plans, refresh, loading } = useStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    refresh()
  }, [refresh])

  // Filtros locais
  const [busca, setBusca] = useState('')
  // Permite abrir já filtrado: /cadastro?turma=<id> (usado na tela de Turmas e na Visão geral)
  const [turmaFiltro, setTurmaFiltro] = useState(searchParams.get('turma') ?? '')
  const turmaDaUrl = searchParams.get('turma') ?? ''
  // Mantém o filtro em sincronia se a URL mudar (ex.: voltar de Turmas para outra turma)
  useEffect(() => {
    setTurmaFiltro(turmaDaUrl)
  }, [turmaDaUrl])

  // Idem para o risco: /cadastro?risco=CRITICO | ATENCAO | REGULAR | PENDENTE
  const riscoDaUrl = searchParams.get('risco') ?? ''
  const [riscoFiltro, setRiscoFiltro] = useState(riscoDaUrl)
  useEffect(() => {
    setRiscoFiltro(riscoDaUrl)
  }, [riscoDaUrl])

  // Recorte vindo da Visão geral: /cadastro?foco=semplano | atencaosemplano | semconectividade
  const foco = searchParams.get('foco') ?? ''
  const limparFoco = () => {
    const p = new URLSearchParams(searchParams)
    p.delete('foco')
    setSearchParams(p)
  }

  // Edição e seleções
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [calculandoIds, setCalculandoIds] = useState<Set<number>>(new Set())
  const [executandoLote, setExecutandoLote] = useState(false)
  const [progressoLote, setProgressoLote] = useState<{ total: number; concluidos: number } | null>(null)

  // Mensagens de feedback
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)

  const notificar = (msg: string, erro = false) => {
    if (erro) {
      setMensagemErro(msg)
      setTimeout(() => setMensagemErro(null), 6000)
    } else {
      setMensagemSucesso(msg)
      setTimeout(() => setMensagemSucesso(null), 5000)
    }
  }

  // Estatísticas dos alunos cadastrados
  const total = alunosCadastrados.length
  const criticos = alunosCadastrados.filter(a => a.ia_nivel_alerta === 'CRITICO').length
  const atencao = alunosCadastrados.filter(a => a.ia_nivel_alerta === 'ATENCAO').length
  const regulares = alunosCadastrados.filter(a => a.ia_nivel_alerta === 'REGULAR').length
  const pendentes = alunosCadastrados.filter(a => !a.ia_nivel_alerta).length

  // Filtragem da lista
  const filtrados = useMemo(() => {
    return alunosCadastrados.filter(a => {
      // Busca por nome ou RA
      if (busca.trim()) {
        const termo = busca.trim().toLowerCase()
        const matchNome = (a.nome || '').toLowerCase().includes(termo)
        const matchRa = (a.numero_matricula || '').toLowerCase().includes(termo)
        if (!matchNome && !matchRa) return false
      }

      // Filtro de turma
      if (turmaFiltro) {
        if (String(a.turma_id ?? '') !== turmaFiltro) return false
      }

      // Recortes da Visão geral
      if (foco === 'semplano' && !(a.ia_nivel_alerta === 'CRITICO' && !plans[String(a.id)])) return false
      if (foco === 'atencaosemplano' && !(a.ia_nivel_alerta === 'ATENCAO' && !plans[String(a.id)])) return false
      if (
        foco === 'semconectividade' &&
        !((a.ia_nivel_alerta === 'CRITICO' || a.ia_nivel_alerta === 'ATENCAO') &&
          a.conectividade != null && Number(a.conectividade) === 0)
      ) return false

      // Filtro de risco
      if (riscoFiltro) {
        if (riscoFiltro === 'PENDENTE') {
          if (a.ia_nivel_alerta) return false
        } else if (a.ia_nivel_alerta !== riscoFiltro) {
          return false
        }
      }

      return true
    }).sort((x, y) => {
      const ox = x.ia_nivel_alerta ? ORDEM_RISCO[x.ia_nivel_alerta] : 3
      const oy = y.ia_nivel_alerta ? ORDEM_RISCO[y.ia_nivel_alerta] : 3
      if (ox !== oy) return ox - oy
      const dp = Number(y.ia_probabilidade_risco ?? 0) - Number(x.ia_probabilidade_risco ?? 0)
      return dp || (x.nome || '').localeCompare(y.nome || '', 'pt-BR')
    })
  }, [alunosCadastrados, busca, turmaFiltro, riscoFiltro, foco, plans])

  // Seleção múltipla
  const toggleSelect = (id: number) => {
    setSelectedIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = filtrados.length > 0 && filtrados.every(a => selectedIds.has(a.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtrados.map(a => a.id)))
    }
  }

  // Executar predição individual via IA
  const calcularIAIndividual = async (aluno: AlunoApi) => {
    setCalculandoIds(prev => new Set(prev).add(aluno.id))
    try {
      const payload = alunoApiParaPredicao(aluno)
      const res = await api.preverRisco(payload)
      await refresh()
      notificar(`Predição calculada com sucesso para ${aluno.nome}! Nível: ${res.resultado.nivel_alerta} (${res.resultado.probabilidade_percentual.toFixed(1)}%).`)
    } catch (err) {
      notificar(`Erro ao calcular IA para ${aluno.nome}: ${(err as Error).message}`, true)
    } finally {
      setCalculandoIds(prev => {
        const next = new Set(prev)
        next.delete(aluno.id)
        return next
      })
    }
  }

  // Executar predição em lote para selecionados ou todos os pendentes
  const calcularIALote = async (somentePendentes = false) => {
    const alvos = somentePendentes
      ? alunosCadastrados.filter(a => !a.ia_nivel_alerta)
      : filtrados.filter(a => selectedIds.has(a.id))

    if (!alvos.length) {
      notificar('Nenhum aluno selecionado para processamento de IA.', true)
      return
    }

    setExecutandoLote(true)
    setProgressoLote({ total: alvos.length, concluidos: 0 })

    let sucessos = 0
    let falhas = 0

    for (let i = 0; i < alvos.length; i++) {
      const aluno = alvos[i]
      try {
        const payload = alunoApiParaPredicao(aluno)
        await api.preverRisco(payload)
        sucessos++
      } catch (err) {
        console.error(`Falha no cálculo de IA para ${aluno.numero_matricula}:`, err)
        falhas++
      }
      setProgressoLote({ total: alvos.length, concluidos: i + 1 })
    }

    await refresh()
    setExecutandoLote(false)
    setProgressoLote(null)
    setSelectedIds(new Set())
    notificar(`Processamento concluído: ${sucessos} calculado(s) com sucesso${falhas > 0 ? `, ${falhas} falha(s)` : ''}.`)
  }

  // Exportar dados cadastrais para CSV
  const exportarCSV = () => {
    const lista = selectedIds.size > 0
      ? filtrados.filter(a => selectedIds.has(a.id))
      : filtrados

    if (!lista.length) return

    const cabecalho = [
      'ID', 'Matricula_RA', 'Nome', 'Turma', 'Turno',
      'Faixa_Etaria', 'Sexo', 'Escolaridade_Pai', 'Escolaridade_Mae',
      'Ocupacao_Pai', 'Ocupacao_Mae', 'Tamanho_Familia', 'Renda_Familiar',
      'Quartos', 'Maquina_Lavar', 'Televisores', 'Celulares',
      'Veiculo_Proprio', 'Refrigeracao', 'Conectividade',
      'IA_Nivel_Alerta', 'IA_Probabilidade_Risco', 'IA_Risco_Defasagem',
      'IA_Recomendacao', 'Data_Cadastro'
    ]

    const linhas = lista.map(a => [
      a.id,
      a.numero_matricula,
      a.nome,
      a.turma || '',
      a.turno || '',
      a.tp_faixa_etaria ?? '',
      a.tp_sexo ?? '',
      a.q001_escolaridade_pai ?? '',
      a.q002_escolaridade_mae ?? '',
      a.q003_ocupacao_pai ?? '',
      a.q004_ocupacao_mae ?? '',
      a.q005_tamanho_familia ?? '',
      a.q006_renda_familiar ?? '',
      a.q009_quartos ?? '',
      a.q014_maquina_lavar ?? '',
      a.q019_televisores ?? '',
      a.q022_celulares ?? '',
      a.veiculo_proprio ?? '',
      a.refrigeracao ?? '',
      a.conectividade ?? '',
      a.ia_nivel_alerta || 'PENDENTE',
      a.ia_probabilidade_risco ? `${a.ia_probabilidade_risco}%` : '',
      a.ia_risco_defasagem ?? '',
      (a.ia_recomendacao || '').replace(/[\r\n]+/g, ' '),
      a.data_cadastro ? new Date(a.data_cadastro).toLocaleDateString('pt-BR') : ''
    ])

    downloadCSV('alunos-cadastrados-farol-ia.csv', [cabecalho, ...linhas])
  }

  const STATS = [
    { key: '', label: 'alunos cadastrados', valor: total, cls: '' },
    { key: 'CRITICO', label: 'risco crítico', valor: criticos, cls: 'red' },
    { key: 'ATENCAO', label: 'em atenção', valor: atencao, cls: 'amber' },
    { key: 'REGULAR', label: 'situação regular', valor: regulares, cls: 'teal' },
    { key: 'PENDENTE', label: 'predição pendente', valor: pendentes, cls: '' }
  ]

  return (
    <main className="page">
      {/* Cabeçalho da página */}
      <div className="page-head">
        <div>
          <div className="eyebrow">GESTÃO DE ESTUDANTES</div>
          <h1>Estudantes</h1>
          <p className="sub">
            Acompanhe o risco de cada estudante e abra a ficha para ver os detalhes.
          </p>
        </div>
      </div>

      {/* Notificações e feedback */}
      {mensagemSucesso && <div className="form-msg ok">{mensagemSucesso}</div>}
      {mensagemErro && <div className="form-msg err">{mensagemErro}</div>}

      {/* Barra de progresso para lote */}
      {executandoLote && progressoLote && (
        <div className="card" style={{ background: '#f0f9f8', border: '1px solid #c2e5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 600 }}>
            <span>Processando predições de IA em lote...</span>
            <span>{progressoLote.concluidos} de {progressoLote.total}</span>
          </div>
          <span className="progress-bar big" style={{ width: '100%' }}>
            <i style={{ width: `${(progressoLote.concluidos / Math.max(progressoLote.total, 1)) * 100}%` }} />
          </span>
        </div>
      )}

      {/* Indicadores (clicáveis: filtram a lista por situação) */}
      <section className="card lista-stats">
        {STATS.map(st =>
          st.key ? (
            <button
              type="button"
              key={st.label}
              className={'lista-stat' + (riscoFiltro === st.key ? ' on' : '')}
              aria-pressed={riscoFiltro === st.key}
              onClick={() => setRiscoFiltro(riscoFiltro === st.key ? '' : st.key)}
            >
              <b className={st.cls}>{st.valor}</b>
              <span>{st.label}</span>
            </button>
          ) : (
            <div key={st.label} className="lista-stat static">
              <b>{st.valor}</b>
              <span>{st.label}</span>
            </div>
          )
        )}
      </section>

      {/* Ações */}
      <div className="toolbar lista-toolbar">
        <div className="actions">
          <CadastroActions compact />

          <button
            type="button"
            className="btn"
            onClick={exportarCSV}
            disabled={!filtrados.length}
            title="Exportar alunos listados para CSV"
          >
            <Icon name="download" />
            Exportar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </button>
        </div>

        {pendentes > 0 && (
          <button
            type="button"
            className="btn teal sm"
            onClick={() => calcularIALote(true)}
            disabled={executandoLote}
          >
            <Icon name="spark" />
            Calcular IA para {pendentes} pendente(s)
          </button>
        )}
      </div>

      {/* Filtros de busca */}
      <div className="filters-row">
        <label className="search">
          <Icon name="search" />
          <input
            placeholder="Buscar por nome do aluno ou RA/matrícula..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button type="button" className="link plain small" onClick={() => setBusca('')}>
              Limpar
            </button>
          )}
        </label>

        <select
          aria-label="Filtrar por Turma"
          value={turmaFiltro}
          onChange={(e) => setTurmaFiltro(e.target.value)}
        >
          <option value="">Todas as turmas</option>
          {turmas.map(t => (
            <option key={t.id} value={String(t.id)}>
              {t.nome} {t.turno ? `(${t.turno})` : ''}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por Situação IA"
          value={riscoFiltro}
          onChange={(e) => setRiscoFiltro(e.target.value)}
        >
          <option value="">Todos os status de risco</option>
          <option value="CRITICO">Risco Crítico</option>
          <option value="ATENCAO">Atenção</option>
          <option value="REGULAR">Regular</option>
          <option value="PENDENTE">Predição Pendente</option>
        </select>
      </div>

      {/* Recorte ativo vindo da Visão geral */}
      {FOCOS[foco] && (
        <div className="chips-row">
          <div>
            <span className="chip">
              {FOCOS[foco]}{' '}
              <button type="button" aria-label="Remover filtro" onClick={limparFoco}>×</button>
            </span>
          </div>
        </div>
      )}

      {/* Lista de estudantes */}
      <section className="card table-card">
        <div className="tabs">
          <button type="button" className="on">
            Estudantes
            <em>{filtrados.length}</em>
          </button>

          <span className="muted small">Ordenados por prioridade de risco</span>
        </div>

        <table className="students lista">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todos os alunos listados"
                />
              </th>
              <th>Estudante</th>
              <th>Turma</th>
              <th>Risco</th>
              <th>Plano</th>
              <th style={{ width: 110 }} />
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="empty">
                  Carregando lista de alunos cadastrados...
                </td>
              </tr>
            )}

            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  {alunosCadastrados.length === 0
                    ? 'Nenhum estudante cadastrado no banco de dados ainda. Clique em "Cadastrar estudante" para começar.'
                    : 'Nenhum estudante corresponde aos filtros selecionados.'}
                </td>
              </tr>
            )}

            {!loading && filtrados.map(a => {
              const isSelected = selectedIds.has(a.id)
              const isCalculando = calculandoIds.has(a.id)
              const badge = a.ia_nivel_alerta ? BADGE_RISCO[a.ia_nivel_alerta] : null
              const temPlano = Boolean(plans[String(a.id)])

              return (
                <tr
                  key={a.id}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => navigate(`/alunos/${a.id}`)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(a.id)}
                      aria-label={`Selecionar ${a.nome}`}
                    />
                  </td>

                  <td>
                    <div className="lista-nome">{a.nome}</div>
                    <div className="muted small">RA {a.numero_matricula}</div>
                  </td>

                  <td>
                    {a.turma ? (
                      <>
                        <div>{a.turma}</div>
                        {a.turno && <div className="muted small">{a.turno}</div>}
                      </>
                    ) : (
                      <span className="muted small">Sem turma</span>
                    )}
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    {badge ? (
                      <div className="lista-risco">
                        <span className={`tag ${badge.classe}`}>{badge.label}</span>
                        {a.ia_probabilidade_risco != null && (
                          <b>{Number(a.ia_probabilidade_risco).toFixed(1)}%</b>
                        )}
                      </div>
                    ) : (
                      <div className="lista-risco">
                        <span className="muted small">Pendente</span>
                        <button
                          type="button"
                          className="btn teal sm"
                          style={{ padding: '3px 7px', fontSize: 11 }}
                          onClick={() => calcularIAIndividual(a)}
                          disabled={isCalculando}
                          title="Executar predição do modelo LightGBM"
                        >
                          <Icon name="spark" size={12} />
                          {isCalculando ? 'Calculando…' : 'Calcular IA'}
                        </button>
                      </div>
                    )}
                  </td>

                  <td>
                    {temPlano ? (
                      <span className="tag Menor">Com plano</span>
                    ) : a.ia_nivel_alerta === 'CRITICO' || a.ia_nivel_alerta === 'ATENCAO' ? (
                      <span className="tag Atenção">Sem plano</span>
                    ) : (
                      <span className="muted small">—</span>
                    )}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <Link
                      className="link lista-open"
                      to={`/alunos/${a.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver ficha <Icon name="arrow" size={13} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Rodapé da tabela */}
        <div className="table-foot">
          <span className="muted small">
            Exibindo {filtrados.length} de {alunosCadastrados.length} estudante(s)
          </span>

          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="small muted">{selectedIds.size} selecionado(s)</span>
              <button
                type="button"
                className="btn teal sm"
                onClick={() => calcularIALote(false)}
                disabled={executandoLote}
              >
                <Icon name="spark" />
                Calcular IA nos selecionados
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}