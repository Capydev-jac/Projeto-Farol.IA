// Opções do formulário de cadastro
// `value` = código NUMÉRICO que o modelo LightGBM espera (/api/predict/aluno).

export interface Opt {
  value: number
  label: string
}

//Bloco A: Perfil
export const FAIXA_ETARIA: Opt[] = [
  { value: 1, label: 'Menor de 17 anos (fluxo adiantado)' },
  { value: 2, label: '17 anos (idade regular - 3º ano)' },
  { value: 3, label: '18 anos (idade regular - 3º ano)' },
  { value: 4, label: '19 anos (distorção de 1 ano)' },
  { value: 5, label: '20 anos (distorção de 2 anos)' },
  { value: 6, label: '21 anos ou mais (distorção severa)' }
]

export const SEXO: Opt[] = [
  { value: 0, label: 'Masculino' },
  { value: 1, label: 'Feminino' }
]

// Bloco B: Família e renda
export const ESCOLARIDADE: Opt[] = [
  { value: 0, label: 'Nunca estudou' },
  { value: 1, label: 'Não completou a 4ª série/5º ano do Fund.' },
  { value: 2, label: 'Completou a 4ª/5º ano, não a 8ª/9º ano' },
  { value: 3, label: 'Completou a 8ª/9º ano, não o Ensino Médio' },
  { value: 4, label: 'Completou o Ensino Médio, não a Faculdade' },
  { value: 5, label: 'Completou a Faculdade, não a Pós-graduação' },
  { value: 6, label: 'Completou a Pós-graduação' },
  { value: -1, label: 'Não sei' }
]

export const OCUPACAO: Opt[] = [
  { value: 0, label: 'Grupo 1: Lavrador, agricultor, pescador…' },
  { value: 1, label: 'Grupo 2: Diarista, doméstico, vendedor…' },
  { value: 2, label: 'Grupo 3: Operário, pedreiro, motorista…' },
  { value: 3, label: 'Grupo 4: Professor básico, técnico, policial…' },
  { value: 4, label: 'Grupo 5: Médico, engenheiro, advogado…' },
  { value: -1, label: 'Não sei' }
]

// Q005: botões rápidos 1..8 (8 = "8 ou mais")
export const MORADORES: Opt[] = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  value: n,
  label: n === 8 ? '8+' : String(n)
}))

// Q006: Renda familiar mensal - 17 faixas oficiais do questionário socioeconômico do ENEM (A a Q)
export const RENDA: Opt[] = [
  { value: 0, label: 'A: Nenhuma renda' },
  { value: 1, label: 'B: Até R$ 1.320,00 (Até 1 salário mínimo)' },
  { value: 2, label: 'C: De R$ 1.320,01 até R$ 1.980,00 (1 a 1,5 salários mínimos)' },
  { value: 3, label: 'D: De R$ 1.980,01 até R$ 2.640,00 (1,5 a 2 salários mínimos)' },
  { value: 4, label: 'E: De R$ 2.640,01 até R$ 3.300,00 (2 a 2,5 salários mínimos)' },
  { value: 5, label: 'F: De R$ 3.300,01 até R$ 3.960,00 (2,5 a 3 salários mínimos)' },
  { value: 6, label: 'G: De R$ 3.960,01 até R$ 5.280,00 (3 a 4 salários mínimos)' },
  { value: 7, label: 'H: De R$ 5.280,01 até R$ 6.600,00 (4 a 5 salários mínimos)' },
  { value: 8, label: 'I: De R$ 6.600,01 até R$ 7.920,00 (5 a 6 salários mínimos)' },
  { value: 9, label: 'J: De R$ 7.920,01 até R$ 9.240,00 (6 a 7 salários mínimos)' },
  { value: 10, label: 'K: De R$ 9.240,01 até R$ 10.560,00 (7 a 8 salários mínimos)' },
  { value: 11, label: 'L: De R$ 10.560,01 até R$ 11.880,00 (8 a 9 salários mínimos)' },
  { value: 12, label: 'M: De R$ 11.880,01 até R$ 13.200,00 (9 a 10 salários mínimos)' },
  { value: 13, label: 'N: De R$ 13.200,01 até R$ 15.840,00 (10 a 12 salários mínimos)' },
  { value: 14, label: 'O: De R$ 15.840,01 até R$ 19.800,00 (12 a 15 salários mínimos)' },
  { value: 15, label: 'P: De R$ 19.800,01 até R$ 26.400,00 (15 a 20 salários mínimos)' },
  { value: 16, label: 'Q: Acima de R$ 26.400,00 (Mais de 20 salários mínimos)' }
]

// Bloco C: Bens em quantidade (0..4)
const qtd = (zero: string, um: string, dois: string, tres: string, quatro: string): Opt[] => [
  { value: 0, label: zero },
  { value: 1, label: um },
  { value: 2, label: dois },
  { value: 3, label: tres },
  { value: 4, label: quatro }
]

// 0 = não possui; 4 = "quatro ou mais" (rótulos curtos para caber no seletor segmentado)
export const QUARTOS = qtd('0', '1', '2', '3', '4+')         // Q009
export const MAQUINA_LAVAR = qtd('0', '1', '2', '3', '4+')   // Q014
export const TELEVISORES = qtd('0', '1', '2', '3', '4+')     // Q019
export const CELULARES = qtd('0', '1', '2', '3', '4+')       // Q022

// Bloco D: Sim / Não
export const SIM_NAO: Opt[] = [
  { value: 1, label: 'Sim' },
  { value: 0, label: 'Não' }
]

// Conversores número (modelo) -> letra (banco)
const LETRAS = 'ABCDEFGHIJKLMNOPQ'

/** Q001/Q002: -1 -> 'H' (Não sei); 0..6 -> 'A'..'G' */
export const escolaridadeParaLetra = (v: number) => (v === -1 ? 'H' : LETRAS[v])

/** Q003/Q004: -1 -> 'F' (Não sei); 0..4 -> 'A'..'E' */
export const ocupacaoParaLetra = (v: number) => (v === -1 ? 'F' : LETRAS[v])

/** Q006 (0..16) e Q009/Q014/Q019/Q022 (0..4): 0 -> 'A', 1 -> 'B'… */
export const ordinalParaLetra = (v: number) => LETRAS[v]

export const sexoParaLetra = (v: number): 'M' | 'F' => (v === 1 ? 'F' : 'M')

// Decodificadores para exibição legível a partir das letras do banco
export const decodificarEscolaridade = (letra: string | null | undefined): string => {
  if (!letra) return '—'
  const l = letra.toUpperCase()
  if (l === 'H') return 'Não sei informar'
  const idx = 'ABCDEFG'.indexOf(l)
  if (idx >= 0 && ESCOLARIDADE[idx]) return ESCOLARIDADE[idx].label
  return `Letra ${l}`
}

export const decodificarOcupacao = (letra: string | null | undefined): string => {
  if (!letra) return '—'
  const l = letra.toUpperCase()
  if (l === 'F') return 'Não sei informar'
  const idx = 'ABCDE'.indexOf(l)
  if (idx >= 0 && OCUPACAO[idx]) return OCUPACAO[idx].label
  return `Letra ${l}`
}

export const decodificarRenda = (letra: string | null | undefined): string => {
  if (!letra) return '—'
  const l = letra.toUpperCase()
  const idx = LETRAS.indexOf(l)
  if (idx >= 0 && RENDA[idx]) return RENDA[idx].label
  return `Faixa ${l}`
}

export const decodificarBens = (letra: string | null | undefined): string => {
  if (!letra) return '—'
  const mapa: Record<string, string> = {
    A: '0 (Não possui)',
    B: '1',
    C: '2',
    D: '3',
    E: '4 ou mais'
  }
  return mapa[letra.toUpperCase()] || letra
}

export const decodificarFaixaEtaria = (codigo: number | null | undefined): string => {
  if (!codigo) return '—'
  const encontrado = FAIXA_ETARIA.find(f => f.value === codigo)
  if (encontrado) return encontrado.label
  if (codigo >= 7) return `${codigo + 15} anos ou mais`
  return `${codigo}`
}
