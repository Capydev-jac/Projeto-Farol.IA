import React from 'react'
import { useStore } from './store'
import { RENDAS, ESCOLARIDADES, INFRAS } from './data'
import type { Filters } from './types'

// Filtros sociológicos e de turma. `f` é o objeto de filtros; `set(chave, valor)` o atualiza.
interface MoreFiltersProps {
  f: Filters
  set: (key: keyof Filters, value: string) => void
}

export default function MoreFilters({ f, set }: MoreFiltersProps) {
  const { turmas } = useStore()
  const sel = (k: keyof Filters, label: string, items: string[], byIndex?: boolean) => (
    <label className="fsel">{label}
      <select value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
        <option value="">Todas</option>
        {items.map((it, i) => <option key={it} value={byIndex ? i : it}>{it}</option>)}
      </select>
    </label>
  )
  return (
    <div className="more-filters card">
      {sel('turma', 'Turma', turmas.map((t) => t.nome))}
      {sel('renda', 'Faixa de renda', RENDAS, true)}
      {sel('esc', 'Escolaridade familiar', ESCOLARIDADES, true)}
      {sel('infra', 'Infraestrutura domiciliar', INFRAS, true)}
    </div>
  )
}

export const FILTER_LABELS = (f: Filters) => {
  const out: [keyof Filters, string][] = []
  if (f.q) out.push(['q', `Código: ${f.q}`])
  if (f.school) out.push(['school', f.school])
  if (f.risk) out.push(['risk', `Risco ${f.risk.toLowerCase()}`])
  if (f.turma) out.push(['turma', `Turma ${f.turma}`])
  if (f.renda !== undefined && f.renda !== '') out.push(['renda', RENDAS[Number(f.renda)]])
  if (f.esc !== undefined && f.esc !== '') out.push(['esc', `Família: ${ESCOLARIDADES[Number(f.esc)].toLowerCase()}`])
  if (f.infra !== undefined && f.infra !== '') out.push(['infra', `Infra ${INFRAS[Number(f.infra)].toLowerCase()}`])
  if (f.freqMax) out.push(['freqMax', `Frequência < ${f.freqMax}%`])
  if (f.mtMax) out.push(['mtMax', `Matemática < ${f.mtMax} pts`])
  return out
}