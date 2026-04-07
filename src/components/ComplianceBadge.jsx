import MaterialIcon from './MaterialIcon'
import './ComplianceBadge.css'

/**
 * Compliance Status Chip
 * @param {{ status: 'COMPLIANT'|'NON_COMPLIANT'|'DOUBTFUL'|'PENDING', size?: 'sm'|'md'|'lg' }} props
 */
export default function ComplianceBadge({ status, size = 'sm' }) {
  const config = {
    COMPLIANT: {
      label: 'COMPLIANT',
      icon: 'check_circle',
      className: 'compliance-badge--compliant',
    },
    NON_COMPLIANT: {
      label: 'NON-COMPLIANT',
      icon: 'cancel',
      className: 'compliance-badge--non-compliant',
    },
    DOUBTFUL: {
      label: 'DOUBTFUL',
      icon: 'help',
      className: 'compliance-badge--doubtful',
    },
    PENDING: {
      label: 'PENDING',
      icon: 'schedule',
      className: 'compliance-badge--pending',
    }
  }

  const { label, icon, className } = config[status] || config.DOUBTFUL

  return (
    <span className={`compliance-badge compliance-badge--${size} ${className}`}>
      <MaterialIcon name={icon} fill={true} className="compliance-badge__icon" />
      {label}
    </span>
  )
}
