/**
 * Funds built to a published Shariah methodology, each confirmed on Yahoo
 * and against its issuer on 2026-10-24. Used to badge them in the ETF X-Ray
 * and to route them there from search — Yahoo lists some (e.g. STXSHA.JO)
 * as plain equities.
 *
 * kind: 'equity' funds can be X-rayed through their holdings; 'sukuk' funds
 * hold Islamic bonds, which the stock screen doesn't apply to; 'reit' funds
 * hold property trusts, which need case-by-case review (SHARIAH.md §6).
 */
const DEDICATED_SHARIAH_FUNDS = {
  SPUS: { provider: 'SP Funds', kind: 'equity' },
  SPTE: { provider: 'SP Funds', kind: 'equity' },
  SPWO: { provider: 'SP Funds', kind: 'equity' },
  SPRE: { provider: 'SP Funds', kind: 'reit' },
  SPSK: { provider: 'SP Funds', kind: 'sukuk' },
  HLAL: { provider: 'Wahed', kind: 'equity' },
  UMMA: { provider: 'Wahed', kind: 'equity' },
  'SPWI.L': { provider: 'Wahed', kind: 'equity' },
  'ISUS.L': { provider: 'iShares', kind: 'equity' },
  'ISWD.L': { provider: 'iShares', kind: 'equity' },
  'ISDE.L': { provider: 'iShares', kind: 'equity' },
  'IGDA.L': { provider: 'Invesco', kind: 'equity' },
  'WSHR.NE': { provider: 'Wealthsimple', kind: 'equity' },
  'STXSHA.JO': { provider: 'Satrix', kind: 'equity' },
}

export const DEDICATED_SHARIAH_FUND_TICKERS = Object.keys(DEDICATED_SHARIAH_FUNDS)

export function getDedicatedShariahFund(ticker) {
  const key = (ticker || '').toUpperCase()
  return DEDICATED_SHARIAH_FUNDS[key] ? { ticker: key, ...DEDICATED_SHARIAH_FUNDS[key] } : null
}
