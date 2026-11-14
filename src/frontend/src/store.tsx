import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react'

import { api } from './services/api'
import { norm } from './utils'
import type {
  EnemEstatisticas,
  EnemParticipante,
  EnemResumo,
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