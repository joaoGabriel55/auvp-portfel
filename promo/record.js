// Plays the promo on stage.html (the real app runs inside it, in demo mode) and records it frame by frame.
// Output: out/frames/*.jpg + out/timeline.json (frame times, subtitles, clicks) for build.js.
import { chromium } from 'playwright'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const APP = process.env.APP_URL ?? 'http://localhost:5173/'
const OUT = 'out/frames'
// capture tops out near 13 fps at 1080p, so the whole show runs K times slower and build.js speeds it back up
const K = 3
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ args: ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'] })
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(APP).origin })
const page = await ctx.newPage()
await page.goto(pathToFileURL('stage.html').href)
await page.evaluate(() => document.fonts.ready)

// app starts clean, in Portuguese, on the connect screen
const appEl = page.locator('#app')
const frameOf = async sel => (await page.locator(sel).elementHandle()).contentFrame()
await appEl.evaluate((f, url) => { f.src = url }, APP)
let app = await frameOf('#app')
await app.waitForLoadState()
await app.evaluate(() => { localStorage.clear(); localStorage.setItem('auvp-lang', 'pt'); localStorage.setItem('auvp-currency', 'BRL') })
await app.evaluate(() => location.reload())
await app.waitForSelector('.demo-btn')
await page.waitForTimeout(800)

// ---- recorder
const frames = []
const cdp = await ctx.newCDPSession(page)
let pending = Promise.resolve()
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  const file = `${OUT}/${String(frames.length).padStart(5, '0')}.jpg`
  frames.push({ file, t: metadata.timestamp })
  pending = pending.then(() => writeFileSync(file, Buffer.from(data, 'base64')))
})
await cdp.send('Animation.enable')
await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / K })
await page.evaluate(k => { window.K = k }, K)
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 })
const t0 = Date.now() / 1000
const now = () => (Date.now() / 1000 - t0) / K

// ---- helpers
const subs = [], clicks = []
const wait = ms => page.waitForTimeout(ms * K)
const S = (fn, arg) => page.evaluate(fn, arg)
async function say(pt, en, { eyebrow, card } = {}) {
  if (subs.length) subs.at(-1).end ??= now()
  if (card) await S(html => stage.card(html), card)
  else if (eyebrow !== undefined) await S(([e, h]) => stage.head(e, h), [eyebrow, pt])
  await S(t => stage.sub(t), en)
  subs.push({ start: now(), pt: pt.replace(/<[^>]+>/g, ''), en })
}
const words = (html, i = 0) => S(([h, i]) => stage.words(h, i), [html, i])
const center = async loc => { const b = await loc.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2] }
async function point(loc, ms = 650) {
  const [x, y] = await center(loc)
  await S(([x, y]) => stage.cursor(x, y), [x, y])
  await wait(ms)
  return [x, y]
}
// glide the cursor to an element, ripple, then act (DOM click by default: works even when the camera clips the target)
async function act(loc, fn = l => l.evaluate(e => e.click())) {
  const [x, y] = await point(loc)
  await S(([x, y]) => stage.ripple(x, y), [x, y])
  clicks.push(now())
  await fn(loc)
}
const cam = (x, y, s) => S(([x, y, s]) => stage.cam(x, y, s), [x, y, s])
async function slide(range, from, to) {
  for (let v = from; v !== to; v += Math.sign(to - from)) {
    const b = await range.boundingBox()
    await S(([x, y]) => stage.cursor(x, y, true), [b.x + 8 + (b.width - 16) * (v / 100), b.y + b.height / 2])
    await range.evaluate((el, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }, v + Math.sign(to - from))
    await wait(70)
  }
}

// ---- 1. intro
await wait(400)
await say('Portfel. Sua carteira AUVP, redesenhada.', 'Portfel. Your AUVP wallet, redesigned.', {
  card: `<div class="brand"><img class="logo" src="${APP}auvp-logo.svg"><b>Portfel</b></div><div class="rule"></div>
         <h2>${await words('Sua carteira AUVP, <em>redesenhada.</em>')}</h2>`,
})
await wait(3600)

// ---- 2. the monthly question
await say('Todo mês, a mesma pergunta: onde investir o aporte?', 'Every month, the same question: where should this month’s money go?', {
  card: `<h2>${await words('Todo mês, a mesma pergunta:')}</h2><h1>${await words('onde investir <em>o aporte?</em>', 4)}</h1>`,
})
await wait(3600)
await S(() => stage.card(''))

// ---- 3. connect
await S(() => stage.layout('app'))
await say('Conecte sua conta em um clique. Ou explore a <em>demonstração.</em>', 'Connect your account in one click. Or explore the demo.', { eyebrow: '01 · Conectar' })
await wait(1600)
await act(app.locator('.demo-btn'))
await app.waitForSelector('.summary')
await S(() => stage.url('Portfel · /carteira'))
await wait(1400)

// ---- 4. carteira overview
await say('Patrimônio e metas, <em>em um olhar.</em>', 'Net worth and targets, at a glance.', { eyebrow: '02 · Carteira' })
await cam(1150, 200, 1.7)
await wait(2100)
await say('Cada classe mostra <em>quanto falta</em> para a meta.', 'Each class shows how far it is from its target.', { eyebrow: '02 · Carteira' })
await cam(1000, 650, 1.45)
await wait(2500)
await cam(720, 450, 1)

// ---- 5. aporte: the hero flow
await say('Digite o valor do <em>aporte do mês.</em>', 'Type in this month’s contribution.', { eyebrow: '03 · Aporte' })
await cam(400, 230, 1.6)
await wait(900)
await act(app.locator('.money-input'), l => l.pressSequentially('15000', { delay: 170 * K }))
await wait(500)
await act(app.locator('.aporte-form .btn-primary'))
await app.waitForSelector('.plan-groups')
await cam(720, 450, 1)
await say('O Diagrama do Cerrado monta <em>sua lista de compras.</em>', 'The Cerrado Diagram builds your shopping list.', { eyebrow: '03 · Aporte' })
await wait(1200)
await cam(1210, 470, 1.55)
await wait(2100)
await say('Em <em>cotas inteiras</em>, ajustáveis uma a uma.', 'In whole shares, adjustable one by one.', { eyebrow: '03 · Aporte' })
await act(app.locator('.pline').first().locator('.stepper button').nth(1))
await wait(600)
await act(app.locator('.pline').first().locator('.stepper button').nth(1))
await wait(1300)
await say('Veja o efeito nas metas <em>antes de comprar.</em>', 'See the effect on your targets before you buy.', { eyebrow: '03 · Aporte' })
await S(() => stage.hideCursor())
await cam(540, 640, 1.55)
await wait(2800)
await cam(1210, 700, 1.5)
await say('Comprou na corretora? <em>Registre tudo</em> de uma vez.', 'Bought at your broker? Log it all at once.', { eyebrow: '03 · Aporte' })
await wait(800)
await act(app.locator('.plan-foot .btn-primary'))
await app.waitForSelector('.plan-done')
await wait(1700)
await cam(720, 450, 1)
await app.locator('.plan-drawer .drawer-head .icon-btn').evaluate(e => e.click())
await wait(800)

// ---- 6. nota de força
await say('Responda sim ou não. <em>A nota se calcula sozinha.</em>', 'Answer yes or no. The score calculates itself.', { eyebrow: '04 · Nota de força' })
await cam(1000, 400, 1.5)
await act(app.locator('.search input'), l => l.pressSequentially('WEGE', { delay: 150 * K }))
await wait(1200)
await act(app.locator('.hrow').first())
await app.waitForSelector('.checklist')
await cam(1215, 560, 1.6)
await wait(1300)
await act(app.locator('.checklist input').nth(9))
await wait(1100)
await act(app.locator('.checklist input').nth(4))
await wait(1500)
await say('E copie um <em>prompt pronto</em> para analisar o ativo com IA.', 'And copy a ready-made prompt to analyze the asset with AI.', { eyebrow: '04 · Nota de força' })
await cam(1215, 200, 1.7)
await wait(700)
await act(app.locator('.drawer-head .icon-btn').nth(1))
await wait(2100)
await S(() => stage.hideCursor())
await cam(720, 450, 1)
await app.locator('.drawer-head .icon-btn').last().evaluate(e => e.click())
await app.locator('.search input').fill('')
await wait(500)

// ---- 7. metas
await say('Ajuste suas metas por classe.', 'Fine-tune your targets per asset class.', { eyebrow: '05 · Metas' })
await act(app.locator('.tab').nth(1))
await app.waitForSelector('.goals')
await cam(720, 420, 1.3)
await wait(900)
await slide(app.locator('.goal input[type=range]').nth(0), 20, 30)
await wait(900)
await say('A soma <em>sempre fecha em 100%.</em>', 'The total always adds up to 100%.', { eyebrow: '05 · Metas' })
await slide(app.locator('.goal input[type=range]').nth(5), 25, 15)
await wait(900)
await act(app.locator('.goals-foot .btn-primary'))
await wait(2000)

// ---- 8. perguntas
await cam(720, 450, 1)
await say('E as perguntas do diagrama <em>são suas.</em>', 'And the diagram questions are yours to edit.', { eyebrow: '06 · Perguntas' })
await act(app.locator('.tab').nth(2))
await wait(1600)
await act(app.locator('.segmented button').nth(1))
await wait(1700)
await act(app.locator('.tab').nth(0))
await wait(900)
await S(() => stage.hideCursor())

// ---- 9. languages, currencies, mobile
await app.evaluate(() => localStorage.setItem('auvp-lang', 'es'))
await page.locator('#mob').evaluate((f, url) => { f.src = url }, APP)
const mob = await frameOf('#mob')
await mob.waitForSelector('.summary')
await S(() => stage.layout('multi'))
await say('Português, inglês ou espanhol. <em>Real, dólar ou euro.</em>', 'Portuguese, English or Spanish. Real, dollar or euro.', { eyebrow: '07 · Para todos' })
await wait(1500)
await app.locator('.topbar-end select').nth(1).selectOption('en')
await app.waitForSelector('.summary')
await wait(900)
const usd = app.locator('.topbar-end select').nth(0)
await app.waitForFunction(() => !document.querySelector('.topbar-end select option[value=USD]')?.disabled, null, { timeout: 8000 }).catch(() => {})
if (await usd.locator('option[value=USD]').isEnabled()) await usd.selectOption('USD')
await wait(1200)
await say('No computador <em>e no celular.</em>', 'On desktop and on mobile.', { eyebrow: '07 · Para todos' })
await mob.evaluate(ms => new Promise(done => {
  const t0 = performance.now(), ease = x => x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2
  const step = t => { const p = Math.min(1, (t - t0) / ms); scrollTo(0, 640 * ease(p)); p < 1 ? requestAnimationFrame(step) : done() }
  requestAnimationFrame(step)
}), 1400 * K)
await wait(1600)
await mob.locator('.lrow-class').nth(0).evaluate(e => e.click())
await wait(1700)

// ---- 10. under the hood
await S(() => stage.layout('title'))
await say('Por baixo do capô.', 'Under the hood.', {
  card: `<h1>${await words('Por baixo <em>do capô.</em>')}</h1>
    <div class="chips">${['React 19', 'TypeScript', 'Vite', 'CSS puro', 'View Transitions', 'i18n PT · EN · ES', 'Acessível', 'Responsivo']
      .map((c, i) => `<span class="chip" style="--i:${i}">${c}</span>`).join('')}</div>
    <pre class="code"><b>POST</b> /users/suggestions  <i>{ value: 15000 }</i>  →  lista de compras</pre>`,
})
await wait(3800)
await say('Roda na API real da AUVP. Sem backend próprio, sem coleta de dados.', 'Runs on the real AUVP API. No backend of its own, no data collected.', {
  card: `<h1 style="font-size:76px">${await words('Roda na <em>API real da AUVP.</em>')}</h1>
    <h2>${await words('Sem backend próprio. Sem coleta de dados.', 5)}</h2>`,
})
await wait(4000)

// ---- 11. outro
await say('Um projeto voluntário, feito por um aluno AUVP.', 'A volunteer project, made by an AUVP student.', {
  card: `<h2>${await words('Um projeto voluntário, feito por')}</h2><h1>${await words('um aluno <em>AUVP.</em>', 5)}</h1>`,
})
await wait(3600)
await say('Gabriel Quaresma. Feedback é muito bem-vindo.', 'Gabriel Quaresma. Feedback is very welcome.', {
  card: `<div class="brand"><img class="logo" src="${APP}auvp-logo.svg"><b>Portfel</b></div><div class="rule"></div>
    <h1 style="font-size:72px">${await words('Gabriel Quaresma')}</h1>
    <h2>${await words('Feedback é muito <em>bem-vindo.</em>', 2)}</h2>
    <div class="links"><div>in/<span>gabriel-quaresma-dev</span></div><div>github.com/<span>joaogabriel55</span></div></div>
    <p class="fine">Proposta não oficial · sem vínculo com a AUVP · Unofficial proposal, not endorsed by AUVP</p>`,
})
await wait(5600)
subs.at(-1).end = now()
await wait(300)

await cdp.send('Page.stopScreencast')
const end = now()
await pending
await browser.close()
writeFileSync('out/timeline.json', JSON.stringify({ frames: frames.map(f => ({ file: f.file, t: (f.t - t0) / K })), end, subs, clicks }, null, 1))
console.log(`recorded ${frames.length} frames, ${end.toFixed(1)}s, ${subs.length} subtitles`)
