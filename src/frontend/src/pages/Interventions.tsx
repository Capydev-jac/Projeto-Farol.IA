import React from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import type { Student } from '../types'

const SHOW = 8

function LinhaEstudante({ s }: { s: Student }) {
  return (
    <li>
      <Link className="person-name" to={`/alunos/${s.id}`}>
        {s.nome || `Estudante #${s.id}`}
      </Link>
      <span className="muted small">
        {s.turma}
        {s.matricula ? ` · RA ${s.matricula}` : ''}
      </span>
    </li>
  )
}

export default function Interventions() {
  const { students } = useStore()

  const cols = [
    {
      title: 'Sem plano',
      hint: 'Risco elevado sem plano de apoio',
      tag: 'Elevado',
      list: students.filter((s) => s.risk === 'Elevado' && !s.hasPlan)
    },
    {
      title: 'Em andamento',
      hint: 'Equipe já está conduzindo as etapas',
      tag: 'Menor',
      list: students.filter((s) => s.hasPlan)
    }
  ]

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">PLANOS DE APOIO</div>
          <h1>Intervenções, começando pela escuta.</h1>
          <p className="sub">
            Acompanhe quem já tem plano e quem ainda precisa de uma conversa. Abra um estudante para criar ou editar o plano.
          </p>
        </div>
      </div>

      <div className="kanban">
        {cols.map((c) => (
          <section className="card" key={c.title}>
            <div className="card-head">
              <div>
                <h3>{c.title}</h3>
                <p className="muted small">{c.hint}</p>
              </div>
              <span className={'tag ' + c.tag}>{c.list.length}</span>
            </div>

            <ul className="mini-list people">
              {c.list.slice(0, SHOW).map((s) => (
                <LinhaEstudante key={s.id} s={s} />
              ))}
              {c.list.length === 0 && (
                <li className="empty muted small">Nenhum estudante nesta etapa.</li>
              )}
            </ul>

            {c.list.length > SHOW && (
              <Link className="link" to="/cadastro">
                Ver todos ({c.list.length}) →
              </Link>
            )}
          </section>
        ))}
      </div>

      <div className="notice">
        Planos são sugestões para conversa com estudante e equipe, não rótulos. Registre responsáveis por cargo ou equipe.
      </div>

      <footer className="foot">
        <span>Dados cadastrados nesta instalação.</span>
        <span>Farol.IA · FATEC Jacareí</span>
      </footer>
    </main>
  )
}