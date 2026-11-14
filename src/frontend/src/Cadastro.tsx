import React, { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import Modal from './Modal'
import { useStore } from './store'
import NovoEstudante from './NovoEstudanteForm'
import { downloadCSV } from './utils'
import type { Student } from './types'

const LGPD = 'Não registre nome, CPF, contatos ou qualquer dado pessoal. O estudante é identificado apenas por um código gerado automaticamente (LGPD).'

function NovaTurma({ onClose }: { onClose: () => void }) {
  const { addTurma } = useStore()
  const [ident, setIdent] = useState('')
  const [turno, setTurno] = useState('Manhã')
  const [msg, setMsg] = useState<{ err?: string; ok?: string } | null>(null)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
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

function Importar({ onClose }: { onClose: () => void }) {
  const { importCSV } = useStore()
  const [res, setRes] = useState<{ added: number; errors: string[] } | null>(null)
  const [drag, setDrag] = useState(false)
  const lerArquivo = async (file?: File) => {
    if (!file) return
    setRes(await importCSV(await file.text()))
  }
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    await lerArquivo(e.target.files?.[0])
    e.target.value = ''
  }
  const template = () => downloadCSV('modelo-importacao-farol-ia.csv', [
    ['turma', 'escola', 'renda', 'escolaridade', 'infraestrutura', 'frequencia'],
    ['3ª A', 'Escola Horizonte', 1, 1, 1, 88],
    ['3ª B', 'Escola Ipê', 'Até 1 salário mínimo', 'Ensino fundamental', 'Básica', 92],
  ])
  return (
    <Modal
      title="Importar estudantes em lote"
      subtitle="Envie um arquivo CSV com um estudante por linha."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={template}><Icon name="download" /> Baixar modelo</button>
          <div className="foot-actions"><button type="button" className="btn" onClick={onClose}>Fechar</button></div>
        </>
      }
    >
      <div className="form">
        <p className="callout small"><Icon name="info" size={14} /><span>{LGPD}</span></p>

        <div
          className={'dropzone' + (drag ? ' drag' : '')}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); lerArquivo(e.dataTransfer.files?.[0]) }}
        >
          <span className="dropzone-icon"><Icon name="upload" size={20} /></span>
          <b>Arraste o arquivo CSV aqui</b>
          <span className="muted small">ou selecione do seu computador · separador “;” ou “,”</span>
          <label className="btn teal file-btn"><Icon name="upload" /> Escolher arquivo CSV
            <input type="file" accept=".csv,text/csv" onChange={onFile} hidden />
          </label>
        </div>

        <div>
          <p className="muted small" style={{ marginBottom: 6 }}>Colunas esperadas (rótulos por extenso também são aceitos):</p>
          <div className="profile-chips" style={{ marginBottom: 0 }}>
            <span>turma</span><span>escola</span><span>renda (0–3)</span><span>escolaridade (0–2)</span>
            <span>infraestrutura (0–2)</span><span>frequencia (0–100)</span>
          </div>
        </div>

        {res && (
          <div className={'form-msg ' + (res.errors.length ? 'err' : 'ok')}>
            <b>{res.added} estudante(s) importado(s).</b>
            {res.errors.slice(0, 5).map((m) => <div key={m}>{m}</div>)}
            {res.errors.length > 5 && <div>… e mais {res.errors.length - 5} erro(s).</div>}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function CadastroActions({ defaultTurma, compact }: { defaultTurma?: string; compact?: boolean }) {
  const [open, setOpen] = useState<'turma' | 'aluno' | 'csv' | null>(null)
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