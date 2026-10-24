import { Fragment, type ReactNode } from 'react'
import { en } from './locales/en'
import { es } from './locales/es'

export const LANGS = { pt: 'Português', en: 'English', es: 'Español' } as const
export type Lang = keyof typeof LANGS
const LANG_KEY = 'auvp-lang'

const pick = (l?: string | null) => (Object.keys(LANGS) as Lang[]).find(k => l?.toLowerCase().startsWith(k))
export const lang: Lang = pick(localStorage.getItem(LANG_KEY)) ?? pick(navigator.language) ?? 'pt'
document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang

const dict = { pt: null, en, es }[lang]

const lookup = (key: string) => {
  const s = dict?.[key]
  if (dict && s === undefined && import.meta.env.DEV) console.warn(`[i18n] missing ${lang}:`, key)
  return s ?? key
}

/** UI text; the pt-BR string is the key, {name} placeholders come from vars */
export const t = (key: string, vars: Record<string, string | number> = {}) =>
  lookup(key).replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))

/** t for sentences whose placeholders are elements (bold figures, code) */
export const tx = (key: string, vars: Record<string, ReactNode>) =>
  lookup(key).split(/\{(\w+)\}/).map((part, i) => <Fragment key={i}>{i % 2 ? vars[part] : part}</Fragment>)

export function LangSelect() {
  return (
    // shortcut: strings are resolved at module load, so switching reloads the page; move to context if reloads hurt
    <select className="mini-select" value={lang} aria-label={t('Idioma')} onChange={e => { localStorage.setItem(LANG_KEY, e.target.value); location.reload() }}>
      {Object.entries(LANGS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  )
}
