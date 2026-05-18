import MaterialIcon from './MaterialIcon'
import './ProvenanceCard.css'

// Friendly labels for the source tags that the verify-screen orchestrator
// emits. Keeps the UI readable without exposing internal naming.
const SOURCE_LABELS = {
  'yahoo': 'Yahoo Finance',
  'yahoo:spot': 'Yahoo Finance (spot price)',
  'yahoo:annual': 'Yahoo Finance (last annual statement)',
  'yahoo:ttm': 'Yahoo Finance (trailing 12 months)',
  'yahoo:explicit': 'Yahoo Finance',
  'unavailable': 'Not available',
}

function describeSource(tag) {
  if (!tag) return 'Not available'
  if (SOURCE_LABELS[tag]) return SOURCE_LABELS[tag]
  // Dynamic tags: 'yahoo:24m-avg(24mo)', 'edgar:10-K', 'edgar:10-K/A', etc.
  if (tag.startsWith('yahoo:24m-avg')) {
    const months = tag.match(/\((\d+)mo\)/)?.[1]
    return months ? `Yahoo Finance (${months}-month average)` : 'Yahoo Finance (24-month average)'
  }
  if (tag.startsWith('edgar:')) {
    const form = tag.slice('edgar:'.length)
    return `SEC EDGAR (${form})`
  }
  return tag
}

function relativeTime(iso) {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return null
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const CONFIDENCE_TONE = {
  HIGH: { className: 'provenance-card__confidence--high', icon: 'verified', label: 'High confidence' },
  MEDIUM: { className: 'provenance-card__confidence--medium', icon: 'check_circle', label: 'Medium confidence' },
  LOW: { className: 'provenance-card__confidence--low', icon: 'help', label: 'Low confidence' },
}

// Display order — top-to-bottom in the per-metric list. Matches how the
// underlying ratio screen weighs them: market cap is the denominator for
// the three balance-sheet ratios, then the components, then revenue.
const FIELDS = [
  { key: 'marketCap', label: 'Market cap' },
  { key: 'totalDebt', label: 'Total debt' },
  { key: 'cashAndShortTermInvestments', label: 'Cash + short-term investments' },
  { key: 'receivables', label: 'Receivables' },
  { key: 'totalAssets', label: 'Total assets' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'haramIncome', label: 'Non-permissible income' },
]

/**
 * Displays the data_sources_used object produced by /api/verify-screen.
 * Renders nothing when there's no verification data yet — the parent is
 * responsible for showing a "Verify" CTA in that case.
 */
export default function ProvenanceCard({ verification, confidence, onReverify, reverifying }) {
  if (!verification) return null

  const provenance = verification.fieldProvenance || {}
  const mismatches = Array.isArray(verification.mismatches) ? verification.mismatches : []
  const confTone = CONFIDENCE_TONE[confidence] || CONFIDENCE_TONE.MEDIUM
  const verifiedRel = relativeTime(verification.verifiedAt)

  const sourceMix = [
    verification.usedEdgar && 'SEC EDGAR',
    verification.usedTtm && 'Yahoo TTM',
    verification.usedAvgCap && 'Yahoo 24-month chart',
    !verification.usedEdgar && !verification.usedTtm && !verification.usedAvgCap && 'Yahoo Finance',
  ].filter(Boolean).join(' + ')

  return (
    <div className="provenance-card">
      <div className="provenance-card__header">
        <div>
          <h3 className="provenance-card__title">
            <MaterialIcon name="fact_check" size={18} />
            Source verification
          </h3>
          <p className="provenance-card__sub">
            Cross-checked against {sourceMix}
            {verifiedRel && <> · {verifiedRel}</>}
          </p>
        </div>
        <span className={`provenance-card__confidence ${confTone.className}`}>
          <MaterialIcon name={confTone.icon} size={14} fill />
          {confTone.label}
        </span>
      </div>

      <dl className="provenance-card__metrics">
        {FIELDS.map(f => {
          const source = provenance[f.key]
          if (!source || source === 'unavailable') return null
          return (
            <div key={f.key} className="provenance-card__row">
              <dt>{f.label}</dt>
              <dd>{describeSource(source)}</dd>
            </div>
          )
        })}
      </dl>

      {verification.marketCapBasis && (
        <p className="provenance-card__note">
          <MaterialIcon name="info" size={12} />
          Market cap calculated as {verification.marketCapBasis}. Income basis: {verification.incomeBasis || 'ANNUAL'}.
        </p>
      )}

      {mismatches.length > 0 && (
        <div className="provenance-card__mismatches">
          <h4>
            <MaterialIcon name="warning" size={14} fill />
            {mismatches.length} source disagreement{mismatches.length === 1 ? '' : 's'}
          </h4>
          <ul>
            {mismatches.slice(0, 4).map((m, i) => (
              <li key={i}>
                {describeSource(m.source)} differs from the picked source by {(m.deltaPercent * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {typeof onReverify === 'function' && (
        <button
          type="button"
          className="provenance-card__reverify"
          onClick={onReverify}
          disabled={reverifying}
        >
          {reverifying ? (
            <>
              <MaterialIcon name="refresh" size={14} className="spinner" />
              Re-verifying…
            </>
          ) : (
            <>
              <MaterialIcon name="refresh" size={14} />
              Re-verify now
            </>
          )}
        </button>
      )}
    </div>
  )
}
