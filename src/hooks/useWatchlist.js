import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Centralized watchlist hook.
 * Backed by Supabase when configured + authenticated, with localStorage fallback.
 */

const LOCAL_STORAGE_KEY = 'halaq_watchlist'

function getLocalWatchlist() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setLocalWatchlist(items) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage full or disabled — silently ignore.
  }
}

export function useWatchlist(user) {
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)
  // Surfaced to consumers so a silently-rolled-back add/remove doesn't
  // look like a stuck button. Cleared automatically on the next mutation.
  const [error, setError] = useState(null)
  const watchlistRef = useRef(watchlist)

  useEffect(() => {
    watchlistRef.current = watchlist
  }, [watchlist])

  const tickerSet = useMemo(
    () => new Set(watchlist.map(w => w.ticker)),
    [watchlist]
  )

  const isInWatchlist = useCallback(
    (ticker) => tickerSet.has(ticker),
    [tickerSet]
  )

  const fetchWatchlist = useCallback(async () => {
    setLoading(true)

    if (user && supabase.isConfigured) {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })

      if (!error && data) {
        const items = data.map(row => ({
          ticker: row.ticker,
          name: row.name || row.ticker,
          sector: row.sector || '',
          exchange: row.exchange || '',
          status: row.status || null,
          // Verification metadata (migration 007 + verify-screen endpoint).
          // Null on legacy rows or rows the user hasn't verified yet.
          confidence: row.confidence || null,
          dataSourcesUsed: row.data_sources_used || null,
          screenedAt: row.screened_at || null,
          marketCap: null,
          addedAt: row.added_at,
        }))
        setWatchlist(items)
        setLocalWatchlist(items)
        setLoading(false)
        return
      }
      // Fall through to local on error
    }

    setWatchlist(getLocalWatchlist())
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  const addToWatchlist = useCallback(async (stock) => {
    if (!stock?.ticker) return
    setError(null)
    const item = {
      ticker: stock.ticker,
      name: stock.name || stock.ticker,
      sector: stock.sector || '',
      exchange: stock.exchange || '',
      status: stock.status || null,
      marketCap: stock.marketCap || null,
    }

    setWatchlist(prev => {
      if (prev.some(w => w.ticker === item.ticker)) return prev
      const next = [item, ...prev]
      setLocalWatchlist(next)
      return next
    })

    if (user && supabase.isConfigured) {
      const { error: insertError } = await supabase.from('watchlist').insert({
        user_id: user.id,
        ticker: item.ticker,
        name: item.name,
        sector: item.sector,
        exchange: item.exchange,
        status: item.status,
      })
      if (insertError) {
        // Roll back on persistence failure AND surface the reason so the
        // caller can show a toast — silent rollback looked like a bug.
        setWatchlist(prev => {
          const next = prev.filter(w => w.ticker !== item.ticker)
          setLocalWatchlist(next)
          return next
        })
        setError(`Couldn't save ${item.ticker} to your watchlist: ${insertError.message}`)
      }
    }
  }, [user])

  const updateStatus = useCallback(async (ticker, status) => {
    if (!ticker || !status) return
    let touched = false
    setWatchlist(prev => {
      let mutated = false
      const next = prev.map(w => {
        if (w.ticker === ticker && w.status !== status) {
          mutated = true
          return { ...w, status }
        }
        return w
      })
      if (!mutated) return prev
      touched = true
      setLocalWatchlist(next)
      return next
    })

    if (touched && user && supabase.isConfigured) {
      await supabase
        .from('watchlist')
        .update({ status })
        .eq('user_id', user.id)
        .eq('ticker', ticker)
    }
  }, [user])

  /**
   * Apply a verify-screen response to local state. The server has already
   * persisted status + confidence + data_sources_used + screened_at to
   * the watchlist row, so this is a pure local merge — no DB write.
   * Used by the Verify button on Watchlist and StockDetail.
   */
  const applyVerification = useCallback((ticker, result) => {
    if (!ticker || !result?.status) return
    setWatchlist(prev => {
      let mutated = false
      const next = prev.map(w => {
        if (w.ticker !== ticker) return w
        mutated = true
        return {
          ...w,
          status: result.status,
          confidence: result.confidence || w.confidence || null,
          dataSourcesUsed: result.verification || w.dataSourcesUsed || null,
          screenedAt: result.verification?.verifiedAt || new Date().toISOString(),
        }
      })
      if (!mutated) return prev
      setLocalWatchlist(next)
      return next
    })
  }, [])

  const removeFromWatchlist = useCallback(async (ticker) => {
    if (!ticker) return
    setError(null)
    const previous = watchlistRef.current
    setWatchlist(prev => {
      const next = prev.filter(w => w.ticker !== ticker)
      setLocalWatchlist(next)
      return next
    })

    if (user && supabase.isConfigured) {
      const { error: deleteError } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('ticker', ticker)
      if (deleteError) {
        setWatchlist(previous)
        setLocalWatchlist(previous)
        setError(`Couldn't remove ${ticker} from your watchlist: ${deleteError.message}`)
      }
    }
  }, [user])

  const toggle = useCallback(async (stock) => {
    const ticker = typeof stock === 'string' ? stock : stock?.ticker
    if (!ticker) return
    if (tickerSet.has(ticker)) {
      await removeFromWatchlist(ticker)
    } else {
      await addToWatchlist(typeof stock === 'string' ? { ticker } : stock)
    }
  }, [tickerSet, addToWatchlist, removeFromWatchlist])

  return {
    watchlist,
    tickers: tickerSet,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    updateStatus,
    applyVerification,
    toggle,
    loading,
    error,
    clearError: () => setError(null),
    refetch: fetchWatchlist,
  }
}
