import ComplianceBadge from './ComplianceBadge'
import MaterialIcon from './MaterialIcon'
import './StockRowCard.css'

export default function StockRowCard({
  ticker,
  name,
  sector,
  exchange,
  status,
  inWatchlist,
  onToggleWatchlist,
  onClick,
}) {
  return (
    <div
      className="stock-row-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="stock-row-card__ticker">{ticker}</div>

      <div className="stock-row-card__info">
        <p className="stock-row-card__name">{name}</p>
        <div className="stock-row-card__meta">
          {sector && <span className="stock-row-card__sector">{sector}</span>}
          {exchange && <span className="stock-row-card__exchange">{exchange}</span>}
        </div>
      </div>

      <div className="stock-row-card__actions">
        <div className="stock-row-card__badge-wrapper">
          {status ? (
            <ComplianceBadge status={status} size="sm" />
          ) : (
            <span className="stock-row-card__screen-cta">
              Screen
              <MaterialIcon name="arrow_forward" size={14} />
            </span>
          )}
        </div>
        <button
          type="button"
          className="stock-row-card__bookmark-btn focus-ghost"
          onClick={(e) => {
            e.stopPropagation()
            onToggleWatchlist?.()
          }}
          aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <MaterialIcon
            name="bookmark"
            fill={inWatchlist}
            className={inWatchlist ? 'text-secondary' : 'text-outline'}
          />
        </button>
      </div>
    </div>
  )
}
