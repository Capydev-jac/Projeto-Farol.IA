
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

import { api } from './services/api.js'
import { parseCSV, parseLevel, norm } from './utils.js'
import { SCHOOLS, RENDAS, ESCOLARIDADES, INFRAS } from './data.js'

const Ctx = createContext(null)

export function StoreProvider({ children }) {

  // Estados originais do sistema
  const [students, setStudents] = useState([])
  const [turmas, setTurmas] = useState([])
  const [plans, setPlans] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Novos estados: dados reais do ENEM
  const [enemResumo, setEnemResumo] = useState(null)
  const [enemEstatisticas, setEnemEstatisticas] = useState(null)
  const [enemParticipantes, setEnemParticipantes] = useState([])

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
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Cadastro de turmas
  const addTurma = async (ident, turno) => {
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
      return { error: e.message }
    }
  }

  // Cadastro de alunos
  const addStudents = async inputs => {
    const created = []

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
      return { error: e.message }
    }
  }

  // Importação CSV original do sistema
  const importCSV = async text => {
    const rows = parseCSV(text)

    if (rows.length < 2) {
      return {
        added: 0,
        errors: ['Arquivo vazio ou sem linhas de dados.']
      }
    }

    const head = rows[0].map(norm)
    const col = name => head.findIndex(h => h.startsWith(name))

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

    const inputs = []
    const errors = []

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

      const bad = []

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
          school,
          turma: turma.nome,
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

    if (result?.error) {
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
  const setPlan = async (id, plan) => {
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
      return { error: e.message }
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

export const useStore = () => useContext(Ctx)
