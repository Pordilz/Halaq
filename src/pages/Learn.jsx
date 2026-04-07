import { useState } from 'react'
import MaterialIcon from '../components/MaterialIcon'
import './Learn.css'

export default function Learn() {
  const [activeCategory, setActiveCategory] = useState('All')
  
  const categories = ['All', 'Basics', 'Purification', 'Methodology', 'Zakat']
  
  const articles = [
    {
      id: 1,
      title: 'The Fundamentals of Halal Investing',
      excerpt: 'Understand the core principles that govern Islamic finance and how they apply to the modern stock market.',
      category: 'Basics',
      readTime: '5 min',
      icon: 'menu_book'
    },
    {
      id: 2,
      title: 'How Dividend Purification Works',
      excerpt: 'A complete guide to calculating and distributing your purification obligations accurately.',
      category: 'Purification',
      readTime: '8 min',
      icon: 'water_drop'
    },
    {
      id: 3,
      title: 'AAOIFI Standard 21 Explained',
      excerpt: 'Deep dive into the specific rules and thresholds used by major Islamic financial institutions.',
      category: 'Methodology',
      readTime: '12 min',
      icon: 'gavel'
    },
    {
      id: 4,
      title: 'Zakat on Shares: A Practical Guide',
      excerpt: 'How to calculate your annual Zakat when holding individual stocks versus ETFs.',
      category: 'Zakat',
      readTime: '7 min',
      icon: 'calculate'
    },
    {
      id: 5,
      title: 'Understanding Debt Ratios',
      excerpt: 'Why conventional debt is restricted and how to read a balance sheet the Halal way.',
      category: 'Basics',
      readTime: '6 min',
      icon: 'account_balance'
    },
    {
      id: 6,
      title: 'Can I Invest in Tech Giants?',
      excerpt: 'A case study on screening FAANG stocks and dealing with mixed-revenue businesses.',
      category: 'Methodology',
      readTime: '9 min',
      icon: 'business_center'
    }
  ]

  const filteredArticles = activeCategory === 'All' 
    ? articles 
    : articles.filter(a => a.category === activeCategory)

  return (
    <div className="learn-page container animate-entrance">
      {/* Hero */}
      <div className="learn-hero mb-8">
        <h1 className="text-h1 mb-2">Knowledge Center</h1>
        <p className="text-on-surface-variant text-body-lg max-w-xl">
          Master the principles of Islamic finance. Curated articles, methodologies, and guides for the conscious investor.
        </p>
      </div>

      {/* Categories */}
      <div className="categories-strip mb-6">
        {categories.map(cat => (
          <button 
            key={cat}
            className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="articles-grid">
        {filteredArticles.map(article => (
          <div key={article.id} className="article-card card-standard interactive-element">
            <div className="article-icon-wrapper">
              <MaterialIcon name={article.icon} size={28} className="text-primary" />
            </div>
            <div className="article-meta">
              <span className="article-category">{article.category}</span>
              <span className="article-time">· {article.readTime}</span>
            </div>
            <h3 className="text-h3 mb-2">{article.title}</h3>
            <p className="text-on-surface-variant text-body-sm line-clamp-3">
              {article.excerpt}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
