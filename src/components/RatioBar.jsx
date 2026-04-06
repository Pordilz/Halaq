import { useState, useEffect } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import './RatioBar.css'

/**
 * Visual progress bar showing a financial ratio against its threshold.
 * @param {{ name, ratio, threshold, ratioPercent, thresholdPercent, pass, description, error }} props
 */
export default function RatioBar({ name, ratio, threshold, ratioPercent, thresholdPercent, pass, description, error }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Trigger the animation shortly after mount
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Calculate fill width as a percentage of the threshold for visual impact
  const finalFillPercent = ratio !== null && ratio !== undefined
    ? Math.min((ratio / threshold) * 100, 150) // cap at 150% of threshold for visual
    : 0

  // Normalized to a 0-100% bar width where 100% = threshold
  const targetBarWidth = ratio !== null
    ? Math.min((ratio / (threshold * 1.5)) * 100, 100)
    : 0
    
  const barWidth = mounted ? targetBarWidth : 0

  const thresholdPosition = (threshold / (threshold * 1.5)) * 100

  return (
    <div className={`ratio-bar ${pass ? 'ratio-bar--pass' : 'ratio-bar--fail'}`}>
      <div className="ratio-bar__header">
        <div className="ratio-bar__name">
          {pass
            ? <CheckCircle size={16} className="ratio-bar__status-icon ratio-bar__status-icon--pass" />
            : <XCircle size={16} className="ratio-bar__status-icon ratio-bar__status-icon--fail" />
          }
          <span>{name}</span>
        </div>
        <div className="ratio-bar__value">
          <span className="ratio-bar__actual">{error ? 'N/A' : ratioPercent}</span>
          <span className="ratio-bar__separator">/</span>
          <span className="ratio-bar__threshold">{thresholdPercent}</span>
        </div>
      </div>

      <div className="ratio-bar__track">
        <div
          className="ratio-bar__fill"
          style={{ width: `${barWidth}%` }}
        />
        <div
          className="ratio-bar__threshold-line"
          style={{ left: `${thresholdPosition}%` }}
        >
          <span className="ratio-bar__threshold-label">Limit</span>
        </div>
      </div>

      <p className="ratio-bar__description">{description}</p>
    </div>
  )
}
