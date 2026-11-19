import React, { useState, type ChangeEvent, type FormEvent } from 'react'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import { useStore } from '../../store'
import NovoEstudante from './NovoEstudanteForm'
import { downloadCSV } from '../../lib/utils'
import { api } from '../../services/api'
import { paraCadastro, paraPredicao } from './alunoMapper'
import { COLUNAS, lerCSV, linhasModelo, type ResultadoLeitura } from './importacaoAlunos'

const AVISO_IMPORT = 'Use somente as colunas do modelo (nome, RA e as respostas do dicionário de dados). Não inclua CPF, contatos ou outros dados pessoais.'

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

type Fase = 'escolher' | 'revisar' | 'importando' | 'pronto'

interface Falha { linha: number; ra: string; motivo: string }
interface Resumo {
  cadastrados: number
  falhas: Falha[]
  niveis: { REGULAR: number; ATENCAO: number; CRITICO: number }
  semPredicao: number
}

// Executa `fn` sobre os itens com no máximo `limite` requisições simultâneas.
async function emLotes<T>(itens: T[], limite: number, fn: (item: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (i < itens.length) await fn(itens[i++])
  }))
}

function Importar({ onClose }: { onClose: () => void }) {
  const { turmas, refresh } = useStore()
  const [fase, setFase] = useState<Fase>('escolher')
  const [drag, setDrag] = useState(false)
  const [arquivo, setArquivo] = useState('')
  const [leitura, setLeitura] = useState<ResultadoLeitura>({ validas: [], erros: [] })
  const [calcularIA, setCalcularIA] = useState(true)
  const [feitos, setFeitos] = useState(0)
  const [resumo, setResumo] = useState<Resumo | null>(null)

  const lerArquivo = async (file?: File) => {
    if (!file) return
    setArquivo(file.name)
    setLeitura(lerCSV(await file.text(), turmas))
    setFase('revisar')
  }
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    await lerArquivo(e.target.files?.[0])
    e.target.value = ''
  }
  const modelo = () => downloadCSV('modelo-importacao-farol-ia.csv', linhasModelo())

  const importar = async () => {
    const { validas } = leitura
    setFase('importando'); setFeitos(0)
    const r: Resumo = { cadastrados: 0, falhas: [], niveis: { REGULAR: 0, ATENCAO: 0, CRITICO: 0 }, semPredicao: 0 }

    await emLotes(validas, 4, async ({ linha, aluno }) => {
      try {
        await api.cadastrarAluno(paraCadastro(aluno))
        r.cadastrados++
      } catch (err) {
        r.falhas.push({ linha, ra: aluno.ra, motivo: (err as Error).message })
        setFeitos((n) => n + 1)
        return
      }
      if (calcularIA) {
        try {
          const p = await api.preverRisco(paraPredicao(aluno))
          r.niveis[p.resultado.nivel_alerta]++
        } catch {
          r.semPredicao++
        }
      }
      setFeitos((n) => n + 1)
    })

    r.falhas.sort((a, b) => a.linha - b.linha)
    setResumo(r)
    setFase('pronto')
    refresh()
  }

  const { validas, erros } = leitura
  const voltar = () => { setFase('escolher'); setLeitura({ validas: [], erros: [] }); setResumo(null) }

  const rodape =
    fase === 'escolher' ? (
      <>
        <button type="button" className="btn" onClick={modelo}><Icon name="download" /> Baixar modelo</button>
        <div className="foot-actions"><button type="button" className="btn" onClick={onClose}>Fechar</button></div>
      </>
    ) : fase === 'revisar' ? (
      <>
        <button type="button" className="btn" onClick={voltar}>Trocar arquivo</button>
        <div className="foot-actions">
          <button type="button" className="btn teal" disabled={!validas.length} onClick={importar}>
            Importar {validas.length} estudante(s)
          </button>
        </div>
      </>
    ) : fase === 'importando' ? (
      <div className="foot-info">Importando… não feche esta janela.</div>
    ) : (
      <>
        <button type="button" className="btn" onClick={voltar}>Importar outro arquivo</button>
        <div className="foot-actions"><button type="button" className="btn teal" onClick={onClose}>Concluir</button></div>
      </>
    )

  return (
    <Modal
      title="Importar estudantes em lote"
      subtitle="Um estudante por linha, seguindo o dicionário de dados do Farol.IA."
      size={fase === 'escolher' ? 'md' : 'lg'}
      onClose={fase === 'importando' ? () => {} : onClose}
      footer={rodape}
    >
      <div className="form">
        {fase === 'escolher' && (
          <>
            <p className="callout small"><Icon name="info" size={14} /><span>{AVISO_IMPORT}</span></p>
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
            <details className="col-help">
              <summary>Ver colunas e valores aceitos</summary>
              <table className="mini-table">
                <thead><tr><th>Coluna</th><th>Valores</th></tr></thead>
                <tbody>{COLUNAS.map((c) => <tr key={c.nome}><td><code>{c.nome}</code></td><td>{c.ajuda}</td></tr>)}</tbody>
              </table>
            </details>
          </>
        )}

        {fase === 'revisar' && (
          <>
            <p className="muted small">Arquivo: <b>{arquivo}</b></p>
            <div className="import-stats">
              <div className="ok"><b>{validas.length}</b><span>prontos para importar</span></div>
              <div className={erros.length ? 'bad' : ''}><b>{erros.length}</b><span>com problema (serão ignorados)</span></div>
            </div>
            {erros.length > 0 && (
              <div className="form-msg err">
                <b>Corrija no arquivo e reenvie, ou importe só os válidos:</b>
                <ul className="err-list">
                  {erros.slice(0, 8).map((m) => <li key={m}>{m}</li>)}
                  {erros.length > 8 && <li>… e mais {erros.length - 8} linha(s) com problema.</li>}
                </ul>
              </div>
            )}
            <label className="check-row">
              <input type="checkbox" checked={calcularIA} onChange={(e) => setCalcularIA(e.target.checked)} />
              <span>Calcular o risco com a IA logo após cadastrar cada estudante</span>
            </label>
          </>
        )}

        {fase === 'importando' && (
          <div className="import-progress">
            <span className="progress-bar big"><i style={{ width: `${(feitos / Math.max(validas.length, 1)) * 100}%` }} /></span>
            <b>{feitos} de {validas.length}</b>
          </div>
        )}

        {fase === 'pronto' && resumo && (
          <>
            <div className="import-stats">
              <div className="ok"><b>{resumo.cadastrados}</b><span>cadastrados</span></div>
              <div className={resumo.falhas.length ? 'bad' : ''}><b>{resumo.falhas.length}</b><span>não cadastrados</span></div>
            </div>
            {calcularIA && resumo.cadastrados > 0 && (
              <div className="profile-chips">
                <span>Crítico: {resumo.niveis.CRITICO}</span>
                <span>Atenção: {resumo.niveis.ATENCAO}</span>
                <span>Regular: {resumo.niveis.REGULAR}</span>
                {resumo.semPredicao > 0 && <span>Sem predição: {resumo.semPredicao}</span>}
              </div>
            )}
            {resumo.falhas.length > 0 && (
              <div className="form-msg err">
                <b>Não foram cadastrados:</b>
                <ul className="err-list">
                  {resumo.falhas.slice(0, 8).map((f) => <li key={f.linha}>Linha {f.linha} (RA {f.ra}): {f.motivo}</li>)}
                  {resumo.falhas.length > 8 && <li>… e mais {resumo.falhas.length - 8}.</li>}
                </ul>
              </div>
            )}
            {resumo.semPredicao > 0 && (
              <p className="muted small">{resumo.semPredicao} estudante(s) foram cadastrados, mas a predição falhou. Rode “Calcular risco” depois.</p>
            )}
          </>
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
        <button type="button" className="btn teal" onClick={() => setOpen('aluno')}><Icon name="plus" /> Cadastrar Estudante</button>
        <button type="button" className="btn" onClick={() => setOpen('turma')}><Icon name="plus" /> Nova turma</button>
        <button type="button" className="btn" onClick={() => setOpen('csv')}><Icon name="upload" /> {compact ? 'Importar' : 'Importar CSV'}</button>
      </div>
      {open === 'turma' && <NovaTurma onClose={close} />}
      {open === 'aluno' && <NovoEstudante onClose={close} defaultTurma={defaultTurma} />}
      {open === 'csv' && <Importar onClose={close} />}
    </>
  )
}