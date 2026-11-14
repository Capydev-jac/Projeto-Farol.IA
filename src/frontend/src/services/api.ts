import type {
  EnemEstatisticas,
  EnemParticipantesPage,
  EnemResumo,
  Plan,
  Student,
  Turma
} from '../types'

const API = '/api'

export interface NovoAlunoPayload {
  school: string
  turmaId: string
  freq: number
  renda: number
  esc: number
  infra: number
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.erro || `Erro HTTP ${response.status}`)
  }

  if (response.status === 204) return null as T

  return response.json()
}

export const api = {
  // Rotas existentes
  turmas: () => request<Turma[]>('/turmas'),
  alunos: () => request<Student[]>('/alunos'),

  criarTurma: (dados: { nome: string; turno: string }) =>
    request<Turma>('/turmas', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),

  criarAluno: (dados: NovoAlunoPayload) =>
    request<Student>('/alunos', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),

  salvarPlano: (id: string, dados: Plan) =>
    request<Plan>(`/intervencoes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    }),

  // Novas rotas: dados reais do ENEM
  enemResumo: () =>
    request<EnemResumo>('/enem/resumo'),

  enemEstatisticas: () =>
    request<EnemEstatisticas>('/enem/estatisticas'),

  enemParticipantes: (pagina = 1, limite = 20) =>
    request<EnemParticipantesPage>(
      `/enem/participantes?pagina=${pagina}&limite=${limite}`
    )
}