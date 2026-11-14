import React, { useEffect } from 'react'

interface ModalProps {
  title: string
  subtitle?: string
  /** 'lg' para formulários longos */
  size?: 'md' | 'lg'
  /** Rodapé fixo (botões / status). Fica fora da área que rola. */
  footer?: React.ReactNode
  onClose: () => void
  children?: React.ReactNode
}

export default function Modal({ title, subtitle, size = 'md', footer, onClose, children }: ModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    // trava a rolagem da página de fundo enquanto o modal está aberto
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (size === 'lg' ? ' lg' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}