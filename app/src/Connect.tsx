import { useEffect, useRef, useState } from 'react'
import { Bookmark, Eye, KeyRound } from 'lucide-react'
import { token } from './api'
import { DEMO_TOKEN } from './demo'
import { Credits } from './Credits'
import { LangSelect, t, tx } from './i18n'

const bookmarklet = `javascript:(()=>{if(!location.host.endsWith('auvp.com.br')){alert(${JSON.stringify(t('Abra ferramentas.auvp.com.br logado e clique de novo.'))});return}const t=localStorage.getItem('auvp-web@token');if(!t){alert(${JSON.stringify(t('Faça login na AUVP primeiro.'))});return}window.open('${location.origin}/#token='+encodeURIComponent(t))})()`

export function Connect({ onConnected, notice }: { onConnected: () => void; notice?: string }) {
  const link = useRef<HTMLAnchorElement>(null)
  const [pasted, setPasted] = useState('')

  // React refuses javascript: hrefs, so set it on the DOM node directly
  useEffect(() => link.current?.setAttribute('href', bookmarklet), [])

  return (
    <main className="connect">
      <div className="connect-panel">
        <LangSelect />
        <img className="connect-logo" src="/auvp-logo.svg" alt="AUVP" width={113} height={20} />
        <h1>{t('Conecte sua carteira AUVP')}</h1>
        <p className="lede">
          {tx('Esta versão lê e grava direto na sua conta AUVP. Ela precisa da sessão do site {site}, que fica só neste navegador.', { site: <strong>ferramentas.auvp.com.br</strong> })}
        </p>
        {notice && <p className="connect-notice" role="alert">{notice}</p>}

        <ol className="steps">
          <li>
            <span className="step-title"><Bookmark size={16} /> {t('Arraste este botão para a barra de favoritos')}</span>
            <a ref={link} className="btn btn-primary bookmarklet" onClick={e => e.preventDefault()}>{t('Conectar AUVP')}</a>
          </li>
          <li>
            <span className="step-title">{t('Abra a Carteira na AUVP já logado e clique no favorito')}</span>
            <a className="link" href="https://ferramentas.auvp.com.br/carteira" target="_blank" rel="noreferrer">
              {t('Abrir ferramentas.auvp.com.br/carteira')}
            </a>
          </li>
        </ol>

        <details className="manual">
          <summary><KeyRound size={14} /> {t('Prefiro colar o token manualmente')}</summary>
          <p>
            {tx('No site da AUVP, abra o console (F12) e rode {code}. Cole o resultado aqui.', { code: <code>localStorage.getItem('auvp-web@token')</code> })}
          </p>
          <form
            className="row"
            onSubmit={e => {
              e.preventDefault()
              if (!pasted.trim()) return
              token.set(pasted)
              onConnected()
            }}
          >
            <label className="sr-only" htmlFor="tok">Token</label>
            <input id="tok" className="input" value={pasted} onChange={e => setPasted(e.target.value)} placeholder="eyJhbGciOi…" autoComplete="off" spellCheck={false} />
            <button className="btn" type="submit" disabled={!pasted.trim()}>{t('Conectar')}</button>
          </form>
        </details>
        <button className="btn demo-btn" onClick={() => { token.set(DEMO_TOKEN); onConnected() }}>
          <Eye size={15} /> {t('Ver demonstração com dados fictícios')}
        </button>
        <Credits />
      </div>
    </main>
  )
}
