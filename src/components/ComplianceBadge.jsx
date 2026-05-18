import MaterialIcon from './MaterialIcon'
import './ComplianceBadge.css'

// Status taxonomy (migration 007): the old conflated DOUBTFUL bucket was
// split into REVIEW_REQUIRED (mixed-business — passes financials, needs
// human judgement) and UNVERIFIED (data gaps — auto-resolvable via the
// Verify flow). Users finally get to tell apart "this needs my attention"
// from "we just couldn't fetch the data."
const STATUS_CONFIG = {
  COMPLIANT: {
    label: 'COMPLIANT',
    icon: 'check_circle',
    className: 'compliance-badge--compliant',
    tooltip: 'Passes both the business-activity screen and all financial ratios under the current methodology.',
  },
  NON_COMPLIANT: {
    label: 'NON-COMPLIANT',
    icon: 'cancel',
    className: 'compliance-badge--non-compliant',
    tooltip: 'Fails the business-activity screen (e.g. conventional bank, alcohol, gambling) or at least one financial ratio is over its threshold.',
  },
  REVIEW_REQUIRED: {
    label: 'REVIEW REQUIRED',
    icon: 'rule',
    className: 'compliance-badge--review',
    tooltip: 'Passes all financial ratios but operates in a mixed-business industry (hotels, media, etc.) where some revenue may be non-permissible. Verify the revenue mix before acting.',
  },
  UNVERIFIED: {
    label: 'UNVERIFIED',
    icon: 'sync_problem',
    className: 'compliance-badge--unverified',
    tooltip: 'Halaq could not fetch enough reliable data to give a confident verdict — typically a missing balance-sheet line item. Tap Verify to re-fetch from official filings (SEC EDGAR for US tickers).',
  },
  PENDING: {
    label: 'PENDING',
    icon: 'schedule',
    className: 'compliance-badge--pending',
    tooltip: 'Compliance check has not run yet for this stock.',
  },
  // Deprecated alias: existing watchlist rows still using 'DOUBTFUL' fall
  // through to UNVERIFIED rendering. Migration 007 backfills them on the
  // server; this guard keeps the UI safe in the interim.
  DOUBTFUL: {
    label: 'UNVERIFIED',
    icon: 'sync_problem',
    className: 'compliance-badge--unverified',
    tooltip: 'Halaq could not fetch enough reliable data to give a confident verdict. Tap Verify to re-fetch from official filings.',
  },
}

/**
 * Compliance Status Chip
 * @param {{ status: 'COMPLIANT'|'NON_COMPLIANT'|'REVIEW_REQUIRED'|'UNVERIFIED'|'PENDING'|'DOUBTFUL', size?: 'sm'|'md'|'lg' }} props
 */
export default function ComplianceBadge({ status, size = 'sm' }) {
  const { label, icon, className, tooltip } = STATUS_CONFIG[status] || STATUS_CONFIG.UNVERIFIED

  return (
    <span
      className={`compliance-badge compliance-badge--${size} ${className}`}
      title={tooltip}
      aria-label={`${label}. ${tooltip}`}
    >
      <MaterialIcon name={icon} fill={true} className="compliance-badge__icon" />
      {label}
    </span>
  )
}

export { STATUS_CONFIG }
