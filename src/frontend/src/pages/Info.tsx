import React from 'react'
import { useStore } from '../store'

// Desempenho medido no conjunto de teste do treinamento (n = 136.272), corte de 50%.
const METRICAS: [string, string, string][] = [
  ['ROC-AUC', '0,7578', 'Capacidade de separar quem está no grupo de risco de quem não está.'],
  ['Acurácia', '67%', 'Acertos gerais ao dividir em “risco” e “regular”.'],
  ['Recall do risco', '72%', 'De quem realmente está no grupo de risco, quantos o modelo sinaliza (Atenção + Crítico).'],
  ['Precisão do “Regular”', '88%', 'Quando o modelo indica Regular, ele acerta em 88% dos casos.'],
  ['F1 do risco', '0,525', 'Equilíbrio entre acertar quem está em risco e não sinalizar demais.'],
]

const FAIXAS: [string, string, string, string][] = [
  ['65% ou mais', 'Crítico', 'Precisão 50,9% · recall 45,0%', 'Intervenção prioritária: tutoria individualizada, busca ativa e reforço pedagógico.'],
  ['50% a 64,9%', 'Atenção', 'Recall acumulado (Crítico + Atenção) 71,8%', 'Monitoramento preventivo: acompanhar frequência, atividades e desempenho escolar.'],
  ['Abaixo de 50%', 'Regular', 'Precisão 88%', 'Acompanhamento padrão do desempenho escolar.'],
]

export function Modelo() {
  return (
    <main className="page doc">
      <div className="eyebrow">TRANSPARÊNCIA</div>
      <h1>Sobre o modelo</h1>
      <p className="sub">Como o risco de defasagem é estimado, o que o modelo mede de fato e quais são os seus limites.</p>

      <section className="card">
        <h3>O que o modelo estima</h3>
        <p className="muted">
          O modelo calcula a <b>probabilidade de o estudante estar entre os 25% de menor desempenho no ENEM</b>, a partir do perfil
          socioeconômico e familiar. Ele <b>não estima nota</b> e não usa frequência nem notas da escola.
        </p>
        <p className="muted">
          Por isso, “risco” aqui é relativo à distribuição nacional do ENEM e indica onde o apoio pedagógico pode ser mais necessário. Não é uma previsão sobre o futuro de uma pessoa.
        </p>
      </section>

      <section className="card">
        <h3>Como foi construído</h3>
        <ol className="steps">
          <li><b>Base.</b> Microdados do ENEM 2023 (INEP): concluintes do 3º ano do Ensino Médio, presentes nos dois dias de prova e com redação válida. Restaram 681.357 estudantes.</li>
          <li><b>Alvo.</b> Risco = média das cinco provas (quatro áreas e redação) no 1º quartil. As notas foram removidas dos dados de entrada para evitar vazamento de informação.</li>
          <li><b>Treinamento.</b> Classificação binária com LightGBM, 80% para treino e 20% para teste, com classes balanceadas. Um Random Forest serviu de comparação (AUC 0,7541).</li>
          <li><b>Execução.</b> O modelo roda no servidor do Farol.IA, sem serviços externos, e devolve probabilidade, nível de alerta e recomendação.</li>
          <li><b>Aplicação web.</b> Mostra o resultado ao gestor, com filtros, planos de apoio e relatórios para download.</li>
        </ol>
      </section>

      <section className="card">
        <h3>Informações usadas (15 variáveis)</h3>
        <ul className="bullets">
          <li><b>Perfil:</b> faixa etária e sexo.</li>
          <li><b>Família:</b> escolaridade e ocupação do pai e da mãe (ou responsáveis), número de moradores e renda familiar.</li>
          <li><b>Moradia e bens:</b> quartos, máquina de lavar, televisores, celulares, veículo próprio, geladeira ou freezer, e computador ou internet em casa.</li>
        </ul>
        <p className="muted small">
          As que mais pesam são renda familiar, número de moradores, escolaridade do pai, faixa etária e escolaridade da mãe. O modelo cruza renda com tamanho da família, o que equivale a estimar a renda por pessoa.
        </p>
      </section>

      <section className="card">
        <h3>Faixas de alerta</h3>
        <table className="mini-table">
          <thead><tr><th>Probabilidade</th><th>Nível</th><th>Desempenho no teste</th><th>Recomendação exibida</th></tr></thead>
          <tbody>
            {FAIXAS.map(([faixa, nivel, desempenho, acao]) => (
              <tr key={nivel}><td>{faixa}</td><td><b>{nivel}</b></td><td>{desempenho}</td><td className="muted">{acao}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">Na Visão geral, “Crítico” aparece como “Elevado” e “Regular” como “Menor”. São os mesmos níveis.</p>
      </section>

      <section className="card">
        <h3>Métricas de validação</h3>
        <table className="mini-table">
          <thead><tr><th>Métrica</th><th>Resultado</th><th>O que significa</th></tr></thead>
          <tbody>
            {METRICAS.map(([m, v, d]) => (
              <tr key={m}><td>{m}</td><td><b>{v}</b></td><td className="muted">{d}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          Medidas no conjunto de teste do ENEM 2023 (136.272 estudantes), não em dados desta escola. Um modelo com AUC próximo de 0,76 ajuda a priorizar, mas erra com frequência.
        </p>
      </section>

      <section className="card">
        <h3>Limites</h3>
        <ul className="bullets">
          <li><b>Erros são esperados.</b> No nível Crítico, a precisão é de cerca de 51%: aproximadamente metade dos sinalizados não estaria no grupo de risco. Por outro lado, o nível Crítico sozinho identifica 45% de quem está.</li>
          <li><b>Os dados de treino não representam toda a rede.</b> Foram usados apenas estudantes que fizeram o ENEM por inteiro. Quem faltou ou abandonou a prova ficou de fora.</li>
          <li><b>O risco é relativo ao país.</b> Uma escola pode ter perfil socioeconômico mais baixo e, ainda assim, resultados bons. O modelo não enxerga isso.</li>
          <li><b>Correlação não é causalidade.</b> Barreiras sociais não indicam falta de potencial, e o sistema não deve ser usado para classificar pessoas.</li>
          <li><b>Variáveis sensíveis.</b> O modelo usa sexo e faixa etária. Revise os resultados por grupo para identificar padrões injustos.</li>
          <li><b>Sinais que a escola conhece e o modelo não vê.</b> Frequência, notas, saúde e contexto familiar atual não entram na estimativa. A escuta do estudante e da equipe vem primeiro.</li>
        </ul>
      </section>

      <section className="card">
        <h3>O que ainda é ilustrativo</h3>
        <p className="muted">
          O comparativo com a média nacional do ENEM na Visão geral usa valores de referência ilustrativos, e a escola e o período exibidos nos filtros são fixos.
          O modelo em si, as variáveis e as faixas descritas acima correspondem ao que o sistema executa.
        </p>
      </section>
    </main>
  )
}

export function Privacidade() {
  const { alunosCadastrados, turmas } = useStore()
  return (
    <main className="page doc">
      <div className="eyebrow">TRANSPARÊNCIA</div>
      <h1>Privacidade e dados</h1>
      <p className="sub">Quais dados o Farol.IA guarda e para quê. O tratamento deve seguir a Lei Geral de Proteção de Dados Pessoais (LGPD); controle de acesso e retenção ainda dependem da escola e da implantação.</p>

      <section className="card">
        <h3>O que é coletado</h3>
        <ul className="bullets">
          <li><b>Identificação:</b> nome e RA (matrícula) do estudante. CPF, endereço e contatos não são coletados.</li>
          <li><b>Escola:</b> turma e turno.</li>
          <li><b>Perfil e família:</b> faixa etária, sexo, escolaridade e ocupação do pai e da mãe (ou responsáveis), número de moradores e renda familiar.</li>
          <li><b>Moradia e bens:</b> quartos, máquina de lavar, televisores, celulares, veículo, geladeira ou freezer, e computador ou internet em casa.</li>
          <li><b>Gerado pelo sistema:</b> probabilidade de risco, nível de alerta, recomendação, data da estimativa e versão do modelo.</li>
          <li><b>Registrado pela escola:</b> planos de apoio e seus responsáveis.</li>
        </ul>
      </section>

      <section className="card">
        <h3>Para que servem</h3>
        <p className="muted">
          Somente para estimar onde o apoio pedagógico é mais necessário e organizar o acompanhamento. Os dados não devem ser usados para punir, classificar ou expor estudantes.
          Como muitos estudantes são menores de idade, o tratamento deve sempre considerar o melhor interesse da criança e do adolescente.
        </p>
      </section>

      <section className="card">
        <h3>Onde ficam guardados</h3>
        <p className="muted">
          No banco de dados do servidor do Farol.IA, não no navegador. Atualmente há <b>{alunosCadastrados.length}</b> estudante(s) e <b>{turmas.length}</b> turma(s) cadastrados.
        </p>
        <ul className="bullets">
          <li><b>Exclusão:</b> ao excluir um estudante na ficha, o cadastro, a estimativa e o plano de apoio dele são removidos.</li>
          <li><b>Exportações:</b> o CSV da lista de estudantes inclui nome e RA. Trate esses arquivos como dados pessoais e não os envie por canais abertos.</li>
          <li><b>Estimativas:</b> são apoio à decisão e podem errar. Sempre contextualize cada sinal antes de intervir.</li>
        </ul>
      </section>
    </main>
  )
}