import type { Asset, AssetType, Diagram, Goal } from './api'
import { t } from './i18n'

export const CLASSES: { type: AssetType; label: string; short: string; color: string; diagram?: Diagram; fixed?: boolean }[] = [
  { type: 'acoes_nacionais', label: t('Ações Nacionais'), short: 'BR', color: 'var(--c-br)', diagram: 'diagrama-do-cerrado' },
  { type: 'acoes_internacionais', label: t('Ações Internacionais'), short: 'INT', color: 'var(--c-int)', diagram: 'diagrama-do-cerrado' },
  { type: 'fundos_imobiliarios', label: t('Fundos Imobiliários'), short: 'FII', color: 'var(--c-fii)', diagram: 'investimentos-imobiliarios' },
  { type: 'reits', label: 'REITs', short: 'REIT', color: 'var(--c-reit)', diagram: 'investimentos-imobiliarios' },
  { type: 'criptomoedas', label: t('Criptomoedas'), short: 'CRI', color: 'var(--c-cri)' },
  { type: 'rendafixa', label: t('Renda Fixa'), short: 'RF', color: 'var(--c-rf)', fixed: true },
  { type: 'rendafixa_internacional', label: t('Renda Fixa Internacional'), short: 'RFI', color: 'var(--c-rfi)', fixed: true },
]

export const classOf = (t: AssetType) => CLASSES.find(c => c.type === t)!

export type Currency = 'BRL' | 'USD' | 'EUR'
export const CURRENCIES: Currency[] = ['BRL', 'USD', 'EUR']

/** display currency; data stays in BRL and money formatters divide by `rate` (BRL per unit). App sets it before each render */
export const display: { currency: Currency; rate: number; asOf?: string } = { currency: 'BRL', rate: 1 }

const money = (o: Intl.NumberFormatOptions) => {
  const byCurrency = new Map<Currency, Intl.NumberFormat>()
  return (v: number, c = display.currency, rate = display.rate) => {
    let f = byCurrency.get(c)
    if (!f) byCurrency.set(c, (f = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: c, ...o })))
    return f.format(v / rate)
  }
}
const brl = money({})
const brlShort = money({ maximumFractionDigits: 0 })
const brlCompact = money({ notation: 'compact', maximumFractionDigits: 1 })
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 })
const pct = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

export const fmt = {
  /** money in the display currency */
  brl: (v: number) => brl(v),
  brlShort: (v: number) => brlShort(v),
  brlCompact: (v: number) => (Math.abs(v / display.rate) < 1000 ? brlShort(v) : brlCompact(v)),
  /** always reais: typed amounts, broker orders, exchange rates */
  real: (v: number) => brl(v, 'BRL', 1),
  num: (v: number) => num.format(v),
  pct: (v: number) => `${pct.format(v)}%`,
  pp: (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${pct.format(Math.abs(v))} ${t('p.p.')}`,
  date: (s?: string) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—'),
}

/** pt-BR money/number input → number ("1.234,56" → 1234.56) */
export const parseNum = (s: string) => {
  const n = Number(s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** one CSV line → fields; handles "quoted, commas" and "" escapes */
const csvFields = (line: string) => [...line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g)].map(m => m[1]?.replace(/""/g, '"') ?? m[2])

export interface RendaFixaRow { name: string; value: number }

/** broker "posição" export (Categoria,Produto,Indexador,Vencimento,Taxa,…,Saldo bruto) → renda fixa titles */
export function parseRendaFixaCsv(text: string): RendaFixaRow[] {
  const [head, ...lines] = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  const cols = csvFields(head ?? '').map(c => c.trim().toLowerCase())
  const col = (n: string) => cols.indexOf(n)
  const [cat, prod, venc, taxa, bruto] = ['categoria', 'produto', 'vencimento', 'taxa', 'saldo bruto'].map(col)
  if ([cat, prod, venc, bruto].includes(-1)) throw new Error(t('CSV sem as colunas Categoria, Produto, Vencimento e Saldo bruto.'))
  return lines.map((l, i) => {
    const f = csvFields(l).map(s => s.trim())
    // export uses "." decimals in numeric columns, so Number(), not parseNum
    const value = Number(f[bruto])
    if (!(value > 0)) throw new Error(t('Linha {n}: saldo bruto inválido (“{v}”).', { n: i + 2, v: f[bruto] }))
    return { name: `${[f[cat], f[prod], f[taxa]].filter(Boolean).join(' · ')} | ${f[venc]}`, value }
  })
}

export interface ClassRow {
  type: AssetType
  total: number
  atual: number
  meta: number
  drift: number
  assets: Asset[]
  /** BRL this month's aporte adds to the class */
  aporte: number
  /** share after the aporte, % */
  after: number
}

export function ledger(assets: Asset[], goals: Goal[], aporteByAsset: Map<string, number> = new Map()): { rows: ClassRow[]; total: number; aporte: number } {
  const total = assets.reduce((s, a) => s + (a.value || 0), 0)
  const aporte = [...aporteByAsset.values()].reduce((s, v) => s + v, 0)
  const rows = CLASSES.map(c => {
    const list = assets.filter(a => a.type === c.type).sort((a, b) => b.value - a.value)
    const t = list.reduce((s, a) => s + (a.value || 0), 0)
    const add = list.reduce((s, a) => s + (aporteByAsset.get(a._id) ?? 0), 0)
    const atual = total ? (t / total) * 100 : 0
    const meta = goals.find(g => g.type === c.type)?.value ?? 0
    return {
      type: c.type, total: t, atual, meta, drift: atual - meta, assets: list, aporte: add,
      after: total + aporte ? ((t + add) / (total + aporte)) * 100 : 0,
    }
  })
  return { rows, total, aporte }
}

if (import.meta.env.DEV) {
  const r = ledger(
    [{ _id: 'a', name: 'X', type: 'rendafixa', amount: 1, value: 75, strength: 1 },
     { _id: 'b', name: 'Y', type: 'acoes_nacionais', amount: 1, value: 25, strength: 1 }],
    [{ type: 'rendafixa', value: 50 }, { type: 'acoes_nacionais', value: 50 }],
    new Map([['b', 100]]),
  )
  const br = r.rows.find(x => x.type === 'acoes_nacionais')!
  console.assert(br.atual === 25 && br.drift === -25 && br.after === 62.5, 'ledger math', br)
  console.assert(parseNum('1.234,56') === 1234.56, 'parseNum')
  console.assert(brl(500, 'USD', 5).includes('100,00') && fmt.real(10).includes('R$'), 'money conversion')
  const csv = parseRendaFixaCsv('Categoria,Produto,Indexador,Vencimento,Taxa,Preço,Quantidade,Saldo líquido,Saldo bruto\nLCA,BANCO X,Pós-fixado,21/01/2027,"87,00% do CDI",1091.2371,1,1091.23,1091.23\nTESOURO DIRETO,Tesouro Selic,Pré,01/03/2028,,,0.1,1942.42,2014.17\n')
  console.assert(csv.length === 2 && csv[0].name === 'LCA · BANCO X · 87,00% do CDI | 21/01/2027' && csv[1].value === 2014.17, 'parseRendaFixaCsv', csv)
}
