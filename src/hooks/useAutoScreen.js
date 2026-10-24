import { useEffect, useRef } from 'react'
import { fetchAllScreeningData } from '../services/yahooFinanceApi'
import { screenStock } from '../services/complianceEngine'
import { needsScreen } from '../lib/screenFreshness'

// Per visit, so a large watchlist doesn't fire dozens of requests at once.
const MAX_PER_VISIT = 8

/**
 * Screens watchlist rows that have no verdict yet or a stale one, one at a
 * time, and saves the result through updateStatus (which records verdict
 * changes — migration 009). Used by Home and Watchlist.
 */
export function useAutoScreen(watchlist, updateStatus, methodology) {
  const screenedRef = useRef(new Set())

  useEffect(() => {
    let cancelled = false
    const now = Date.now()
    const pending = watchlist
      .filter(s => !screenedRef.current.has(s.ticker) && needsScreen(s, now))
      .slice(0, MAX_PER_VISIT)
    if (pending.length === 0) return undefined

    ;(async () => {
      for (const stock of pending) {
        if (cancelled) return
        screenedRef.current.add(stock.ticker)
        try {
          const data = await fetchAllScreeningData(stock.ticker)
          if (cancelled) return
          const compliance = screenStock(data.profile, data.balanceSheet, data.income, { methodology })
          updateStatus(stock.ticker, compliance.status)
        } catch {
          // Keep the existing verdict (or null) so the next visit retries —
          // a Yahoo blip shouldn't overwrite a real verdict.
        }
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length, methodology])
}
