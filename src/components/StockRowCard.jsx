import ComplianceBadge from './ComplianceBadge'
import MaterialIcon from './MaterialIcon'
import './StockRowCard.css'

export default function StockRowCard({
  ticker,
  name,
  sector,
  exchange,
  status,
  // If true, the parent is actively screening this row (Watchlist auto-screen).
  // If false/undefined and status is null, we show "Tap to screen" instead of
  // a spinner — search results have no auto-screen, so a perpetual spinner
  // misleads users into thinking the page is stuck.
  screening = false,
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
          ) : screening ? (
            <span className="stock-row-card__screen-cta" aria-live="polite">
              <MaterialIcon name="refresh" size={14} className="spinner" />
              Checking…
            </span>
          ) : (
            <span className="stock-row-card__screen-cta">
              Tap to screen
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
