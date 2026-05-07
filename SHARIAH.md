# Halaq — Shariah Compliance Methodology

This document is the **single source of truth** for how Halaq decides whether a
stock is COMPLIANT, DOUBTFUL, or NON_COMPLIANT. It lists the published
scholarly standards we implement, the peer apps we cross-checked our results
against, and the open issues we know about.

> **Important.** Halaq surfaces guidance, not a fatwa. The financial
> ratio framework is mechanical. The business-activity framework involves
> judgement. Where scholars disagree, we err on the side of strictness.

---

## 1. Standards we implement

The compliance engine (`src/services/complianceEngine.js`) supports four
published methodologies. Default is **AAOIFI** because it is the most widely
cited Sharia accounting standard globally and is the backbone of
the major Islamic financial institutions.

| Key      | Name                                              | Source                                                                             |
| -------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `AAOIFI` | AAOIFI Shariah Standard No. 21 (Investment Sukuk) | https://aaoifi.com — published Shariah Standards (Standard No. 21)                  |
| `DJIM`   | Dow Jones Islamic Market Index methodology        | https://www.spglobal.com/spdji/en/index-family/shariah/                            |
| `SP`     | S&P Global Shariah indices                        | https://www.spglobal.com/spdji/en/index-family/shariah/                            |
| `FTSE`   | FTSE Shariah Global Equity Index                  | https://www.ftserussell.com/products/indices/ftse-shariah                          |

Each methodology specifies its own thresholds; see the `METHODOLOGIES` map in
`complianceEngine.js`.

---

## 2. The two-stage screen

### 2.1 Business activity (qualitative)

A company **fails outright** if its primary line of business is in any of the
following sectors. The list is informed by AAOIFI, DJIM, and S&P
classifications and cross-checked with peer apps (see §4):

- Conventional banking, mortgage finance, consumer finance, capital markets
  brokerage, credit services
- Conventional insurance and reinsurance (life, P&C, specialty, brokers)
- Alcohol production / distribution (breweries, wineries, distilleries)
- Tobacco production
- Gambling, casinos, gaming, resort & casino operators
- Adult entertainment
- Pork and non-halal meat production

A company is flagged **CAUTION** (passes only if the haram-revenue ratio < 5%)
if it operates in a **mixed** sector:

- Hotels, lodging, restaurants
- Entertainment, broadcasting, diversified media
- Department / discount / grocery / specialty retail
- Aerospace & defence
- Travel services & leisure
- Communication services (broad)

If sector and industry are both unknown (e.g. ETFs, newly listed entities),
status is **DOUBTFUL** — never silently passed.

### 2.2 Financial ratios (quantitative)

We compute four ratios. Thresholds vary by methodology — what follows is the
AAOIFI default, which is also what Zoya and Musaffa use for the leverage and
haram-income tests:

| Ratio              | Formula                                            | AAOIFI  | DJIM   | S&P    | FTSE                              |
| ------------------ | -------------------------------------------------- | ------- | ------ | ------ | --------------------------------- |
| Leverage           | Total Debt ÷ Market Cap                            | < 33%   | < 33%  | < 33%  | < 33.33% of **Total Assets**     |
| Liquidity          | (Cash + Interest-bearing securities) ÷ Market Cap  | < 33%   | < 33%  | < 33%  | < 33.33% of **Total Assets**     |
| Receivables        | Accounts Receivable ÷ Market Cap                   | < 49%   | < 33%  | < 49%  | < 50% of **Total Assets**        |
| Haram Revenue      | (Interest income + Interest expense) ÷ Total Rev.  | < 5%    | < 5%   | < 5%   | < 5%                              |

Both **interest income** (riba earned) and **interest expense** (riba paid)
count toward the haram-revenue test. Where interest line items are not
explicitly broken out, we estimate from non-operating income; where neither
exists, we derive from `total debt × 5%` (the conservative upper-bound on a
typical commercial cost of debt). The data-source confidence (`explicit`,
`estimated`, `debt-derived`) is surfaced in the UI.

### 2.3 Verdict

```
NON_COMPLIANT  if business activity fails outright
                or any quantitative ratio fails with real (non-data-error) cause
DOUBTFUL       if data is incomplete, sector is mixed, or business is unclear
COMPLIANT      otherwise
```

---

## 3. Purification

For COMPLIANT or DOUBTFUL stocks with **non-zero** haram-revenue ratio, the
investor should donate the corresponding percentage of any **dividends** to
charity (capital gains are not purified under the dominant AAOIFI position).

Halaq surfaces the purification % and a worked example on the Stock Detail
page's Purification tab.

---

## 4. Peer cross-references

We cross-check our verdicts against widely-used Muslim investing apps and data
providers. We are not affiliated with any of them; we use them to sanity-check
our methodology and to audit edge cases.

| Provider     | Methodology family | Notes                                                            |
| ------------ | ------------------ | ---------------------------------------------------------------- |
| **Zoya**     | AAOIFI             | Most widely-used. We benchmark our AAOIFI mode against theirs.   |
| **Musaffa**  | AAOIFI + S&P       | Tighter on receivables; we surface S&P methodology to match.     |
| **Islamicly**| AAOIFI             | Used widely in MENA. We cross-check borderline financials.       |
| **Wahed Invest** | AAOIFI         | Investment manager, conservative. Useful for sector edge cases.  |
| **Wahed Shariah Board** | —      | Public scholar list — used for fatwa edge cases.                |
| **AAOIFI**   | AAOIFI             | Source standard. Authoritative.                                  |

A discrepancy with one of the above is treated as a high-priority bug. Issues
should be filed with the ticker, the conflict, and a screenshot of the peer's
verdict.

### 4.1 Test fixtures

We maintain sanity-check fixtures for the following well-known tickers:

- **AAPL** — should be COMPLIANT under AAOIFI/S&P/FTSE/DJIM (matches Zoya, Musaffa)
- **MSFT** — should be COMPLIANT under AAOIFI/S&P/FTSE/DJIM (matches Zoya)
- **JPM**  — should be NON_COMPLIANT (banking) under all standards (matches all)
- **TSLA** — has historically oscillated; commonly DOUBTFUL on receivables
- **V**    — NON_COMPLIANT under AAOIFI (interest-based payments network) (matches Zoya)
- **JNJ**  — COMPLIANT (matches Zoya, Musaffa, Islamicly)
- **SBK.JO** — NON_COMPLIANT (Standard Bank, conventional banking)
- **AGL.JO** — typically COMPLIANT (Anglo American, mining)

When the engine is changed, run these through and confirm none of the
verdicts flip unexpectedly.

---

## 5. Where our data comes from

Financial statements and price data come from Yahoo Finance via the
`yahoo-finance2` library (used by countless retail finance products and
returned via our own proxy at `/api/screen/:ticker`). Yahoo's data is sourced
from S&P Global Market Intelligence and Refinitiv. We use the most recent
fully reported annual statement available.

We **do not** rely on company-self-reported data without a primary source
(10-K, integrated annual report, or audited filings). When Yahoo Finance has
not yet ingested a recent filing, our verdict will be stale; we surface the
`balanceSheetPeriod` and `incomeStatementPeriod` so the user can see this.

Live price data (used on the Home and Stock Detail pages) is also Yahoo
Finance via `/api/quote/:ticker`. Updates every 60 seconds while a screen is
open. There is no paid data dependency.

---

## 6. Known gaps

1. **ETFs** are flagged DOUBTFUL because we don't extract holdings yet. The
   ETF X-Ray feature (Scholar tier) is in development.
2. **Dividends-only purification.** Capital gains are not purified under AAOIFI
   majority view; we follow that. Some scholars disagree.
3. **Cryptocurrencies** are out of scope. AAOIFI has not issued a binding
   global ruling and scholarly opinion remains divided.
4. **REITs** require manual scrutiny — their underlying tenants and lease
   structures determine compliance. We currently treat them like any other
   equity, which understates risk for some REITs.
5. **Sukuk** are out of scope (treated as a fixed-income instrument distinct
   from equities).
6. **Currency conversion.** Market cap is taken in the company's reporting
   currency. We do not normalise to USD before applying ratios.

---

## 7. Disclaimer

The verdict produced by Halaq is a **screening guidance** under the published
methodologies above. It is not:

- a fatwa for the user's individual situation;
- investment advice;
- a substitute for consulting a qualified Islamic finance scholar;
- guaranteed to match any specific peer app's verdict at any moment in time.

Rulings differ between scholars, and data sources can briefly disagree. When
in doubt, the user should consult a qualified scholar.
