import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { api, type Asset, type User } from './api'
import { classOf, fmt, parseNum, parseRendaFixaCsv, type RendaFixaRow } from './domain'
import { Field } from './AssetDrawer'
import type { Run } from './App'
import { t } from './i18n'

interface Props { user: User; run: Run; onClose: () => void }

export function ImportRF({ user, run, onClose }: Props) {
  const [rows, setRows] = useState<RendaFixaRow[]>([])
  const [fileError, setFileError] = useState('')
  const [alocation, setAlocation] = useState('')
  const [strength, setStrength] = useState('0')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => dialog.current?.showModal(), [])

  // re-importing the same title (same name) updates its value instead of duplicating it
  const existing = new Map(user.assets.filter(a => a.type === 'rendafixa').map(a => [a.name, a]))
  const updates = rows.filter(r => existing.has(r.name)).length
  const total = rows.reduce((s, r) => s + r.value, 0)

  const load = async (file?: File) => {
    setRows([]); setFileError('')
    if (!file) return
    try { setRows(parseRendaFixaCsv(await file.text())) } catch (e) { setFileError(e instanceof Error ? e.message : String(e)) }
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    const s = parseNum(strength)
    if (!alocation.trim()) e.alocation = t('Informe onde os títulos estão alocados.')
    if (!Number.isInteger(s) || s < -10 || s > 10) e.strength = t('Nota inteira entre -10 e 10.')
    setErrors(e)
    if (Object.keys(e).length || !rows.length) return
    setSaving(true)
    const ok = await run(async () => {
      for (const r of rows) {
        const old = existing.get(r.name)
        await (old
          ? api.updateAsset({ ...old, value: r.value, alocation: alocation.trim() }, user._id)
          : api.createAsset({ type: 'rendafixa', name: r.name, amount: 1, value: r.value, alocation: alocation.trim(), useForcedStrength: true, strength: s, updatedBy: user._id } as Partial<Asset>))
      }
    }, t('{n} títulos importados', { n: rows.length }))
    setSaving(false)
    if (ok) onClose()
  }

  const c = classOf('rendafixa')
  return (
    <dialog ref={dialog} className="modal" aria-labelledby="import-title" onCancel={e => { e.preventDefault(); onClose() }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-inner">
        <header className="drawer-head">
          <div>
            <p className="drawer-class"><span className="swatch" style={{ background: c.color }} aria-hidden />{c.label}</p>
            <h2 id="import-title">{t('Importar CSV')}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t('Fechar')}><X size={18} /></button>
        </header>

        <div className="drawer-body">
          <section className="fieldset">
            <Field label={t('Arquivo CSV')} id="f-csv" error={fileError} hint={t('Exportação de posição: Categoria, Produto, Vencimento, Taxa, Saldo bruto')}>
              <input id="f-csv" className="input" type="file" accept=".csv,text/csv" onChange={e => load(e.target.files?.[0])} />
            </Field>
            <Field label={t('Alocado em')} id="f-imp-aloc" error={errors.alocation} hint={t('Corretora ou banco, vale para todos os títulos')}>
              <input id="f-imp-aloc" className="input" value={alocation} onChange={e => setAlocation(e.target.value)} />
            </Field>
            <Field label={t('Nota (-10 a 10)')} id="f-imp-strength" error={errors.strength} hint={t('Só para títulos novos; os já existentes mantêm a nota')}>
              <input id="f-imp-strength" className="input num narrow" inputMode="numeric" value={strength} onChange={e => setStrength(e.target.value)} />
            </Field>
          </section>

          {rows.length > 0 && (
            <section className="fieldset">
              <h3>{t('{n} títulos', { n: rows.length })} · <span className="num">{fmt.brl(total)}</span></h3>
              <p className="help">{t('{novos} novos, {upd} já na carteira (valor atualizado).', { novos: rows.length - updates, upd: updates })}</p>
              <ul className="plan-lines">
                {rows.map(r => (
                  <li key={r.name} className="import-line">
                    <span>{r.name}{existing.has(r.name) && <span className="muted"> · {t('atualiza')}</span>}</span>
                    <span className="num">{fmt.brl(r.value)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="drawer-foot">
          <button className="btn btn-primary push" onClick={submit} disabled={saving || !rows.length}>
            {saving ? t('Importando…') : rows.length ? t('Importar {n} títulos', { n: rows.length }) : t('Importar títulos')}
          </button>
        </footer>
      </div>
    </dialog>
  )
}
