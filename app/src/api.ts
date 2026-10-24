import { t } from './i18n'
import { DEMO_TOKEN, demoCall } from './demo'

const BASE = 'https://ferramentas-backend.auvp.com.br'
const TOKEN_KEY = 'auvp-token'

export type AssetType =
  | 'acoes_internacionais'
  | 'acoes_nacionais'
  | 'fundos_imobiliarios'
  | 'reits'
  | 'criptomoedas'
  | 'rendafixa'
  | 'rendafixa_internacional'

export type Diagram = 'diagrama-do-cerrado' | 'investimentos-imobiliarios'

export interface Asset {
  _id: string
  assetId?: string
  name: string
  type: AssetType
  amount: number
  /** total position in BRL */
  value: number
  strength: number
  useForcedStrength?: boolean
  alocation?: string
  diagramResponses?: string[]
  updatedAt?: string
}

export interface Goal { type: AssetType; value: number; _id?: string }
export interface Question { _id: string; criterias: string; question: string; diagram: Diagram }

export interface User {
  _id: string
  name: string
  assets: Asset[]
  investimentGoals: Goal[]
  diagramQuestions: Question[]
}

export interface Suggestion {
  /** user asset _id */
  assetId: string
  suggestionQuantity: number
  suggestionValue: number
  assetName?: string
  assetType?: AssetType
  currentValue?: number
  currentPrice?: number
  strength?: number
  totalAfterSuggestionPercentage?: number
}

export class AuthError extends Error {}

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t.trim().replace(/^"|"$/g, '')),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

async function call<T>(method: string, path: string, data?: unknown): Promise<T> {
  if (token.get() === DEMO_TOKEN) return demoCall(method, path, data) as Promise<T>
  const res = await fetch(`${BASE}/${path.replace(/^\//, '')}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.get()}` },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  if (res.status === 401) throw new AuthError('Sessão expirada')
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? t('Erro {status} em {path}', { status: res.status, path }))
  }
  return res.status === 204 ? (undefined as T) : res.json().catch(() => undefined as T)
}

/** today's BRL price of one USD and one EUR (AwesomeAPI, public, CORS-enabled) */
export async function fxRates() {
  const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL')
  if (!res.ok) throw new Error(t('Erro {status} em {path}', { status: res.status, path: 'awesomeapi' }))
  const j = await res.json()
  const rates = { USD: Number(j?.USDBRL?.bid), EUR: Number(j?.EURBRL?.bid) }
  if (!(rates.USD > 0 && rates.EUR > 0)) throw new Error('fx: invalid rates')
  return { ...rates, asOf: String(j.USDBRL.create_date).replace(' ', 'T') }
}

export const api = {
  me: () => call<User>('GET', 'auth/me'),
  classification: () => call<{ classificacao: string }>('GET', 'users/classification'),
  dollarQuote: () => call<{ dollarQuote: number }>('GET', 'config/dollar-quote'),

  createAsset: (a: Partial<Asset>) => call<Asset>('POST', 'users/assets', a),
  updateAsset: (a: Asset, userId: string) => call<Asset>('PATCH', `users/assets/${a._id}`, { ...a, updatedBy: userId }),
  deleteAsset: (id: string) => call<void>('DELETE', `users/assets/${id}`),
  deleteAssetsOfType: (type: AssetType) => call<void>('DELETE', `users/assets?type=${type}`),
  /** server-side increment: cotas for priced assets, BRL for renda fixa */
  buy: (id: string, value: number) => call<void>('PATCH', `users/assets/${id}/input`, { value }),
  sell: (id: string, value: number) => call<void>('PATCH', `users/assets/${id}/sell-input`, { value }),
  saveResponses: (id: string, responses: string[], strength: number) =>
    call<void>('PATCH', `users/assets/${id}/diagram`, { responses, strength }),
  tickerSearch: (type: AssetType, search: string) =>
    call<{ _id: string; name: string }[]>('GET', `assets/sugestions?type=${type}&search=${encodeURIComponent(search)}`),
  forcedStrength: (assetId: string) => call<{ strength?: number }>('GET', `assets/${assetId}/force-strength`),

  suggestions: (value: number) => call<Suggestion[]>('POST', 'users/suggestions', { value }),
  saveGoals: (userId: string, investimentGoals: Goal[]) => call<void>('PATCH', `users/${userId}`, { investimentGoals }),

  createQuestion: (q: Omit<Question, '_id'>) => call<Question>('POST', 'wallets/diagrams', q),
  updateQuestion: (q: Question) => call<Question>('PATCH', `wallets/diagrams/${q._id}`, q),
  deleteQuestion: (id: string) => call<void>('DELETE', `wallets/diagrams/${id}`),
}
