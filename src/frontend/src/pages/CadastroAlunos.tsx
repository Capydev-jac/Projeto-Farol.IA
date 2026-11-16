import React, { useState, useMemo, useEffect } from 'react'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import NovoEstudanteForm from '../features/cadastro/NovoEstudanteForm'
import { useStore } from '../store'
import { api, type AlunoApi } from '../services/api'
import { alunoApiParaPredicao } from '../features/cadastro/alunoMapper'
import {
  decodificarEscolaridade,
  decodificarOcupacao,
  decodificarRenda,
  decodificarBens,
  decodificarFaixaEtaria
} from '../features/cadastro/formOptions'
import { linhasModelo } from '../features/cadastro/importacaoAlunos'
import { downloadCSV } from '../lib/utils'
import CadastroActions from '../features/cadastro/Cadastro'

// Visual styling helper for AI alerts
const BADGE_RISCO: Record<string, { label: string; classe: string }> = {
  CRITICO: { label: 'Crítico', classe: 'Elevado' },
  ATENCAO: { label: 'Atenção', classe: 'Atenção' },
  REGULAR: { label: 'Regular', classe: 'Menor' }
}

export default function CadastroAlunos() {
  const { alunosCadastrados, turmas, refresh, loading } = useStore()

  useEffect(() => {
    refresh()
  }, [refresh])

  // Filtros locais
  const [busca, setBusca] = useState('')
  const [turmaFiltro, setTurmaFiltro] = useState('')
  const [riscoFiltro, setRiscoFiltro] = useState('')
  const [sexoFiltro, setSexoFiltro] = useState('')

  // Modais e seleções
  const [modalNovo, setModalNovo] = useState(false)
  const [modalFicha, setModalFicha] = useState<AlunoApi | null>(null)
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

      // Filtro de risco
      if (riscoFiltro) {
        if (riscoFiltro === 'PENDENTE') {
          if (a.ia_nivel_alerta) return false
        } else if (a.ia_nivel_alerta !== riscoFiltro) {
          return false
        }
      }

      // Filtro de sexo
      if (sexoFiltro) {
        if (a.tp_sexo !== sexoFiltro) return false
      }

      return true
    })
  }, [alunosCadastrados, busca, turmaFiltro, riscoFiltro, sexoFiltro])

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
      if (modalFicha?.id === aluno.id) {
        // Atualiza a ficha aberta
        const atualizado = alunosCadastrados.find(a => a.id === aluno.id)
        if (atualizado) setModalFicha({ ...atualizado, ...res.aluno })
      }
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

  // Excluir aluno
  const excluirEstudante = async (aluno: AlunoApi) => {
    const confirmar = window.confirm(`Tem certeza que deseja excluir o cadastro do estudante "${aluno.nome}" (RA: ${aluno.numero_matricula})?`)
    if (!confirmar) return

    try {
      await api.excluirAluno(aluno.id)
      await refresh()
      if (modalFicha?.id === aluno.id) setModalFicha(null)
      notificar(`Estudante "${aluno.nome}" excluído com sucesso.`)
    } catch (err) {
      notificar(`Erro ao excluir: ${(err as Error).message}`, true)
    }
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

  return (
    <main className="page">
      {/* Cabeçalho da página */}
      <div className="page-head">
        <div>
          <div className="eyebrow">GESTÃO DE ESTUDANTES · BANCO DE DADOS FAROL.IA</div>
          <h1>Cadastro de Alunos</h1>
          <p className="sub">
            Módulo oficial de registro socioeconômico. Estruturado conforme as 15 variáveis preditivas do LightGBM (ENEM 2023) e armazenado no PostgreSQL.
          </p>
        </div>

        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={() => downloadCSV('modelo-importacao-farol-ia.csv', linhasModelo())}
            title="Baixar planilha de exemplo para preenchimento em lote"
          >
            <Icon name="download" />
            Modelo CSV
          </button>

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

          <button
            type="button"
            className="btn teal"
            onClick={() => setModalNovo(true)}
          >
            <Icon name="plus" />
            Novo Aluno
          </button>
        </div>
      </div>

      {/* Notificações e feedback */}
      {mensagemSucesso && (
        <div className="form-msg ok" style={{ margin: 0 }}>
          {mensagemSucesso}
        </div>
      )}
      {mensagemErro && (
        <div className="form-msg err" style={{ margin: 0 }}>
          {mensagemErro}
        </div>
      )}

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

      {/* Cartões de estatísticas (Stat Strip) */}
      <section className="card stat-strip">
        <div>
          <b>{total}</b>
          <span>alunos cadastrados</span>
        </div>
        <div>
          <b className="red">{criticos}</b>
          <span>risco crítico</span>
        </div>
        <div>
          <b className="amber">{atencao}</b>
          <span>em atenção</span>
        </div>
        <div>
          <b className="teal">{regulares}</b>
          <span>situação regular</span>
        </div>
        <div>
          <b style={{ color: pendentes > 0 ? '#8a6d3b' : 'var(--muted)' }}>
            {pendentes}
          </b>
          <span>predição pendente</span>
        </div>
      </section>

      {/* Barra de ferramentas e ações secundárias */}
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CadastroActions compact />

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
            <button
              type="button"
              className="link plain small"
              onClick={() => setBusca('')}
            >
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

        <select
          aria-label="Filtrar por Sexo"
          value={sexoFiltro}
          onChange={(e) => setSexoFiltro(e.target.value)}
        >
          <option value="">Sexo: Todos</option>
          <option value="F">Feminino</option>
          <option value="M">Masculino</option>
        </select>
      </div>

      {/* Tabela de alunos cadastrados */}
      <section className="card table-card">
        <div className="tabs">
          <button type="button" className="on">
            Estudantes Cadastrados
            <em>{filtrados.length}</em>
          </button>

          <span className="muted small">
            Base oficial: tabela <code>alunos</code> · PostgreSQL
          </span>
        </div>

        <table className="students">
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
              <th>Estudante / RA</th>
              <th>Turma</th>
              <th>Perfil</th>
              <th>Família / Renda</th>
              <th>Infraestrutura & Bens</th>
              <th>Avaliação da IA</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="empty">
                  Carregando lista de alunos cadastrados...
                </td>
              </tr>
            )}

            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  {alunosCadastrados.length === 0
                    ? 'Nenhum estudante cadastrado no banco de dados ainda. Clique em "Novo Aluno" para começar.'
                    : 'Nenhum estudante corresponde aos filtros selecionados.'}
                </td>
              </tr>
            )}

            {!loading && filtrados.map(a => {
              const isSelected = selectedIds.has(a.id)
              const isCalculando = calculandoIds.has(a.id)
              const badge = a.ia_nivel_alerta ? BADGE_RISCO[a.ia_nivel_alerta] : null

              return (
                <tr key={a.id} className={isSelected ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(a.id)}
                      aria-label={`Selecionar ${a.nome}`}
                    />
                  </td>

                  <td>
                    <button
                      type="button"
                      className="link plain"
                      style={{ textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}
                      onClick={() => setModalFicha(a)}
                    >
                      {a.nome}
                    </button>
                    <div className="muted small">
                      RA {a.numero_matricula}
                    </div>
                  </td>

                  <td>
                    {a.turma ? (
                      <>
                        <b>{a.turma}</b>
                        <div className="muted small">{a.turno || 'Turno não informado'}</div>
                      </>
                    ) : (
                      <span className="muted small">Sem turma</span>
                    )}
                  </td>

                  <td>
                    <span>
                      {a.tp_sexo === 'F' ? 'Feminino' : a.tp_sexo === 'M' ? 'Masculino' : '—'}
                    </span>
                    <div className="muted small">
                      {decodificarFaixaEtaria(a.tp_faixa_etaria)}
                    </div>
                  </td>

                  <td>
                    <div>{decodificarRenda(a.q006_renda_familiar)}</div>
                    <div className="muted small">
                      {a.q005_tamanho_familia ? `${a.q005_tamanho_familia} moradores` : 'Família não informada'}
                    </div>
                  </td>

                  <td>
                    <div className="small">
                      {a.conectividade ? 'Internet ativa' : 'Sem conexão'} · {a.veiculo_proprio ? 'Veículo' : 'Sem veículo'}
                    </div>
                    <div className="muted small">
                      Celulares: {decodificarBens(a.q022_celulares)} · Quartos: {decodificarBens(a.q009_quartos)}
                    </div>
                  </td>

                  <td>
                    {badge ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className={`tag ${badge.classe}`}>
                          {badge.label}
                        </span>
                        {a.ia_probabilidade_risco != null && (
                          <span className="small muted">
                            Risco: <b>{Number(a.ia_probabilidade_risco).toFixed(1)}%</b>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => setModalFicha(a)}
                        title="Ver ficha completa do estudante"
                      >
                        Ver ficha
                      </button>

                      <button
                        type="button"
                        className="btn sm"
                        style={{ color: 'var(--red)' }}
                        onClick={() => excluirEstudante(a)}
                        title="Excluir estudante do banco"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Rodapé da tabela */}
        <div className="table-foot">
          <span className="muted small">
            Exibindo {filtrados.length} de {alunosCadastrados.length} estudante(s) cadastrado(s)
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

      {/* Modal de Novo Aluno */}
      {modalNovo && (
        <NovoEstudanteForm
          onClose={() => {
            setModalNovo(false)
            refresh()
          }}
        />
      )}

      {/* Modal Ficha Completa do Aluno */}
      {modalFicha && (
        <Modal
          title={`Ficha do Estudante: ${modalFicha.nome}`}
          subtitle={`RA / Matrícula: ${modalFicha.numero_matricula} · Código no banco: #${modalFicha.id}`}
          size="lg"
          onClose={() => setModalFicha(null)}
          footer={
            <>
              <div className="foot-info">
                Cadastrado em: {modalFicha.data_cadastro ? new Date(modalFicha.data_cadastro).toLocaleString('pt-BR') : 'Data não informada'}
              </div>
              <div className="foot-actions">
                <button
                  type="button"
                  className="btn"
                  style={{ color: 'var(--red)' }}
                  onClick={() => excluirEstudante(modalFicha)}
                >
                  Excluir Aluno
                </button>
                <button
                  type="button"
                  className="btn teal"
                  onClick={() => calcularIAIndividual(modalFicha)}
                  disabled={calculandoIds.has(modalFicha.id)}
                >
                  <Icon name="spark" />
                  {modalFicha.ia_nivel_alerta ? 'Recalcular IA' : 'Calcular Risco (IA)'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setModalFicha(null)}
                >
                  Fechar
                </button>
              </div>
            </>
          }
        >
          <div className="form" style={{ gap: 16 }}>
            {/* Bloco de Predição da IA */}
            {modalFicha.ia_nivel_alerta ? (
              <div
                className={`risk-card ${
                  modalFicha.ia_nivel_alerta === 'CRITICO'
                    ? 'red'
                    : modalFicha.ia_nivel_alerta === 'ATENCAO'
                    ? 'amber'
                    : 'green'
                }`}
              >
                <div>
                  <span className="risk-label">Probabilidade de Risco</span>
                  <span className="risk-pct">
                    {modalFicha.ia_probabilidade_risco != null
                      ? `${Number(modalFicha.ia_probabilidade_risco).toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
                <div>
                  <span
                    className={`tag big ${BADGE_RISCO[modalFicha.ia_nivel_alerta]?.classe || ''}`}
                    style={{ marginLeft: 0 }}
                  >
                    Nível {BADGE_RISCO[modalFicha.ia_nivel_alerta]?.label || modalFicha.ia_nivel_alerta}
                  </span>
                  <p>{modalFicha.ia_recomendacao || 'Sem recomendação registrada.'}</p>
                  <span className="risk-model">
                    Modelo: {modalFicha.ia_versao_modelo || 'LightGBM Top 15'} · Data da predição:{' '}
                    {modalFicha.ia_data_predicao
                      ? new Date(modalFicha.ia_data_predicao).toLocaleString('pt-BR')
                      : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="ia-hint">
                <Icon name="spark" size={24} />
                <div style={{ flex: 1 }}>
                  <b>Classificação de IA Pendente</b>
                  <p className="muted small">
                    Os 15 atributos necessários já estão no banco de dados. Clique em &quot;Calcular Risco (IA)&quot; para estimar a defasagem.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn teal sm"
                  onClick={() => calcularIAIndividual(modalFicha)}
                  disabled={calculandoIds.has(modalFicha.id)}
                >
                  Calcular agora
                </button>
              </div>
            )}

            {/* Seção 1: Identificação & Turma */}
            <section className="form-section">
              <h4 className="sec-title">
                <span className="sec-num">1</span>
                Identificação & Matrícula
              </h4>
              <div className="form-grid">
                <div>
                  <span className="muted small">Nome Completo:</span>
                  <div><b>{modalFicha.nome}</b></div>
                </div>
                <div>
                  <span className="muted small">RA / Número de Matrícula:</span>
                  <div><code>{modalFicha.numero_matricula}</code></div>
                </div>
                <div>
                  <span className="muted small">Turma Vinculada:</span>
                  <div>{modalFicha.turma ? `${modalFicha.turma} (${modalFicha.turno || 'Turno não informado'})` : 'Sem turma associada'}</div>
                </div>
                <div>
                  <span className="muted small">Data do Cadastro:</span>
                  <div>{modalFicha.data_cadastro ? new Date(modalFicha.data_cadastro).toLocaleString('pt-BR') : '—'}</div>
                </div>
              </div>
            </section>

            {/* Seção 2: Perfil Demográfico */}
            <section className="form-section">
              <h4 className="sec-title">
                <span className="sec-num">2</span>
                Perfil Demográfico
              </h4>
              <div className="form-grid">
                <div>
                  <span className="muted small">Faixa Etária (TP_FAIXA_ETARIA):</span>
                  <div><b>{decodificarFaixaEtaria(modalFicha.tp_faixa_etaria)}</b> (Código: {modalFicha.tp_faixa_etaria})</div>
                </div>
                <div>
                  <span className="muted small">Sexo (TP_SEXO):</span>
                  <div><b>{modalFicha.tp_sexo === 'M' ? 'Masculino (M)' : modalFicha.tp_sexo === 'F' ? 'Feminino (F)' : '—'}</b></div>
                </div>
              </div>
            </section>

            {/* Seção 3: Contexto Familiar e Renda */}
            <section className="form-section">
              <h4 className="sec-title">
                <span className="sec-num">3</span>
                Contexto Familiar e Renda
              </h4>
              <div className="form-grid">
                <div>
                  <span className="muted small">Escolaridade do Pai (Q001):</span>
                  <div><b>{decodificarEscolaridade(modalFicha.q001_escolaridade_pai)}</b> (Letra: {modalFicha.q001_escolaridade_pai || '—'})</div>
                </div>
                <div>
                  <span className="muted small">Escolaridade da Mãe (Q002):</span>
                  <div><b>{decodificarEscolaridade(modalFicha.q002_escolaridade_mae)}</b> (Letra: {modalFicha.q002_escolaridade_mae || '—'})</div>
                </div>
                <div>
                  <span className="muted small">Ocupação do Pai (Q003):</span>
                  <div><b>{decodificarOcupacao(modalFicha.q003_ocupacao_pai)}</b> (Letra: {modalFicha.q003_ocupacao_pai || '—'})</div>
                </div>
                <div>
                  <span className="muted small">Ocupação da Mãe (Q004):</span>
                  <div><b>{decodificarOcupacao(modalFicha.q004_ocupacao_mae)}</b> (Letra: {modalFicha.q004_ocupacao_mae || '—'})</div>
                </div>
                <div>
                  <span className="muted small">Moradores na Residência (Q005):</span>
                  <div><b>{modalFicha.q005_tamanho_familia ?? '—'} pessoa(s)</b></div>
                </div>
                <div>
                  <span className="muted small">Renda Familiar Mensal (Q006):</span>
                  <div><b>{decodificarRenda(modalFicha.q006_renda_familiar)}</b></div>
                </div>
              </div>
            </section>

            {/* Seção 4: Infraestrutura, Bens e Conectividade */}
            <section className="form-section">
              <h4 className="sec-title">
                <span className="sec-num">4</span>
                Infraestrutura, Bens e Conectividade
              </h4>
              <div className="form-grid">
                <div>
                  <span className="muted small">Quartos para dormir (Q009):</span>
                  <div><b>{decodificarBens(modalFicha.q009_quartos)}</b> (Letra: {modalFicha.q009_quartos || '—'})</div>
                </div>
                <div>
                  <span className="muted small">Máquinas de lavar roupa (Q014):</span>
                  <div><b>{decodificarBens(modalFicha.q014_maquina_lavar)}</b> (Letra: {modalFicha.q014_maquina_lavar || '—'})</div>
                </div>
                <div>
                  <span className="muted small">Televisores em cores (Q019):</span>
                  <div><b>{decodificarBens(modalFicha.q019_televisores)}</b> (Letra: {modalFicha.q019_televisores || '—'})</div>
                </div>
                <div>
                  <span className="muted small">Telefones celulares (Q022):</span>
                  <div><b>{decodificarBens(modalFicha.q022_celulares)}</b> (Letra: {modalFicha.q022_celulares || '—'})</div>
                </div>
                <div>
                  <span className="muted small">Veículo próprio (carro ou moto):</span>
                  <div><b>{modalFicha.veiculo_proprio === 1 ? 'Sim (1)' : 'Não (0)'}</b></div>
                </div>
                <div>
                  <span className="muted small">Geladeira / Freezer:</span>
                  <div><b>{modalFicha.refrigeracao === 1 ? 'Sim (1)' : 'Não (0)'}</b></div>
                </div>
                <div className="span-2">
                  <span className="muted small">Conectividade (computador ou internet):</span>
                  <div><b>{modalFicha.conectividade === 1 ? 'Sim (1)' : 'Não (0)'}</b></div>
                </div>
              </div>
            </section>
          </div>
        </Modal>
      )}
    </main>
  )
}
