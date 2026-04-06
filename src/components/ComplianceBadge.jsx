import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import './ComplianceBadge.css'

/**
 * Large compliance status badge
 * @param {{ status: 'COMPLIANT'|'NON_COMPLIANT'|'DOUBTFUL', size?: 'sm'|'md'|'lg' }} props
 */
export default function ComplianceBadge({ status, size = 'lg' }) {
  const config = {
    COMPLIANT: {
      label: 'Shariah Compliant',
      icon: CheckCircle,
      className: 'compliance-badge--compliant',
    },
    NON_COMPLIANT: {
      label: 'Non-Compliant',
      icon: XCircle,
      className: 'compliance-badge--non-compliant',
    },
    DOUBTFUL: {
      label: 'Doubtful',
      icon: AlertTriangle,
      className: 'compliance-badge--doubtful',
    },
  }

  const { label, icon: Icon, className } = config[status] || config.DOUBTFUL

  return (
    <div className={`compliance-badge compliance-badge--${size} ${className}`}>
      <Icon className="compliance-badge__icon" />
      <span className="compliance-badge__label">{label}</span>
    </div>
  )
}
