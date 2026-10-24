const DAY_MS = 24 * 60 * 60 * 1000
// Re-screen saved verdicts daily: prices move the ratios, companies report
// new financials, and methodology updates change verdicts.
const RESCREEN_AFTER_MS = DAY_MS
// A Verify result (multi-source) outranks a fast screen for a week.
const VERIFIED_FRESH_MS = 7 * DAY_MS

// Whether a watchlist row's verdict is missing or stale.
export function needsScreen(stock, now = Date.now()) {
  if (!stock.status) return true
  const last = stock.screenedAt ? Date.parse(stock.screenedAt) : 0
  if (stock.dataSourcesUsed && now - last < VERIFIED_FRESH_MS) return false
  return now - last > RESCREEN_AFTER_MS
}
