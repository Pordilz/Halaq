import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Centralized Watchlist Hook
 * Backed by Supabase when configured + authenticated, localStorage fallback otherwise.
 * 
 * Usage:
 *   const { watchlist, tickers, isInWatchlist, toggle, loading } = useWatchlist(user)
 */

const LOCAL_STORAGE_KEY = 'halaq_watchlist'

function getLocalWatchlist() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setLocalWatchlist(items) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
}

export function useWatchlist(user) {
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)

  // Compute a Set of tickers for O(1) lookups
  const tickers = new Set(watchlist.map(w => w.ticker))

  const isInWatchlist = useCallback((ticker) => {
    return tickers.has(ticker)
  }, [tickers])

  // ---- Fetch ----
  const fetchWatchlist = useCallback(async () => {
    setLoading(true)

    if (user && supabase.isConfigured) {
      // Supabase-backed fetch
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)

      if (!error && data) {
        setWatchlist(data.map(row => ({
          ticker: row.ticker,
          name: row.name || row.ticker,
          sector: row.sector || '',
          exchange: row.exchange || '',
          status: null, // Will be resolved on click
          marketCap: null,
          addedAt: row.added_at,
        })))
      } else {
        // Supabase failed — fall back to localStorage
        setWatchlist(getLocalWatchlist())
      }
    } else {
      // No user or Supabase not configured — use localStorage
      setWatchlist(getLocalWatchlist())
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  // ---- Add ----
  const addToWatchlist = useCallback(async (stock) => {
    const item = {
      ticker: stock.ticker,
      name: stock.name || stock.ticker,
      sector: stock.sector || '',
      exchange: stock.exchange || '',
      status: stock.status || null,
      marketCap: stock.marketCap || null,
    }

    // Optimistic update
    setWatchlist(prev => {
      if (prev.some(w => w.ticker === item.ticker)) return prev
      return [...prev, item]
    })

    if (user && supabase.isConfigured) {
      await supabase.from('watchlist').insert({
        user_id: user.id,
        ticker: item.ticker,
        name: item.name,
        sector: item.sector,
        exchange: item.exchange,
      })
    }

    // Also persist to localStorage as backup
    const local = getLocalWatchlist()
    if (!local.some(w => w.ticker === item.ticker)) {
      setLocalWatchlist([...local, item])
    }
  }, [user])

  // ---- Remove ----
  const removeFromWatchlist = useCallback(async (ticker) => {
    // Optimistic update
    setWatchlist(prev => prev.filter(w => w.ticker !== ticker))

    if (user && supabase.isConfigured) {
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('ticker', ticker)
    }

    // Also clean localStorage
    setLocalWatchlist(getLocalWatchlist().filter(w => w.ticker !== ticker))
  }, [user])

  // ---- Toggle ----
  const toggle = useCallback(async (stock) => {
    const ticker = typeof stock === 'string' ? stock : stock.ticker
    if (tickers.has(ticker)) {
      await removeFromWatchlist(ticker)
    } else {
      await addToWatchlist(typeof stock === 'string' ? { ticker: stock } : stock)
    }
  }, [tickers, addToWatchlist, removeFromWatchlist])

  return {
    watchlist,
    tickers,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggle,
    loading,
    refetch: fetchWatchlist,
  }
}
