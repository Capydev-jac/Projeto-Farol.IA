import type {
  EnemEstatisticas,
  EnemParticipantesPage,
  EnemResumo,
  Plan,
  Student,
  Turma
} from '../types'

// Em desenvolvimento o Vite faz proxy de /api
const API: string = import.meta.env.VITE_API_URL ?? '/api'


/* Tipos

/** POST /api/alunos, o BANCO guarda letras (A, B, C…) e sexo 'M'/'F'. */
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

/** POST /api/predict/aluno, o MODELO espera números (ordem do dicionário). */
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

/** Linha devolvida por GET /api/alunos (colunas do SELECT em alunos.controller.ts). */
export interface AlunoApi {
  id: number
  numero_matricula: string
  nome: string
  turma_id: number | null
  turma: string | null
  turno: string | null
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
  // Preenchidos depois que a predição roda (null antes disso)
  ia_risco_defasagem: boolean | number | null
  ia_probabilidade_risco: number | null
  ia_nivel_alerta: 'REGULAR' | 'ATENCAO' | 'CRITICO' | null
  ia_recomendacao: string | null
  ia_data_predicao: string | null
  ia_versao_modelo: string | null
  data_cadastro: string
}

/* Cliente HTTP */

/** Erro de API com o status HTTP, para a tela poder tratar casos como 409 (RA duplicado). */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.', 0)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.erro || body.mensagem || `Erro HTTP ${response.status}`, response.status)
  }

  if (response.status === 204) return null as T

  return response.json()
}

/* Rotas */

export const api = {
  // Turmas
  turmas: () => request<Turma[]>('/turmas'),

  criarTurma: (dados: { nome: string; turno: string }) =>
    request<Turma>('/turmas', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),

  // Alunos

  /** Lista crua do backend (snake_case). */
  listarAlunos: (filtros: { turmaId?: number } = {}) => {
    const qs = filtros.turmaId ? `?turmaId=${filtros.turmaId}` : ''
    return request<{ sucesso: boolean; total: number; alunos: AlunoApi[] }>(`/alunos${qs}`).then((r) => r.alunos)
  },

  consultarAluno: (id: number | string) =>
    request<{ sucesso: boolean; aluno: AlunoApi & { plan: { status: string; owners: unknown } | null } }>(
      `/alunos/${encodeURIComponent(String(id))}`
    ).then((r) => r.aluno),

  alunos: () => api.listarAlunos().then((lista) => lista as unknown as Student[]),

  cadastrarAluno: (dados: CadastroAlunoPayload) =>
    request<{ sucesso: boolean; aluno: AlunoCadastrado }>('/alunos', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),


  atualizarAluno: (id: number | string, dados: CadastroAlunoPayload) =>
    request<{ sucesso: boolean; mensagem?: string }>(
      `/alunos/${encodeURIComponent(String(id))}`,
      {
        method: 'PATCH',
        body: JSON.stringify(dados)
      }
    ),


  excluirAluno: (id: number | string) =>
    request<{ sucesso: boolean; mensagem?: string }>(`/alunos/${encodeURIComponent(String(id))}`, {
      method: 'DELETE'
    }),

  // Predição (LightGBM)
  preverRisco: (dados: PredicaoPayload) =>
    request<{ sucesso: boolean; mensagem?: string; resultado: PredicaoResultado }>('/predict/aluno', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),

  //  Intervenções
  salvarPlano: (id: string, dados: Plan) =>
    request<Plan>(`/intervencoes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    }),

  // Dados reais do ENEM
  enemResumo: () => request<EnemResumo>('/enem/resumo'),

  enemEstatisticas: () => request<EnemEstatisticas>('/enem/estatisticas'),

  enemParticipantes: (pagina = 1, limite = 20) =>
    request<EnemParticipantesPage>(`/enem/participantes?pagina=${pagina}&limite=${limite}`)
}