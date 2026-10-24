import { useState } from 'react'
import { Check, Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api, type Diagram, type Question, type User } from './api'
import type { Run } from './App'
import { t } from './i18n'

export const DIAGRAMS: { id: Diagram; label: string; scope: string }[] = [
  { id: 'diagrama-do-cerrado', label: t('Diagrama do Cerrado'), scope: t('Ações nacionais e internacionais') },
  { id: 'investimentos-imobiliarios', label: t('Investimentos imobiliários'), scope: t('Fundos imobiliários e REITs') },
]

type Draft = { _id?: string; criterias: string; question: string }

const mdLine = (x: Question, n: number) => `${n}. ${x.criterias ? `**${x.criterias}**: ` : ''}${x.question}`

/** prompt-ready Markdown for ChatGPT/Claude; without a ticker the user fills in the placeholder */
export const toMarkdown = (label: string, qs: Question[], ticker = '[TICKER]') => [
  t('# {label}: análise de {ticker}', { label, ticker }),
  '',
  t('Responda cada pergunta abaixo sobre o ativo **{ticker}** com **Sim** ou **Não**, seguido de uma justificativa curta com dados e fontes.', { ticker }),
  t('No fim, conte quantos "Sim" e quantos "Não" e calcule a nota: Sim menos Não.'),
  '',
  ...qs.map((x, i) => mdLine(x, i + 1)),
].join('\n')

export function Perguntas({ user, run }: { user: User; run: Run }) {
  const [diagram, setDiagram] = useState<Diagram>('diagrama-do-cerrado')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const all = user.diagramQuestions.filter(q => q.diagram === diagram)
  const q = query.trim().toLowerCase()
  const list = all.filter(x => !q || x.question.toLowerCase().includes(q) || x.criterias.toLowerCase().includes(q))
  const d = DIAGRAMS.find(x => x.id === diagram)!

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(c => (c === key ? null : c)), 2000)
  }

  const save = async () => {
    if (!draft?.question.trim()) return
    const body = { criterias: draft.criterias.trim(), question: draft.question.trim(), diagram }
    const ok = draft._id
      ? await run(() => api.updateQuestion({ ...body, _id: draft._id! } as Question), t('Pergunta atualizada'))
      : await run(() => api.createQuestion(body), t('Pergunta adicionada'))
    if (ok) setDraft(null)
  }

  const editor = (
    <form className="q-editor" onSubmit={e => { e.preventDefault(); save() }}>
      <label className="field">
        <span>{t('Critério')}</span>
        <input className="input" value={draft?.criterias ?? ''} onChange={e => setDraft(x => x && { ...x, criterias: e.target.value })} placeholder={t('Ex.: ROE')} />
      </label>
      <label className="field grow">
        <span>{t('Pergunta (resposta sim soma 1 ponto, não tira 1)')}</span>
        <input className="input" autoFocus value={draft?.question ?? ''} onChange={e => setDraft(x => x && { ...x, question: e.target.value })} placeholder={t('Ex.: ROE historicamente maior que 5%?')} />
      </label>
      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>{t('Cancelar')}</button>
        <button type="submit" className="btn btn-primary" disabled={!draft?.question.trim()}>{t('Salvar')}</button>
      </div>
    </form>
  )

  return (
    <div className="page perguntas">
      <header className="page-head">
        <div>
          <h1>{t('Perguntas do diagrama')}</h1>
          <p className="lede">{t('Cada ativo responde estas perguntas com sim ou não. A nota de força é o número de “sim” menos o número de “não”.')}</p>
        </div>
      </header>

      <div className="toolbar spread">
        <div className="segmented" role="tablist" aria-label={t('Diagrama')}>
          {DIAGRAMS.map(x => (
            <button key={x.id} role="tab" aria-selected={diagram === x.id} onClick={() => { setDiagram(x.id); setDraft(null) }}>
              {x.label} <span className="chip-count num">{user.diagramQuestions.filter(y => y.diagram === x.id).length}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search">
            <Search size={15} aria-hidden />
            <span className="sr-only">{t('Buscar pergunta')}</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Buscar pergunta')} />
          </label>
          <button className="btn" onClick={() => copy('all', toMarkdown(d.label, list))} disabled={!list.length} title={t('Copia as perguntas em Markdown para colar no ChatGPT, Claude etc.')}>
            {copied === 'all' ? <><Check size={15} /> {t('Copiado')}</> : <><Copy size={15} /> {t('Copiar para IA')}</>}
          </button>
        </div>
      </div>
      <p className="muted scope">{t('Vale para {escopo}. “Copiar para IA” gera um prompt em Markdown: troque [TICKER] pelo ativo e cole no ChatGPT ou Claude.', { escopo: d.scope.toLowerCase() })}</p>

      <ol className="questions">
        {list.map((x, i) => draft?._id === x._id ? <li key={x._id} className="q editing">{editor}</li> : (
          <li key={x._id} className="q">
            <span className="q-n num">{i + 1}</span>
            <div className="q-text">
              <p>{x.criterias && <strong className="q-crit">{x.criterias}. </strong>}{x.question}</p>
            </div>
            <div className="q-actions">
              {deleting === x._id ? (
                <>
                  <button className="btn btn-danger sm" onClick={() => run(() => api.deleteQuestion(x._id), t('Pergunta excluída')).then(() => setDeleting(null))}>{t('Excluir')}</button>
                  <button className="btn btn-ghost sm" onClick={() => setDeleting(null)}>{t('Cancelar')}</button>
                </>
              ) : (
                <>
                  <button className="icon-btn" onClick={() => copy(x._id, mdLine(x, i + 1))} aria-label={t('Copiar pergunta {n} em Markdown', { n: i + 1 })} title={t('Copiar em Markdown')}>
                    {copied === x._id ? <Check size={15} className="ok-icon" /> : <Copy size={15} />}
                  </button>
                  <button className="icon-btn" onClick={() => setDraft({ ...x })} aria-label={t('Editar pergunta {n}', { n: i + 1 })} title={t('Editar')}><Pencil size={15} /></button>
                  <button className="icon-btn" onClick={() => setDeleting(x._id)} aria-label={t('Excluir pergunta {n}', { n: i + 1 })} title={t('Excluir')}><Trash2 size={15} /></button>
                </>
              )}
            </div>
          </li>
        ))}
        {draft && !draft._id && <li className="q editing">{editor}</li>}
      </ol>
      {!list.length && <p className="empty">{q ? t('Nenhuma pergunta com “{q}”.', { q: query }) : t('Nenhuma pergunta neste diagrama ainda. Sem perguntas, a nota dos ativos é definida manualmente.')}</p>}
      {!draft && (
        <button className="btn add-q" onClick={() => setDraft({ criterias: '', question: '' })}><Plus size={15} /> {t('Adicionar pergunta')}</button>
      )}
    </div>
  )
}
