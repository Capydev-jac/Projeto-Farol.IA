import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import { useStore } from '../../store'
import { api, ApiError, type AlunoCadastrado, type PredicaoPayload, type PredicaoResultado } from '../../services/api'
import { paraCadastro, paraPredicao, type AlunoNumerico } from './alunoMapper'
import Icon from '../../components/Icon'
import * as O from './formOptions'

type Num = number | ''

interface FormState {
  nome: string
  ra: string
  turmaId: string
  faixa: Num
  sexo: Num
  q001: Num
  q002: Num
  q003: Num
  q004: Num
  q005: Num
  q006: Num
  q009: Num
  q014: Num
  q019: Num
  q022: Num
  veiculo: Num
  refrig: Num
  conect: Num
}

const INICIAL: FormState = {
  nome: '', ra: '', turmaId: '',
  faixa: '', sexo: '',
  q001: '', q002: '', q003: '', q004: '', q005: '', q006: '',
  q009: '', q014: '', q019: '', q022: '',
  veiculo: '', refrig: '', conect: ''
}

// Campos numéricos obrigatórios (nome exibido na mensagem de erro)
const OBRIGATORIOS: Record<Exclude<keyof FormState, 'nome' | 'ra' | 'turmaId'>, string> = {
  faixa: 'Faixa etária', sexo: 'Sexo',
  q001: 'Escolaridade do pai', q002: 'Escolaridade da mãe',
  q003: 'Ocupação do pai', q004: 'Ocupação da mãe',
  q005: 'Moradores na casa', q006: 'Renda familiar',
  q009: 'Quartos', q014: 'Máquina de lavar', q019: 'Televisores', q022: 'Celulares',
  veiculo: 'Veículo próprio', refrig: 'Refrigeração', conect: 'Conectividade'
}

// Campos reutilizáveis
function SelectField({ label, value, options, onChange, invalid }: {
  label: string; value: Num; options: O.Opt[]; onChange: (v: Num) => void; invalid?: boolean
}) {
  return (
    <label className={invalid ? 'invalid' : ''}>
      <span>{label}<span className="req">*</span></span>
      <select value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}>
        <option value="">Selecione…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function ChoiceField({ label, value, options, onChange, invalid, span }: {
  label: string; value: Num; options: O.Opt[]; onChange: (v: Num) => void; invalid?: boolean; span?: boolean
}) {
  return (
    <div className={'field' + (invalid ? ' invalid' : '') + (span ? ' span-2' : '')}>
      <span>{label}<span className="req">*</span></span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value} type="button"
            className={value === o.value ? 'on' : ''}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >{o.label}</button>
        ))}
      </div>
    </div>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <h4 className="sec-title"><span className="sec-num">{n}</span>{title}</h4>
      {children}
    </section>
  )
}

// Conversão do formulário -> contratos da API
function paraAluno(f: FormState): AlunoNumerico {
  const n = (v: Num) => v as number
  return {
    nome: f.nome, ra: f.ra, turmaId: f.turmaId ? Number(f.turmaId) : null,
    faixa: n(f.faixa), sexo: n(f.sexo),
    q001: n(f.q001), q002: n(f.q002), q003: n(f.q003), q004: n(f.q004), q005: n(f.q005), q006: n(f.q006),
    q009: n(f.q009), q014: n(f.q014), q019: n(f.q019), q022: n(f.q022),
    veiculo: n(f.veiculo), refrig: n(f.refrig), conect: n(f.conect)
  }
}

const TAG_CLASSE = { CRITICO: 'Elevado', ATENCAO: 'Atenção', REGULAR: '' } as const
const TAG_TEXTO = { CRITICO: 'Crítico', ATENCAO: 'Atenção', REGULAR: 'Regular' } as const

// Componente principal
export default function NovoEstudanteForm({ onClose, defaultTurma }: {
  onClose: () => void
  defaultTurma?: string
}) {
  const { turmas, refresh } = useStore()
  const nav = useNavigate()

  const [f, setF] = useState<FormState>(() => ({
    ...INICIAL,
    turmaId: turmas.find((t) => t.nome === defaultTurma)?.id ?? ''
  }))
  const [erro, setErro] = useState('')
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [aluno, setAluno] = useState<AlunoCadastrado | null>(null)
  const [predicaoPayload, setPredicaoPayload] = useState<PredicaoPayload | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState<PredicaoResultado | null>(null)

  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => {
    setF((cur) => ({ ...cur, [k]: v }))
    setErro('')
  }

  const fechar = () => { if (aluno) refresh(); onClose() }

  const chaves = Object.keys(OBRIGATORIOS) as (keyof typeof OBRIGATORIOS)[]
  const preenchidos = chaves.filter((k) => f[k] !== '').length + (f.nome.trim() ? 1 : 0) + (f.ra.trim() ? 1 : 0)
  const total = chaves.length + 2
  const inv = (k: keyof typeof OBRIGATORIOS) => tentou && f[k] === ''

  const cadastrar = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setErro('')
    setTentou(true)

    const faltando = chaves.filter((k) => f[k] === '')
    const faltaIdent = (f.nome.trim() ? 0 : 1) + (f.ra.trim() ? 0 : 1)
    const faltam = faltando.length + faltaIdent
    if (faltam > 0) {
      setErro(`Faltam ${faltam} campo(s) obrigatório(s). Os campos em vermelho precisam ser preenchidos.`)
      setTimeout(() => document.querySelector('.modal .invalid, .modal .invalid-id')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0)
      return
    }

    setSalvando(true)
    try {
      const dados = paraAluno(f)                               // formulário -> códigos numéricos
      const r = await api.cadastrarAluno(paraCadastro(dados))  // letras (A, B, C…) para o banco
      setAluno(r.aluno)
      setPredicaoPayload(paraPredicao(dados))                  // números para o modelo
    } catch (err) {
      setErro(
        err instanceof ApiError && err.status === 409
          ? 'Já existe um estudante cadastrado com este RA.'
          : (err as Error).message
      )
    } finally {
      setSalvando(false)
    }
  }

  const calcularRisco = async () => {
    if (!predicaoPayload) return
    setErro('')
    setCalculando(true)
    try {
      const r = await api.preverRisco(predicaoPayload)
      setResultado(r.resultado)
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setCalculando(false)
    }
  }

  const novo = () => {
    refresh()
    setF({ ...INICIAL, turmaId: f.turmaId })
    setAluno(null); setPredicaoPayload(null); setResultado(null); setErro(''); setTentou(false)
  }

  // Tela 2: aluno cadastrado + botão da IA
  if (aluno) {
    return (
      <Modal
        title="Estudante cadastrado"
        onClose={fechar}
        footer={
          <>
            <div className="foot-info" />
            <div className="foot-actions">
              <button type="button" className="btn" onClick={novo}>Cadastrar outro</button>
              <button type="button" className={'btn' + (resultado ? ' teal' : '')}
                onClick={() => { onClose(); refresh(); nav(`/estudantes/${aluno.id}`) }}>
                Ver estudante
              </button>
            </div>
          </>
        }
      >
        <div className="form">
          <div className="success-head">
            <span className="success-icon" aria-hidden="true">✓</span>
            <div>
              <b>{aluno.nome}</b>
              <p className="muted small">RA {aluno.numero_matricula} · cadastro salvo com sucesso</p>
            </div>
          </div>

          {resultado ? (
            <div className={'risk-card ' + resultado.cor_semaforo}>
              <div>
                <span className="risk-label">Probabilidade de risco</span>
                <span className="risk-pct">{resultado.probabilidade_percentual.toFixed(1).replace('.', ',')}%</span>
              </div>
              <div>
                <span className={'tag big ' + TAG_CLASSE[resultado.nivel_alerta]} style={{ marginLeft: 0 }}>
                  {TAG_TEXTO[resultado.nivel_alerta]}
                </span>
                <p>{resultado.recomendacao}</p>
                <span className="risk-model">Modelo {resultado.versao_modelo}</span>
              </div>
            </div>
          ) : (
            <div className="ia-hint">
              <Icon name="spark" size={22} />
              <div style={{ flex: 1 }}>
                <b>Calcular risco de defasagem</b>
                <p className="muted small">O modelo de IA usa as respostas do cadastro para estimar o risco do estudante.</p>
              </div>
              <button type="button" className="btn teal" onClick={calcularRisco} disabled={calculando}>
                {calculando ? 'Calculando…' : 'Calcular risco (IA)'}
              </button>
            </div>
          )}

          {erro && <p className="form-msg err">{erro}</p>}
        </div>
      </Modal>
    )
  }

  // Tela 1: formulário
  return (
    <Modal
      title="Cadastrar estudante"
      subtitle="Preencha os dados abaixo. Todos os campos são obrigatórios, exceto a turma."
      size="lg"
      onClose={fechar}
      footer={
        <>
          <div className="foot-info">
            {erro ? (
              <span className="foot-err">{erro}</span>
            ) : (
              <span className="progress">
                <span className="progress-bar"><i style={{ width: `${(preenchidos / total) * 100}%` }} /></span>
                {preenchidos} de {total} campos
              </span>
            )}
          </div>
          <div className="foot-actions">
            <button type="button" className="btn" onClick={fechar}>Cancelar</button>
            <button type="button" className="btn teal" disabled={salvando} onClick={cadastrar}>
              {salvando ? 'Salvando…' : 'Cadastrar estudante'}
            </button>
          </div>
        </>
      }
    >
      <form className="form" onSubmit={cadastrar} noValidate>
        <Section n={1} title="Identificação">
          <div className="form-grid">
            <label className={'span-2' + (tentou && !f.nome.trim() ? ' invalid invalid-id' : '')}>
              <span>Nome do aluno<span className="req">*</span></span>
              <input value={f.nome} maxLength={150} onChange={(e) => set('nome')(e.target.value)} placeholder="Nome completo" />
            </label>
            <label className={tentou && !f.ra.trim() ? 'invalid invalid-id' : ''}>
              <span>RA / Matrícula<span className="req">*</span></span>
              <input value={f.ra} maxLength={50} onChange={(e) => set('ra')(e.target.value)} placeholder="Ex.: 20263014" />
            </label>
            <label>
              <span>Turma <span className="muted">(opcional)</span></span>
              <select value={f.turmaId} onChange={(e) => set('turmaId')(e.target.value)}>
                <option value="">Sem turma</option>
                {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.turno ? ` · ${t.turno}` : ''}</option>)}
              </select>
            </label>
          </div>
        </Section>

        <Section n={2} title="Perfil">
          <div className="form-grid">
            <SelectField label="Faixa etária" value={f.faixa} options={O.FAIXA_ETARIA} onChange={set('faixa')} invalid={inv('faixa')} />
            <ChoiceField label="Sexo" value={f.sexo} options={O.SEXO} onChange={set('sexo')} invalid={inv('sexo')} />
          </div>
        </Section>

        <Section n={3} title="Família e renda">
          <div className="form-grid">
            <SelectField label="Escolaridade do pai (ou responsável)" value={f.q001} options={O.ESCOLARIDADE} onChange={set('q001')} invalid={inv('q001')} />
            <SelectField label="Escolaridade da mãe (ou responsável)" value={f.q002} options={O.ESCOLARIDADE} onChange={set('q002')} invalid={inv('q002')} />
            <SelectField label="Ocupação do pai (ou responsável)" value={f.q003} options={O.OCUPACAO} onChange={set('q003')} invalid={inv('q003')} />
            <SelectField label="Ocupação da mãe (ou responsável)" value={f.q004} options={O.OCUPACAO} onChange={set('q004')} invalid={inv('q004')} />
            <SelectField label="Renda familiar mensal" value={f.q006} options={O.RENDA} onChange={set('q006')} invalid={inv('q006')} />
            <ChoiceField label="Moradores na casa (incluindo o estudante)" value={f.q005} options={O.MORADORES} onChange={set('q005')} invalid={inv('q005')} />
          </div>
        </Section>

        <Section n={4} title="Moradia e bens">
          <div className="form-grid">
            <ChoiceField label="Quartos para dormir" value={f.q009} options={O.QUARTOS} onChange={set('q009')} invalid={inv('q009')} />
            <ChoiceField label="Máquinas de lavar roupa" value={f.q014} options={O.MAQUINA_LAVAR} onChange={set('q014')} invalid={inv('q014')} />
            <ChoiceField label="Televisões em cores" value={f.q019} options={O.TELEVISORES} onChange={set('q019')} invalid={inv('q019')} />
            <ChoiceField label="Telefones celulares" value={f.q022} options={O.CELULARES} onChange={set('q022')} invalid={inv('q022')} />
          </div>
          <div className="form-grid three">
            <ChoiceField label="A família possui veículo próprio (carro ou moto)?" value={f.veiculo} options={O.SIM_NAO} onChange={set('veiculo')} invalid={inv('veiculo')} />
            <ChoiceField label="A residência possui geladeira ou freezer?" value={f.refrig} options={O.SIM_NAO} onChange={set('refrig')} invalid={inv('refrig')} />
            <ChoiceField label="O estudante tem computador ou internet em casa?" value={f.conect} options={O.SIM_NAO} onChange={set('conect')} invalid={inv('conect')} />
          </div>
          <p className="muted small">Nas quantidades, <b>0</b> = não possui e <b>4+</b> = quatro ou mais.</p>
        </Section>
      </form>
    </Modal>
  )
}