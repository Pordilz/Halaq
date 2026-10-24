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
      <div className="learn-hero mb-8">
        <h1 className="text-h1 mb-2">Knowledge centre</h1>
        <p className="text-on-surface-variant text-body-lg max-w-xl">
          Plain-English explanations of the methodology behind every Halaq verdict — drawn from
          AAOIFI standards, leading scholars, and peer-reviewed against the major Muslim
          investing apps.
        </p>
      </div>

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

      <div className="articles-grid">
        {filtered.map(a => (
          <button
            type="button"
            key={a.id}
            className="article-card card-standard"
            onClick={() => {
              // Reset scroll BEFORE the article mounts so the browser doesn't
              // paint a single frame with the list's scroll position
              // applied to the new article — that single frame is what made
              // articles "open halfway through" visually.
              window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
              setOpenId(a.id)
            }}
          >
            <div className="article-icon-wrapper">
              <MaterialIcon name={a.icon} size={22} className="text-primary" />
            </div>
            <div className="article-meta">
              <span className="article-category">{a.category}</span>
              <span className="article-time">· {a.readTime}</span>
            </div>
            <h3>{a.title}</h3>
            <p>{a.summary}</p>
            <span className="article-card__cta">
              Read article <MaterialIcon name="arrow_forward" size={14} />
            </span>
          </button>
        ))}
      </div>
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
        <span className="article-view__eyebrow">{article.category} · {article.readTime}</span>
        <h1 className="article-view__title">{article.title}</h1>
        <p className="article-view__lede">{article.summary}</p>

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
