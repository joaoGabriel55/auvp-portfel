import { useMemo, useState } from 'react'
import { api, type Goal, type User } from './api'
import { CLASSES, fmt, ledger } from './domain'
import type { Run } from './App'
import { t, tx } from './i18n'

export function Metas({ user, perfil, run }: { user: User; perfil?: string; run: Run }) {
  const initial = useMemo(() => Object.fromEntries(CLASSES.map(c => [c.type, user.investimentGoals.find(g => g.type === c.type)?.value ?? 0])), [user])
  const [draft, setDraft] = useState<Record<string, number>>(initial)
  const [saving, setSaving] = useState(false)
  const { rows } = useMemo(() => ledger(user.assets, user.investimentGoals), [user])
  const sum = Object.values(draft).reduce((s, v) => s + v, 0)
  const dirty = CLASSES.some(c => draft[c.type] !== initial[c.type])
  const rest = 100 - sum

  const set = (t: string, v: number) => setDraft(d => ({ ...d, [t]: Math.max(0, Math.min(100, Math.round(v))) }))

  const save = async () => {
    setSaving(true)
    const goals: Goal[] = CLASSES.map(c => ({ ...user.investimentGoals.find(g => g.type === c.type), type: c.type, value: draft[c.type] }))
    await run(() => api.saveGoals(user._id, goals), t('Metas salvas. O próximo aporte já usa os novos valores.'))
    setSaving(false)
  }

  return (
    <div className="page metas">
      <header className="page-head">
        <div>
          <h1>{t('Metas por classe')}</h1>
          <p className="lede">{t('Quanto de cada classe você quer ter na carteira. O cálculo do aporte usa estas porcentagens; a soma precisa dar 100%.')}</p>
        </div>
        {perfil && <p className="perfil">{tx('Perfil de investidor {perfil}', { perfil: <strong>{perfil}</strong> })}</p>}
      </header>

      <div className="goals">
        <div className="goal goal-head">
          <span>{t('Classe')}</span><span className="r">{t('Hoje')}</span><span>{t('Meta')}</span><span className="r">{t('Diferença')}</span>
        </div>
        {CLASSES.map(c => {
          const atual = rows.find(r => r.type === c.type)?.atual ?? 0
          const v = draft[c.type]
          return (
            <div className="goal" key={c.type}>
              <label htmlFor={`g-${c.type}`} className="class-name"><span className="swatch" style={{ background: c.color }} aria-hidden />{c.label}</label>
              <span className="r num muted">{fmt.pct(atual)}</span>
              <span className="goal-input">
                <input type="range" min={0} max={100} value={v} onChange={e => set(c.type, +e.target.value)} aria-label={t('Meta de {classe} (controle deslizante)', { classe: c.label })} style={{ '--v': `${v}%` } as React.CSSProperties} />
                <span className="pct-field">
                  <input id={`g-${c.type}`} className="input num" inputMode="numeric" value={v} onChange={e => set(c.type, Number(e.target.value.replace(/\D/g, '')) || 0)} />
                  <span aria-hidden>%</span>
                </span>
              </span>
              <span className="r num muted">{fmt.pp(atual - v)}</span>
            </div>
          )
        })}
      </div>

      <div className={`goals-foot ${sum === 100 ? 'is-ok' : 'is-off'}`}>
        <p className="goals-sum" aria-live="polite">
          {t('Soma')} <strong className="num">{sum}%</strong>
          {sum !== 100 && <span> · {rest > 0 ? t('faltam {n}% para fechar 100%', { n: rest }) : t('sobram {n}% para fechar 100%', { n: -rest })}</span>}
        </p>
        <div className="row">
          <button className="btn btn-ghost" onClick={() => setDraft(initial)} disabled={!dirty || saving}>{t('Desfazer')}</button>
          <button className="btn btn-primary" onClick={save} disabled={!dirty || sum !== 100 || saving}>{saving ? t('Salvando…') : t('Salvar metas')}</button>
        </div>
      </div>
    </div>
  )
}
