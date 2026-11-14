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

// Q006: agrupado. value = letra representativa da faixa.
export const RENDA: Opt[] = [
  { value: 0, label: 'Nenhuma renda' },
  { value: 1, label: 'Até 1 salário mín. (até R$ 1.320)' },
  { value: 3, label: 'De 1 a 2 salários mín. (R$ 1.320 a R$ 2.640)' },
  { value: 5, label: 'De 2 a 3 salários mín. (R$ 2.640 a R$ 3.960)' },
  { value: 7, label: 'De 3 a 5 salários mín. (R$ 3.960 a R$ 6.600)' },
  { value: 10, label: 'De 5 a 10 salários mín. (R$ 6.600 a R$ 13.200)' },
  { value: 14, label: 'Acima de 10 salários mínimos (+ R$ 13.200)' }
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