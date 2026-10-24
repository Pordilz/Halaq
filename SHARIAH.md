# Halaq — Shariah Compliance Methodology

This document is the **single source of truth** for how Halaq decides whether a
stock is COMPLIANT, NON_COMPLIANT, REVIEW_REQUIRED or UNVERIFIED. It lists the
published scholarly standards we implement, where each threshold comes from,
the peer apps we cross-check against, and the gaps we know about.

> **Important.** Halaq surfaces guidance, not a fatwa. The financial
> ratio framework is mechanical. The business-activity framework involves
> judgement. Where scholars disagree, we err on the side of strictness.

---

## 1. Standards we implement

The compliance engine (`src/services/complianceEngine.js`) supports four
published methodologies. Default is **AAOIFI** because it is the most widely
cited Sharia accounting standard globally and is the backbone of the major
Islamic financial institutions. Thresholds are pinned by
`test/complianceEngine.test.js` — change both together.

| Key      | Name                                                      | Source (last checked 2026-10-24)                                                                                                                                  |
| -------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AAOIFI` | AAOIFI Shari'ah Standard No. 21 — Financial Papers (Shares and Bonds) | https://aaoifi.com/shariaa-standards/?lang=en — thresholds per §6 note 1                                                                                |
| `DJIM`   | Dow Jones Islamic Market Indices methodology, September 2026 | https://www.spglobal.com/spdji/en/documents/methodologies/methodology-dj-islamic-market-indices.pdf (Accounting-Based Compliance Screens; change effective 2026-09-18) |
| `SP`     | S&P Shariah Indices methodology, October 2026              | https://www.spglobal.com/spdji/en/documents/methodologies/methodology-sp-shariah-indices.pdf (Accounting-Based Screens; change effective 2026-09-18)              |
| `FTSE`   | FTSE Yasaar Global Equity Shariah Index Series             | https://www.lseg.com/en/ftse-russell/indices/global-shariah                                                                                                       |

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

Shariah-certified financial institutions (Islamic banks with their own Shariah
Supervisory Board) are exempt from the bank exclusion and the accounting
screens — the same carve-out S&P and DJIM make for companies "run on a fully
Shariah compliant basis". See `SHARIAH_CERTIFIED_INSTITUTIONS` in the engine.

A company is flagged **CAUTION** if it operates in a **mixed** sector, because
its impermissible sales lines aren't in the data we screen:

- Hotels, lodging, restaurants
- Entertainment, broadcasting, diversified media
- Department / discount / grocery / specialty retail
- Aerospace & defence
- Travel services & leisure
- Ad-driven internet platforms, interactive / electronic gaming
- Luxury goods (conglomerates often carry alcohol divisions)

If sector and industry are both unknown (e.g. ETFs, newly listed entities),
the stock is **UNVERIFIED** — never silently passed.

### 2.2 Financial ratios (quantitative)

| Ratio                 | Numerator                                    | AAOIFI          | DJIM                     | S&P                      | FTSE (Yasaar)              |
| --------------------- | -------------------------------------------- | --------------- | ------------------------ | ------------------------ | -------------------------- |
| Leverage              | Interest-bearing debt                        | < 30% of mkt cap | < 30% of 24-month avg mkt cap | < 30% of 36-month avg mkt cap | < 33.333% of total assets |
| Liquidity             | Cash + interest-bearing securities           | < 30% of mkt cap | < 30% of 24-month avg mkt cap | < 30% of 36-month avg mkt cap | < 33.333% of total assets |
| Receivables           | Accounts receivable + cash                   | —               | —                        | —                        | < 50% of total assets      |
| Impermissible income  | Interest income (+ other impermissible income) | < 5% of revenue | < 5% of revenue + interest income | < 5% of revenue + interest income | < 5% of revenue |

Notes:

- **No receivables test outside FTSE.** AAOIFI SS21 has no separate
  receivables limit. S&P and DJIM removed theirs in 2023 and kept only the
  leverage screen; their 2026-09-18 update reinstated the cash screen at 30%
  and cut leverage from 33% to 30%.
- **Interest income only.** The impermissible-income test counts interest the
  company *earns* — S&P and DJIM specify "all forms of interest income
  (operating and non-operating)". Interest the company *pays* is what the
  leverage test measures, so it is not added in (doing so used to over-fail
  stocks and overstate purification).
- **Market-cap basis.** The fast screen uses current market cap for every
  methodology. The Verify path uses a 24-month trailing average. S&P's
  36-month window isn't modelled yet; the stock page says which basis a
  verdict used.
- **Buffers.** S&P and DJIM let index constituents stay compliant within two
  percentage points of a limit for up to three reviews. That hysteresis needs
  a stock's history, so Halaq applies the hard limit at each screen.

Where the impermissible-income figure comes from (`api/_lib/interest.js`):

| `interestDataSource` | Meaning                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `explicit`           | Interest income as reported, or reported net non-operating interest + interest expense         |
| `estimated`          | Positive other non-operating income, used where interest isn't broken out (e.g. AAPL). A proxy. |
| `unavailable`        | No usable figure — the ratio is a data gap, never 0%                                           |

### 2.3 Verdict

```
NON_COMPLIANT    business activity fails outright, or any ratio computed from
                 reported data breaches its limit
UNVERIFIED       business activity unknown; or two or more ratios can't be
                 computed; or the only breach is an estimated figure
REVIEW_REQUIRED  mixed-business CAUTION that passes every ratio
COMPLIANT        everything passes (one missing ratio keeps COMPLIANT at LOW
                 confidence, with a prompt to Verify)
```

Missing data is never screened as zero. When Yahoo has a balance sheet for the
period, an omitted line (typically debt) counts as none reported; when there
is no balance sheet at all, the ratios are data gaps.

---

## 3. Purification

For stocks with a non-zero impermissible-income ratio, the investor should
donate that percentage of any **dividends** to charity (capital gains are not
purified under the dominant AAOIFI position). This matches the S&P / DJIM
"dividend purification ratio": dividends × non-permissible income ÷ total
income.

The Stock Detail page's Purification tab shows the rate and calculates the
amount for a holding: shares × annual dividend per share (pre-filled from
Yahoo) × rate. When the rate rests on an estimate it is labelled as one; when
interest income is unavailable, the tab says so instead of showing 0%.

---

## 4. Peer cross-references

We cross-check our verdicts against widely-used Muslim investing apps and data
providers. We are not affiliated with any of them; we use them to sanity-check
our methodology and to audit edge cases.

| Provider     | Methodology family | Notes                                                            |
| ------------ | ------------------ | ---------------------------------------------------------------- |
| **Zoya**     | AAOIFI             | Most widely-used. We benchmark our AAOIFI mode against theirs.   |
| **Musaffa**  | AAOIFI + S&P       | Useful second opinion on borderline financials.                  |
| **Islamicly**| AAOIFI             | Used widely in MENA. We cross-check borderline financials.       |
| **Wahed Invest** | AAOIFI         | Investment manager, conservative. Useful for sector edge cases.  |
| **Wahed Shariah Board** | —      | Public scholar list — used for fatwa edge cases.                |
| **AAOIFI**   | AAOIFI             | Source standard. Authoritative.                                  |

A discrepancy with one of the above is treated as a high-priority bug. Issues
should be filed with the ticker, the conflict, and a screenshot of the peer's
verdict.

### 4.1 Test fixtures

`npm test` runs the engine and normaliser tests offline against recorded Yahoo
payloads in `test/fixtures/yahoo/` (record new ones with
`node scripts/capture-yahoo-fixtures.js TICKER`). Golden AAOIFI verdicts:

- **AAPL** — COMPLIANT (impermissible income estimated from non-operating income)
- **MSFT** — COMPLIANT (interest income reported)
- **JPM**  — NON_COMPLIANT (conventional banking)
- **SBK.JO** — NON_COMPLIANT (Standard Bank, conventional banking)
- **SPUS** — UNVERIFIED on its own financials (an ETF is screened via its holdings)

When the engine changes, re-run `npm test` and `node scripts/compare-screens.js
--local` and review any verdict that flips.

---

## 5. Where our data comes from

Financial statements and price data come from Yahoo Finance via the
`yahoo-finance2` library, returned via our own proxy at `/api/screen/:ticker`.
Income-statement figures use the trailing twelve months when Yahoo has them,
otherwise the latest annual statement; balance-sheet figures use the latest
reported period. The Verify path adds SEC EDGAR (US filers), a TTM rebuild from
quarterly filings and a 24-month average market cap.

We **do not** rely on company-self-reported data without a primary source
(10-K, integrated annual report, or audited filings). When Yahoo Finance has
not yet ingested a recent filing, our verdict will be stale; we surface the
`balanceSheetPeriod` and `incomeStatementPeriod` so the user can see this.

Live price data (used on the Home and Stock Detail pages) is also Yahoo
Finance via `/api/quote/:ticker`. Updates every 60 seconds while a screen is
open. There is no paid data dependency.

---

## 6. Known gaps

1. **AAOIFI primary text.** The 30% / 30% / 5% AAOIFI thresholds are the
   consistent reading across screening providers and match the S&P and DJIM
   2026 limits, but we have not reviewed the SS21 text itself (AAOIFI's
   standards are distributed through its site). Re-check when we obtain it.
2. **ETFs** have no operating financials and are UNVERIFIED on their own;
   compliance comes from their holdings.
3. **Other impermissible revenue.** Yahoo doesn't break out sales lines such as
   alcohol in a supermarket, so the 5% test measures interest income only and
   mixed businesses are sent to review.
4. **Dividends-only purification.** Capital gains are not purified under the
   AAOIFI majority view; we follow that. Some scholars disagree.
5. **Cryptocurrencies** are out of scope. AAOIFI has not issued a binding
   global ruling and scholarly opinion remains divided.
6. **REITs** require manual scrutiny — their underlying tenants and lease
   structures determine compliance. We currently treat them like any other
   equity, which understates risk for some REITs.
7. **Sukuk** are out of scope (treated as a fixed-income instrument distinct
   from equities).
8. **Currency conversion.** Market cap is taken in the company's reporting
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
