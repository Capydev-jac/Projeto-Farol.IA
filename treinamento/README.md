# 📊 Dataset e Pipeline de Tratamento de Dados — Farol.Edu (ENEM 2023)

Este diretório armazena as bases de dados tratadas, higienizadas e codificadas a partir dos **Microdados do ENEM 2023** (INEP), utilizadas para o treinamento do modelo de Machine Learning de predição precoce de defasagem educacional e para a geração de indicadores comparativos da plataforma.

---

## 📁 Arquivos Disponíveis neste Repositório

A base original do INEP (`MICRODADOS_ENEM_2023.csv`, com ~3,9 milhões de inscritos e 1,65 GB) passou por um pipeline rigoroso de limpeza, reduzindo o volume final para **681.360 registros íntegros** de estudantes concluintes do Ensino Médio:

| Arquivo | Formato | Descrição e Finalidade no Projeto |
| :--- | :---: | :--- |
| **`ENEM_2023_3ANO_ENCODED.parquet`** | `.parquet` | **Base principal de Treinamento (Recomendada).** 100% numérica, com *One-Hot Encoding* aplicado às variáveis nominais e tipagem otimizada (`int8`). Leitura ultrarrápida em Python/Colab. |
| **`ENEM_2023_3ANO_ENCODED.csv`** | `.csv` | Versão em texto separado por ponto e vírgula (`;`) da matriz 100% numérica codificada, mantida para compatibilidade universal e auditoria. |
| **`ENEM_2023_3ANO_ORDINAL.parquet`** | `.parquet` | Base tratada **antes** da expansão em colunas *dummies* (*One-Hot*). Mantém `SG_UF_ESC`, `TP_COR_RACA` e `TP_DEPENDENCIA_ADM_ESC` em colunas únicas. Ideal para alimentar agregações históricas do Dashboard (RF04) e análises exploratórias. |

---

## 🛠️ Pipeline de Tratamento e Higienização Realizado

### 1. Escolha da Edição 2023 (Conformidade Técnica e LGPD)
A partir das edições de 2024/2025, o INEP desmembrou os microdados em duas planilhas sem chave de ligação (`PARTICIPANTES` e `RESULTADOS`), impossibilitando o cruzamento direto entre o questionário socioeconômico e a nota individual do aluno. A edição de **2023** foi selecionada por ser a base pós-pandemia mais recente que preserva a relação unificada **1:1 (Perfil Sociológico do Estudante $\rightarrow$ Desempenho nas Provas)** na mesma linha.

### 2. Remoção de Atributos Irrelevantes e Prevenção de *Data Leakage*
Das **76 variáveis** originais da tabela principal (além do descarte integral da tabela auxiliar `ITENS_PROVA_2023`), foram removidas:
* **Identificadores e metadados logísticos (18 colunas):** `NU_INSCRICAO`, `NU_ANO`, `TP_ESTADO_CIVIL`, `TP_NACIONALIDADE`, `TP_ANO_CONCLUIU`, códigos/nomes de municípios de prova e escola (`CO_MUNICIPIO_*`, `NO_MUNICIPIO_*`, `CO_UF_*`, `SG_UF_PROVA`, `TP_SIT_FUNC_ESC`), códigos de caderno (`CO_PROVA_*`) e opção de idioma (`TP_LINGUA`).
* **Vazamento de Dados / *Data Leakage* (13 colunas):** Vetores de respostas e gabaritos (`TX_RESPOSTAS_*`, `TX_GABARITO_*`) e notas parciais das competências da redação (`NU_NOTA_COMP1` a `COMP5`).
* **Simplificação de UX do Formulário Escolar (4 colunas):** As questões `Q015` (secadora de roupas), `Q017` (lava-louças), `Q020` (aparelho de DVD) e `Q023` (telefone fixo) foram descartadas por obsolescência e baixo ganho de informação, tornando o formulário de cadastro de turmas mais enxuto para o gestor educacional.

### 3. Filtragem de Escopo e Eliminação de Valores Nulos (`NaN`)
Para refletir fielmente o cenário de alunos ativos em sala de aula e evitar ruídos estatísticos no aprendizado de máquina, foram aplicados os seguintes filtros de linha:
1. **Exclusão de Treineiros (`IN_TREINEIRO == 0`):** Remoção de estudantes de 1º e 2º ano que prestaram o exame apenas para teste.
2. **Recorte Exclusivo de Concluintes do 3º Ano (`TP_ST_CONCLUSAO == 2`):** Manutenção apenas de alunos regularmente matriculados no último ano do Ensino Médio. Essa regra eliminou mais de 1,39 milhão de registros com valores ausentes (`NaN`) nas variáveis de escola (`SG_UF_ESC`, `TP_DEPENDENCIA_ADM_ESC`, `TP_LOCALIZACAO_ESC`), que ficam em branco para candidatos já formados em anos anteriores.
3. **Presença Integral nos Dois Dias e Redação Válida:** Mantidos apenas candidatos presentes nas quatro provas objetivas (`TP_PRESENCA_CN == 1`, `CH == 1`, `LC == 1`, `MT == 1`) e com redação sem anulação (`TP_STATUS_REDACAO == 1`), impedindo que notas zero por falta distorcessem o cálculo de risco.
4. **Remoção de Colunas de Controle e Resíduos:** Após a filtragem, as 7 colunas de filtro foram removidas e registros residuais incompletos foram descartados via `.dropna()`, resultando em **681.360 linhas com 0% de dados nulos**.

---

## 🎯 Engenharia da Variável-Alvo (*Target* — $y$)

O problema foi modelado como uma **Classificação Binária Supervisionada** voltada ao alerta preventivo:

1. Calculou-se temporariamente a média aritmética simples das 5 provas (`CN`, `CH`, `LC`, `MT` e `REDACAO`).
2. Identificou-se o ponto de corte do **1º Quartil (25% menores médias gerais da distribuição)**.
3. Criou-se a coluna binária **`RISCO_DEFASAGEM`**:
   * **`1` (Risco de Defasagem — 25% da base):** Estudantes cujo perfil sociológico os posiciona no 1º quartil de desempenho, demandando atenção e intervenção pedagógica precoce.
   * **`0` (Desempenho Regular Esperado — 75% da base):** Estudantes posicionados acima do 1º quartil.
4. **Prevenção Final de *Leakage*:** Tanto as 5 notas originais quanto a média calculada foram **definitivamente apagadas** do dataset final, garantindo que o modelo tome decisões exclusivamente a partir de variáveis sociológicas, demográficas e de infraestrutura.

---

## 🔢 Codificação de Variáveis Categóricas (*Encoding*)

Todas as variáveis de entrada ($X$) foram convertidas para representações numéricas inteiras de 8 bits (`int8`), reduzindo o uso de memória em mais de 85%:

* **Binária (`TP_SEXO`):** `'M' -> 0` | `'F' -> 1`.
* **Escolaridade dos Pais (`Q001` Pai e `Q002` Mãe):** Escala ordinal crescente de `'A' -> 0` (*Nunca estudou*) até `'G' -> 6` (*Pós-graduação*). A resposta `'H'` (*Não sei*) foi mapeada para **`-1`**, evitando que fosse interpretada como nível superior à pós-graduação.
* **Ocupação dos Pais (`Q003` Pai e `Q004` Mãe):** Grupos socioeconômicos ordenados de `'A' -> 0` (*Grupo 1*) até `'E' -> 4` (*Grupo 5*). A opção `'F'` (*Não sei*) foi mapeada para **`-1`**.
* **Renda Familiar Mensal (`Q006`):** Escala ordinal estrita das 17 faixas salariais do ENEM, de `'A' -> 0` (*Nenhuma renda*) até `'Q' -> 16` (*Acima de R$ 26.400,00*).
* **Infraestrutura Domiciliar, Bens e Conectividade (`Q007` a `Q014`, `Q016`, `Q018`, `Q019`, `Q021`, `Q022`, `Q024`, `Q025`):** Conversão ordinal direta da quantidade/posse do item na residência: `'A' -> 0` (*Não possui*) até `'E' -> 4` (*Quatro ou mais*). A coluna `Q005` (número de moradores de `1` a `20`) foi mantida em sua escala numérica original.
* **Variáveis Nominais (`SG_UF_ESC`, `TP_COR_RACA`, `TP_DEPENDENCIA_ADM_ESC`):** No arquivo `_ENCODED`, foram expandidas via *One-Hot Encoding* (`pd.get_dummies` com `drop_first=True`), gerando colunas binárias independentes (`0` ou `1`).

---

## 📈 Resumo de Validação do Modelo e Regra de Semáforo (RNF03)

O treinamento executado sobre esta base (divisão estratificada 80% treino / 20% teste com `class_weight='balanced'`) consagrou o algoritmo **LightGBM Classifier** com **ROC-AUC de `0.7959`** sobre os **136.272 alunos** do conjunto de teste.

A calibração da probabilidade retornada pelo modelo (`predict_proba`) fundamenta as três faixas de alerta exibidas no Dashboard do Gestor Educacional:

| Faixa de Probabilidade | Nível de Alerta no Dashboard | Métricas de Validação no Corte | Ação Pedagógica Recomendada |
| :---: | :--- | :--- | :--- |
| **`>= 65%`** | 🔴 **Crítico (Alto Risco)** | **Acurácia: 76,8%** \| **Precision: 53,6%** \| **Recall: 52,9%** *(Isola os ~25% mais vulneráveis da turma)* | Intervenção imediata, tutoria individualizada e busca ativa. |
| **`50% a 64,9%`** | 🟡 **Atenção (Monitoramento)** | **F1-Score Máximo: 0,560** \| **Recall Acumulado: 76,6%** *(Captura mais de 3 em cada 4 alunos com defasagem)* | Acompanhamento preventivo de frequência, tarefas e apoio escolar. |
| **`< 50%`** | 🟢 **Regular** | **Precision da Classe Regular: 90,0%** | Acompanhamento pedagógico padrão da turma. |

---

## 💻 Como Carregar os Dados no Python

```python
import pandas as pd

# Leitura recomendada (rápida e com tipagem preservada)
df = pd.read_parquet('ENEM_2023_3ANO_ENCODED.parquet')

# Alternativa via CSV
# df = pd.read_csv('ENEM_2023_3ANO_ENCODED.csv', sep=';')

# Separação entre Features (X) e Variável-Alvo (y)
X = df.drop(columns=['RISCO_DEFASAGEM'])
y = df['RISCO_DEFASAGEM']

print(f"Base carregada: {X.shape[0]:,} alunos e {X.shape[1]} atributos preditores.")
