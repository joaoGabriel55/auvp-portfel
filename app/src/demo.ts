import type { Asset, AssetType, Goal, Question, Suggestion, User } from './api'
import { CLASSES } from './domain'

/** token value that switches the app to this in-memory wallet instead of the AUVP backend */
export const DEMO_TOKEN = 'demo'

const STOCK_Q: [string, string][] = [
  ['ROE', 'A empresa tem ROE histórico acima de 10%?'],
  ['Dívida', 'A dívida líquida é menor que 2x o EBITDA?'],
  ['Lucro', 'A empresa teve lucro nos últimos 5 anos?'],
  ['Crescimento', 'A receita cresceu nos últimos 5 anos?'],
  ['Dividendos', 'A empresa paga dividendos de forma consistente?'],
  ['Governança', 'A empresa está no Novo Mercado ou tem boa governança?'],
  ['Setor', 'O setor é perene, com demanda nos próximos 20 anos?'],
  ['Liderança', 'A empresa é líder ou vice-líder no seu setor?'],
  ['Estatal', 'A empresa é livre de controle estatal?'],
  ['Tempo de mercado', 'A empresa tem mais de 10 anos de bolsa?'],
]
const FII_Q: [string, string][] = [
  ['Vacância', 'A vacância é menor que 10%?'],
  ['Inquilinos', 'O fundo tem mais de 5 inquilinos?'],
  ['Localização', 'Os imóveis ficam em regiões nobres?'],
  ['Gestão', 'A gestora tem bom histórico?'],
  ['Liquidez', 'A liquidez diária é maior que R$ 1 milhão?'],
  ['P/VP', 'O P/VP está abaixo de 1,1?'],
]
const questions: Question[] = [
  ...STOCK_Q.map(([criterias, question], i) => ({ _id: `qs${i}`, criterias, question, diagram: 'diagrama-do-cerrado' as const })),
  ...FII_Q.map(([criterias, question], i) => ({ _id: `qf${i}`, criterias, question, diagram: 'investimentos-imobiliarios' as const })),
]

// [type, name, amount (cotas, or 1 for renda fixa), unit price in BRL, nota, alocação]
const ROWS: [AssetType, string, number, number, number, string?][] = [
  ['acoes_nacionais', 'WEGE3', 220, 52.4, 8],
  ['acoes_nacionais', 'ITUB4', 400, 34.9, 6],
  ['acoes_nacionais', 'EGIE3', 250, 41.2, 6],
  ['acoes_nacionais', 'TAEE11', 300, 35.6, 4],
  ['acoes_nacionais', 'PETR4', 150, 37.8, -2],
  ['acoes_internacionais', 'AAPL', 30, 1240, 8],
  ['acoes_internacionais', 'MSFT', 20, 2310, 10],
  ['acoes_internacionais', 'GOOGL', 35, 960, 6],
  ['acoes_internacionais', 'JNJ', 18, 870, 4],
  ['fundos_imobiliarios', 'HGLG11', 60, 158, 4],
  ['fundos_imobiliarios', 'KNRI11', 50, 139, 2],
  ['fundos_imobiliarios', 'XPML11', 80, 104, 2],
  ['reits', 'O', 40, 315, 2],
  ['criptomoedas', 'BTC', 0.05, 580000, 1],
  ['rendafixa', 'Tesouro IPCA+ 2035', 1, 32000, 1, 'Tesouro Direto'],
  ['rendafixa', 'CDB 110% CDI', 1, 15000, 1, 'Banco Inter'],
  ['rendafixa_internacional', 'Treasury 2030', 1, 9000, 1, 'Avenue'],
]

const answered = (type: AssetType, nota: number) => {
  const qs = questions.filter(q => q.diagram === CLASSES.find(c => c.type === type)?.diagram)
  // nota = yes - no, so yes = (n + nota) / 2
  return qs.slice(0, Math.max(0, Math.round((qs.length + nota) / 2))).map(q => q._id)
}

const user: User = {
  _id: 'demo-user',
  name: 'Investidor Demo',
  assets: ROWS.map(([type, name, amount, price, strength, alocation], i): Asset => ({
    _id: `a${i}`, assetId: name, name, type, amount, value: amount * price, strength, alocation,
    diagramResponses: answered(type, strength), updatedAt: '2026-10-01T12:00:00Z',
  })),
  investimentGoals: [
    { type: 'acoes_nacionais', value: 20 }, { type: 'acoes_internacionais', value: 25 },
    { type: 'fundos_imobiliarios', value: 15 }, { type: 'reits', value: 5 },
    { type: 'criptomoedas', value: 5 }, { type: 'rendafixa', value: 25 },
    { type: 'rendafixa_internacional', value: 5 },
  ],
  diagramQuestions: questions,
}

const fixed = (a: Asset) => !!CLASSES.find(c => c.type === a.type)?.fixed
const price = (a: Asset) => (fixed(a) || !a.amount ? 1 : a.value / a.amount)
const byId = (id: string) => user.assets.find(a => a._id === id)!

// shortcut: rough stand-in for the server's Diagrama do Cerrado math (fills class gaps, split by nota)
function suggest(value: number): Suggestion[] {
  const total = user.assets.reduce((s, a) => s + a.value, 0) + value
  const gaps = user.investimentGoals.map(g => ({
    g, gap: Math.max(0, (g.value / 100) * total - user.assets.filter(a => a.type === g.type).reduce((s, a) => s + a.value, 0)),
  })).filter(x => x.gap > 0 && user.assets.some(a => a.type === x.g.type && a.strength > 0))
  const sumGap = gaps.reduce((s, x) => s + x.gap, 0)
  return gaps.flatMap(({ g, gap }) => {
    const pool = user.assets.filter(a => a.type === g.type && a.strength > 0)
    const notas = pool.reduce((s, a) => s + a.strength, 0)
    return pool.map(a => {
      const share = (value * gap) / sumGap * (a.strength / notas)
      const qty = fixed(a) ? Math.round(share) : a.type === 'criptomoedas' ? +(share / price(a)).toFixed(4) : Math.floor(share / price(a))
      return { assetId: a._id, suggestionQuantity: qty, suggestionValue: fixed(a) ? qty : qty * price(a), currentPrice: price(a), strength: a.strength }
    })
  })
}

/** answers api.ts calls from memory; writes change this wallet until the page reloads */
export async function demoCall(method: string, path: string, data?: any): Promise<unknown> {
  const [route, query] = path.replace(/^\//, '').split('?')
  const r = `${method} ${route}`
  const id = route.split('/')[2]
  let m: RegExpMatchArray | null

  if (r === 'GET auth/me') return structuredClone(user)
  if (r === 'GET users/classification') return { classificacao: 'Moderado' }
  if (r === 'GET config/dollar-quote') return { dollarQuote: 5.4 }
  if (r === 'GET assets/sugestions') return []
  if (/^GET assets\/[^/]+\/force-strength$/.test(r)) return {}
  if (r === 'POST users/suggestions') return suggest(data.value)
  if (r === 'POST users/assets') {
    const a: Asset = { amount: 0, value: 0, strength: 0, ...data, _id: `a${Date.now()}` }
    user.assets.push(a)
    return a
  }
  if ((m = r.match(/^PATCH users\/assets\/[^/]+\/(input|sell-input)$/))) {
    const a = byId(id), sign = m[1] === 'input' ? 1 : -1
    if (fixed(a)) a.value += sign * data.value
    else { a.value += sign * data.value * price(a); a.amount += sign * data.value }
    return
  }
  if (/^PATCH users\/assets\/[^/]+\/diagram$/.test(r)) return void Object.assign(byId(id), { diagramResponses: data.responses, strength: data.strength })
  if (/^PATCH users\/assets\/[^/]+$/.test(r)) return void Object.assign(byId(id), data)
  if (/^DELETE users\/assets\/[^/]+$/.test(r)) return void (user.assets = user.assets.filter(a => a._id !== id))
  if (r === 'DELETE users/assets') return void (user.assets = user.assets.filter(a => a.type !== new URLSearchParams(query).get('type')))
  if (/^PATCH users\/[^/]+$/.test(r)) return void (user.investimentGoals = data.investimentGoals as Goal[])
  if (r === 'POST wallets/diagrams') {
    const q = { ...data, _id: `q${Date.now()}` }
    user.diagramQuestions.push(q)
    return q
  }
  if (/^PATCH wallets\/diagrams\/[^/]+$/.test(r)) return void Object.assign(user.diagramQuestions.find(q => q._id === id)!, data)
  if (/^DELETE wallets\/diagrams\/[^/]+$/.test(r)) return void (user.diagramQuestions = user.diagramQuestions.filter(q => q._id !== id))
  throw new Error(`Demo: ${method} ${path} não suportado`)
}
