import { Fragment, useCallback, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronRight, Minus, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import { api, type Asset, type User } from './api'
import { classOf, display, fmt, ledger, parseNum, type ClassRow } from './domain'
import { AssetDrawer } from './AssetDrawer'
import { Aporte } from './Aporte'
import { ImportRF } from './ImportRF'
import type { Run } from './App'
import { t, tx } from './i18n'

interface Props { user: User; perfil?: string; run: Run; onError: (e: unknown) => void }

export function Carteira({ user, perfil, run, onError }: Props) {
  const [preview, setPreview] = useState<Map<string, number> | null>(null)
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [onlyOut, setOnlyOut] = useState(false)
  const [selected, setSelected] = useState<Asset | 'new' | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  // one right panel at a time: the aporte plan or the asset editor
  const openPlan = useCallback((o: boolean) => { setPlanOpen(o); if (o) setSelected(s => (s === 'new' ? s : null)) }, [])
  const select = (a: Asset | 'new' | null) => { setSelected(a); if (a && a !== 'new') setPlanOpen(false) }

  const byAsset = useMemo(() => preview ?? new Map<string, number>(), [preview])
  const { rows, total, aporte } = useMemo(() => ledger(user.assets, user.investimentGoals, byAsset), [user, byAsset])
  const scale = Math.max(...rows.flatMap(r => [r.atual, r.meta, r.after]), 1) * 1.08
  const worst = [...rows].filter(r => r.meta > 0).sort((a, b) => a.drift - b.drift)[0]
  const outCount = user.assets.filter(a => a.strength <= 0).length
  const q = query.trim().toLowerCase()
  const filtering = !!q || onlyOut
  const visible = (r: ClassRow) => r.assets.filter(a => (!q || a.name.toLowerCase().includes(q)) && (!onlyOut || a.strength <= 0))

  const toggle = (t: string) => setOpen(s => { const n = new Set(s); if (!n.delete(t)) n.add(t); return n })
  const drawerAsset = selected && selected !== 'new' ? user.assets.find(a => a._id === selected._id) ?? null : selected

  return (
    <div className="carteira">
      <section className="overview" aria-label={t('Resumo')}>
        <Aporte user={user} onPreview={setPreview} run={run} onError={onError} open={planOpen} onOpenChange={openPlan} slot={slot} />

        <dl className="summary">
          <div className="summary-total">
            <dt>{t('Patrimônio')}</dt>
            <dd className="num big">{fmt.brl(total)}</dd>
            {display.currency !== 'BRL' && (
              <dd className="fx-note num">{t('{real} · cotação de {d}: {um} = {v}', { real: fmt.real(total), d: fmt.date(display.asOf), um: fmt.brl(display.rate), v: fmt.real(display.rate) })}</dd>
            )}
          </div>
          <div><dt>{t('Ativos')}</dt><dd className="num">{user.assets.length}</dd></div>
          <div><dt>{t('Perfil')}</dt><dd>{perfil ?? '—'}</dd></div>
          {worst && worst.drift < 0 && (
            <div className="summary-wide">
              <dt>{t('Mais longe da meta')}</dt>
              <dd>{classOf(worst.type).label} <span className="muted num">{fmt.pp(worst.drift)}</span></dd>
            </div>
          )}
        </dl>
      </section>

      <section className="ledger" aria-labelledby="ledger-title">
        <div className="ledger-head">
          <h2 id="ledger-title">{t('Classes de ativos')}</h2>
          <div className="toolbar">
            <label className="search">
              <Search size={15} aria-hidden />
              <span className="sr-only">{t('Buscar ativo')}</span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Buscar ticker ou título')} />
              {query && <button className="icon-btn sm" onClick={() => setQuery('')} aria-label={t('Limpar busca')}><X size={14} /></button>}
            </label>
            <button className="chip" aria-pressed={onlyOut} onClick={() => setOnlyOut(v => !v)} title={t('Ativos com nota 0 ou negativa não entram no cálculo do aporte')}>
              {t('Fora do cálculo')} <span className="chip-count num">{outCount}</span>
            </button>
            <button className="btn" onClick={() => setImporting(true)} title={t('Importar títulos de Renda Fixa de um CSV')}><Upload size={15} /> {t('Importar CSV')}</button>
            <button className="btn" onClick={() => select('new')}><Plus size={15} /> {t('Adicionar ativo')}</button>
          </div>
        </div>

        <div className="ledger-table">
          <div className="lrow lrow-head">
            <span>{t('Classe')}</span>
            <span className="r">{t('Valor')}</span>
            <span className="bar-col">{t('Atual vs meta')}</span>
            <span className="r">{t('Atual')}</span>
            <span className="r">{t('Meta')}</span>
            <span className="r">{t('Desvio')}</span>
          </div>

          {rows.map(r => {
            const c = classOf(r.type)
            const list = visible(r)
            if (filtering && !list.length) return null
            const isOpen = filtering || open.has(r.type)
            return (
              <Fragment key={r.type}>
                <button className="lrow lrow-class" aria-expanded={isOpen} onClick={() => toggle(r.type)} disabled={filtering}>
                  <span className="class-name">
                    <ChevronRight size={16} className="chev" aria-hidden />
                    <span className="swatch" style={{ background: c.color }} aria-hidden />
                    {c.label}
                    <span className="count num">{r.assets.length}</span>
                  </span>
                  <span className="r num val-cell">{fmt.brlShort(r.total)}<ChevronRight size={15} className="chev chev-end" aria-hidden /></span>
                  <span className="bar-col"><MetaBar row={r} scale={scale} color={c.color} /></span>
                  <span className="r num">{fmt.pct(r.atual)}{r.after > r.atual && <span className="after">→ {fmt.pct(r.after)}</span>}</span>
                  <span className="r num meta-num">{fmt.pct(r.meta)}</span>
                  <span className="r drift-cell"><Drift v={r.drift} /><Gap row={r} total={total} /></span>
                </button>
                {isOpen && (
                  <div className="holdings">
                    {list.length ? list.map(a => (
                      // a div, not a button: the quantity cell holds its own controls; the name button keeps keyboard access
                      <div key={a._id} className="hrow" aria-current={drawerAsset && drawerAsset !== 'new' && drawerAsset._id === a._id ? 'true' : undefined} onClick={() => select(a)}>
                        <button className="h-name" onClick={e => { e.stopPropagation(); select(a) }}>{a.name}{a.alocation && <span className="muted"> · {a.alocation}</span>}</button>
                        {c.fixed ? <span /> : <Qty asset={a} run={run} />}
                        <span className="r num">{fmt.brl(a.value)}</span>
                        <span className="r num muted">{r.total ? fmt.pct((a.value / r.total) * 100) : '—'}</span>
                        <span className="r"><Nota v={a.strength} /></span>
                        <span className="r num aporte-cell">{byAsset.get(a._id) ? `+ ${fmt.brl(byAsset.get(a._id)!)}` : ''}</span>
                      </div>
                    )) : (
                      <div className="hrow-empty">
                        {t('Nenhum ativo de {classe}.', { classe: c.label })}{' '}
                        <button className="link" onClick={() => select('new')}>{t('Adicionar')}</button>
                      </div>
                    )}
                    {!filtering && r.assets.length > 0 && <DeleteClass row={r} run={run} />}
                  </div>
                )}
              </Fragment>
            )
          })}
          {filtering && rows.every(r => !visible(r).length) && (
            <p className="empty">{q ? t('Nenhum ativo encontrado para “{q}”.', { q: query }) : t('Nenhum ativo encontrado.')}</p>
          )}
        </div>
        <p className="footnote">{aporte > 0 ? t('A barra mostra a participação atual; o traço dourado marca a meta; a parte hachurada é o que o aporte deste mês acrescenta.') : t('A barra mostra a participação atual; o traço dourado marca a meta.')}</p>
      </section>

      <div ref={setSlot} className="panel-slot">
        {drawerAsset && drawerAsset !== 'new' && (
          <AssetDrawer key={drawerAsset._id} asset={drawerAsset} user={user} run={run} onClose={() => select(null)} onCreated={() => select(null)} />
        )}
      </div>
      {drawerAsset === 'new' && (
        <AssetDrawer key="new" asset={null} user={user} run={run} onClose={() => setSelected(null)} onCreated={() => setSelected(null)} />
      )}
      {importing && <ImportRF user={user} run={run} onClose={() => setImporting(false)} />}
    </div>
  )
}

/** inline quantity editor; the change goes through buy/sell so the server reprices the position */
function Qty({ asset, run }: { asset: Asset; run: Run }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (draft === null) return (
    <button className="r num muted qty-btn" title={t('Ajustar quantidade')} onClick={e => { e.stopPropagation(); setDraft(String(asset.amount).replace('.', ',')) }}>
      {t('{n} un', { n: fmt.num(asset.amount) })}
    </button>
  )
  const next = parseNum(draft)
  const delta = Math.round((next - asset.amount) * 1e8) / 1e8
  const valid = next > 0 && delta !== 0
  const confirm = async () => {
    if (!valid || busy) return
    setBusy(true)
    const ok = await run(() => (delta > 0 ? api.buy(asset._id, delta) : api.sell(asset._id, -delta)), t('Quantidade de {nome} atualizada', { nome: asset.name }))
    setBusy(false)
    if (ok) setDraft(null)
  }
  return (
    <span className="qty-edit" onClick={e => e.stopPropagation()}>
      <input className="input num" inputMode="decimal" autoFocus value={draft} disabled={busy} aria-label={t('Quantidade de {nome}', { nome: asset.name })}
        onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') setDraft(null) }} />
      <button className="icon-btn sm" onClick={confirm} disabled={!valid || busy} aria-label={t('Confirmar')}><Check size={14} /></button>
      <button className="icon-btn sm" onClick={() => setDraft(null)} disabled={busy} aria-label={t('Cancelar')}><X size={14} /></button>
    </span>
  )
}

function DeleteClass({ row, run }: { row: ClassRow; run: Run }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const { label } = classOf(row.type)
  const n = row.assets.length
  if (!confirm) return (
    <div className="holdings-foot">
      <button className="btn btn-ghost danger-text" onClick={() => setConfirm(true)}><Trash2 size={15} /> {t('Excluir todos de {classe}', { classe: label })}</button>
    </div>
  )
  return (
    <div className="holdings-foot is-confirm" role="alert">
      <span>{tx('Excluir {ativos} de {classe} ({total})? Não dá para desfazer.', { ativos: <strong>{n} {n === 1 ? t('ativo') : t('ativos')}</strong>, classe: label, total: <span className="num">{fmt.brl(row.total)}</span> })}</span>
      <span className="row">
        <button className="btn btn-danger" disabled={busy} onClick={async () => {
          setBusy(true)
          if (!(await run(() => api.deleteAssetsOfType(row.type), t('{n} ativos de {classe} excluídos', { n, classe: label })))) setBusy(false)
        }}>{busy ? t('Excluindo…') : t('Confirmar exclusão')}</button>
        <button className="btn btn-ghost" onClick={() => setConfirm(false)} disabled={busy}>{t('Cancelar')}</button>
      </span>
    </div>
  )
}

function MetaBar({ row, scale, color }: { row: ClassRow; scale: number; color: string }) {
  const f = (v: number) => Math.min(1, v / scale)
  const w = (v: number) => `${f(v) * 100}%`
  return (
    <span className="metabar" aria-label={t(row.aporte ? 'Atual {atual}, meta {meta}, após aporte {after}' : 'Atual {atual}, meta {meta}', { atual: fmt.pct(row.atual), meta: fmt.pct(row.meta), after: fmt.pct(row.after) })}>
      <span className="metabar-fill" style={{ transform: `scaleX(${f(row.atual)})`, background: color }} />
      {row.after > row.atual && <span className="metabar-after" style={{ left: w(row.atual), width: `max(3px, ${w(row.after - row.atual)})` }} />}
      {row.meta > 0 && <span className="metabar-tick" style={{ left: w(row.meta) }} />}
    </span>
  )
}

/** distance to the meta in reais; with an open plan, how much of it this month covers */
function Gap({ row, total }: { row: ClassRow; total: number }) {
  if (Math.abs(row.drift) < 1 || !row.meta) return null
  const gap = (row.meta / 100) * total - row.total
  if (row.aporte > 0 && gap > 0) return <span className="gap gap-aporte num">{t('+{aporte} de {gap}', { aporte: fmt.brlCompact(row.aporte), gap: fmt.brlCompact(gap) })}</span>
  return <span className="gap num">{gap > 0 ? t('faltam {v}', { v: fmt.brlCompact(gap) }) : t('sobram {v}', { v: fmt.brlCompact(-gap) })}</span>
}

function Drift({ v }: { v: number }) {
  if (Math.abs(v) < 1) return <span className="drift drift-ok"><Minus size={13} aria-hidden /> {t('na meta')}</span>
  const under = v < 0
  return (
    <span className={`drift ${under ? 'drift-under' : 'drift-over'} num`}>
      {under ? <ArrowDown size={13} aria-hidden /> : <ArrowUp size={13} aria-hidden />}
      {fmt.pp(v)}
    </span>
  )
}

export function Nota({ v }: { v: number }) {
  return <span className={`nota ${v > 0 ? 'nota-pos' : 'nota-out'} num`} title={v > 0 ? t('Entra no cálculo do aporte') : t('Fora do cálculo do aporte')}>{v}</span>
}

