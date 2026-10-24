import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { AlertCircle, Check, LogOut, RefreshCw } from 'lucide-react'
import { api, AuthError, fxRates, token, type User } from './api'
import { Carteira } from './Carteira'
import { Metas } from './Metas'
import { Perguntas } from './Perguntas'
import { Connect } from './Connect'
import { Credits } from './Credits'
import { LangSelect, t } from './i18n'
import { CURRENCIES, display, fmt, type Currency } from './domain'

export type Run = (fn: () => Promise<unknown>, ok?: string) => Promise<boolean>

const TABS = [
  { id: 'carteira', label: t('Carteira') },
  { id: 'metas', label: t('Metas') },
  { id: 'perguntas', label: t('Perguntas') },
] as const
type Tab = (typeof TABS)[number]['id']

const CURRENCY_KEY = 'auvp-currency'
const LABEL: Record<Currency, string> = { BRL: 'R$ BRL', USD: 'US$ USD', EUR: '€ EUR' }

// token handed over by the bookmarklet in the URL fragment (never sent to a server)
const hashToken = new URLSearchParams(location.hash.slice(1)).get('token')
if (hashToken) {
  token.set(hashToken)
  history.replaceState(null, '', location.pathname)
}

export default function App() {
  const [connected, setConnected] = useState(!!token.get())
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<string>()
  const [tab, setTab] = useState<Tab>(() => (TABS.some(t => `#${t.id}` === location.hash) ? (location.hash.slice(1) as Tab) : 'carteira'))
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const toastTimer = useRef<number>(undefined)
  const [currency, setCurrency] = useState<Currency>(() => (CURRENCIES.find(c => c === localStorage.getItem(CURRENCY_KEY)) ?? 'BRL'))
  const [fx, setFx] = useState<Awaited<ReturnType<typeof fxRates>> | null>(null)

  // children format money during this render, so set the display currency first; without rates, stay in BRL
  const rate = currency === 'BRL' ? 1 : fx?.[currency]
  Object.assign(display, rate ? { currency, rate, asOf: fx?.asOf } : { currency: 'BRL', rate: 1, asOf: undefined })

  useEffect(() => { fxRates().then(setFx).catch(() => {}) }, [])

  const say = useCallback((kind: 'ok' | 'error', text: string) => {
    setToast({ kind, text })
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), kind === 'error' ? 8000 : 3500)
  }, [])

  const fail = useCallback((e: unknown) => {
    if (e instanceof AuthError) {
      token.clear()
      setConnected(false)
      say('error', t('Sua sessão AUVP expirou. Conecte de novo para continuar.'))
    } else say('error', e instanceof Error ? e.message : String(e))
  }, [say])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setUser(await api.me())
    } catch (e) {
      fail(e)
    } finally {
      setLoading(false)
    }
  }, [fail])

  const run: Run = useCallback(async (fn, ok) => {
    try {
      await fn()
      if (ok) say('ok', ok)
      await reload()
      return true
    } catch (e) {
      fail(e)
      return false
    }
  }, [fail, reload, say])

  useEffect(() => {
    if (!connected) return
    reload()
    api.classification().then(r => setPerfil(r?.classificacao)).catch(() => {})
  }, [connected, reload])

  const go = (next: Tab) => {
    if (next === tab) return
    history.replaceState(null, '', `#${next}`)
    if (!document.startViewTransition) return setTab(next)
    // slide direction follows tab order; CSS reads it from <html data-nav>
    const i = (id: Tab) => TABS.findIndex(x => x.id === id)
    document.documentElement.dataset.nav = i(next) > i(tab) ? 'forward' : 'back'
    document.startViewTransition(() => flushSync(() => setTab(next)))
  }

  if (!connected) return <Connect onConnected={() => setConnected(true)} notice={toast?.text} />

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src="/auvp-logo.svg" alt="AUVP" width={90} height={16} />
          <span className="brand-name">Portfel</span>
        </div>
        <nav className="tabs" aria-label={t('Seções da carteira')}>
          {TABS.map(t => (
            <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
              {t.label}
              {tab === t.id && <span className="tab-line" aria-hidden />}
            </button>
          ))}
        </nav>
        <div className="topbar-end">
          <select className="mini-select" value={display.currency} aria-label={t('Moeda')} title={fx ? t('Cotação de {d}: US$ 1 = {usd} · € 1 = {eur}', { d: new Date(fx.asOf).toLocaleString('pt-BR'), usd: fmt.real(fx.USD), eur: fmt.real(fx.EUR) }) : t('Cotações indisponíveis')}
            onChange={e => { const c = e.target.value as Currency; setCurrency(c); localStorage.setItem(CURRENCY_KEY, c) }}>
            {CURRENCIES.map(c => <option key={c} value={c} disabled={c !== 'BRL' && !fx}>{LABEL[c]}</option>)}
          </select>
          <LangSelect />
          <button className="icon-btn" onClick={reload} aria-label={t('Recarregar dados')} title={t('Recarregar dados')} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : undefined} />
          </button>
          {/* native popover: closes on outside click and Esc */}
          <button className="who" popoverTarget="profile-menu" aria-label={t('Menu do perfil')} title={user?.name}>
            {user && <span className="who-name">{user.name.split(' ')[0]}</span>}
            <span className="avatar" aria-hidden>{user?.name.trim().charAt(0).toUpperCase() || '·'}</span>
          </button>
          <div id="profile-menu" className="menu" popover="auto">
            {user && <p className="menu-name">{user.name}</p>}
            <button className="menu-item" onClick={() => { token.clear(); setConnected(false) }}>
              <LogOut size={15} /> {t('Desconectar')}
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        {!user ? (
          <div className="skeleton-page" aria-busy="true" aria-label={t('Carregando carteira')}>
            <div className="sk sk-hero" />
            {Array.from({ length: 7 }, (_, i) => <div key={i} className="sk sk-row" />)}
          </div>
        ) : tab === 'carteira' ? (
          <Carteira user={user} perfil={perfil} run={run} onError={fail} />
        ) : tab === 'metas' ? (
          <Metas user={user} perfil={perfil} run={run} />
        ) : (
          <Perguntas user={user} run={run} />
        )}
      </main>

      <Credits />

      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className={`toast toast-${toast.kind}`}>
            {toast.kind === 'ok' ? <Check size={16} /> : <AlertCircle size={16} />}
            {toast.text}
          </div>
        )}
      </div>
    </div>
  )
}
