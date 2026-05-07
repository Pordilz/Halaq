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
      {/* Card 2 — doubtful */}
      <g transform="translate(132 92)">
        <rect width="120" height="140" rx="20" fill="#ffffff" />
        <rect x="16" y="20" width="44" height="22" rx="6" fill="#a3f0ca" fillOpacity="0.6" />
        <text x="38" y="35" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="11" fill="#0d5233">TSLA</text>
        <rect x="16" y="56" width="80" height="8" rx="3" fill="#0f1a27" fillOpacity="0.8" />
        <rect x="16" y="72" width="60" height="6" rx="3" fill="#0f1a27" fillOpacity="0.35" />
        <rect x="16" y="100" width="80" height="22" rx="11" fill="#fef3c7" />
        <circle cx="29" cy="111" r="6" fill="#92400e" />
        <text x="29" y="115" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="9" fill="#fff">?</text>
        <text x="56" y="115" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="9" fill="#78350f" letterSpacing="0.05em">DOUBTFUL</text>
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

/* Hero — phone with screening list */
export function HeroPhoneMockup({ width = 320, height = 560 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 320 560"
      fill="none"
      role="img"
      aria-label="Halaq mobile preview"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        {/* Tight, soft shadow that hugs the phone — no spreading halo */}
        <filter id="phone-shadow" x="-10%" y="-5%" width="120%" height="115%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#0f1a27" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* Phone body — drawn entirely inside a clipped rounded shape so no
          background leaks past the frame. */}
      <g filter="url(#phone-shadow)">
        <rect x="10" y="10" width="300" height="540" rx="46" fill="#0f1a27" />
      </g>
      <rect x="18" y="18" width="284" height="524" rx="40" fill="#f8f9fb" />
      {/* Notch */}
      <rect x="120" y="24" width="80" height="22" rx="11" fill="#0f1a27" />

      {/* Status bar */}
      <g transform="translate(0 60)">
        <text x="36" y="16" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="12" fill="#0f1a27">9:41</text>
        <g transform="translate(232 4)" fill="#0f1a27">
          <rect width="18" height="11" rx="2" />
          <rect x="22" width="14" height="11" rx="2" />
          <rect x="42" width="22" height="11" rx="3" />
        </g>
      </g>

      {/* App header */}
      <g transform="translate(34 96)">
        <text x="0" y="20" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="22" fill="#0f1a27" letterSpacing="-0.02em">Find halal stocks</text>
        <text x="0" y="42" fontFamily="Manrope, sans-serif" fontWeight="500" fontSize="12" fill="#3a4a5c">AAOIFI methodology</text>
      </g>

      {/* Search bar */}
      <g transform="translate(34 152)">
        <rect width="252" height="42" rx="14" fill="#ffffff" stroke="#0f1a27" strokeOpacity="0.08" />
        <circle cx="22" cy="21" r="6" stroke="#627080" strokeWidth="2" />
        <line x1="27" y1="26" x2="32" y2="31" stroke="#627080" strokeWidth="2" strokeLinecap="round" />
        <text x="44" y="26" fontFamily="Manrope, sans-serif" fontWeight="500" fontSize="12" fill="#627080">Search by name or ticker…</text>
      </g>

      {/* Result rows */}
      {[
        { y: 218, t: 'AAPL', n: 'Apple Inc.',     s: 'NASDAQ', state: 'compliant' },
        { y: 286, t: 'MSFT', n: 'Microsoft Corp.', s: 'NASDAQ', state: 'compliant' },
        { y: 354, t: 'TSLA', n: 'Tesla Inc.',     s: 'NASDAQ', state: 'doubtful' },
        { y: 422, t: 'JPM',  n: 'JPMorgan Chase', s: 'NYSE',   state: 'noncompliant' },
      ].map((row) => {
        const palette = {
          compliant:    { bg: '#90f5be', dot: '#006837', label: 'COMPLIANT',     text: '#002715', width: 92 },
          doubtful:     { bg: '#fef3c7', dot: '#92400e', label: 'DOUBTFUL',      text: '#78350f', width: 80 },
          noncompliant: { bg: '#fee2e2', dot: '#b91c1c', label: 'NON-COMPLIANT', text: '#7f1d1d', width: 110 },
        }[row.state]
        // Right-align the pill against the row; right padding = 12px.
        const ROW_WIDTH = 252
        const PILL_RIGHT_PAD = 12
        const pillX = ROW_WIDTH - PILL_RIGHT_PAD - palette.width
        return (
          <g key={row.t} transform={`translate(34 ${row.y})`}>
            <rect width={ROW_WIDTH} height="56" rx="16" fill="#ffffff" stroke="#0f1a27" strokeOpacity="0.05" />
            {/* ticker badge */}
            <rect x="12" y="14" width="56" height="28" rx="8" fill="#a3f0ca" fillOpacity="0.5" />
            <text x="40" y="33" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="12" fill="#0d5233">{row.t}</text>
            {/* name */}
            <text x="80" y="24" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="12" fill="#0f1a27">{row.n}</text>
            <text x="80" y="40" fontFamily="Manrope, sans-serif" fontWeight="600" fontSize="9" fill="#627080" letterSpacing="0.04em">{row.s}</text>
            {/* status pill — pill is one group with dot and text laid out left-to-right with proper padding */}
            <g transform={`translate(${pillX} 16)`}>
              <rect width={palette.width} height="24" rx="12" fill={palette.bg} />
              <circle cx="13" cy="12" r="4" fill={palette.dot} />
              <text x="22" y="16" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="8.5" fill={palette.text} letterSpacing="0.06em">{palette.label}</text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
