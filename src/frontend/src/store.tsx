import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react'

import { api, type AlunoApi } from './services/api'
import { norm } from './lib/utils'
import { alunoApiParaStudent } from './lib/alunoAdapter'
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
  alunosCadastrados: AlunoApi[]
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

  // Estados dos alunos cadastrados no banco
  const [alunosCadastrados, setAlunosCadastrados] = useState<AlunoApi[]>([])
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
        alunosResult,
        turmasResult,
        resumoResult,
        estatisticasResult,
        participantesResult
      ] = await Promise.allSettled([
        api.listarAlunos(),
        api.turmas(),
        api.enemResumo(),
        api.enemEstatisticas(),
        api.enemParticipantes(1, 20)
      ])

      // Dados dos alunos cadastrados
      if (alunosResult.status === 'fulfilled') {
        const alunos = alunosResult.value

        setAlunosCadastrados(alunos)

        const estudantesConvertidos = alunos.map(
          alunoApiParaStudent
        )

        setStudents(estudantesConvertidos)

        console.log(
          'Alunos carregados do backend:',
          estudantesConvertidos.length
        )
      } else {
        console.error(
          'Erro ao listar alunos:',
          alunosResult.reason
        )

        setError('Não foi possível carregar os alunos.')
      }

      // Turmas
      if (turmasResult.status === 'fulfilled') {
        setTurmas(turmasResult.value)
      } else {
        console.error('Erro ao listar turmas:', turmasResult.reason)
      }

      // Dados reais do ENEM
      if (resumoResult.status === 'fulfilled') {
        setEnemResumo(resumoResult.value)
      }

      if (estatisticasResult.status === 'fulfilled') {
        setEnemEstatisticas(estatisticasResult.value)
      }

      if (participantesResult.status === 'fulfilled') {
        setEnemParticipantes(participantesResult.value.participantes ?? [])
      }

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
    const raw = ident.trim()

    if (!raw) {
      return { error: 'Informe o identificador da turma.' }
    }

    const value = raw.toUpperCase()
    const nome = value.startsWith('3ª') ? value : `3ª ${value}`

    if (turmas.some(t => norm(t.nome || (t as { identificador?: string }).identificador || '') === norm(nome))) {
      return { error: `A turma ${nome} já existe.` }
    }

    try {
      const turma = await api.criarTurma({ nome, turno })

      setTurmas(current => [...current, turma])
      await refresh()

      return { turma: turma.nome || (turma as { identificador?: string }).identificador || nome }
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
        // Funcionalidades de alunos cadastrados e turmas
        alunosCadastrados,
        students,
        turmas,
        plans,
        loading,
        error,
        refresh,
        addTurma,
        setPlan,
        customCount: alunosCadastrados.length,
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