
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react'

import { api } from './services/api'
import { parseCSV, parseLevel, norm } from './utils'
import { SCHOOLS, RENDAS, ESCOLARIDADES, INFRAS } from './data'
import type {
  EnemEstatisticas,
  EnemParticipante,
  EnemResumo,
  NovoAluno,
  Plan,
  Student,
  Turma
} from './types'

interface StoreValue {
  students: Student[]
  turmas: Turma[]
  plans: Record<string, Plan>
  loading: boolean
  error: string
  refresh: () => Promise<void>
  addTurma: (ident: string, turno: string) => Promise<{ error?: string; turma?: string }>
  addStudents: (inputs: NovoAluno[]) => Promise<Student[] | { error: string }>
  importCSV: (text: string) => Promise<{ added: number; errors: string[] }>
  setPlan: (id: string, plan: Plan) => Promise<{ ok?: boolean; error?: string }>
  customCount: number
  customTurmas: number
  resetCustom?: () => void
  enemResumo: EnemResumo | null
  enemEstatisticas: EnemEstatisticas | null
  enemParticipantes: EnemParticipante[]
}

const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {

  // Estados originais do sistema
  const [students, setStudents] = useState<Student[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [plans, setPlans] = useState<Record<string, Plan>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Novos estados: dados reais do ENEM
  const [enemResumo, setEnemResumo] = useState<EnemResumo | null>(null)
  const [enemEstatisticas, setEnemEstatisticas] = useState<EnemEstatisticas | null>(null)
  const [enemParticipantes, setEnemParticipantes] = useState<EnemParticipante[]>([])

  // Busca os dados do backend e PostgreSQL
  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [
        alunos,
        turmasDados,
        resumo,
        estatisticas,
        participantes
      ] = await Promise.all([
        api.alunos(),
        api.turmas(),
        api.enemResumo(),
        api.enemEstatisticas(),
        api.enemParticipantes(1, 20)
      ])

      // Dados originais
      setStudents(alunos)
      setTurmas(turmasDados)

      // Dados reais do ENEM
      setEnemResumo(resumo)
      setEnemEstatisticas(estatisticas)
      setEnemParticipantes(participantes.participantes ?? [])

    } catch (e) {
      console.error('Erro ao carregar dados:', e)
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Cadastro de turmas
  const addTurma = async (ident: string, turno: string) => {
    const value = ident.trim().toUpperCase()

    if (!value) {
      return { error: 'Informe o identificador da turma.' }
    }

    const nome = `3ª ${value}`

    if (turmas.some(t => norm(t.nome) === norm(nome))) {
      return { error: `A turma ${nome} já existe.` }
    }

    try {
      const turma = await api.criarTurma({ nome, turno })

      setTurmas(current => [...current, turma])

      return { turma: turma.nome }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  // Cadastro de alunos
  const addStudents = async (inputs: NovoAluno[]): Promise<Student[] | { error: string }> => {
    const created: Student[] = []

    try {
      for (const item of inputs) {
        const turma = turmas.find(t => t.nome === item.turma)

        if (!turma) {
          throw new Error(`Turma ${item.turma} não encontrada.`)
        }

        const aluno = await api.criarAluno({
          school: item.school,
          turmaId: turma.id,
          freq: Number(item.freq),
          renda: Number(item.renda),
          esc: Number(item.esc),
          infra: Number(item.infra)
        })

        created.push(aluno)
      }

      setStudents(current => [...current, ...created])

      return created
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  // Importação CSV original do sistema
  const importCSV = async (text: string) => {
    const rows = parseCSV(text)

    if (rows.length < 2) {
      return {
        added: 0,
        errors: ['Arquivo vazio ou sem linhas de dados.']
      }
    }

    const head = rows[0].map(norm)
    const col = (name: string) => head.findIndex(h => h.startsWith(name))

    const idx = {
      turma: col('turma'),
      escola: col('escola'),
      renda: col('renda'),
      esc: col('escolaridade'),
      infra: col('infra'),
      freq: col('frequencia')
    }

    const missing = Object.entries(idx)
      .filter(([, v]) => v < 0)
      .map(([k]) => k)

    if (missing.length) {
      return {
        added: 0,
        errors: [`Colunas ausentes: ${missing.join(', ')}.`]
      }
    }

    const inputs: NovoAluno[] = []
    const errors: string[] = []

    rows.slice(1).forEach((r, i) => {
      const turma = turmas.find(
        t => norm(t.nome) === norm(r[idx.turma])
      )

      const school = SCHOOLS.find(
        s =>
          norm(s) === norm(r[idx.escola]) ||
          norm(s) === norm('Escola ' + r[idx.escola])
      )

      const renda = parseLevel(r[idx.renda], RENDAS)
      const esc = parseLevel(r[idx.esc], ESCOLARIDADES)
      const infra = parseLevel(r[idx.infra], INFRAS)

      const freq = Math.round(
        parseFloat(String(r[idx.freq]).replace(',', '.'))
      )

      const bad: string[] = []

      if (!turma) bad.push('turma')
      if (!school) bad.push('escola')
      if (renda < 0) bad.push('renda')
      if (esc < 0) bad.push('escolaridade')
      if (infra < 0) bad.push('infraestrutura')
      if (!(freq >= 0 && freq <= 100)) bad.push('frequência')

      if (bad.length) {
        errors.push(
          `Linha ${i + 2}: valor inválido em ${bad.join(', ')}.`
        )
      } else {
        inputs.push({
          school: school!,
          turma: turma!.nome,
          freq,
          renda,
          esc,
          infra
        })
      }
    })

    const result = inputs.length
      ? await addStudents(inputs)
      : []

    if ('error' in result) {
      return {
        added: 0,
        errors: [...errors, result.error]
      }
    }

    return {
      added: result.length,
      errors
    }
  }

  // Planos de intervenção
  const setPlan = async (id: string, plan: Plan) => {
    try {
      const saved = await api.salvarPlano(id, plan)

      setPlans(current => ({
        ...current,
        [id]: saved
      }))

      setStudents(current =>
        current.map(s =>
          s.id === id
            ? { ...s, hasPlan: true }
            : s
        )
      )

      return { ok: true }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  // Disponibiliza os dados para todas as páginas
  return (
    <Ctx.Provider
      value={{
        // Funcionalidades originais
        students,
        turmas,
        plans,
        loading,
        error,
        refresh,
        addTurma,
        addStudents,
        importCSV,
        setPlan,
        customCount: students.length,
        customTurmas: turmas.length,

        // Dados reais do ENEM
        enemResumo,
        enemEstatisticas,
        enemParticipantes
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useStore = () => useContext(Ctx) as StoreValue