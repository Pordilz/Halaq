import { useEffect, useMemo, useState } from 'react'
import MaterialIcon from '../components/MaterialIcon'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { ARTICLES, CATEGORIES } from '../content/learn'
import './Learn.css'

export default function Learn() {
  useDocumentTitle('Learn', 'Curated Islamic finance articles, methodology and guides.')
  const [active, setActive] = useState('All')
  const [openId, setOpenId] = useState(null)

  const filtered = useMemo(
    () => active === 'All' ? ARTICLES : ARTICLES.filter(a => a.category === active),
    [active]
  )

  const openArticle = openId ? ARTICLES.find(a => a.id === openId) : null

  if (openArticle) {
    return <ArticleView article={openArticle} onBack={() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      setOpenId(null)
    }} />
  }

  return (
    <div className="learn-page container animate-entrance">
      <header className="learn-header">
        <h1 className="learn-header__title">Learn</h1>
        <p className="learn-header__lead">
          Plain-English explanations of how Halaq reaches a verdict, from the published AAOIFI,
          S&amp;P, Dow Jones and FTSE methodologies.
        </p>
      </header>

      <div className="categories-strip mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            className={`category-pill ${active === cat ? 'active' : ''}`}
            onClick={() => setActive(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <ul className="article-index">
        {filtered.map(a => (
          <li key={a.id}>
            <button
              type="button"
              className="article-index__row"
              onClick={() => {
                // Reset scroll BEFORE the article mounts so the browser doesn't
                // paint a single frame with the list's scroll position
                // applied to the new article — that single frame is what made
                // articles "open halfway through" visually.
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
                setOpenId(a.id)
              }}
            >
              <span className="article-index__title">{a.title}</span>
              <span className="article-index__summary">{a.summary}</span>
              <span className="article-index__meta">{a.category}, {a.readTime}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ArticleView({ article, onBack }) {
  useDocumentTitle(article.title, article.summary)

  // The page reuses the same Learn route, so React Router doesn't reset
  // scroll between the index and the article. Without this the article
  // opens at whatever scroll position the index had — usually mid-page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [article.id])

  return (
    <div className="learn-page container animate-entrance">
      <button type="button" className="article-back" onClick={onBack}>
        <MaterialIcon name="arrow_back" size={18} /> Back to all articles
      </button>

      <article className="article-view">
        <h1 className="article-view__title">{article.title}</h1>
        <p className="article-view__lede">{article.summary}</p>
        <p className="article-view__meta">{article.category}, {article.readTime}</p>

        {article.sections.map(s => (
          <section key={s.h} className="article-view__section">
            <h2>{s.h}</h2>
            <p>{s.p}</p>
          </section>
        ))}

        <section className="article-view__sources">
          <h2>Sources</h2>
          <ul>
            {article.sources.map(s => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  <MaterialIcon name="open_in_new" size={14} /> {s.name}
                </a>
              </li>
            ))}
          </ul>
          <p className="article-view__disclaimer">
            This is a plain-English summary written by Halaq for educational purposes. It is not a
            fatwa. For personal rulings, consult a qualified scholar.
          </p>
        </section>
      </article>
    </div>
  )
}
