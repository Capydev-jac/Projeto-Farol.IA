// Converte um aluno em CÓDIGOS NUMÉRICOS para os dois contratos da API. Usado pelo formulário e pela importação em lote.
import type { CadastroAlunoPayload, PredicaoPayload, AlunoApi } from '../../services/api'
import * as O from './formOptions'

export interface AlunoNumerico {
  nome: string
  ra: string
  turmaId: number | null
  faixa: number        // TP_FAIXA_ETARIA
  sexo: number         // TP_SEXO: 0 = M, 1 = F
  q001: number         // escolaridade pai   (-1 = não sei, 0..6)
  q002: number         // escolaridade mãe   (-1 = não sei, 0..6)
  q003: number         // ocupação pai       (-1 = não sei, 0..4)
  q004: number         // ocupação mãe       (-1 = não sei, 0..4)
  q005: number         // moradores          (1..20)
  q006: number         // renda              (0..16)
  q009: number         // quartos            (0..4)
  q014: number         // máquina de lavar   (0..4)
  q019: number         // televisores        (0..4)
  q022: number         // celulares          (0..4)
  veiculo: number      // 0/1
  refrig: number       // 0/1
  conect: number       // 0/1
}

/** POST /api/alunos (o banco guarda letras). */
export function paraCadastro(a: AlunoNumerico): CadastroAlunoPayload {
  return {
    numero_matricula: a.ra.trim(),
    nome: a.nome.trim(),
    turma_id: a.turmaId,
    tp_faixa_etaria: a.faixa,
    tp_sexo: O.sexoParaLetra(a.sexo),
    q001_escolaridade_pai: O.escolaridadeParaLetra(a.q001),
    q002_escolaridade_mae: O.escolaridadeParaLetra(a.q002),
    q003_ocupacao_pai: O.ocupacaoParaLetra(a.q003),
    q004_ocupacao_mae: O.ocupacaoParaLetra(a.q004),
    q005_tamanho_familia: a.q005,
    q006_renda_familiar: O.ordinalParaLetra(a.q006),
    q009_quartos: O.ordinalParaLetra(a.q009),
    q014_maquina_lavar: O.ordinalParaLetra(a.q014),
    q019_televisores: O.ordinalParaLetra(a.q019),
    q022_celulares: O.ordinalParaLetra(a.q022),
    veiculo_proprio: a.veiculo as 0 | 1,
    refrigeracao: a.refrig as 0 | 1,
    conectividade: a.conect as 0 | 1
  }
}

/** POST /api/predict/aluno (o modelo espera números). */
export function paraPredicao(a: AlunoNumerico): PredicaoPayload {
  return {
    matricula_ra: a.ra.trim(),
    nome_aluno: a.nome.trim(),
    TP_FAIXA_ETARIA: a.faixa, TP_SEXO: a.sexo,
    Q001: a.q001, Q002: a.q002, Q003: a.q003, Q004: a.q004,
    Q005: a.q005, Q006: a.q006,
    Q009: a.q009, Q014: a.q014, Q019: a.q019, Q022: a.q022,
    VEICULO_PROPRIO: a.veiculo, REFRIGERACAO: a.refrig, CONECTIVIDADE: a.conect
  }
}

/** Converte um AlunoApi (vindo do banco com letras) em PredicaoPayload (números para o modelo LightGBM) */
export function alunoApiParaPredicao(a: AlunoApi): PredicaoPayload {
  const LETRAS = 'ABCDEFGHIJKLMNOPQ'

  const converterLetra = (letra: string | null | undefined, padrao = 0) => {
    if (!letra) return padrao
    const idx = LETRAS.indexOf(letra.toUpperCase())
    return idx >= 0 ? idx : padrao
  }

  const converterEscolaridade = (letra: string | null | undefined) => {
    if (!letra || letra.toUpperCase() === 'H') return -1
    const idx = 'ABCDEFG'.indexOf(letra.toUpperCase())
    return idx >= 0 ? idx : -1
  }

  const converterOcupacao = (letra: string | null | undefined) => {
    if (!letra || letra.toUpperCase() === 'F') return -1
    const idx = 'ABCDE'.indexOf(letra.toUpperCase())
    return idx >= 0 ? idx : -1
  }

  return {
    matricula_ra: a.numero_matricula,
    nome_aluno: a.nome,
    TP_FAIXA_ETARIA: Number(a.tp_faixa_etaria || 2),
    TP_SEXO: a.tp_sexo === 'F' ? 1 : 0,
    Q001: converterEscolaridade(a.q001_escolaridade_pai),
    Q002: converterEscolaridade(a.q002_escolaridade_mae),
    Q003: converterOcupacao(a.q003_ocupacao_pai),
    Q004: converterOcupacao(a.q004_ocupacao_mae),
    Q005: Number(a.q005_tamanho_familia || 4),
    Q006: converterLetra(a.q006_renda_familiar, 1),
    Q009: converterLetra(a.q009_quartos, 2),
    Q014: converterLetra(a.q014_maquina_lavar, 1),
    Q019: converterLetra(a.q019_televisores, 1),
    Q022: converterLetra(a.q022_celulares, 2),
    VEICULO_PROPRIO: a.veiculo_proprio ? 1 : 0,
    REFRIGERACAO: a.refrigeracao ? 1 : 0,
    CONECTIVIDADE: a.conectividade ? 1 : 0
  }
}


/** Converte um aluno do banco para preencher o formulário de edição. */
export function alunoApiParaNumerico(a: AlunoApi): AlunoNumerico {
  const converterLetra = (letra: string | null | undefined, padrao = 0) => {
    if (!letra) return padrao
    const idx = 'ABCDEFGHIJKLMNOPQ'.indexOf(letra.toUpperCase())
    return idx >= 0 ? idx : padrao
  }

  const converterEscolaridade = (letra: string | null | undefined) => {
    if (!letra) return -1
    if (letra.toUpperCase() === 'H') return -1
    const idx = 'ABCDEFG'.indexOf(letra.toUpperCase())
    return idx >= 0 ? idx : -1
  }

  const converterOcupacao = (letra: string | null | undefined) => {
    if (!letra) return -1
    if (letra.toUpperCase() === 'F') return -1
    const idx = 'ABCDE'.indexOf(letra.toUpperCase())
    return idx >= 0 ? idx : -1
  }

  return {
    nome: a.nome,
    ra: a.numero_matricula,
    turmaId: a.turma_id,
    faixa: Number(a.tp_faixa_etaria || 2),
    sexo: a.tp_sexo === 'F' ? 1 : 0,
    q001: converterEscolaridade(a.q001_escolaridade_pai),
    q002: converterEscolaridade(a.q002_escolaridade_mae),
    q003: converterOcupacao(a.q003_ocupacao_pai),
    q004: converterOcupacao(a.q004_ocupacao_mae),
    q005: Number(a.q005_tamanho_familia || 4),
    q006: converterLetra(a.q006_renda_familiar, 1),
    q009: converterLetra(a.q009_quartos, 2),
    q014: converterLetra(a.q014_maquina_lavar, 1),
    q019: converterLetra(a.q019_televisores, 1),
    q022: converterLetra(a.q022_celulares, 2),
    veiculo: a.veiculo_proprio ? 1 : 0,
    refrig: a.refrigeracao ? 1 : 0,
    conect: a.conectividade ? 1 : 0
  }
}
