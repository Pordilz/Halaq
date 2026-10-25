/**
 * Bespoke editorial illustrations for onboarding, empty states, and marketing.
 * All inherit `currentColor` so they tint to the surrounding theme.
 * No emoji. No external image deps.
 */

const FRAME_PROPS = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  'aria-hidden': 'true',
}

/* Slide 1 — Calm screening */
export function ScreeningIllustration({ size = 280 }) {
  return (
    <svg {...FRAME_PROPS} width={size} height={size} viewBox="0 0 280 280">
      <defs>
        <linearGradient id="screen-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#1a6b47" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#1a6b47" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <rect width="280" height="280" rx="40" fill="url(#screen-bg)" />
      <g transform="translate(40 60)">
        <rect width="200" height="160" rx="20" fill="#ffffff" stroke="#1a6b47" strokeOpacity="0.12" />
        <rect x="20" y="22" width="120" height="14" rx="4" fill="#1a6b47" fillOpacity="0.16" />
        <rect x="20" y="44" width="80" height="10" rx="3" fill="#1a6b47" fillOpacity="0.10" />
        <rect x="20" y="76" width="160" height="8" rx="3" fill="#1a6b47" fillOpacity="0.08" />
        <rect x="20" y="76" width="92" height="8" rx="3" fill="#1a6b47" />
        <rect x="20" y="98" width="160" height="8" rx="3" fill="#1a6b47" fillOpacity="0.08" />
        <rect x="20" y="98" width="46" height="8" rx="3" fill="#22875a" />
        <rect x="20" y="120" width="160" height="8" rx="3" fill="#1a6b47" fillOpacity="0.08" />
        <rect x="20" y="120" width="120" height="8" rx="3" fill="#1a6b47" fillOpacity="0.45" />
      </g>
      <g transform="translate(180 30)">
        <circle cx="22" cy="22" r="22" fill="#1a6b47" />
        <path d="M14 22l6 6 12-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

/* Slide 2 — Compliance ruling */
export function RulingIllustration({ size = 280 }) {
  return (
    <svg {...FRAME_PROPS} width={size} height={size} viewBox="0 0 280 280">
      <defs>
        <linearGradient id="ruling-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#a3f0ca" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#ffe792" stopOpacity="0.20" />
        </linearGradient>
      </defs>
      <rect width="280" height="280" rx="40" fill="url(#ruling-bg)" />
      {/* Card 1 — compliant */}
      <g transform="translate(36 56)">
        <rect width="120" height="140" rx="20" fill="#ffffff" />
        <rect x="16" y="20" width="44" height="22" rx="6" fill="#a3f0ca" fillOpacity="0.6" />
        <text x="38" y="35" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="11" fill="#0d5233">AAPL</text>
        <rect x="16" y="56" width="80" height="8" rx="3" fill="#0f1a27" fillOpacity="0.8" />
        <rect x="16" y="72" width="60" height="6" rx="3" fill="#0f1a27" fillOpacity="0.35" />
        <rect x="16" y="100" width="86" height="22" rx="11" fill="#90f5be" />
        <circle cx="29" cy="111" r="6" fill="#006837" />
        <path d="M26 111l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <text x="56" y="115" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="9" fill="#002715" letterSpacing="0.05em">COMPLIANT</text>
      </g>
      {/* Card 2 — review required (mixed business; the old DOUBTFUL bucket
          was split into REVIEW_REQUIRED + UNVERIFIED in migration 007) */}
      <g transform="translate(132 92)">
        <rect width="120" height="140" rx="20" fill="#ffffff" />
        <rect x="16" y="20" width="44" height="22" rx="6" fill="#a3f0ca" fillOpacity="0.6" />
        <text x="38" y="35" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="11" fill="#0d5233">TSLA</text>
        <rect x="16" y="56" width="80" height="8" rx="3" fill="#0f1a27" fillOpacity="0.8" />
        <rect x="16" y="72" width="60" height="6" rx="3" fill="#0f1a27" fillOpacity="0.35" />
        <rect x="16" y="100" width="72" height="22" rx="11" fill="#fef3c7" />
        <circle cx="29" cy="111" r="6" fill="#92400e" />
        <text x="29" y="115" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="9" fill="#fff">?</text>
        <text x="56" y="115" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="9" fill="#78350f" letterSpacing="0.05em">REVIEW</text>
      </g>
      {/* Stacked bar at bottom */}
      <g transform="translate(40 226)">
        <rect width="200" height="8" rx="4" fill="#0f1a27" fillOpacity="0.06" />
        <rect width="120" height="8" rx="4" fill="#006837" />
        <rect x="124" width="50" height="8" rx="4" fill="#92400e" />
        <rect x="178" width="22" height="8" rx="4" fill="#b91c1c" />
      </g>
    </svg>
  )
}

/* Slide 3 — Halal portfolio */
export function PortfolioIllustration({ size = 280 }) {
  return (
    <svg {...FRAME_PROPS} width={size} height={size} viewBox="0 0 280 280">
      <defs>
        <linearGradient id="port-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#1a6b47" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#22875a" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <rect width="280" height="280" rx="40" fill="url(#port-bg)" />
      <circle cx="140" cy="140" r="76" fill="#ffffff" stroke="#1a6b47" strokeOpacity="0.12" />
      {/* Donut chart segments — 60% green, 25% gold, 15% subtle */}
      <g transform="translate(140 140)">
        <circle r="64" fill="none" stroke="#0f1a27" strokeOpacity="0.05" strokeWidth="18" />
        <circle r="64" fill="none" stroke="#1a6b47" strokeWidth="18" strokeDasharray="241 402" strokeDashoffset="0" transform="rotate(-90)" />
        <circle r="64" fill="none" stroke="#e8c84a" strokeWidth="18" strokeDasharray="100 402" strokeDashoffset="-241" transform="rotate(-90)" />
        <circle r="64" fill="none" stroke="#92400e" strokeOpacity="0.7" strokeWidth="18" strokeDasharray="60 402" strokeDashoffset="-341" transform="rotate(-90)" />
      </g>
      {/* Centre label */}
      <g>
        <text x="140" y="136" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="24" fill="#0f1a27" letterSpacing="-0.02em">12</text>
        <text x="140" y="155" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="9" fill="#627080" letterSpacing="0.12em">SAVED</text>
      </g>
      {/* Floating chips */}
      <g transform="translate(20 36)">
        <rect width="92" height="32" rx="16" fill="#ffffff" />
        <circle cx="18" cy="16" r="6" fill="#006837" />
        <text x="32" y="20" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="11" fill="#0f1a27">AAPL · COMPLIANT</text>
      </g>
      <g transform="translate(170 220)">
        <rect width="92" height="32" rx="16" fill="#ffffff" />
        <circle cx="18" cy="16" r="6" fill="#006837" />
        <text x="32" y="20" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="11" fill="#0f1a27">MSFT · COMPLIANT</text>
      </g>
    </svg>
  )
}
