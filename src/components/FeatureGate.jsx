import MaterialIcon from './MaterialIcon'
import './FeatureGate.css'

/**
 * Full-page card for a feature the user can't use yet — a Pro upsell or a
 * roadmap item. `tone` picks the badge colour: 'pro' (primary) or 'soon'.
 */
export default function FeatureGate({ icon, badge, tone = 'pro', title, body, features, featuresTitle, action }) {
  return (
    <div className="container animate-entrance feature-gate">
      <div className="feature-gate__card card-standard">
        <div className="feature-gate__icon">
          <MaterialIcon name={icon} size={32} fill />
        </div>
        {badge && <span className={`feature-gate__badge feature-gate__badge--${tone}`}>{badge}</span>}
        <h1 className="text-h1">{title}</h1>
        <p className="feature-gate__body text-on-surface-variant text-body-lg">{body}</p>

        {features?.length > 0 && (
          <div className="feature-gate__features">
            {featuresTitle && (
              <h3 className="feature-gate__features-title text-h3">
                <MaterialIcon name="lock" size={20} className="text-secondary" />
                {featuresTitle}
              </h3>
            )}
            <ul>
              {features.map(item => (
                <li key={item}>
                  <MaterialIcon name="check_circle" className="text-secondary" size={18} fill />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {action && (
          <button type="button" className="btn btn-primary btn--lg" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
