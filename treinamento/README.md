# 📊 Dataset, Engenharia de Atributos e Modelo Preditivo — Farol.Edu (ENEM 2023)

Este diretório armazena a base de dados tratada, a documentação do dicionário de variáveis e os artefatos do modelo de Machine Learning (**LightGBM Classifier**) desenvolvidos para o projeto **Farol.Edu**. O objetivo do modelo é realizar a predição precoce de risco de defasagem educacional em turmas concluintes do 3º ano do Ensino Médio a partir de indicadores demográficos e socioeconômicos.

---

## 📁 Artefatos Disponíveis neste Repositório

A base bruta original do INEP (`MICRODADOS_ENEM_2023.csv`, com ~3,9 milhões de inscritos e 1,65 GB) passou por um pipeline de filtragem de escopo, seleção de relevância (*Feature Selection*) e consolidação de atributos de produto, resultando em uma matriz enxuta de **681.357 estudantes** e **16 colunas** (`15 features` + `1 target`):

| Arquivo | Formato | Descrição e Finalidade no Projeto |
| :--- | :---: | :--- |
| **`ENEM_2023_3ANO_TOP15.parquet`** | `.parquet` | **Base principal de Treinamento e Análise.** 100% numérica (`int8`), sem valores nulos (`NaN`), compactada (leitura instantânea no Google Colab/Python) e contendo apenas os 15 atributos preditores finais e a variável-alvo `RISCO_DEFASAGEM`. *(Nota: A versão `.csv` supera o limite de 25 MB de upload web do GitHub, sendo substituída com vantagem pelo formato `.parquet`)*. |
| **`modeloLightGBM.ts`** | `.ts` | **Módulo de Inferência para Produção (Node.js / TypeScript).** Código nativo transpilado via `m2cgen` a partir do modelo LightGBM treinado. Permite executar predições em tempo real na API sem dependência de binários externos. |
| **`Dicionario_Dados.docx`** | `.docx` | Especificação detalhada do mapeamento numérico de todas as variáveis, guia de agrupamento visual de UX para o Frontend e contrato JSON da API. |

---

## 🛠️ Pipeline de Tratamento e Seleção de Escopo

### 1. Escolha da Edição 2023 (Vínculo 1:1 Participante $\rightarrow$ Desempenho)
A partir da edição de 2024, o INEP desmembrou os microdados em tabelas separadas sem chave de cruzamento individual entre o questionário socioeconômico e as notas das provas. A edição de **2023** foi selecionada por ser a base pós-pandemia mais recente que preserva a integridade da relação $1:1$ na mesma linha do registro.

### 2. Filtragem de Escopo e Higienização de Nulos (`NaN`)
Para refletir fielmente a realidade de estudantes regulares em sala de aula e eliminar ruídos provocados por abstenções, foram aplicados os seguintes filtros:
1. **Exclusão de Treineiros (`IN_TREINEIRO == 0`):** Remoção de candidatos de 1º e 2º ano que realizaram a prova apenas para experiência.
2. **Recorte Exclusivo de Concluintes do 3º Ano (`TP_ST_CONCLUSAO == 2`):** Manutenção exclusiva de alunos matriculados no último ano do Ensino Médio regular.
3. **Presença Integral e Redação Válida:** Mantidos apenas estudantes presentes nos dois dias de exame (`TP_PRESENCA_CN == 1`, `CH == 1`, `LC == 1`, `MT == 1`) e com redação corrigida sem anulação (`TP_STATUS_REDACAO == 1`).
4. **Remoção de Resíduos (`.dropna()`):** Eliminação de registros incompletos, consolidando **681.357 linhas 100% íntegras**.

### 3. Seleção de Atributos de Maior Relevância (*Feature Importance*)
Em uma primeira rodada exploratória com 60 variáveis (incluindo *One-Hot Encoding* de Unidades Federativas, Dependência Administrativa e Cor/Raça), identificou-se que os indicadores socioeconômicos familiares e a distorção idade-série concentravam mais de 95% do poder preditivo da árvore.
* Foram descartadas variáveis de identificação logística, gabaritos/notas parciais (prevenção de *Data Leakage*), itens domésticos obsoletos (`Q015` secadora, `Q017` lava-louças, `Q020` DVD, `Q023` telefone fixo) e variáveis de contexto escolar/regional de baixo ganho de informação.
* O formulário de entrada foi reduzido para **15 perguntas diretas**, dispensando transformações *dummies* complexas no Backend e tornando o preenchimento na plataforma web até 4 vezes mais rápido para o gestor escolar.

---

## 🎯 Variável-Alvo ($y$) e Engenharia de Atributos para Produto (UX)

### 1. Construção da Variável-Alvo (`RISCO_DEFASAGEM`)
O problema foi modelado como uma **Classificação Binária Supervisionada** voltada à intervenção preventiva:
* Calculou-se temporariamente a média aritmética simples das 5 provas (`CN`, `CH`, `LC`, `MT` e `REDACAO`).
* Definiu-se o limiar no **1º Quartil (25% menores médias gerais da distribuição)**.
* Criou-se a coluna binária **`RISCO_DEFASAGEM`**:
  * **`1` (Risco de Defasagem — 25,0% da base):** Estudantes posicionados no 1º quartil de notas, requerendo atenção pedagógica precoce.
  * **`0` (Desempenho Regular — 75,0% da base):** Estudantes posicionados nos 75% superiores da distribuição.
* **Prevenção Estrita de *Data Leakage*:** As 5 notas originais e a média temporária foram integralmente removidas da matriz antes da exportação do dataset.

### 2. Consolidação de Indicadores Binários de Produto (`0` = Não | `1` = Sim)
Para evitar perguntas excessivamente granulares no cadastro escolar e capturar o conforto material e digital da família de forma semântica, 6 questões originais do ENEM foram consolidadas em **3 indicadores binários (`int8`)**:
* **`VEICULO_PROPRIO`:** Assume `1` se a família possui automóvel (`Q010 > 0`) **ou** motocicleta (`Q011 > 0`), e `0` caso contrário.
* **`REFRIGERACAO`:** Assume `1` se a residência possui geladeira (`Q012 > 0`) **ou** freezer (`Q013 > 0`), e `0` caso contrário.
* **`CONECTIVIDADE`:** Assume `1` se o estudante possui computador/notebook (`Q024 > 0`) **ou** acesso à internet em casa (`Q025 > 0`), e `0` caso contrário.

---

## 🔢 Codificação Numérica e Ranking de Importância dos 15 Atributos ($X$)

Todas as 15 variáveis preditoras foram tipadas em `int8` (8 bits) seguindo sua hierarquia estatística. Abaixo está a lista ordenada das colunas pelo índice esperado no modelo e seu respectivo peso (*splits*) nas árvores do **LightGBM**:

| Índice no Vetor | Coluna | Descrição do Atributo | Escala Codificada (`int8`) | Importância (*Splits*) | Rank |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **`0`** | **`TP_FAIXA_ETARIA`** | Faixa etária do estudante (Distorção idade-série) | `1` (<17 anos) a `20` (>70 anos) | `1.678` | 4º |
| **`1`** | **`TP_SEXO`** | Sexo biológico | `0`: Masculino \| `1`: Feminino | `859` | 11º |
| **`2`** | **`Q001`** | Escolaridade do Pai (ou responsável masculino) | `-1`: Não sei \| `0`: Nunca estudou a `6`: Pós-graduação | `1.831` | 3º |
| **`3`** | **`Q002`** | Escolaridade da Mãe (ou responsável feminino) | `-1`: Não sei \| `0`: Nunca estudou a `6`: Pós-graduação | `1.606` | 5º |
| **`4`** | **`Q003`** | Grupo de Ocupação do Pai | `-1`: Não sei \| `0`: Grupo 1 (Rural/Informal) a `4`: Grupo 5 | `1.555` | 6º |
| **`5`** | **`Q004`** | Grupo de Ocupação da Mãe | `-1`: Não sei \| `0`: Grupo 1 (Rural/Informal) a `4`: Grupo 5 | `1.403` | 7º |
| **`6`** | **`Q005`** | Total de moradores na residência | `1` (mora sozinho) a `20` pessoas | `2.096` | 2º |
| **`7`** | **`Q006`** | Renda Mensal Familiar Total | `0`: Nenhuma renda (`A`) a `16`: Acima de R$ 26.400 (`Q`) | `2.385` | 1º |
| **`8`** | **`Q009`** | Quantidade de quartos para dormir | `0`: Nenhum a `4`: Quatro ou mais | `1.016` | 10º |
| **`9`** | **`Q014`** | Posse/quantidade de máquina de lavar roupa | `0`: Nenhuma a `4`: Quatro ou mais | `775` | 12º |
| **`10`** | **`Q019`** | Posse/quantidade de televisão em cores | `0`: Nenhuma a `4`: Quatro ou mais | `1.062` | 9º |
| **`11`** | **`Q022`** | Quantidade de telefones celulares na residência | `0`: Nenhum a `4`: Quatro ou mais | `1.377` | 8º |
| **`12`** | **`VEICULO_PROPRIO`** | Posse de locomoção própria (Carro ou Moto) | `0`: Não possui \| `1`: Sim, possui | `478` | 13º |
| **`13`** | **`REFRIGERACAO`** | Posse de equipamento de refrigeração (Geladeira/Freezer) | `0`: Não possui \| `1`: Sim, possui | `109` | 15º |
| **`14`** | **`CONECTIVIDADE`** | Acesso digital domiciliar (Computador ou Internet) | `0`: Não possui \| `1`: Sim, possui | `348` | 14º |

> **Interpretabilidade Sociológica:** O modelo combina `Q006` (1º lugar) e `Q005` (2º lugar) nos nós superiores das árvores para estimar implicitamente a **renda per capita familiar**, cruzando-a em seguida com o **capital cultural dos pais** (`Q001`, `Q002`, `Q003`, `Q004`) e com o indicador de **atraso escolar** (`TP_FAIXA_ETARIA`).

---

## 📈 Resultados de Validação (RNF03) e Semáforo Pedagógico (RF03)

A base final foi dividida de forma estratificada em **545.085 registros de treino (80%)** e **136.272 registros de teste (20%)**, aplicando-se `class_weight='balanced'`.

### 1. Comparativo de Algoritmos no Conjunto de Teste ($n = 136.272$)
* **LightGBM Classifier (Modelo Vencedor):** `ROC-AUC = 0.7578` | `Acurácia = 67%` | `Recall (Risco) = 72%` | `Precision (Regular) = 88%` | `F1-Score (Risco) = 0.525`.
* **Random Forest Classifier (Baseline):** `ROC-AUC = 0.7541` | `Acurácia = 67%` | `Recall (Risco) = 72%` | `Precision (Regular) = 87%` | `F1-Score (Risco) = 0.520`.

### 2. Calibração de Limiares para o Semáforo do Dashboard
Em vez de um corte único rígido, as probabilidades contínuas geradas pelo modelo alimentam três faixas de priorização pedagógica no painel do gestor:

| Faixa de Probabilidade | Status no Semáforo | Métricas de Validação no Teste ($n = 136.272$) | Proporção Sinalizada na Turma | Ação Pedagógica Recomendada |
| :---: | :--- | :--- | :---: | :--- |
| **`>= 65,0%`** | 🔴 **CRÍTICO** | **Acurácia Geral: 75,4%** \| **Precision: 50,9%** \| **Recall: 45,0%** (`30.107` alunos em alerta) | **~22,1% da turma** | **Intervenção Imediata:** Tutoria individualizada, busca ativa e reforço prioritário no contraturno. |
| **`50,0% a 64,9%`** | 🟡 **ATENÇÃO** | **F1-Score Máximo: 0,525** \| **Recall Acumulado: 71,8%** \| **Acurácia: 67,5%** (`59.142` alunos acumulados) | **~21,3% da turma** *(43,4% acumulados)* | **Monitoramento Preventivo:** Acompanhamento próximo de frequência, tarefas e oferta de laboratório escolar. |
| **`< 50,0%`** | 🟢 **REGULAR** | **Precision da Classe Regular: 88,0%** (`77.130` alunos regulares) | **~56,6% da turma** | **Acompanhamento Padrão:** Seguimento normal do calendário pedagógico da turma. |

---

## 💻 Como Utilizar os Artefatos no Código

### A. Em Python (Análise Exploratória ou Retreinamento no Colab)
```python
import pandas as pd

# Carregar a base final enxuta em Parquet
df = pd.read_parquet('ENEM_2023_3ANO_TOP15.parquet')

X = df.drop(columns=['RISCO_DEFASAGEM'])
y = df['RISCO_DEFASAGEM']

print(f"Dataset carregado: {X.shape[0]:,} alunos e {X.shape[1]} atributos preditores.")
```

### B. Em TypeScript / Node.js (Consumo na API Backend via `m2cgen`)
```typescript
import { calcularScoreModelo } from './modeloLightGBM';

// Vetor posicional contendo os 15 atributos do aluno (Índices 0 a 14)
const vetorAluno: number[] = [
  3, // 0: TP_FAIXA_ETARIA (18 anos)
  0, // 1: TP_SEXO (Masculino)
  2, // 2: Q001 (Pai completou 5º ano EF)
  3, // 3: Q002 (Mãe completou 9º ano EF)
  1, // 4: Q003 (Ocupação Pai - Grupo 2)
  1, // 5: Q004 (Ocupação Mãe - Grupo 2)
  5, // 6: Q005 (5 moradores na casa)
  1, // 7: Q006 (Renda até 1 salário mínimo)
  2, // 8: Q009 (2 quartos)
  1, // 9: Q014 (1 máquina de lavar)
  1, // 10: Q019 (1 televisão)
  2, // 11: Q022 (2 celulares)
  0, // 12: VEICULO_PROPRIO (Não possui carro/moto)
  1, // 13: REFRIGERACAO (Possui geladeira/freezer)
  0  // 14: CONECTIVIDADE (Não possui PC/Internet)
];

const [probRegular, probRisco] = calcularScoreModelo(vetorAluno) as number[];
const percentualRisco = Number((probRisco * 100).toFixed(1));
const nivelAlerta = probRisco >= 0.65 ? 'CRITICO' : probRisco >= 0.50 ? 'ATENCAO' : 'REGULAR';

console.log(`Probabilidade de Defasagem: ${percentualRisco}% | Status: ${nivelAlerta}`);
```
