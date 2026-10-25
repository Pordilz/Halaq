// Yahoo Finance data for the landing page's sample reports, fetched on
// 25 October 2026 (prices at the 24 October close). The page runs these
// through the real compliance engine, so its verdicts match the app's for
// that date. Each company reports in the currency it trades in, so the
// market-value ratios are like for like. Refresh with
// fetchScreeningPayload() and keep SAMPLES_AS_OF in step.

export const SAMPLES_AS_OF = '24 October 2026'

export const LANDING_SAMPLES = [
  {
    "displayName": "Apple",
    "profile": {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "sector": "Technology",
      "industry": "Consumer Electronics",
      "exchange": "NasdaqGS",
      "quoteType": "EQUITY",
      "marketCap": 5074761285632,
      "currency": "USD",
      "regularMarketPrice": 347.725,
      "dividendRate": 1.08
    },
    "balanceSheet": {
      "period": "2026-06-30",
      "totalDebt": 84344000000,
      "cashAndShortTermInvestments": 62399000000,
      "cashAndCashEquivalents": 39544000000,
      "netReceivables": 31398000000,
      "totalAssets": 383266000000,
      "totalLiabilities": 275746000000
    },
    "income": {
      "period": "2026-06-30",
      "basis": "TTM",
      "revenue": 466823000000,
      "netIncome": 128930000000,
      "grossProfit": 227123000000,
      "operatingIncome": 154859000000,
      "interestIncome": 1047000000,
      "interestExpense": null,
      "interestDataSource": "estimated"
    }
  },
  {
    "displayName": "Nestlé",
    "profile": {
      "ticker": "NESN.SW",
      "name": "Nestlé S.A.",
      "sector": "Consumer Defensive",
      "industry": "Packaged Foods",
      "exchange": "Swiss",
      "quoteType": "EQUITY",
      "marketCap": 215294803968,
      "currency": "CHF",
      "regularMarketPrice": 83.7,
      "dividendRate": 3.1
    },
    "balanceSheet": {
      "period": "2026-06-30",
      "totalDebt": 62845000000,
      "cashAndShortTermInvestments": 6134000000,
      "cashAndCashEquivalents": 3551000000,
      "netReceivables": 10021000000,
      "totalAssets": 128384000000,
      "totalLiabilities": 98880000000
    },
    "income": {
      "period": "2026-06-30",
      "basis": "TTM",
      "revenue": 88775000000,
      "netIncome": 7440000000,
      "grossProfit": 40572000000,
      "operatingIncome": 13797000000,
      "interestIncome": 304000000,
      "interestExpense": 1756000000,
      "interestDataSource": "explicit"
    }
  },
  {
    "displayName": "Telkom Indonesia",
    "profile": {
      "ticker": "TLKM.JK",
      "name": "Perusahaan Perseroan (Persero) PT Telekomunikasi Indonesia Tbk",
      "sector": "Communication Services",
      "industry": "Telecom Services",
      "exchange": "Jakarta",
      "quoteType": "EQUITY",
      "marketCap": 220821297561600,
      "currency": "IDR",
      "regularMarketPrice": 2240,
      "dividendRate": 223.17
    },
    "balanceSheet": {
      "period": "2026-06-30",
      "totalDebt": 80885000000000,
      "cashAndShortTermInvestments": 56483000000000,
      "cashAndCashEquivalents": 54579000000000,
      "netReceivables": 11774000000000,
      "totalAssets": 303087000000000,
      "totalLiabilities": 168239000000000
    },
    "income": {
      "period": "2026-06-30",
      "basis": "TTM",
      "revenue": 149616000000000,
      "netIncome": 17636000000000,
      "grossProfit": 100057000000000,
      "operatingIncome": 34477000000000,
      "interestIncome": 1519000000000,
      "interestExpense": 4640000000000,
      "interestDataSource": "explicit"
    }
  },
  {
    "displayName": "Costco",
    "profile": {
      "ticker": "COST",
      "name": "Costco Wholesale Corporation",
      "sector": "Consumer Defensive",
      "industry": "Discount Stores",
      "exchange": "NasdaqGS",
      "quoteType": "EQUITY",
      "marketCap": 444600549376,
      "currency": "USD",
      "regularMarketPrice": 1003.32,
      "dividendRate": 5.88
    },
    "balanceSheet": {
      "period": "2026-08-31",
      "totalDebt": 8576000000,
      "cashAndShortTermInvestments": 21301000000,
      "cashAndCashEquivalents": 20207000000,
      "netReceivables": 3959000000,
      "totalAssets": 89045000000,
      "totalLiabilities": 53242000000
    },
    "income": {
      "period": "2026-08-31",
      "basis": "TTM",
      "revenue": 303154000000,
      "netIncome": 9226000000,
      "grossProfit": 38875000000,
      "operatingIncome": 11685000000,
      "interestIncome": 642000000,
      "interestExpense": 145000000,
      "interestDataSource": "explicit"
    }
  },
  {
    "displayName": "Heineken",
    "profile": {
      "ticker": "HEIA.AS",
      "name": "Heineken N.V.",
      "sector": "Consumer Defensive",
      "industry": "Beverages - Brewers",
      "exchange": "Amsterdam",
      "quoteType": "EQUITY",
      "marketCap": 42881343488,
      "currency": "EUR",
      "regularMarketPrice": 77.52,
      "dividendRate": 1.92
    },
    "balanceSheet": {
      "period": "2026-06-30",
      "totalDebt": 20644000000,
      "cashAndShortTermInvestments": 2831000000,
      "cashAndCashEquivalents": 2831000000,
      "netReceivables": 5297000000,
      "totalAssets": 58044000000,
      "totalLiabilities": 36338000000
    },
    "income": {
      "period": "2026-06-30",
      "basis": "TTM",
      "revenue": 29414000000,
      "netIncome": 2266000000,
      "grossProfit": 10541000000,
      "operatingIncome": 3548000000,
      "interestIncome": 127000000,
      "interestExpense": 719000000,
      "interestDataSource": "explicit"
    }
  }
]
