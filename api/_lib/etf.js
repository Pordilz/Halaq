/**
 * ETF X-Ray data: the fund's profile plus a screening payload for each of
 * its top holdings (Yahoo lists ten), from the cached fast path. The client
 * runs the compliance engine on the holdings under the user's methodology.
 */

import YahooFinance from 'yahoo-finance2';
import { isValidTicker, classifyYahooError } from './yahoo.js';
import { numOrNull } from './interest.js';
import { getScreeningPayload } from './screening-cache.js';
import { getDedicatedShariahFund } from '../../src/services/shariahFunds.js';

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
});

const CONCURRENCY = 4;

export function fetchFundSummary(ticker) {
  return yahooFinance.quoteSummary(
    ticker,
    { modules: ['price', 'topHoldings', 'fundProfile'] },
    { validateResult: false }
  );
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

/**
 * Throws an error with statusCode 400 and code 'NOT_A_FUND' when the ticker
 * is a plain equity; Yahoo failures propagate for the caller to classify.
 */
export async function buildEtfXray(ticker, { summary = fetchFundSummary, screen = getScreeningPayload } = {}) {
  const data = await summary(ticker);
  const price = data.price || {};
  const dedicated = getDedicatedShariahFund(ticker);
  if (!['ETF', 'MUTUALFUND'].includes(price.quoteType) && !dedicated) {
    throw Object.assign(new Error(`${ticker} isn't a fund. Open it as a stock instead.`), {
      statusCode: 400,
      code: 'NOT_A_FUND',
    });
  }

  const top = data.topHoldings || {};
  const listed = top.holdings || [];
  const isScreenable = h => h.symbol && isValidTicker(String(h.symbol).toUpperCase());
  const weightOf = h => numOrNull(h.holdingPercent) ?? 0;

  const holdings = await mapLimit(listed.filter(isScreenable), CONCURRENCY, async h => {
    const symbol = String(h.symbol).toUpperCase();
    const base = { symbol, name: h.holdingName || symbol, weight: weightOf(h) };
    try {
      return { ...base, data: await screen(symbol) };
    } catch (err) {
      return { ...base, error: classifyYahooError(err).message };
    }
  });

  return {
    fund: {
      ticker,
      name: price.longName || price.shortName || ticker,
      quoteType: price.quoteType || null,
      currency: price.currency || null,
      family: data.fundProfile?.family || null,
      category: data.fundProfile?.categoryName || null,
      dedicated,
      positions: {
        stock: numOrNull(top.stockPosition),
        bond: numOrNull(top.bondPosition),
        cash: numOrNull(top.cashPosition),
        other: numOrNull(top.otherPosition),
      },
    },
    holdings,
    // Listed holdings without a usable symbol (cash, futures, unlisted).
    unscreenable: listed
      .filter(h => !isScreenable(h))
      .map(h => ({ name: h.holdingName || 'Unlisted holding', weight: weightOf(h) })),
    coverage: listed.reduce((sum, h) => sum + weightOf(h), 0),
  };
}
