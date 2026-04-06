import { Link } from 'react-router-dom'
import {
  Shield, Search, BarChart3, Calculator,
  ChevronRight, CheckCircle, Star, TrendingUp, ArrowRight,
} from 'lucide-react'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing">
      {/* ---- Hero ---- */}
      <section className="hero">
        <div className="hero__bg-pattern" />
        <div className="hero__inner container">
          <div className="hero__content animate-fade-in-up">
            <div className="hero__badge">
              <Shield size={14} />
              <span>AAOIFI Standard Screening</span>
            </div>
            <h1 className="hero__title">
              Invest with <span className="hero__highlight">Confidence</span>{' '}
              and <span className="hero__highlight">Conscience</span>
            </h1>
            <p className="hero__subtitle">
              Screen JSE-listed and international stocks for Shariah compliance. 
              Built for South African Muslim investors who want transparency 
              in every investment decision.
            </p>
            <div className="hero__actions">
              <Link to="/screener" className="btn btn-accent btn-lg">
                Screen a Stock
                <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="btn btn-secondary btn-lg">
                How It Works
              </a>
            </div>
            <div className="hero__trust">
              <div className="hero__trust-item">
                <CheckCircle size={16} />
                <span>AAOIFI Standards</span>
              </div>
              <div className="hero__trust-item">
                <CheckCircle size={16} />
                <span>JSE & US Stocks</span>
              </div>
              <div className="hero__trust-item">
                <CheckCircle size={16} />
                <span>Free to Try</span>
              </div>
            </div>
          </div>

          <div className="hero__visual animate-fade-in-up delay-2">
            <div className="hero__card">
              <div className="hero__card-header">
                <div className="hero__card-ticker">AAPL</div>
                <div className="hero__card-badge hero__card-badge--pass">
                  <CheckCircle size={14} />
                  Compliant
                </div>
              </div>
              <div className="hero__card-company">Apple Inc.</div>
              <div className="hero__card-ratios">
                <div className="hero__card-ratio">
                  <span>Debt/MCap</span>
                  <span className="hero__card-ratio-value hero__card-ratio-value--pass">18.2%</span>
                </div>
                <div className="hero__card-ratio">
                  <span>Cash/MCap</span>
                  <span className="hero__card-ratio-value hero__card-ratio-value--pass">4.5%</span>
                </div>
                <div className="hero__card-ratio">
                  <span>Recv/MCap</span>
                  <span className="hero__card-ratio-value hero__card-ratio-value--pass">2.1%</span>
                </div>
                <div className="hero__card-ratio">
                  <span>Haram Rev</span>
                  <span className="hero__card-ratio-value hero__card-ratio-value--pass">0.0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- How It Works ---- */}
      <section id="how-it-works" className="how-it-works section">
        <div className="container">
          <div className="section-header text-center animate-fade-in-up">
            <h2>How Halaq Screens Stocks</h2>
            <p className="text-muted">
              Every stock passes through a rigorous two-layer screening based on AAOIFI standards
            </p>
          </div>

          <div className="steps">
            <div className="step card card-elevated animate-fade-in-up delay-1">
              <div className="step__number">1</div>
              <Search size={28} className="step__icon" />
              <h3>Business Activity Screen</h3>
              <p>
                We check if the company's primary business involves prohibited activities 
                like conventional banking, alcohol, gambling, or tobacco.
              </p>
            </div>

            <div className="step card card-elevated animate-fade-in-up delay-2">
              <div className="step__number">2</div>
              <BarChart3 size={28} className="step__icon" />
              <h3>Financial Ratio Screen</h3>
              <p>
                Four AAOIFI ratios are calculated: leverage, liquidity, receivables, 
                and haram income — each must be below strict thresholds.
              </p>
            </div>

            <div className="step card card-elevated animate-fade-in-up delay-3">
              <div className="step__number">3</div>
              <Calculator size={28} className="step__icon" />
              <h3>Purification Calculation</h3>
              <p>
                If a halal stock has incidental haram income (&lt;5%), we calculate 
                exactly how much of your dividends to donate to charity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Criteria ---- */}
      <section className="criteria section-sm">
        <div className="container">
          <div className="criteria__grid">
            <div className="criteria__info animate-fade-in-up">
              <h2>AAOIFI Financial Thresholds</h2>
              <p className="text-muted">
                Using the most recent annual financial statements, every stock 
                must pass all four ratio tests:
              </p>
            </div>
            <div className="criteria__cards">
              <div className="criteria__card animate-fade-in-up delay-1">
                <div className="criteria__card-value">&lt; 33%</div>
                <div className="criteria__card-label">Leverage Ratio</div>
                <div className="criteria__card-desc">Total Debt ÷ Market Cap</div>
              </div>
              <div className="criteria__card animate-fade-in-up delay-2">
                <div className="criteria__card-value">&lt; 33%</div>
                <div className="criteria__card-label">Liquidity Ratio</div>
                <div className="criteria__card-desc">Cash + Securities ÷ Market Cap</div>
              </div>
              <div className="criteria__card animate-fade-in-up delay-3">
                <div className="criteria__card-value">&lt; 49%</div>
                <div className="criteria__card-label">Receivables Ratio</div>
                <div className="criteria__card-desc">Receivables ÷ Market Cap</div>
              </div>
              <div className="criteria__card animate-fade-in-up delay-4">
                <div className="criteria__card-value">&lt; 5%</div>
                <div className="criteria__card-label">Haram Income</div>
                <div className="criteria__card-desc">Non-permissible Revenue ÷ Total Revenue</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Pricing ---- */}
      <section className="pricing section" id="pricing">
        <div className="container">
          <div className="section-header text-center animate-fade-in-up">
            <h2>Simple, Transparent Pricing</h2>
            <p className="text-muted">Start free, upgrade when you need more</p>
          </div>

          <div className="pricing__grid">
            {/* Free */}
            <div className="pricing__card card animate-fade-in-up delay-1">
              <div className="pricing__tier">Free</div>
              <div className="pricing__price">
                <span className="pricing__amount">R0</span>
                <span className="pricing__period">/month</span>
              </div>
              <ul className="pricing__features">
                <li><CheckCircle size={16} /> 5 stock screens / day</li>
                <li><CheckCircle size={16} /> Basic JSE & US stocks</li>
                <li><CheckCircle size={16} /> AAOIFI financial ratios</li>
              </ul>
              <Link to="/settings" className="btn btn-secondary" style={{ width: '100%' }}>
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="pricing__card pricing__card--featured card card-elevated animate-fade-in-up delay-2">
              <div className="pricing__popular">
                <Star size={14} />
                Most Popular
              </div>
              <div className="pricing__tier">Pro</div>
              <div className="pricing__price">
                <span className="pricing__amount">R79</span>
                <span className="pricing__period">/month</span>
              </div>
              <ul className="pricing__features">
                <li><CheckCircle size={16} /> Unlimited daily searches</li>
                <li><CheckCircle size={16} /> AI Compliance Explainer</li>
                <li><CheckCircle size={16} /> Halal Alternatives</li>
                <li><CheckCircle size={16} /> Batch Screening (up to 20)</li>
              </ul>
              <Link to="/settings" className="btn btn-primary" style={{ width: '100%' }}>
                Subscribe — R79/mo
              </Link>
            </div>

            {/* Scholar */}
            <div className="pricing__card card animate-fade-in-up delay-3">
              <div className="pricing__tier">Scholar</div>
              <div className="pricing__price">
                <span className="pricing__amount">R149</span>
                <span className="pricing__period">/month</span>
              </div>
              <ul className="pricing__features">
                <li><CheckCircle size={16} /> Everything in Pro</li>
                <li><CheckCircle size={16} /> Unlimited Batch Screening</li>
                <li><CheckCircle size={16} /> ETF X-Ray Screening</li>
                <li><CheckCircle size={16} /> AI Shariah Chatbot</li>
                <li><CheckCircle size={16} /> Formal Compliance PDF Reports</li>
              </ul>
              <Link to="/settings" className="btn btn-secondary" style={{ width: '100%' }}>
                Subscribe — R149/mo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="cta section-sm">
        <div className="container">
          <div className="cta__box animate-fade-in-up">
            <h2>Ready to Invest the Halal Way?</h2>
            <p>Screen your first stock in under 30 seconds — completely free.</p>
            <Link to="/screener" className="btn btn-accent btn-lg">
              Start Screening
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
