import { useEffect, useRef, useState } from 'react'
import { Check, Copy, MessageSquareText, Trash2, X } from 'lucide-react'
import { api, type Asset, type AssetType, type User } from './api'
import { CLASSES, classOf, fmt, parseNum } from './domain'
import { Nota } from './Carteira'
import { DIAGRAMS, toMarkdown } from './Perguntas'
import type { Run } from './App'
import { t } from './i18n'

interface Props {
  asset: Asset | null
  user: User
  run: Run
  onClose: () => void
  onCreated: () => void
}

const numStr = (n?: number) => (n === undefined || n === null ? '' : String(n).replace('.', ','))

export function AssetDrawer({ asset, user, run, onClose, onCreated }: Props) {
  const isNew = !asset
  const [type, setType] = useState<AssetType>(asset?.type ?? 'acoes_nacionais')
  const [name, setName] = useState(asset?.name ?? '')
  const [assetId, setAssetId] = useState(asset?.assetId)
  const [amount, setAmount] = useState(numStr(asset?.amount))
  const [value, setValue] = useState(numStr(asset?.value))
  const [alocation, setAlocation] = useState(asset?.alocation ?? '')
  const [forced, setForced] = useState(!!asset?.useForcedStrength)
  const [strength, setStrength] = useState(numStr(asset?.strength ?? 0))
  const [responses, setResponses] = useState<string[]>(asset?.diagramResponses ?? [])
  const [tickers, setTickers] = useState<{ _id: string; name: string }[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [quote, setQuote] = useState<number>()
  const [usd, setUsd] = useState('')
  const [copied, setCopied] = useState<'name' | 'prompt' | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  const c = classOf(type)
  const questions = c.diagram ? user.diagramQuestions.filter(q => q.diagram === c.diagram) : []
  const yes = responses.filter(id => questions.some(q => q._id === id))
  const score = yes.length - (questions.length - yes.length)
  const useChecklist = !isNew && questions.length > 0 && !forced

  useEffect(() => {
    if (isNew) dialog.current?.showModal() // native modal: focus trap, Esc, backdrop
    else heading.current?.focus()
  }, [isNew])
  useEffect(() => {
    if (isNew) return // the dialog's own cancel event handles Esc
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isNew, onClose])
  useEffect(() => {
    if (type === 'rendafixa_internacional') api.dollarQuote().then(r => setQuote(r.dollarQuote)).catch(() => {})
  }, [type])
  useEffect(() => {
    if (!isNew || c.fixed || assetId || name.trim().length < 1) { setTickers([]); return }
    const t = setTimeout(() => api.tickerSearch(type, name.trim()).then(r => setTickers(r ?? [])).catch(() => setTickers([])), 250)
    return () => clearTimeout(t)
  }, [isNew, c.fixed, assetId, name, type])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = t('Informe o nome do ativo.')
    else if (isNew && !c.fixed && !assetId) e.name = t('Escolha um ticker da lista para vincular a cotação.')
    if (c.fixed && type === 'rendafixa' && !alocation.trim()) e.alocation = t('Informe onde o título está alocado.')
    if (!c.fixed && !(parseNum(amount) > 0)) e.amount = t('Quantidade precisa ser maior que 0.')
    if (c.fixed && isNew && !(parseNum(value) > 0)) e.value = t('Informe o valor atual.')
    const s = parseNum(strength)
    if ((forced || !useChecklist) && (!Number.isInteger(s) || s < -10 || s > 10)) e.strength = t('Nota inteira entre -10 e 10.')
    setErrors(e)
    return !Object.keys(e).length
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const fields = {
      name: name.trim(),
      amount: c.fixed ? 1 : parseNum(amount),
      ...(c.fixed ? { value: type === 'rendafixa_internacional' && isNew && quote ? parseNum(value) * quote : parseNum(value) } : {}),
      ...(type === 'rendafixa' ? { alocation: alocation.trim() } : {}),
      useForcedStrength: forced,
      ...(forced || !useChecklist ? { strength: parseNum(strength) } : {}),
    }
    const ok = isNew
      ? await run(() => api.createAsset({ type, assetId, ...fields, updatedBy: user._id } as Partial<Asset>), t('{nome} adicionado', { nome: fields.name }))
      : await run(() => api.updateAsset({ ...asset, ...fields }, user._id), t('Ativo atualizado'))
    setSaving(false)
    if (ok && isNew) onCreated()
  }

  const toggleAnswer = (id: string, on: boolean) => {
    if (!asset) return
    const next = on ? [...yes, id] : yes.filter(x => x !== id)
    const s = next.length - (questions.length - next.length)
    setResponses(next)
    run(() => api.saveResponses(asset._id, next, s))
  }

  const copy = async (key: 'name' | 'prompt', text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(k => (k === key ? null : k)), 2000)
  }

  const tradeUsd = (dir: 'buy' | 'sell') => {
    const v = parseNum(usd)
    if (!asset || !quote || !(v > 0)) return
    run(() => (dir === 'buy' ? api.buy : api.sell)(asset._id, v * quote), dir === 'buy' ? t('Compra registrada') : t('Venda registrada')).then(ok => ok && setUsd(''))
  }

  const body = (
    <>
      <header className="drawer-head">
        <div>
          <h2 id="drawer-title" ref={heading} tabIndex={-1}>{isNew ? t('Adicionar ativo') : asset.name}</h2>
          {!isNew && (
            <p className="drawer-sub num">
              <span className="nowrap"><span className="swatch" style={{ background: c.color }} aria-hidden /> {c.label}</span>
              <span className="nowrap">{fmt.brl(asset.value)}{!c.fixed && <> · {t('{n} un', { n: fmt.num(asset.amount) })}</>}</span>
              <span className="nowrap">{t('nota')} <Nota v={asset.strength} /></span>
            </p>
          )}
          {!isNew && asset.updatedAt && <p className="drawer-updated">{t('Atualizado em {d}', { d: fmt.date(asset.updatedAt) })}</p>}
        </div>
        <div className="row">
          {!isNew && (
            <button className="icon-btn" onClick={() => copy('name', asset.name)} aria-label={t('Copiar {nome}', { nome: asset.name })} title={t('Copiar nome')}>
              {copied === 'name' ? <Check size={16} className="ok-icon" /> : <Copy size={16} />}
            </button>
          )}
          {!isNew && c.diagram && questions.length > 0 && (
            <button className="icon-btn" onClick={() => copy('prompt', toMarkdown(DIAGRAMS.find(d => d.id === c.diagram)!.label, questions, asset.name))} aria-label={t('Copiar prompt de análise de {nome}', { nome: asset.name })} title={t('Copiar prompt para IA (ChatGPT, Claude) com as perguntas do diagrama')}>
              {copied === 'prompt' ? <Check size={16} className="ok-icon" /> : <MessageSquareText size={16} />}
            </button>
          )}
          <button className="icon-btn" onClick={onClose} aria-label={t('Fechar painel')}><X size={18} /></button>
        </div>
      </header>

      <div className="drawer-body">

        <section className="fieldset">
          <h3>{t('Posição')}</h3>
          {isNew && (
            <Field label={t('Classe')} id="f-type">
              <select id="f-type" className="input" value={type} onChange={e => { setType(e.target.value as AssetType); setAssetId(undefined) }}>
                {CLASSES.map(o => <option key={o.type} value={o.type}>{o.label}</option>)}
              </select>
            </Field>
          )}
          {isNew && (
            <Field label={c.fixed ? t('Nome do título') : t('Ticker')} id="f-name" error={errors.name} hint={!c.fixed ? t('Digite e escolha na lista') : t('Ex.: CDB Banco X | 21/01/2027')}>
              <input id="f-name" className="input" value={name} autoComplete="off" onChange={e => { setName(e.target.value.toUpperCase()); setAssetId(undefined) }} />
              {tickers.length > 0 && (
                <div className="ticker-list" role="listbox" aria-label={t('Tickers encontrados')}>
                  {tickers.slice(0, 8).map(t => (
                    <button key={t._id} type="button" role="option" aria-selected={assetId === t._id} className="chip" onClick={() => { setName(t.name); setAssetId(t._id); setTickers([]) }}>{t.name}</button>
                  ))}
                </div>
              )}
              {assetId && <p className="ok-note">{t('Vinculado à cotação de {nome}.', { nome: name })}</p>}
            </Field>
          )}
          {!c.fixed && (
            <Field label={t('Quantidade')} id="f-amount" error={errors.amount} hint={t('Use vírgula para frações, ex.: 4,694')}>
              <input id="f-amount" className="input num" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
            </Field>
          )}
          {type === 'rendafixa' && (
            <>
              {!isNew && (
                <Field label={t('Nome do título')} id="f-name2">
                  <input id="f-name2" className="input" value={name} onChange={e => setName(e.target.value)} />
                </Field>
              )}
              <Field label={t('Alocado em')} id="f-aloc" error={errors.alocation} hint={t('Corretora ou banco')}>
                <input id="f-aloc" className="input" value={alocation} onChange={e => setAlocation(e.target.value)} />
              </Field>
              <Field label={t('Valor atual (R$)')} id="f-value" error={errors.value}>
                <input id="f-value" className="input num" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} />
              </Field>
            </>
          )}
          {type === 'rendafixa_internacional' && isNew && (
            <Field label={t('Valor em dólar (US$)')} id="f-usd-new" error={errors.value} hint={quote ? `${t('Cotação {q}', { q: fmt.real(quote) })}${parseNum(value) > 0 ? ` · ≈ ${fmt.real(parseNum(value) * quote)}` : ''}` : t('Carregando cotação…')}>
              <input id="f-usd-new" className="input num" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} />
            </Field>
          )}
          {type === 'rendafixa_internacional' && !isNew && (
            <Field label={t('Comprar ou vender (US$)')} id="f-usd" hint={quote ? t('Em carteira: US$ {usd} · cotação {q}', { usd: fmt.num(Math.round((asset.value / quote) * 100) / 100), q: fmt.real(quote) }) : t('Carregando cotação…')}>
              <div className="row">
                <input id="f-usd" className="input num" inputMode="decimal" value={usd} onChange={e => setUsd(e.target.value)} />
                <button className="btn" onClick={() => tradeUsd('buy')} disabled={!quote || !(parseNum(usd) > 0)}>{t('Comprar')}</button>
                <button className="btn" onClick={() => tradeUsd('sell')} disabled={!quote || !(parseNum(usd) > 0)}>{t('Vender')}</button>
              </div>
            </Field>
          )}
        </section>

        <section className="fieldset">
          <h3>{t('Nota de força')}</h3>
          <p className="help">{t('Só ativos com nota acima de 0 entram no cálculo do aporte. Quanto maior a nota, maior a prioridade.')}</p>
          {questions.length > 0 && (
            <label className="switch">
              <input type="checkbox" checked={forced} onChange={e => setForced(e.target.checked)} />
              <span>{t('Definir nota manualmente em vez do questionário')}</span>
            </label>
          )}
          {useChecklist ? (
            <>
              <div className="score num" aria-live="polite">
                <span><strong>{yes.length}</strong> {t('sim')}</span>
                <span><strong>{questions.length - yes.length}</strong> {t('não')}</span>
                <span className="score-total">{t('Nota')} <Nota v={score} /></span>
              </div>
              <ul className="checklist">
                {questions.map(q => (
                  <li key={q._id}>
                    <label>
                      <input type="checkbox" checked={yes.includes(q._id)} onChange={e => toggleAnswer(q._id, e.target.checked)} />
                      <span>{q.criterias && <strong>{q.criterias}. </strong>}{q.question}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="help">{t('Cada resposta é salva na hora.')}</p>
            </>
          ) : (
            <Field label={t('Nota (-10 a 10)')} id="f-strength" error={errors.strength} hint={isNew && questions.length ? t('Depois de salvar, você pode responder o questionário.') : undefined}>
              <input id="f-strength" className="input num narrow" inputMode="numeric" value={strength} onChange={e => setStrength(e.target.value)} />
            </Field>
          )}
        </section>
      </div>

      <footer className="drawer-foot">
        {!isNew && (
          confirmDelete ? (
            <span className="row">
              <button className="btn btn-danger" onClick={() => run(() => api.deleteAsset(asset._id), t('{nome} excluído', { nome: asset.name })).then(ok => ok && onClose())}>
                {t('Confirmar exclusão')}
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>{t('Cancelar')}</button>
            </span>
          ) : (
            <button className="btn btn-ghost danger-text" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> {t('Excluir')}</button>
          )
        )}
        <button className="btn btn-primary push" onClick={save} disabled={saving}>{saving ? t('Salvando…') : isNew ? t('Adicionar') : t('Salvar alterações')}</button>
      </footer>
    </>
  )

  return isNew ? (
    <dialog ref={dialog} className="modal" aria-labelledby="drawer-title" onCancel={e => { e.preventDefault(); onClose() }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-inner">{body}</div>
    </dialog>
  ) : <aside className="drawer" aria-labelledby="drawer-title">{body}</aside>
}

export function Field({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : hint && <p className="field-hint">{hint}</p>}
    </div>
  )
}
