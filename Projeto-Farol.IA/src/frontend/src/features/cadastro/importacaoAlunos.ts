// Leitura e validação do CSV de importação em lote
import { parseCSV, norm } from '../../lib/utils'
import type { AlunoNumerico } from './alunoMapper'

interface Coluna {
  chave: keyof AlunoNumerico
  nome: string          // cabeçalho no CSV
  ajuda: string         // texto da legenda
  exemplo: string | number
  min?: number
  max?: number
  aceita?: number[]     // valores extras permitidos além do intervalo (ex.: -1 = "Não sei")
}

export const COLUNAS: Coluna[] = [
  { chave: 'nome',    nome: 'nome',             ajuda: 'Nome completo',                                  exemplo: 'Maria Souza' },
  { chave: 'ra',      nome: 'ra',               ajuda: 'RA / matrícula (único)',                         exemplo: '20263014' },
  { chave: 'turmaId', nome: 'turma',            ajuda: 'Nome da turma já cadastrada (opcional)',         exemplo: '3ª Série A' },
  { chave: 'faixa',   nome: 'faixa_etaria',     ajuda: '1 a 6 (1 = <17 anos … 6 = 21+). Aceita até 20',  exemplo: 2, min: 1, max: 20 },
  { chave: 'sexo',    nome: 'sexo',             ajuda: 'M/F (ou 0 = masculino, 1 = feminino)',           exemplo: 'F' },
  { chave: 'q001',    nome: 'escolaridade_pai', ajuda: '0 a 6; -1 = não sei',                            exemplo: 3, min: 0, max: 6, aceita: [-1] },
  { chave: 'q002',    nome: 'escolaridade_mae', ajuda: '0 a 6; -1 = não sei',                            exemplo: 4, min: 0, max: 6, aceita: [-1] },
  { chave: 'q003',    nome: 'ocupacao_pai',     ajuda: '0 a 4 (grupos 1–5); -1 = não sei',               exemplo: 2, min: 0, max: 4, aceita: [-1] },
  { chave: 'q004',    nome: 'ocupacao_mae',     ajuda: '0 a 4 (grupos 1–5); -1 = não sei',               exemplo: 1, min: 0, max: 4, aceita: [-1] },
  { chave: 'q005',    nome: 'moradores',        ajuda: '1 a 20 (8 ou mais = 8)',                         exemplo: 4, min: 1, max: 20 },
  { chave: 'q006',    nome: 'renda',            ajuda: '0 a 16 (0 = nenhuma; 1,3,5,7,10,14 = faixas)',   exemplo: 3, min: 0, max: 16 },
  { chave: 'q009',    nome: 'quartos',          ajuda: '0 a 4 (4 = quatro ou mais)',                     exemplo: 2, min: 0, max: 4 },
  { chave: 'q014',    nome: 'maquina_lavar',    ajuda: '0 a 4',                                          exemplo: 1, min: 0, max: 4 },
  { chave: 'q019',    nome: 'televisores',      ajuda: '0 a 4',                                          exemplo: 2, min: 0, max: 4 },
  { chave: 'q022',    nome: 'celulares',        ajuda: '0 a 4',                                          exemplo: 3, min: 0, max: 4 },
  { chave: 'veiculo', nome: 'veiculo_proprio',  ajuda: '1 = sim, 0 = não (carro ou moto)',               exemplo: 1, min: 0, max: 1 },
  { chave: 'refrig',  nome: 'refrigeracao',     ajuda: '1 = sim, 0 = não (geladeira ou freezer)',        exemplo: 1, min: 0, max: 1 },
  { chave: 'conect',  nome: 'conectividade',    ajuda: '1 = sim, 0 = não (computador ou internet)',      exemplo: 1, min: 0, max: 1 }
]

/** Linhas do arquivo-modelo */
export function linhasModelo(): (string | number)[][] {
  const ex2: Record<string, string | number> = { nome: 'João Lima', ra: '20263015', turma: '', sexo: 'M', faixa_etaria: 3, renda: 1, moradores: 5, escolaridade_pai: -1, ocupacao_pai: -1 }
  return [
    COLUNAS.map((c) => c.nome),
    COLUNAS.map((c) => c.exemplo),
    COLUNAS.map((c) => (c.nome in ex2 ? ex2[c.nome] : c.exemplo))
  ]
}

export interface LinhaImport {
  linha: number              // nº da linha no arquivo (cabeçalho = 1)
  aluno: AlunoNumerico
}
export interface ResultadoLeitura {
  validas: LinhaImport[]
  erros: string[]
}

const SIM = new Set(['1', 's', 'sim', 'true'])
const NAO = new Set(['0', 'n', 'nao', 'false'])

function lerSexo(v: string): number | null {
  const t = norm(v)
  if (['m', 'masculino', '0'].includes(t)) return 0
  if (['f', 'feminino', '1'].includes(t)) return 1
  return null
}

function lerNumero(v: string, c: Coluna): number | null {
  const t = norm(v)
  if (c.max === 1 && c.min === 0) {            // campos sim/não
    if (SIM.has(t)) return 1
    if (NAO.has(t)) return 0
    return null
  }
  if (!/^-?\d+$/.test(t)) return null
  const n = Number(t)
  if (c.aceita?.includes(n)) return n
  return n >= (c.min ?? -Infinity) && n <= (c.max ?? Infinity) ? n : null
}

export function lerCSV(text: string, turmas: { id: string; nome: string }[]): ResultadoLeitura {
  const rows = parseCSV(text)
  if (rows.length < 2) return { validas: [], erros: ['Arquivo vazio ou sem linhas de dados.'] }

  const cab = rows[0].map(norm)
  const idx = new Map<string, number>()
  COLUNAS.forEach((c) => idx.set(c.nome, cab.indexOf(norm(c.nome))))

  const obrigatorias = COLUNAS.filter((c) => c.nome !== 'turma')
  const ausentes = obrigatorias.filter((c) => idx.get(c.nome)! < 0).map((c) => c.nome)
  if (ausentes.length) {
    return { validas: [], erros: [`Colunas ausentes no cabeçalho: ${ausentes.join(', ')}. Baixe o modelo para ver o formato correto.`] }
  }

  const validas: LinhaImport[] = []
  const erros: string[] = []
  const rasVistos = new Map<string, number>()
  const cel = (r: string[], nome: string) => (idx.get(nome)! >= 0 ? r[idx.get(nome)!] ?? '' : '')

  rows.slice(1).forEach((r, i) => {
    const linha = i + 2
    if (r.every((x) => !x.trim())) return
    const ruins: string[] = []
    const a = {} as AlunoNumerico

    a.nome = cel(r, 'nome').trim()
    a.ra = cel(r, 'ra').trim()
    if (!a.nome) ruins.push('nome vazio')
    if (!a.ra) ruins.push('ra vazio')
    else if (rasVistos.has(a.ra)) ruins.push(`RA repetido (já na linha ${rasVistos.get(a.ra)})`)

    const nomeTurma = cel(r, 'turma').trim()
    a.turmaId = null
    if (nomeTurma) {
      const t = turmas.find((x) => norm(x.nome) === norm(nomeTurma))
      if (t) a.turmaId = Number(t.id)
      else ruins.push(`turma "${nomeTurma}" não encontrada`)
    }

    const sexo = lerSexo(cel(r, 'sexo'))
    if (sexo === null) ruins.push('sexo inválido — use M ou F')
    else a.sexo = sexo

    for (const c of COLUNAS) {
      if (['nome', 'ra', 'turma', 'sexo'].includes(c.nome)) continue
      const n = lerNumero(cel(r, c.nome), c)
      if (n === null) ruins.push(`${c.nome} inválido — esperado: ${c.ajuda}`)
      else (a as unknown as Record<string, number>)[c.chave] = n
    }

    if (ruins.length) erros.push(`Linha ${linha}${a.ra ? ` (RA ${a.ra})` : ''}: ${ruins.join('; ')}.`)
    else {
      rasVistos.set(a.ra, linha)
      validas.push({ linha, aluno: a })
    }
  })

  return { validas, erros }
}