export type Risk = 'Elevado' | 'Atenção' | 'Menor' | 'Pendente'

export type AreaKey = 'LC' | 'CH' | 'CN' | 'MT'

export interface Student {
  id: string
  school: string
  turma: string
  turmaId?: string
  shift: string
  freq: number
  enem: number
  lo: number
  hi: number
  risk: Risk
  hasPlan: boolean
  renda: number
  esc: number
  infra: number
  custom?: boolean
}

export interface Turma {
  id: string
  nome: string
  turno: string
  escola?: string
  custom?: boolean
}

export interface Plan {
  status: string
  owners: string[]
}

export interface NovoAluno {
  school: string
  turma: string
  shift?: string
  freq: number | string
  renda: number | string
  esc: number | string
  infra: number | string
}

export interface Filters {
  q?: string
  school?: string
  turma?: string
  risk?: string
  renda?: string | number
  esc?: string | number
  infra?: string | number
  freqMax?: string | number
  mtMax?: string | number
}

export interface EnemResumo {
  total_participantes: number
  media_cn: string | null
  media_ch: string | null
  media_lc: string | null
  media_mt: string | null
  media_redacao: string | null
}

export interface EnemCategoria {
  categoria: string | null
  total: number
}

export interface EnemEstatisticas {
  sexo: EnemCategoria[]
  faixa_etaria: EnemCategoria[]
  tipo_escola: EnemCategoria[]
  estados: EnemCategoria[]
}

export interface EnemParticipante {
  inscricao: string
  ano: string | null
  faixa_etaria: string | null
  sexo: string | null
  tipo_escola: string | null
  uf_prova: string | null
  nota_cn: string | number | null
  nota_ch: string | number | null
  nota_lc: string | number | null
  nota_mt: string | number | null
  nota_redacao: string | number | null
}

export interface EnemParticipantesPage {
  pagina: number
  limite: number
  participantes: EnemParticipante[]
}