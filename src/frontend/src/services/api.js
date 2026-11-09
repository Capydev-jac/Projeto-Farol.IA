
const API = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.erro || `Erro HTTP ${response.status}`)
  }

  if (response.status === 204) return null

  return response.json()
}

export const api = {
  // Rotas existentes
  turmas: () => request('/turmas'),
  alunos: () => request('/alunos'),

  criarTurma: dados =>
    request('/turmas', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),

  criarAluno: dados =>
    request('/alunos', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),

  salvarPlano: (id, dados) =>
    request(`/intervencoes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    }),

  // Novas rotas: dados reais do ENEM
  enemResumo: () =>
    request('/enem/resumo'),

  enemEstatisticas: () =>
    request('/enem/estatisticas'),

  enemParticipantes: (pagina = 1, limite = 20) =>
    request(
      `/enem/participantes?pagina=${pagina}&limite=${limite}`
    )
}
