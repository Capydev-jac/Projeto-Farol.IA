import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'
import { useStore } from './store.jsx'
import { SCHOOLS, RENDAS, ESCOLARIDADES, INFRAS, pDef } from './data.js'
import { downloadCSV } from './utils.js'

const LGPD = 'Não registre nome, CPF, contatos ou qualquer dado pessoal. O estudante é identificado apenas por um código gerado automaticamente (LGPD).'

function NovaTurma({ onClose }) {
  const { addTurma } = useStore()
  const [ident, setIdent] = useState('')
  const [turno, setTurno] = useState('Manhã')
  const [msg, setMsg] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    const r = await addTurma(ident, turno)
    setMsg(r.error ? { err: r.error } : { ok: `Turma ${r.turma} criada.` })
    if (!r.error) setIdent('')
  }
  return (
    <Modal title="Nova turma" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="muted small">Turmas da 3ª série do Ensino Médio (alvo do ENEM). Informe a letra ou número da turma.</p>
        <label>Identificador<input value={ident} maxLength={3} placeholder="Ex.: E" onChange={(e) => setIdent(e.target.value)} required /></label>
        <label>Turno
          <select value={turno} onChange={(e) => setTurno(e.target.value)}>
            <option>Manhã</option><option>Tarde</option><option>Noite</option>
          </select>
        </label>
        {msg?.err && <p className="form-msg err">{msg.err}</p>}
        {msg?.ok && <p className="form-msg ok">{msg.ok}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Fechar</button>
          <button type="submit" className="btn teal">Criar turma</button>
        </div>
      </form>
    </Modal>
  )
}

function NovoEstudante({ onClose, defaultTurma }) {
  const { turmas, addStudents } = useStore()
  const nav = useNavigate()
  const [f, setF] = useState({ turma: defaultTurma || turmas[0]?.nome || '', school: SCHOOLS[0], renda: 1, esc: 1, infra: 1, freq: '' })
  const [done, setDone] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    const t = turmas.find((x) => x.nome === f.turma)
    if (!t) return setDone({ error: 'Cadastre uma turma antes de cadastrar estudantes.' })
    const result = await addStudents([{ school: f.school, turma: t.nome, shift: t.turno, freq: Math.round(+f.freq), renda: +f.renda, esc: +f.esc, infra: +f.infra }])
    if (result?.error) setDone({ error: result.error })
    else setDone(result[0])
  }
  if (done) {
    if (done.error) return <Modal title="Não foi possível cadastrar" onClose={onClose}><div className="form"><p className="form-msg err">{done.error}</p><div className="form-actions"><button className="btn" onClick={onClose}>Fechar</button></div></div></Modal>
    return (
      <Modal title="Estudante cadastrado" onClose={onClose}>
        <div className="form">
          <p><b>{done.id}</b> · {done.turma} · {done.school}</p>
          <div className="result-grid">
            <div><small className="muted">ENEM estimado</small><b>—</b><small className="muted">Predição ainda não disponível</small></div>
            <div><small className="muted">Prob. de defasagem</small><b>—</b><small className="muted">Modelo em desenvolvimento</small></div>
            <div><small className="muted">Risco</small><span className="tag Atenção">Pendente</span></div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => { setDone(null); setF({ ...f, freq: '' }) }}>Cadastrar outro</button>
            <button type="button" className="btn teal" onClick={() => { onClose(); nav(`/estudantes/${done.id}`) }}>Ver estudante</button>
          </div>
        </div>
      </Modal>
    )
  }
  const sel = (k, list) => (
    <select value={f[k]} onChange={set(k)}>{list.map((l, i) => <option key={l} value={i}>{l}</option>)}</select>
  )
  return (
    <Modal title="Cadastrar estudante" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="callout small">{LGPD}</p>
        {turmas.length === 0 && <p className="form-msg err">Cadastre uma turma antes de cadastrar estudantes.</p>}
        <div className="form-grid">
          <label>Turma<select value={f.turma} onChange={set('turma')}>{turmas.map((t) => <option key={t.nome}>{t.nome}</option>)}</select></label>
          <label>Escola<select value={f.school} onChange={set('school')}>{SCHOOLS.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Renda familiar{sel('renda', RENDAS)}</label>
          <label>Escolaridade familiar{sel('esc', ESCOLARIDADES)}</label>
          <label>Infraestrutura domiciliar{sel('infra', INFRAS)}</label>
          <label>Frequência recente (%)<input type="number" min="0" max="100" required value={f.freq} onChange={set('freq')} placeholder="0 a 100" /></label>
        </div>
        <p className="muted small">Infraestrutura: acesso a internet, computador e espaço de estudo em casa.</p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn teal" disabled={turmas.length === 0}>Cadastrar estudante</button>
        </div>
      </form>
    </Modal>
  )
}

function Importar({ onClose }) {
  const { importCSV } = useStore()
  const [res, setRes] = useState(null)
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRes(await importCSV(await file.text()))
    e.target.value = ''
  }
  const template = () => downloadCSV('modelo-importacao-farol-ia.csv', [
    ['turma', 'escola', 'renda', 'escolaridade', 'infraestrutura', 'frequencia'],
    ['3ª A', 'Escola Horizonte', 1, 1, 1, 88],
    ['3ª B', 'Escola Ipê', 'Até 1 salário mínimo', 'Ensino fundamental', 'Básica', 92],
  ])
  return (
    <Modal title="Importar estudantes em lote" onClose={onClose}>
      <div className="form">
        <p className="callout small">{LGPD}</p>
        <p className="muted small">
          Colunas: turma, escola, renda (0–3), escolaridade (0–2), infraestrutura (0–2) e frequencia (0–100).
          Também são aceitos os rótulos por extenso. Separador “;” ou “,”.
        </p>
        <div className="form-actions left">
          <button type="button" className="btn" onClick={template}><Icon name="download" /> Baixar modelo</button>
          <label className="btn teal file-btn"><Icon name="upload" /> Escolher arquivo CSV
            <input type="file" accept=".csv,text/csv" onChange={onFile} hidden />
          </label>
        </div>
        {res && (
          <div className={'form-msg ' + (res.errors.length ? 'err' : 'ok')}>
            <b>{res.added} estudante(s) importado(s).</b>
            {res.errors.slice(0, 5).map((m) => <div key={m}>{m}</div>)}
            {res.errors.length > 5 && <div>… e mais {res.errors.length - 5} erro(s).</div>}
          </div>
        )}
        <div className="form-actions"><button type="button" className="btn" onClick={onClose}>Fechar</button></div>
      </div>
    </Modal>
  )
}

export default function CadastroActions({ defaultTurma, compact }) {
  const [open, setOpen] = useState(null)
  const close = () => setOpen(null)
  return (
    <>
      <div className="actions">
        <button type="button" className="btn" onClick={() => setOpen('turma')}><Icon name="plus" /> Nova turma</button>
        <button type="button" className="btn" onClick={() => setOpen('csv')}><Icon name="upload" /> {compact ? 'Importar' : 'Importar CSV'}</button>
        <button type="button" className="btn teal" onClick={() => setOpen('aluno')}><Icon name="plus" /> Cadastrar estudante</button>
      </div>
      {open === 'turma' && <NovaTurma onClose={close} />}
      {open === 'aluno' && <NovoEstudante onClose={close} defaultTurma={defaultTurma} />}
      {open === 'csv' && <Importar onClose={close} />}
    </>
  )
}
