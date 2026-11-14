
import { calcularScoreModelo } from "../modeloLightGBM.js";

export type NivelAlerta = "REGULAR" | "ATENCAO" | "CRITICO";
export type CorSemaforo = "green" | "amber" | "red";

export interface AlunoPayload {
  nome_aluno?: string;
  matricula_ra?: string;

  TP_FAIXA_ETARIA: number;
  TP_SEXO: number;

  Q001: number;
  Q002: number;
  Q003: number;
  Q004: number;
  Q005: number;
  Q006: number;

  Q009: number;
  Q014: number;
  Q019: number;
  Q022: number;

  VEICULO_PROPRIO: number;
  REFRIGERACAO: number;
  CONECTIVIDADE: number;
}

export interface PredicaoResponse {
  nome_aluno?: string;
  matricula_ra?: string;

  risco_binario: 0 | 1;
  probabilidade_percentual: number;

  nivel_alerta: NivelAlerta;
  cor_semaforo: CorSemaforo;
  recomendacao: string;

  versao_modelo: string;
}

const LIMIARES = {
  ATENCAO: 0.5,
  CRITICO: 0.65,
} as const;

function montarVetorFeatures(payload: AlunoPayload): number[] {
  const vetorFeatures = [
    Number(payload.TP_FAIXA_ETARIA),
    Number(payload.TP_SEXO),

    Number(payload.Q001),
    Number(payload.Q002),
    Number(payload.Q003),
    Number(payload.Q004),
    Number(payload.Q005),
    Number(payload.Q006),

    Number(payload.Q009),
    Number(payload.Q014),
    Number(payload.Q019),
    Number(payload.Q022),

    Number(payload.VEICULO_PROPRIO),
    Number(payload.REFRIGERACAO),
    Number(payload.CONECTIVIDADE),
  ];

  if (
    vetorFeatures.length !== 15 ||
    vetorFeatures.some((valor) => !Number.isFinite(valor))
  ) {
    throw new Error(
      "Os dados do aluno estão incompletos ou possuem valores inválidos."
    );
  }

  return vetorFeatures;
}

export function preverRiscoAluno(
  payload: AlunoPayload
): PredicaoResponse {
  const vetorFeatures = montarVetorFeatures(payload);

  const probabilidades = calcularScoreModelo(vetorFeatures);
  const probabilidadeRisco = probabilidades[1];

  if (
    !Number.isFinite(probabilidadeRisco) ||
    probabilidadeRisco < 0 ||
    probabilidadeRisco > 1
  ) {
    throw new Error("O modelo retornou uma probabilidade inválida.");
  }

  const percentual = Number(
    (probabilidadeRisco * 100).toFixed(2)
  );

  if (probabilidadeRisco >= LIMIARES.CRITICO) {
    return {
      nome_aluno: payload.nome_aluno,
      matricula_ra: payload.matricula_ra,
      risco_binario: 1,
      probabilidade_percentual: percentual,
      nivel_alerta: "CRITICO",
      cor_semaforo: "red",
      recomendacao:
        "Intervenção prioritária: tutoria individualizada, busca ativa e reforço pedagógico.",
      versao_modelo: "LightGBM-ENEM2023-Top15",
    };
  }

  if (probabilidadeRisco >= LIMIARES.ATENCAO) {
    return {
      nome_aluno: payload.nome_aluno,
      matricula_ra: payload.matricula_ra,
      risco_binario: 1,
      probabilidade_percentual: percentual,
      nivel_alerta: "ATENCAO",
      cor_semaforo: "amber",
      recomendacao:
        "Monitoramento preventivo: acompanhar frequência, atividades e desempenho escolar.",
      versao_modelo: "LightGBM-ENEM2023-Top15",
    };
  }

  return {
    nome_aluno: payload.nome_aluno,
    matricula_ra: payload.matricula_ra,
    risco_binario: 0,
    probabilidade_percentual: percentual,
    nivel_alerta: "REGULAR",
    cor_semaforo: "green",
    recomendacao:
      "Acompanhamento padrão: manter o acompanhamento regular do desempenho escolar.",
    versao_modelo: "LightGBM-ENEM2023-Top15",
  };
}
