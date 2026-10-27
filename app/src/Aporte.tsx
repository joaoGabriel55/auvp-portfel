import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Minus, PanelRightOpen, Plus, RotateCcw, X } from 'lucide-react'
import { api, type Suggestion, type User } from './api'
import { CLASSES, classOf, fmt, parseNum } from './domain'
import { Nota } from './Carteira'
import type { Run } from './App'
import { t, tx } from './i18n'

interface Line {
  s: Suggestion
  name: string
  fixed: boolean
  price: number
  qty: number
  on: boolean
  status?: 'done' | 'error'
}

interface Props {
  user: User
  /** BRL per user-asset id that the plan adds; null when there is no open plan */
  onPreview: (m: Map<string, number> | null) => void
  run: Run
  onError: (e: unknown) => void
  /** the plan lives in the page's right panel; only one panel is open at a time */
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: HTMLElement | null
}

export function Aporte({ user, onPreview, run, onError, open, onOpenChange, slot }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [amount, setAmount] = useState('')
  const [lines, setLines] = useState<Line[] | null>(null)
  const [busy, setBusy] = useState<'calc' | 'save' | null>(null)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const value = parseNum(amount)
  const done = !!lines?.some(l => l.on) && lines.filter(l => l.on).every(l => l.status === 'done')

  const calculate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!(value > 0)) return
    setBusy('calc')
    setLines(null)
    onOpenChange(true)
    try {
      const res = (await api.suggestions(value)) ?? []
      setLines(res.filter(s => s.suggestionQuantity > 0).map(s => {
        const a = user.assets.find(x => x._id === s.assetId)
        const type = a?.type ?? s.assetType ?? 'rendafixa'
        const fixed = !!classOf(type).fixed
        return {
          s, fixed, on: false, qty: s.suggestionQuantity,
          name: a?.name ?? s.assetName ?? '—',
          price: fixed ? s.suggestionValue : s.currentPrice || s.suggestionValue / s.suggestionQuantity,
        }
      }))
    } catch (err) {
      onError(err)
    } finally {
      setBusy(null)
    }
  }

  const total = (l: Line) => (l.fixed ? l.price : l.qty * l.price)
  const chosen = lines?.filter(l => l.on && l.qty > 0) ?? []
  const planned = chosen.reduce((s, l) => s + total(l), 0)
  const leftover = value - planned

  // positions already include registered buys, so a finished plan stops previewing on the bars
  useEffect(() => {
    onPreview(lines && !done ? new Map(lines.filter(l => l.on && l.qty > 0).map(l => [l.s.assetId, l.fixed ? l.price : l.qty * l.price])) : null)
  }, [lines, done, onPreview])

  const groups = useMemo(() => CLASSES.map(c => ({
    c,
    lines: (lines ?? []).filter(l => (user.assets.find(a => a._id === l.s.assetId)?.type ?? l.s.assetType) === c.type),
  })).filter(g => g.lines.length), [lines, user.assets])

  const patch = (id: string, p: Partial<Line>) => setLines(ls => ls && ls.map(l => (l.s.assetId === id ? { ...l, ...p } : l)))
  // registered lines stay checked
  const toggleAll = (ids: Set<string>, on: boolean) => setLines(ls => ls && ls.map(l => (ids.has(l.s.assetId) && l.status !== 'done' ? { ...l, on } : l)))
  const groupToggle = (gl: Line[], label: string) => {
    const n = gl.filter(l => l.on).length
    return (
      <input type="checkbox" checked={n === gl.length} ref={el => { if (el) el.indeterminate = n > 0 && n < gl.length }}
        disabled={busy === 'save' || gl.every(l => l.status === 'done')} aria-label={label}
        onChange={e => toggleAll(new Set(gl.map(l => l.s.assetId)), e.target.checked)} />
    )
  }

  const register = async () => {
    const todo = chosen.filter(l => l.status !== 'done')
    setBusy('save')
    setProgress(0)
    let n = 0
    await run(async () => {
      for (const l of todo) {
        try {
          await api.buy(l.s.assetId, l.qty)
        } catch (e) {
          patch(l.s.assetId, { status: 'error' })
          throw e
        }
        patch(l.s.assetId, { status: 'done' })
        setProgress(++n)
      }
    }, t('Aporte registrado: {n} compras', { n: todo.length }))
    setBusy(null)
  }

  const copy = async () => {
    const text = [t('Aporte {data} — {total}', { data: new Date().toLocaleDateString('pt-BR'), total: fmt.real(planned) }),
      ...chosen.map(l => (l.fixed ? t('{nome}: aplicar {v}', { nome: l.name, v: fmt.real(total(l)) }) : t('{nome}: comprar {n} un (~{v})', { nome: l.name, n: fmt.num(l.qty), v: fmt.real(total(l)) })))].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => { setLines(null); setAmount(''); onOpenChange(false) }

  useEffect(() => {
    if (!open) return
    heading.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const drawer = (
    <aside className="drawer plan-drawer" aria-labelledby="plan-title">
      <header className="drawer-head">
        <div>
          <h2 id="plan-title" ref={heading} tabIndex={-1}>{t('Plano de aporte')}</h2>
          <p className="drawer-sub num">{t('Para {v} informados', { v: fmt.real(value || 0) })}</p>
        </div>
        <button className="icon-btn" onClick={() => onOpenChange(false)} aria-label={t('Fechar plano')}><X size={18} /></button>
      </header>
      <div className="drawer-body">
      {busy === 'calc' && <div className="plan-skeleton" aria-busy="true">{[0, 1, 2].map(i => <div key={i} className="sk sk-row" />)}</div>}

      {lines && !lines.length && (
        <p className="plan-empty">
          {t('Nenhuma compra sugerida para {v}. O valor pode ser menor que o preço de uma cota, ou não há ativos com nota acima de 0 nas classes abaixo da meta.', { v: fmt.real(value) })}
        </p>
      )}

      {lines && lines.length > 0 && (
        <div className="plan">
          <div className="plan-summary">
            <div>
              <span className="plan-big num">{fmt.brl(planned)}</span>
              <span className="muted"> {t(chosen.length === 1 ? 'em {n} compra' : 'em {n} compras', { n: chosen.length })}</span>
            </div>
            {leftover < -0.009 && (
              <p className="over-note">
                {tx('{v} acima do valor informado. Reduza quantidades ou desmarque compras.', { v: <strong className="num">{fmt.brl(-leftover)}</strong> })}
              </p>
            )}
            {!chosen.length && <p className="muted">{t('Marque as compras que vai fazer: uma a uma, por classe ou todas.')}</p>}
            {chosen.length > 0 && leftover > 0.009 && (
              <p className="muted">
                {tx('Sobram {v} porque ações e fundos só são comprados em cotas inteiras.', { v: <strong className="num">{fmt.brl(leftover)}</strong> })}
              </p>
            )}
          </div>

          <label className="plan-group-head plan-all">
            <span className="pline-check">{groupToggle(lines, t('Selecionar todas'))}</span>
            <span className="class-name">{t('Selecionar todas')}</span>
          </label>

          <ol className="plan-groups">
            {groups.map(({ c, lines: gl }) => {
              const sub = gl.filter(l => l.on).reduce((s, l) => s + total(l), 0)
              return (
                <li key={c.type} className="plan-group">
                  <div className="plan-group-head">
                    <label className="class-name">
                      <span className="pline-check">{groupToggle(gl, t('Selecionar {classe}', { classe: c.label }))}</span><span className="swatch" style={{ background: c.color }} aria-hidden />{c.label}</label>
                    <span className="num">{fmt.brl(sub)}</span>
                  </div>
                  <ul className="plan-lines">
                    {gl.map(l => (
                      <li key={l.s.assetId} className={`pline ${l.on ? '' : 'is-off'} ${l.status ? `is-${l.status}` : ''}`}>
                        <label className="pline-check">
                          {l.status === 'done' ? <Check size={16} className="ok-icon" aria-label={t('Registrada')} /> : (
                            <input type="checkbox" checked={l.on} disabled={busy === 'save'} onChange={e => patch(l.s.assetId, { on: e.target.checked })} aria-label={t('Incluir {nome}', { nome: l.name })} />
                          )}
                        </label>
                        <span className="pline-name">
                          <strong>{l.fixed ? l.name.split(' | ')[0] : l.name}</strong>
                          {l.s.strength !== undefined && <Nota v={l.s.strength} />}
                        </span>
                        {l.fixed ? (
                          <span className="pline-qty muted">{t('Aplicar valor')}{l.name.includes(' | ') && <> · {t('vence {d}', { d: l.name.split(' | ').pop()! })}</>}</span>
                        ) : (
                          <span className="pline-qty">
                            <span className="stepper">
                              <button type="button" className="icon-btn sm" disabled={!l.on || l.status === 'done' || l.qty <= 1 || busy === 'save'} onClick={() => patch(l.s.assetId, { qty: l.qty - 1 })} aria-label={t('Menos uma cota de {nome}', { nome: l.name })}><Minus size={13} /></button>
                              <input className="num" inputMode="decimal" value={fmt.num(l.qty)} disabled={!l.on || l.status === 'done' || busy === 'save'} aria-label={t('Quantidade de {nome}', { nome: l.name })}
                                onChange={e => { const v = parseNum(e.target.value); patch(l.s.assetId, { qty: Number.isFinite(v) && v >= 0 ? v : 0 }) }} />
                              <button type="button" className="icon-btn sm" disabled={!l.on || l.status === 'done' || busy === 'save'} onClick={() => patch(l.s.assetId, { qty: l.qty + 1 })} aria-label={t('Mais uma cota de {nome}', { nome: l.name })}><Plus size={13} /></button>
                            </span>
                            <span className="muted num pline-price">× {fmt.brl(l.price)}</span>
                          </span>
                        )}
                        <span className="pline-total num">{fmt.brl(total(l))}</span>
                        {l.status === 'error' && <span className="pline-error">{t('Falhou. Tente registrar de novo.')}</span>}
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ol>

          {!done && <p className="field-hint">{t('Registre depois de comprar na corretora. Ajuste as quantidades se comprou diferente do sugerido.')}</p>}
        </div>
      )}

      </div>
      {!!lines?.length && (
          <footer className="drawer-foot plan-foot">
            {done ? (
              <>
                <p className="plan-done"><Check size={16} /> {t('Aporte registrado. As posições e as barras já estão atualizadas.')}</p>
                <button className="btn" onClick={reset}><RotateCcw size={15} /> {t('Novo aporte')}</button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={reset} disabled={busy === 'save'}><X size={15} /> {t('Descartar')}</button>
                <button className="btn" onClick={copy} disabled={!chosen.length}>{copied ? <><Check size={15} /> {t('Copiada')}</> : <><Copy size={15} /> {t('Copiar lista')}</>}</button>
                <button className="btn btn-primary push" onClick={register} disabled={!chosen.length || busy === 'save'}>
                  {busy === 'save' ? t('Registrando {feito} de {total}…', { feito: progress, total: chosen.filter(l => l.status !== 'done').length + progress }) : t('Registrar {n} compras', { n: chosen.filter(l => l.status !== 'done').length })}
                </button>
              </>
            )}
          </footer>
      )}
    </aside>
  )

  return (
    <>
    <section className="aporte" aria-labelledby="aporte-title">
      <form className="aporte-form" onSubmit={calculate}>
        <div>
          <h1 id="aporte-title" className="aporte-title">{t('Aporte do mês')}</h1>
          <p className="aporte-hint">{t('Digite quanto vai investir. O Diagrama monta a lista de compras com os ativos de nota acima de 0, puxando cada classe para a meta.')}</p>
        </div>
        <div className="aporte-input-row">
          <label className="money-field">
            <span className="sr-only">{t('Valor do aporte em reais')}</span>
            <span className="money-prefix" aria-hidden>R$</span>
            <input
              className="money-input" inputMode="decimal" placeholder="0,00" value={amount} disabled={busy === 'save'}
              onChange={e => { setAmount(e.target.value); if (lines && !done) { setLines(null); onOpenChange(false) } }}
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={!!busy || !(value > 0)}>
            {busy === 'calc' ? t('Calculando…') : lines ? t('Recalcular') : t('Montar lista de compras')}
          </button>
        </div>
      </form>

      {lines && lines.length > 0 && (
        <div className="aporte-ready" aria-live="polite">
          <p>
            {done ? <><Check size={15} className="ok-icon" /> {t('Aporte registrado')}</> : tx(chosen.length === 1 ? 'Plano: {v} em {n} compra' : 'Plano: {v} em {n} compras', { v: <strong className="num">{fmt.brl(planned)}</strong>, n: chosen.length })}
          </p>
          {!open && <button type="button" className="btn" onClick={() => onOpenChange(true)}><PanelRightOpen size={15} /> {t('Ver plano')}</button>}
        </div>
      )}
    </section>
    {open && slot && createPortal(drawer, slot)}
    </>
  )
}