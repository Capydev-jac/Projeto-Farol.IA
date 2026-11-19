import type { Plan } from '../../types'

/**
 * o plano é um texto livre escrito pelo gestor e vai no JSONB `owners`
 * como array de um único item: owners = [texto].
 * Situação gravada quando existe plano; sem plano = nenhum registro no banco.
 */
export const STATUS_PLANO = 'Em andamento'
export const LIMITE_PLANO = 5000

export const ROTEIRO_SUGERIDO = [
  'Situação do estudante:',
  '',
  'O que ele precisa:',
  '',
  'Ações combinadas (quem faz, até quando):',
  '',
  'Como vamos acompanhar:'
].join('\n')

const ETAPAS_ANTIGAS = [
  'Acolhimento e escuta',
  'Reforço em matemática',
  'Verificar acesso e permanência'
]

export function textoDoPlano(plan?: Plan): string {
  const owners = plan?.owners
  if (!Array.isArray(owners) || owners.length === 0) return ''

  if (owners.length === 1) return String(owners[0] ?? '')

  return owners
    .map((o, i) => {
      const nome = String(o ?? '').trim()
      if (!nome) return ''
      return `${ETAPAS_ANTIGAS[i] ?? `Etapa ${i + 1}`} — responsável: ${nome}`
    })
    .filter(Boolean)
    .join('\n')
}

export function planoDoTexto(texto: string): Plan {
  return { status: STATUS_PLANO, owners: [texto.trim()] }
}