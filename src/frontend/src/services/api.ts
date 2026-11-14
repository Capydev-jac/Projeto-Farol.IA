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

/** POST /api/alunos o BANCO guarda letras (A, B, C…) e sexo 'M'/'F'. */
export interface CadastroAlunoPayload {
  numero_matricula: string
  nome: string
  turma_id?: number | null
  tp_faixa_etaria: number
  tp_sexo: 'M' | 'F'
  q001_escolaridade_pai: string
  q002_escolaridade_mae: string
  q003_ocupacao_pai: string
  q004_ocupacao_mae: string
  q005_tamanho_familia: number
  q006_renda_familiar: string
  q009_quartos: string
  q014_maquina_lavar: string
  q019_televisores: string
  q022_celulares: string
  veiculo_proprio: 0 | 1
  refrigeracao: 0 | 1
  conectividade: 0 | 1
}

/** POST /api/predict/aluno o MODELO espera números */
export interface PredicaoPayload {
  matricula_ra: string
  nome_aluno?: string
  TP_FAIXA_ETARIA: number
  TP_SEXO: number
  Q001: number
  Q002: number
  Q003: number
  Q004: number
  Q005: number
  Q006: number
  Q009: number
  Q014: number
  Q019: number
  Q022: number
  VEICULO_PROPRIO: number
  REFRIGERACAO: number
  CONECTIVIDADE: number
}

export interface PredicaoResultado {
  risco_binario: 0 | 1
  probabilidade_percentual: number
  nivel_alerta: 'REGULAR' | 'ATENCAO' | 'CRITICO'
  cor_semaforo: 'green' | 'amber' | 'red'
  recomendacao: string
  versao_modelo: string
}

export interface AlunoCadastrado {
  id: number
  numero_matricula: string
  nome: string
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
  alunos: () => request<{ alunos: Student[] }>('/alunos').then((r) => r.alunos),

  cadastrarAluno: (dados: CadastroAlunoPayload) =>
    request<{ sucesso: boolean; aluno: AlunoCadastrado }>('/alunos', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),

  preverRisco: (dados: PredicaoPayload) =>
    request<{ sucesso: boolean; resultado: PredicaoResultado }>('/predict/aluno', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),

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