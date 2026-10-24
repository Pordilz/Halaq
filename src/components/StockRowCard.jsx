import ComplianceBadge from './ComplianceBadge'
import MaterialIcon from './MaterialIcon'
import { verdictLabel } from '../lib/verdictLabels'
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
  // Verify is the heavy multi-source re-screen for UNVERIFIED rows on the
  // watchlist. Parent (Watchlist) provides onVerify; we render the button
  // only when the row needs verification AND the parent supplied a handler.
  verifying = false,
  onVerify,
  // Previous verdict when it recently changed (Watchlist alerts).
  changedFrom = null,
  inWatchlist,
  onToggleWatchlist,
  onClick,
}) {
  const showVerifyButton =
    (status === 'UNVERIFIED' || status === 'DOUBTFUL') &&
    typeof onVerify === 'function' &&
    !screening

  return (
    <div className="stock-row-card row-link-host">
      <div className="stock-row-card__ticker">{ticker}</div>

      <div className="stock-row-card__info">
        <button
          type="button"
          className="stock-row-card__name row-link"
          onClick={onClick}
          aria-label={`${name} (${ticker})`}
        >
          {name}
        </button>
        <div className="stock-row-card__meta">
          {sector && <span className="stock-row-card__sector">{sector}</span>}
          {exchange && <span className="stock-row-card__exchange">{exchange}</span>}
          {changedFrom && (
            <span className="stock-row-card__changed">
              <MaterialIcon name="change_circle" size={12} />
              Was {verdictLabel(changedFrom)}
            </span>
          )}
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
        {showVerifyButton && (
          <button
            type="button"
            className="stock-row-card__verify-btn focus-ghost"
            onClick={(e) => {
              e.stopPropagation()
              onVerify?.()
            }}
            disabled={verifying}
            aria-label={`Verify ${ticker} against official filings`}
            title="Re-fetch from SEC EDGAR + Yahoo trailing financials for a high-confidence verdict"
          >
            {verifying ? (
              <>
                <MaterialIcon name="refresh" size={14} className="spinner" />
                Verifying…
              </>
            ) : (
              <>
                <MaterialIcon name="verified" size={14} />
                Verify
              </>
            )}
          </button>
        )}
        <button
          type="button"
          className="stock-row-card__bookmark-btn focus-ghost"
          onClick={(e) => {
            e.stopPropagation()
            onToggleWatchlist?.()
          }}
          aria-label={inWatchlist ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
          aria-pressed={!!inWatchlist}
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
