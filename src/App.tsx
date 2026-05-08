import { useEffect, useMemo, useState } from 'react'
import { GITHUB_REPO_URL } from './config'
import { loadLaws } from './data'
import { renderMarkdown } from './markdown'
import type { Law } from './types'
import { compareDatesDesc, formatDate, normalizeSearchText } from './utils'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

type Filter = 'all' | 'active' | 'changed'

function matchesQuery(law: Law, query: string): boolean {
  const q = normalizeSearchText(query.trim())
  if (!q) return true
  const haystack = normalizeSearchText([
    law.id,
    law.number,
    law.title,
    law.category,
    law.status,
    law.effectiveFrom,
    law.lastUpdated,
    law.amendments.map((item) => `${item.date ?? ''} ${item.title} ${item.description ?? ''}`).join(' '),
    law.plainText,
  ].filter(Boolean).join(' '))
  return q.split(/\s+/).every((part) => haystack.includes(part))
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyRepositoryHint() {
  return (
    <section className="empty-state">
      <h2>V datovém repozitáři zatím nejsou žádné zákony</h2>
      <p>
        Aplikace se připojila k repozitáři, ale nenašla žádné platné soubory. Přidej Markdown soubory do složky <code>laws/</code>.
      </p>
      <pre>{`laws/
  14-2020-trestni-zakonik.md
  2-2020-zakon-o-policii.md`}</pre>
    </section>
  )
}

function LawList({ laws, selectedLaw, onSelect }: { laws: Law[]; selectedLaw?: Law; onSelect: (law: Law) => void }) {
  return (
    <div className="law-list">
      {laws.map((law) => (
        <button
          className={`law-list-item ${selectedLaw?.id === law.id ? 'selected' : ''}`}
          key={`${law.path}-${law.id}`}
          onClick={() => onSelect(law)}
          type="button"
        >
          <span className="law-number">{law.number ?? law.id}</span>
          <strong>{law.title}</strong>
          <small>upraveno {formatDate(law.lastUpdated)}</small>
        </button>
      ))}
    </div>
  )
}

function LawDetail({ law }: { law: Law }) {
  const html = useMemo(() => renderMarkdown(law.content), [law.content])

  return (
    <article className="law-detail">
      <header className="law-detail-header">
        <div>
          <p className="eyebrow">{law.category ?? 'Zákon'}</p>
          <h2>{law.title}</h2>
          <p className="law-meta-line">
            {law.number ? `Zákon č. ${law.number}` : law.id} · účinnost {formatDate(law.effectiveFrom)} · poslední úprava {formatDate(law.lastUpdated)}
          </p>
        </div>
        <a className="source-link" href={law.sourceUrl} target="_blank" rel="noreferrer">Upravit na GitHubu</a>
      </header>

      {law.amendments.length > 0 && (
        <section className="amendments">
          <h3>Novely a úpravy</h3>
          <div className="timeline">
            {[...law.amendments].sort((a, b) => compareDatesDesc(a.date, b.date)).map((amendment, index) => (
              <div className="timeline-item" key={`${amendment.date}-${amendment.title}-${index}`}>
                <time>{formatDate(amendment.date)}</time>
                <strong>{amendment.title}</strong>
                {amendment.description && <p>{amendment.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}

function App() {
  const [laws, setLaws] = useState<Law[]>([])
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [error, setError] = useState<string>('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string>('')

  useEffect(() => {
    let mounted = true
    setLoadState('loading')
    loadLaws()
      .then((loaded) => {
        if (!mounted) return
        setLaws(loaded)
        setSelectedId(loaded[0]?.id ?? '')
        setLoadState('ready')
      })
      .catch((err: unknown) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Neznámá chyba při načítání dat')
        setLoadState('error')
      })
    return () => { mounted = false }
  }, [])

  const latestChange = useMemo(() => {
    const dates = laws.map((law) => law.lastUpdated).filter(Boolean) as string[]
    return dates.sort((a, b) => compareDatesDesc(a, b))[0]
  }, [laws])

  const categories = useMemo(() => new Set(laws.map((law) => law.category).filter(Boolean)).size, [laws])

  const filteredLaws = useMemo(() => {
    return laws.filter((law) => {
      if (!matchesQuery(law, query)) return false
      if (filter === 'active') return !law.status || normalizeSearchText(law.status).includes('active') || normalizeSearchText(law.status).includes('plat')
      if (filter === 'changed') return Boolean(law.lastUpdated || law.amendments.length)
      return true
    })
  }, [laws, query, filter])

  const selectedLaw = useMemo(() => {
    return filteredLaws.find((law) => law.id === selectedId) ?? filteredLaws[0] ?? laws.find((law) => law.id === selectedId)
  }, [filteredLaws, laws, selectedId])

  return (
    <div className="app-shell">
      <header className="hero">
        <nav className="topbar">
          <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="topbar-repo-link">Repozitář</a>
        </nav>

        <div className="hero-content" id="top">
          <p className="eyebrow">San Andreas</p>
          <h1>Elektronická kniha zákonů</h1>
        </div>
      </header>

      <main className="main-grid">
        <aside className="sidebar">
          <div className="search-card">
            <label htmlFor="search">Vyhledávání v zákonech</label>
            <input
              id="search"
              placeholder="Např. policie, vláda, pokuta..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {loadState === 'loading' && <div className="loader">Načítám zákony z GitHubu…</div>}
          {loadState === 'error' && <div className="error-box">{error}</div>}
          {loadState === 'ready' && laws.length === 0 && <EmptyRepositoryHint />}
          {filteredLaws.length > 0 && <LawList laws={filteredLaws} selectedLaw={selectedLaw} onSelect={(law) => setSelectedId(law.id)} />}
          {loadState === 'ready' && laws.length > 0 && filteredLaws.length === 0 && (
            <div className="empty-state compact">Nic nenalezeno. Zkus jiné klíčové slovo.</div>
          )}
        </aside>

        <section className="content-panel">
          {selectedLaw ? <LawDetail law={selectedLaw} /> : (
            <div className="placeholder">
              <h2>Vyber zákon ze seznamu</h2>
              <p>Po přidání Markdown souborů do datového repozitáře se zde zobrazí jejich obsah.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <span>San Andreas - Elektronická kniha zákonů</span>
        <span className="footer-sep" />
        <span>Vláda San Andreas - zřizovatel nebere odpovědnost za úpravu obsahu zákonů</span>
      </footer>
    </div>
  )
}

export default App
