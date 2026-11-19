import { useState, type FormEvent } from 'react'
import Modal from '../../components/Modal'
import type { Plan } from '../../types'
import {
  LIMITE_PLANO,
  ROTEIRO_SUGERIDO,
  planoDoTexto,
  textoDoPlano
} from './planoTexto'

interface Props {
  plan?: Plan
  onSave: (plan: Plan) => Promise<string | void> | void
  onClose: () => void
}

export default function PlanoModal({ plan, onSave, onClose }: Props) {
  const [texto, setTexto] = useState(() => textoDoPlano(plan))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!texto.trim()) {
      setErro('Escreva o plano antes de salvar.')
      return
    }

    setErro('')
    setSalvando(true)
    const msg = await onSave(planoDoTexto(texto))
    setSalvando(false)
    if (msg) setErro(msg)
  }

  return (
    <Modal
      title={plan ? 'Editar plano de acompanhamento' : 'Criar plano de acompanhamento'}
      size="lg"
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <p className="muted small">
          Descreva livremente o que este estudante precisa e o que será feito.
        </p>

        <label>
          Plano de acompanhamento
          <textarea
            className="plan-textarea"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={LIMITE_PLANO}
            rows={12}
            autoFocus
            placeholder="Escreva aqui o plano: necessidades identificadas, ações, responsáveis, prazos e como acompanhar."
          />
        </label>

        <div className="plan-modal-meta">
          {!texto.trim() ? (
            <button
              type="button"
              className="link plain small"
              onClick={() => setTexto(ROTEIRO_SUGERIDO)}
            >
              Começar com um roteiro sugerido
            </button>
          ) : (
            <span />
          )}
          <span className="muted small">{texto.length}/{LIMITE_PLANO}</span>
        </div>

        {erro && <p className="small" style={{ color: 'var(--red)' }}>{erro}</p>}

        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn teal" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar plano'}
          </button>
        </div>
      </form>
    </Modal>
  )
}