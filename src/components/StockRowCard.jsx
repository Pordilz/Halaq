import React from 'react'
import { Link } from 'react-router-dom'
import ComplianceBadge from './ComplianceBadge'
import MaterialIcon from './MaterialIcon'
import './StockRowCard.css'

export default function StockRowCard({ 
  ticker, 
  name, 
  sector, 
  exchange, 
  status, 
  marketCap,
  inWatchlist, 
  onToggleWatchlist,
  onClick
}) {
  return (
    <div 
      className="stock-row-card card-standard interactive-element"
      onClick={onClick}
    >
      <div className="stock-row-card__ticker">
        {ticker}
      </div>
      
      <div className="stock-row-card__info">
        <p className="stock-row-card__name truncate">{name}</p>
        <div className="stock-row-card__meta">
          {sector && <span className="stock-row-card__sector">{sector}</span>}
          {exchange && <span className="stock-row-card__exchange">· {exchange}</span>}
        </div>
      </div>
      
      {marketCap && (
        <div className="stock-row-card__mcap desktop-only">
          {marketCap}
        </div>
      )}
      
      <div className="stock-row-card__actions">
        <div className="stock-row-card__badge-wrapper">
          <ComplianceBadge status={status} size="sm" />
        </div>
        <button 
          className="stock-row-card__bookmark-btn focus-ghost"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist?.();
          }}
          aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        >
          <MaterialIcon 
            name="bookmark" 
            fill={inWatchlist} 
            className={inWatchlist ? "text-secondary" : "text-outline"} 
          />
        </button>
      </div>
    </div>
  )
}
