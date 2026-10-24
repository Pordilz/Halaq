import { useState, useEffect } from 'react'
import './RatioBar.css'

/**
 * Ratio Progress Bar Card
 * @param {{ name, ratio, threshold, ratioPercent, thresholdPercent, pass, description, error, estimated, methodology }} props
 */
export default function RatioBar({ name, ratio, threshold, ratioPercent, thresholdPercent, pass, description, error, estimated, methodology }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const ratioVal = ratio !== null && ratio !== undefined ? (ratio / threshold) * 100 : 0
  const barWidth = mounted ? Math.min(ratioVal, 100) : 0

  return (
    <div className="ratio-card card-standard">
      <p className="ratio-card__label">
        {name}
        {estimated && !error && <span className="ratio-card__tag">Estimated</span>}
      </p>
      <p className="ratio-card__value">{error ? 'N/A' : ratioPercent}</p>
      <p className="ratio-card__threshold">
        Max: {thresholdPercent}{methodology ? ` (${methodology})` : ''}
      </p>

      <div className="ratio-card__track">
        <div
          className={`ratio-card__fill ${pass ? 'ratio-card__fill--pass' : 'ratio-card__fill--fail'}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {description && <p className="ratio-card__desc">{description}</p>}
      {error && <p className="ratio-card__desc">{error} — this ratio couldn't be computed from current data.</p>}
    </div>
  )
}
