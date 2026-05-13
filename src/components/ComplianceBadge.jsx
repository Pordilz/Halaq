import MaterialIcon from './MaterialIcon'
import './ComplianceBadge.css'

// Hover-tooltips on the badge explain exactly what each verdict means.
// "DOUBTFUL" in particular causes a lot of confusion — users see it after
// a stock initially showed as compliant and wonder if it changed. The
// tooltip clarifies that it's a data-quality verdict, not a flip-flop.
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
  DOUBTFUL: {
    label: 'NEEDS REVIEW',
    icon: 'help',
    className: 'compliance-badge--doubtful',
    tooltip: 'Halaq does not have enough reliable data to give a confident verdict — typically missing balance-sheet line items or an unclassified business activity. The stock might be compliant, but verify before acting.',
  },
  PENDING: {
    label: 'PENDING',
    icon: 'schedule',
    className: 'compliance-badge--pending',
    tooltip: 'Compliance check has not run yet for this stock.',
  },
}

/**
 * Compliance Status Chip
 * @param {{ status: 'COMPLIANT'|'NON_COMPLIANT'|'DOUBTFUL'|'PENDING', size?: 'sm'|'md'|'lg' }} props
 */
export default function ComplianceBadge({ status, size = 'sm' }) {
  const { label, icon, className, tooltip } = STATUS_CONFIG[status] || STATUS_CONFIG.DOUBTFUL

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
