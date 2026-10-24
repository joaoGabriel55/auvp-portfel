import { t } from './i18n'

const LINKS = [
  { label: 'joaogabriel55.github.io', href: 'https://joaogabriel55.github.io/' },
  { label: 'GitHub', href: 'https://github.com/joaogabriel55' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/gabriel-quaresma-dev/' },
  { label: 'Instagram', href: 'https://www.instagram.com/drawquaresma/' },
]

export function Credits() {
  return (
    <footer className="credits">
      <span>{t('Feito por')} Gabriel Quaresma</span>
      <nav aria-label={t('Links do autor')}>
        {LINKS.map(l => <a key={l.href} className="link" href={l.href} target="_blank" rel="noreferrer">{l.label}</a>)}
      </nav>
    </footer>
  )
}
