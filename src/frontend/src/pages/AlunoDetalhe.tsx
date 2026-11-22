import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { api } from '../services/api'
import NovoEstudanteForm from '../features/cadastro/NovoEstudanteForm'
import { alunoApiParaPredicao } from '../features/cadastro/alunoMapper'
import PlanoModal from '../features/intervencao/PlanoModal'
import { textoDoPlano } from '../features/intervencao/planoTexto'

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
  const navigate = useNavigate()
  const { alunosCadastrados, plans, setPlan, refresh, loading } = useStore()

  const [editandoAluno, setEditandoAluno] = useState(false)
  const [editandoPlano, setEditandoPlano] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null)

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

  const plano = plans[String(aluno.id)]
  const textoPlano = textoDoPlano(plano)

  const salvarPlano = async (novo: { status: string; owners: string[] }) => {
    const r = await setPlan(String(aluno.id), novo)
    if (r.error) return r.error
    setEditandoPlano(false)
  }

  const calcularIA = async () => {
    setCalculando(true)
    setMensagem(null)

    try {
      const res = await api.preverRisco(alunoApiParaPredicao(aluno))
      await refresh()
      setMensagem({
        erro: false,
        texto: `Avaliação atualizada: nível ${res.resultado.nivel_alerta} (${res.resultado.probabilidade_percentual.toFixed(1)}%).`
      })
    } catch (err) {
      setMensagem({ erro: true, texto: `Erro ao calcular IA: ${(err as Error).message}` })
    } finally {
      setCalculando(false)
    }
  }

  const excluir = async () => {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir o cadastro do estudante "${aluno.nome}" (RA: ${aluno.numero_matricula})?`
    )
    if (!confirmar) return

    try {
      await api.excluirAluno(aluno.id)
      // A lista de cadastro recarrega os dados ao abrir.
      navigate('/cadastro')
    } catch (err) {
      setMensagem({ erro: true, texto: `Erro ao excluir: ${(err as Error).message}` })
    }
  }

  const dataBR = (d?: string | null, comHora = false) => {
    if (!d) return 'Não informada'
    const dt = new Date(d)
    return comHora ? dt.toLocaleString('pt-BR') : dt.toLocaleDateString('pt-BR')
  }

  const iniciais = aluno.nome
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .join('')
    .toUpperCase()

  const probabilidade =
    aluno.ia_probabilidade_risco != null
      ? Number(aluno.ia_probabilidade_risco)
      : null

  return (
    <main className="page ficha">

      {/* Navegação */}
      <div className="back">
        <Link to="/cadastro">
          <Icon name="back" size={12} />
          Cadastro de Alunos
        </Link>
        <span className="muted"> / {aluno.nome}</span>
      </div>

      {/* Cabeçalho */}
      <header className="card ficha-head">
        <span className="ficha-avatar" aria-hidden="true">{iniciais}</span>

        <div className="ficha-id">
          <div className="ficha-title">
            <h1>{aluno.nome}</h1>
            {badge && <span className={`tag ${badge.classe}`}>{badge.label}</span>}
          </div>

          <ul className="ficha-chips">
            {aluno.turma && <li><Icon name="class" size={13} />{aluno.turma}</li>}
            {aluno.turno && <li><Icon name="calendar" size={13} />{aluno.turno}</li>}
            <li><Icon name="clipboard" size={13} />RA {aluno.numero_matricula || '—'}</li>
          </ul>
        </div>

        <div className="ficha-actions">
          <button type="button" className="btn teal" onClick={calcularIA} disabled={calculando}>
            <Icon name="spark" />
            {calculando
              ? 'Calculando…'
              : aluno.ia_nivel_alerta
                ? 'Recalcular IA'
                : 'Calcular risco (IA)'}
          </button>
          <button type="button" className="btn" onClick={() => setEditandoAluno(true)}>
            <Icon name="edit" size={14} />
            Editar
          </button>
          <button type="button" className="btn danger" onClick={excluir} aria-label="Excluir cadastro">
            <Icon name="trash" size={14} />
            Excluir
          </button>
        </div>
      </header>

      {mensagem && (
        <div className={'form-msg ' + (mensagem.erro ? 'err' : 'ok')}>
          {mensagem.texto}
        </div>
      )}

      <div className="ficha-grid">

        {/* Coluna principal: o que exige ação */}
        <div className="ficha-col">

          {/* Avaliação da IA */}
          <section className="card">
            <div className="card-head">
              <div>
                <h3>Avaliação da inteligência artificial</h3>
                <p className="muted small">Estimativa de apoio à decisão, não um rótulo.</p>
              </div>
              <Icon name="spark" />
            </div>

            {badge ? (
              <div className={`ficha-risk ${riscoClasse}`}>
                <div className="ficha-risk-top">
                  <div>
                    <span className="ficha-eyebrow">Probabilidade de risco</span>
                    <span className="ficha-risk-pct">
                      {probabilidade != null ? `${probabilidade.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <span className={`tag big ${badge.classe}`}>{badge.label}</span>
                </div>

                <div
                  className="ficha-meter"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={probabilidade ?? 0}
                  aria-label="Probabilidade de risco"
                >
                  <i style={{ width: `${Math.min(100, Math.max(0, probabilidade ?? 0))}%` }} />
                </div>

                <p className="ficha-reco">
                  <b>Recomendação</b>
                  {aluno.ia_recomendacao || 'Nenhuma recomendação registrada.'}
                </p>

                <p className="ficha-meta">
                  Modelo {aluno.ia_versao_modelo || 'não informado'} · avaliado em {dataBR(aluno.ia_data_predicao, true)}
                </p>
              </div>
            ) : (
              <div className="ia-hint">
                <Icon name="spark" size={24} />
                <div style={{ flex: 1 }}>
                  <b>Classificação de IA pendente</b>
                  <p className="muted small">
                    Ainda não existe uma avaliação de risco registrada para este estudante.
                  </p>
                </div>
                <button type="button" className="btn teal sm" onClick={calcularIA} disabled={calculando}>
                  {calculando ? 'Calculando…' : 'Calcular agora'}
                </button>
              </div>
            )}
          </section>

          {/* Plano de acompanhamento */}
          <section className="card">
            <div className="card-head">
              <div>
                <h3>Plano de acompanhamento</h3>
                <p className="muted small">Revisar com o estudante e a equipe.</p>
              </div>
              <span className={'tag ' + (plano ? 'Menor' : 'Atenção')}>
                {plano ? plano.status || 'Em andamento' : 'Sem plano'}
              </span>
            </div>

            {plano && textoPlano ? (
              <p className="plan-text ficha-plan">{textoPlano}</p>
            ) : (
              <p className="ficha-empty">
                {plano
                  ? 'Plano registrado sem descrição. Use “Editar plano” para detalhar.'
                  : 'Este estudante ainda não possui plano de acompanhamento.'}
              </p>
            )}

            <div className="plan-foot">
              <span className="muted small">Planos são sugestões, não rótulos.</span>
              <button type="button" className="btn sm" onClick={() => setEditandoPlano(true)}>
                <Icon name={plano ? 'edit' : 'plus'} size={13} />
                {plano ? 'Editar plano' : 'Criar plano'}
              </button>
            </div>
          </section>
        </div>

        {/* Coluna lateral: dados de referência */}
        <aside className="ficha-col">

          <section className="card">
            <div className="card-head">
              <h3>Perfil do estudante</h3>
              <Icon name="user" />
            </div>

            <dl className="ficha-fields">
              <Field label="Faixa etária" value={decodificarFaixaEtaria(aluno.tp_faixa_etaria)} />
              <Field
                label="Sexo"
                value={aluno.tp_sexo === 'F' ? 'Feminino' : aluno.tp_sexo === 'M' ? 'Masculino' : 'Não informado'}
              />
              <Field label="Cadastrado em" value={dataBR(aluno.data_cadastro)} />
            </dl>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h3>Infraestrutura e bens</h3>
                <p className="muted small">Condições do domicílio.</p>
              </div>
              <Icon name="home" />
            </div>

            <div className="ficha-tiles">
              <Tile label="Quartos" value={decodificarBens(aluno.q009_quartos)} />
              <Tile label="Celulares" value={decodificarBens(aluno.q022_celulares)} />
              <Tile label="Televisores" value={decodificarBens(aluno.q019_televisores)} />
              <Tile label="Máq. de lavar" value={decodificarBens(aluno.q014_maquina_lavar)} />
            </div>

            <ul className="ficha-flags">
              <Flag label="Veículo próprio" valor={aluno.veiculo_proprio} />
              <Flag label="Refrigeração" valor={aluno.refrigeracao} />
              <Flag label="Conectividade" valor={aluno.conectividade} />
            </ul>
          </section>
        </aside>
      </div>

      {/* Contexto familiar */}
      <section className="card">
        <div className="card-head">
          <div>
            <h3>Contexto familiar e renda</h3>
            <p className="muted small">Informações socioeconômicas do cadastro.</p>
          </div>
          <Icon name="users" />
        </div>

        <dl className="ficha-fields cols-3">
          <Field label="Escolaridade do pai" value={decodificarEscolaridade(aluno.q001_escolaridade_pai)} />
          <Field label="Escolaridade da mãe" value={decodificarEscolaridade(aluno.q002_escolaridade_mae)} />
          <Field label="Ocupação do pai" value={decodificarOcupacao(aluno.q003_ocupacao_pai)} />
          <Field label="Ocupação da mãe" value={decodificarOcupacao(aluno.q004_ocupacao_mae)} />
          <Field
            label="Tamanho da família"
            value={aluno.q005_tamanho_familia != null ? `${aluno.q005_tamanho_familia} pessoa(s)` : 'Não informado'}
          />
          <Field label="Renda familiar" value={decodificarRenda(aluno.q006_renda_familiar)} />
        </dl>
      </section>

      {editandoAluno && (
        <NovoEstudanteForm
          alunoEdicao={aluno}
          onClose={() => {
            setEditandoAluno(false)
            refresh()
          }}
        />
      )}

      {editandoPlano && (
        <PlanoModal
          plan={plano}
          onSave={salvarPlano}
          onClose={() => setEditandoPlano(false)}
        />
      )}
    </main>
  )
}

/* Campo rótulo/valor empilhado (<dl> semântico) */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="ficha-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/* Quantidade de bens em destaque */
function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="ficha-tile">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

/* Sim / Não / Não informado com ícone, sem depender só da cor */
function Flag({ label, valor }: { label: string; valor: unknown }) {
  const vazio = valor == null || valor === ''
  const sim = !vazio && Number(valor) === 1
  const estado = vazio ? 'nd' : sim ? 'yes' : 'no'

  return (
    <li className={`ficha-flag ${estado}`}>
      <span>{label}</span>
      <em>
        {vazio ? (
          'Não informado'
        ) : (
          <>
            <Icon name={sim ? 'check' : 'cross'} size={12} />
            {sim ? 'Sim' : 'Não'}
          </>
        )}
      </em>
    </li>
  )
}