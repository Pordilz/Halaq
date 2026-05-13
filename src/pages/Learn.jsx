import { useEffect, useMemo, useState } from 'react'
import MaterialIcon from '../components/MaterialIcon'
import useDocumentTitle from '../hooks/useDocumentTitle'
import './Learn.css'

const CATEGORIES = ['All', 'Basics', 'Methodology', 'Purification', 'Zakat']

/* Each article's body is original Halaq prose. Sources for each piece are
   cited at the bottom; we encourage the reader to consult primary sources. */
const ARTICLES = [
  {
    id: 'basics',
    icon: 'menu_book',
    category: 'Basics',
    readTime: '5 min',
    title: 'The fundamentals of halal investing',
    summary:
      "What makes a stock permissible for a Muslim investor — and why screening is unavoidable when buying public-company shares.",
    sections: [
      {
        h: 'What is "halal" investing?',
        p: 'Halal investing means owning equity in companies whose primary business is permissible under Shariah, and whose financing, capital structure and revenue mix do not derive substantially from interest (riba) or other prohibited sources. Two screens are applied: a qualitative one on the business itself, and a quantitative one on the company\'s financial ratios.',
      },
      {
        h: 'Why this is harder than it looks',
        p: 'Modern listed companies almost always carry some interest-bearing debt and earn some interest income on idle cash — the question is whether those amounts are small enough to be tolerable. Scholars permit this within published thresholds (e.g. AAOIFI: total debt under one-third of market cap, interest-related revenue under 5%). The thresholds aren\'t a loophole — they exist because pure exclusion would shrink the investable universe to almost nothing in conventional capital markets.',
      },
      {
        h: 'What Halaq does',
        p: 'Halaq applies the published AAOIFI standard by default — the same framework used by most major Islamic financial institutions and Shariah indices. We surface the verdict, every ratio used to reach it, the methodology being applied, and the reporting period of the underlying financials. The decision to act is yours.',
      },
    ],
    sources: [
      { name: 'AAOIFI — Accounting and Auditing Organization for Islamic Financial Institutions', url: 'https://aaoifi.com/shariaa-standards/?lang=en' },
      { name: 'IFSB — Islamic Financial Services Board', url: 'https://www.ifsb.org/published.php' },
      { name: 'ISRA — International Shariah Research Academy', url: 'https://ifikr.isra.my/' },
    ],
  },
  {
    id: 'methodology',
    icon: 'gavel',
    category: 'Methodology',
    readTime: '10 min',
    title: 'AAOIFI Standard 21 — the four ratios, in plain English',
    summary:
      'How the four AAOIFI ratios work, what they measure, and what each one tells you about a company\'s capital structure.',
    sections: [
      {
        h: '1. Leverage',
        p: 'Total interest-bearing debt divided by market cap, threshold under 33%. Measures how much of the company\'s market value is financed by riba-based borrowing. Companies with very low debt — Apple, Microsoft, Saudi Aramco — pass easily; capital-heavy banks and utilities almost always fail.',
      },
      {
        h: '2. Liquidity',
        p: 'Cash plus interest-bearing securities divided by market cap, threshold under 33%. Measures how much of the company\'s market value sits in interest-earning assets. Cash-rich tech companies that park reserves in money-market funds can fail this even with zero debt.',
      },
      {
        h: '3. Receivables',
        p: 'Accounts receivable divided by market cap, threshold under 49% (AAOIFI; FTSE uses 50%; DJIM uses 33%). High receivables relative to market cap can indicate that a substantial share of the company\'s value is locked up in deferred-payment claims, which raises Shariah concerns about trading at a price different from face value.',
      },
      {
        h: '4. Haram revenue',
        p: 'Interest income plus interest expense divided by total revenue, threshold under 5%. The idea: a company with non-permissible revenue under 5% can be cleansed via dividend purification (donate that percentage to charity). Above 5%, the contamination is too large to purify.',
      },
      {
        h: 'Two screens, not one',
        p: 'A company can pass all four financial ratios and still fail because its primary business is non-permissible (a brewery, a casino, a conventional bank). The qualitative business-activity screen is applied first; financial ratios only matter if the business itself is permissible.',
      },
    ],
    sources: [
      { name: 'AAOIFI Standards (purchase / preview)', url: 'https://aaoifi.com/shariaa-standards/?lang=en' },
      { name: 'S&P Dow Jones Shariah index methodology', url: 'https://www.spglobal.com/spdji/en/index-family/shariah/' },
      { name: 'FTSE Shariah methodology', url: 'https://www.ftserussell.com/products/indices/ftse-shariah' },
    ],
  },
  {
    id: 'purification',
    icon: 'volunteer_activism',
    category: 'Purification',
    readTime: '6 min',
    title: 'Dividend purification — what to donate, when, and why',
    summary:
      'How to compute the purification amount on a dividend, why capital gains aren\'t purified, and the dominant scholarly position.',
    sections: [
      {
        h: 'What is purification?',
        p: 'Purification (تطهير) is the act of donating to charity the portion of a dividend that derives from non-permissible activities — typically interest income earned on the company\'s cash reserves. It does not transform haram income into halal: the act is one of cleansing the investor\'s holdings, not the company\'s.',
      },
      {
        h: 'How Halaq computes the rate',
        p: 'We compute (interest income + interest expense) ÷ total revenue from the latest reported annual statement. That percentage is the purification rate for any dividend received during that period. Example: a company with a 1.8% rate and a $250 dividend → donate $4.50.',
      },
      {
        h: 'Capital gains vs dividends',
        p: 'The dominant AAOIFI position is that purification applies only to dividends, not to capital gains. The reasoning: dividends are a direct distribution of company income (which contains some non-permissible revenue), whereas capital gains reflect market sentiment about future cash flows, not the cash flows themselves. Some scholars disagree — when in doubt, consult your scholar.',
      },
      {
        h: 'Where to donate',
        p: 'Purification donations should not be given as zakat (different obligations); they should not be given to ineligible recipients (your immediate family). Mosques, water projects, and educational charities are common destinations. Keep records: zakat-eligible giving and purification-eligible giving are tracked separately.',
      },
    ],
    sources: [
      { name: 'AAOIFI Shariah Standard No. 21 — Investment Sukuk', url: 'https://aaoifi.com/shariaa-standards/?lang=en' },
      { name: 'Mufti Taqi Usmani — An Introduction to Islamic Finance', url: 'https://muftitaqiusmani.com' },
      { name: 'IIFA — International Islamic Fiqh Academy resolutions', url: 'https://iifa-aifi.org/en/' },
    ],
  },
  {
    id: 'zakat',
    icon: 'calculate',
    category: 'Zakat',
    readTime: '7 min',
    title: 'Zakat on shares — long-term vs trading positions',
    summary:
      'How to calculate zakat when you hold equities, and the practical short-cut most scholars accept for long-term investors.',
    sections: [
      {
        h: 'The two positions',
        p: 'Scholars distinguish between trading positions (held to flip) and long-term investments (held for income / growth). For trading positions, zakat is on the full market value; for long-term holdings, zakat is on the underlying zakatable assets — primarily cash, receivables and short-term investments — proportional to your shareholding.',
      },
      {
        h: 'The practical short-cut',
        p: 'For most retail investors, computing the underlying zakatable assets per company per year is impractical. AAOIFI Standard 35 and many contemporary scholars (e.g. AMJA, JKN) accept a simplified approach: treat 25% of the market value of long-term holdings as zakatable, then apply 2.5%. So effectively about 0.625% of market value per year. Some scholars require you to apply 2.5% to the full value if the intention is unclear.',
      },
      {
        h: 'When zakat is due',
        p: 'Zakat is due once you\'ve held wealth above the nisab for one lunar year (hawl). Many investors set their zakat anniversary to the same date each year (e.g. Ramadan 1) to keep records clean. Pick a date and stick to it.',
      },
    ],
    sources: [
      { name: 'AAOIFI Shariah Standard No. 35 — Zakah', url: 'https://aaoifi.com/shariaa-standards/?lang=en' },
      { name: 'AMJA — Assembly of Muslim Jurists of America (Zakat resolutions)', url: 'https://www.amjaonline.org/fatwa/en/category/zakat/' },
      { name: 'IIFA — International Islamic Fiqh Academy', url: 'https://iifa-aifi.org/en/' },
    ],
  },
  {
    id: 'debt',
    icon: 'account_balance',
    category: 'Basics',
    readTime: '5 min',
    title: 'Why debt thresholds exist',
    summary:
      'Reading a balance sheet the halal way: what counts as interest-bearing debt and why the 33% line was drawn there.',
    sections: [
      {
        h: 'What "debt" means here',
        p: 'On a balance sheet, debt for Shariah purposes is interest-bearing financial debt: bonds, term loans, revolving credit, finance leases. It does not include trade payables, deferred revenue or pension liabilities — those are operational and free of riba. Halaq uses the company\'s reported "total debt" line which already filters operational liabilities out.',
      },
      {
        h: 'Why 33%?',
        p: 'The threshold is rooted in the prophetic guidance "the third is much" (الثلث كثير), which scholars have used as a benchmark for what is "substantial". Anything more than one-third is considered too significant to overlook; less is tolerable in the secondary-market shareholding context. The same one-third logic underpins liquidity and (with some variation) receivables.',
      },
    ],
    sources: [
      { name: 'AAOIFI Shariah Standard No. 21 — Investment Sukuk', url: 'https://aaoifi.com/shariaa-standards/?lang=en' },
      { name: 'Mufti Taqi Usmani — An Introduction to Islamic Finance', url: 'https://muftitaqiusmani.com' },
      { name: 'IFSB — Islamic Financial Services Board', url: 'https://www.ifsb.org/published.php' },
    ],
  },
  {
    id: 'mixed',
    icon: 'business_center',
    category: 'Methodology',
    readTime: '6 min',
    title: 'Mixed-revenue businesses — the 5% test',
    summary:
      'How airlines, hotels, supermarkets and tech giants get screened when they sell some non-permissible items but most of their revenue is fine.',
    sections: [
      {
        h: 'The principle',
        p: 'A company whose primary business is permissible can still have a slice of revenue from non-permissible activities — a supermarket selling alcohol, a hotel offering room-service liquor, an airline showing a film with adult content. AAOIFI permits these holdings if the non-permissible revenue is under 5% of total revenue and the investor purifies the corresponding dividend percentage.',
      },
      {
        h: 'How Halaq estimates this',
        p: 'Public companies rarely break out non-permissible revenue cleanly. Halaq uses interest income + interest expense as a proxy when explicit lines are missing. We surface our confidence (explicit / estimated / debt-derived) so you can adjust trust in the verdict accordingly.',
      },
      {
        h: 'Common confusions',
        p: 'A holding by a permissible parent in a non-permissible subsidiary still counts. So does a minority stake by a permissible business in an alcohol producer. When in doubt, look at the segments breakdown in the 10-K / annual report.',
      },
    ],
    sources: [
      { name: 'AAOIFI Shariah Standard No. 21 — Investment Sukuk', url: 'https://aaoifi.com/shariaa-standards/?lang=en' },
      { name: 'S&P Dow Jones Islamic Market Index — methodology', url: 'https://www.spglobal.com/spdji/en/index-family/shariah/' },
      { name: 'FTSE Shariah Global Equity Index — methodology', url: 'https://www.ftserussell.com/products/indices/ftse-shariah' },
    ],
  },
]

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
