import type { AlunoApi } from '../services/api'
import type { Risk, Student } from '../types'

function codigoLetra(valor: string | null | undefined): number {
  if (!valor) return -1

  const indice = 'ABCDEFGHIJKLMNOPQ'.indexOf(
    valor.toUpperCase()
  )

  return indice
}

function converterRenda(
  valor: string | null | undefined
): number {
  const codigo = codigoLetra(valor)

  if (codigo < 0) return -1
  if (codigo <= 1) return 0
  if (codigo <= 3) return 1
  if (codigo <= 7) return 2

  return 3
}

function converterEscolaridade(
  pai: string | null | undefined,
  mae: string | null | undefined
): number {
  const valores = [pai, mae]
    .map(codigoLetra)
    .filter(v => v >= 0 && v <= 6)

  if (valores.length === 0) return -1

  const maior = Math.max(...valores)

  if (maior <= 3) return 0
  if (maior === 4) return 1

  return 2
}

function converterInfra(a: AlunoApi): number {
  const itens = [
    a.veiculo_proprio,
    a.refrigeracao,
    a.conectividade
  ]

  const quantidade = itens.filter(
    valor => Number(valor) === 1
  ).length

  if (quantidade === 0) return 0
  if (quantidade <= 2) return 1

  return 2
}

function converterRisco(
  alerta: AlunoApi['ia_nivel_alerta']
): Risk {
  switch (alerta) {
    case 'CRITICO':
      return 'Elevado'
    case 'ATENCAO':
      return 'Atenção'
    case 'REGULAR':
      return 'Menor'
    default:
      return 'Pendente'
  }
}

export function alunoApiParaStudent(
  aluno: AlunoApi
): Student {
  return {
    id: String(aluno.id),
    turmaId: aluno.turma_id == null
      ? undefined
      : String(aluno.turma_id),

    school: 'Não informada',
    turma: aluno.turma ?? 'Sem turma',
    shift: aluno.turno ?? 'Não informado',

    // A API ainda não retorna frequência.
    // Zero é um valor provisório, não uma frequência real.
    freq: 0,

    // A API de risco ainda não retorna notas previstas.
    enem: 0,
    lo: 0,
    hi: 0,

    risk: converterRisco(aluno.ia_nivel_alerta),

    // Será sincronizado com a API de intervenções depois.
    hasPlan: false,

    renda: converterRenda(aluno.q006_renda_familiar),

    esc: converterEscolaridade(
      aluno.q001_escolaridade_pai,
      aluno.q002_escolaridade_mae
    ),

    infra: converterInfra(aluno),

    custom: true
  }
}
