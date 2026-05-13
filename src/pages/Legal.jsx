import { Link, useParams, Navigate } from 'react-router-dom'
import MaterialIcon from '../components/MaterialIcon'
import useDocumentTitle from '../hooks/useDocumentTitle'
import './Legal.css'

// Single-page renderer for /legal/:slug. We deliberately avoid pulling in
// a CMS — these documents change rarely and shipping them as code keeps
// the deploy auditable in git history. Update these strings as Halaq's
// legal posture evolves; do not silently delete material clauses.

const TODAY_REVIEW = '2026-05-08'

const DOCS = {
  privacy: {
    title: 'Privacy policy',
    intro:
      'This policy describes what personal data Halaq collects when you use our Shariah-compliance screening service, why we collect it, and the controls you have over it.',
    sections: [
      {
        h: '1. Data we collect',
        p: 'Account: email, optional username, password (hashed by our auth provider Supabase). Usage: pages visited, features used, search queries, watchlist entries. Billing: handled entirely by Lemon Squeezy — Halaq never receives your card details. We retain only the subscription id, plan tier, and renewal date returned by Lemon Squeezy webhooks.',
      },
      {
        h: '2. Why we collect it',
        p: 'To run your account (login, watchlist persistence, tier gating), to honour billing entitlements, to operate compliance alerts, and to debug issues you report. We do not profile users for advertising and we do not sell user data.',
      },
      {
        h: '3. Where data lives',
        p: 'Halaq application data is stored in Supabase (eu-west-1). Billing data is stored by Lemon Squeezy. Authentication tokens are stored in your browser and on Supabase. Backups are encrypted at rest.',
      },
      {
        h: '4. Cookies & tracking',
        p: 'We use a single first-party cookie set by Supabase to keep you signed in. We do not use third-party advertising trackers, fingerprinting, or session replay.',
      },
      {
        h: '5. Your rights',
        p: 'You can edit your username and notification preferences in /profile. You can cancel your subscription from the Lemon Squeezy customer portal, accessible from the same page. To request export or deletion of your data, email support@halaq.app from the address linked to your account; we honour requests within 30 days.',
      },
      {
        h: '6. Contact',
        p: 'Questions about this policy: privacy@halaq.app.',
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    intro:
      'By creating an account or using halaq.app you agree to these terms. They are written to be understood, not to obscure.',
    sections: [
      {
        h: '1. The service',
        p: 'Halaq screens publicly listed equities for Shariah compliance using AAOIFI methodology and major scholar-aligned alternatives. The output is informational and does not constitute investment advice or a religious ruling. Always consult a qualified scholar for personal rulings and a regulated financial adviser for personal investment decisions.',
      },
      {
        h: '2. Accounts',
        p: 'You are responsible for the security of your password. One person, one account. We may suspend or terminate accounts that abuse the service, attempt to reverse-engineer billing or rate limits, or violate applicable law.',
      },
      {
        h: '3. Subscriptions and billing',
        p: 'Free, Pro and Scholar tiers are described on the /upgrade page. Paid tiers renew automatically until cancelled. Cancel at any time via the customer portal — you keep access until the end of the current billing period and are not charged again.',
      },
      {
        h: '4. Refunds',
        p: 'New subscribers may request a full refund within 14 days of their first paid period by emailing support@halaq.app. After the 14-day window, refunds are at our discretion.',
      },
      {
        h: '5. Acceptable use',
        p: 'No automated scraping of the screener, no sharing accounts, no resale of compliance verdicts as a separate product without written permission. You may export your own watchlist and use the verdicts in your personal investing.',
      },
      {
        h: '6. Disclaimers',
        p: 'Halaq is provided "as is". Markets move; data providers have outages; methodologies evolve. We make a best-effort attempt to deliver accurate verdicts, but do not warrant fitness for any particular purpose. To the maximum extent permitted by law, our liability is limited to the fees you have paid Halaq in the 12 months preceding any claim.',
      },
      {
        h: '7. Changes',
        p: 'We may update these terms; material changes are announced by email at least 14 days before they take effect. Continued use after the effective date constitutes acceptance.',
      },
      {
        h: '8. Governing law',
        p: 'South Africa, with venue in Johannesburg.',
      },
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    intro:
      'Halaq is a research and information tool. It is not a fatwa, not investment advice, and not regulated financial advice.',
    sections: [
      {
        h: 'Religious ruling',
        p: 'Compliance verdicts on this site reflect a methodology (AAOIFI, DJIM, S&P or FTSE Shariah) applied to publicly available financial data. They are not personal religious rulings. For your specific situation, consult a qualified scholar.',
      },
      {
        h: 'Investment risk',
        p: 'Past performance is not indicative of future results. The compliance status of a stock can change quarter-to-quarter as ratios shift. Halaq is not registered as a financial adviser in any jurisdiction. Do your own due diligence and consult a regulated adviser for personal investment decisions.',
      },
      {
        h: 'Data accuracy',
        p: 'We source price and fundamentals data from Yahoo Finance. Yahoo data has known gaps, especially on smaller JSE-listed stocks. Where balance sheet line items are missing, Halaq estimates them and labels the result as "data limited" — treat those verdicts as preliminary.',
      },
    ],
  },
  'data-sources': {
    title: 'Data sources',
    intro:
      'We believe transparency about where the numbers come from is non-negotiable for a Shariah screener. Here is exactly what feeds Halaq.',
    sections: [
      {
        h: 'Price & fundamentals',
        p: 'Yahoo Finance, accessed via the keyless yahoo-finance2 library. Refreshes every minute on the home dashboard, on demand on the screener and stock detail pages. We never charge for raw data we did not pay for.',
      },
      {
        h: 'Methodology',
        p: 'Primary: AAOIFI Shariah Standard No. 21 (Investment Sukuk) and the AAOIFI quantitative thresholds in current use. Pro+ users can switch to Dow Jones Islamic Market Index, S&P Shariah, or FTSE Shariah methodologies.',
      },
      {
        h: 'Peer review',
        p: 'Verdicts are cross-checked against the published Shariah index methodologies (S&P Dow Jones Islamic, FTSE Shariah, MSCI Islamic) and against AAOIFI\'s audit framework. Material disagreements are treated as bugs and tracked publicly.',
      },
      {
        h: 'Update cadence',
        p: 'Compliance verdicts re-run any time you load a stock detail page — there is no overnight batch you might be reading hours-stale data from.',
      },
    ],
  },
}

export default function Legal() {
  const { slug } = useParams()
  const doc = DOCS[slug]

  // Always call hooks before any conditional return so the order is stable.
  useDocumentTitle(
    doc ? `${doc.title} — Halaq` : 'Legal — Halaq',
    doc?.intro || 'Halaq legal documents.'
  )

  if (!doc) {
    return <Navigate to="/legal/privacy" replace />
  }

  return (
    <div className="legal-page container animate-entrance">
      <Link to="/" className="legal-back">
        <MaterialIcon name="arrow_back" size={18} /> Back to home
      </Link>

      <header className="legal-header">
        <h1 className="text-h1">{doc.title}</h1>
        <p className="legal-meta">Last reviewed: {TODAY_REVIEW}</p>
        <p className="legal-intro">{doc.intro}</p>
      </header>

      {doc.sections.map((s) => (
        <section key={s.h} className="legal-section">
          <h2 className="text-h3">{s.h}</h2>
          <p>{s.p}</p>
        </section>
      ))}

      <nav className="legal-nav" aria-label="Other legal documents">
        {Object.entries(DOCS)
          .filter(([k]) => k !== slug)
          .map(([k, d]) => (
            <Link key={k} to={`/legal/${k}`} className="legal-nav__link">
              {d.title} <MaterialIcon name="arrow_forward" size={14} />
            </Link>
          ))}
      </nav>
    </div>
  )
}
