/**
 * Row dates from Yahoo's fundamentalsTimeSeries.
 *
 * The `module: 'all'` series comes back with Date objects, but the trailing
 * (TTM) series returns Unix seconds. `new Date(seconds)` reads those as
 * milliseconds, which dated every TTM income statement to January 1970.
 * Accept either, so a format change on any series can't do that again.
 */

// Below this a number is seconds, not milliseconds: 1e11 ms is March 1973,
// 1e11 s is the year 5138.
const MAX_UNIX_SECONDS = 1e11;

/** Date object, ISO string or Unix seconds/milliseconds → Date, else null. */
export function yahooDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  const d = typeof n === 'number'
    ? new Date(n < MAX_UNIX_SECONDS ? n * 1000 : n)
    : new Date(n);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 'YYYY-MM-DD', or 'N/A' when the date is missing or unreadable. */
export function yahooDay(value) {
  const d = yahooDate(value);
  return d ? d.toISOString().split('T')[0] : 'N/A';
}

/** Sort comparator for rows with a `date`: newest first, undated last. */
export function byDateDesc(a, b) {
  return (yahooDate(b?.date)?.getTime() ?? 0) - (yahooDate(a?.date)?.getTime() ?? 0);
}
