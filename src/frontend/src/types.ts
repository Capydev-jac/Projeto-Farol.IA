export type Risk = 'Elevado' | 'Atenção' | 'Menor' | 'Pendente'

export type AreaKey = 'LC' | 'CH' | 'CN' | 'MT'

export interface Student {
  id: string
  nome?: string
  matricula?: string
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
  conectividade?: number
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