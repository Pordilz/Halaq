export default {
  id: 'methodology',
  icon: 'gavel',
  category: 'Methodology',
  readTime: '10 min',
  title: 'AAOIFI Standard 21 — the three financial tests, in plain English',
  summary:
    'How the AAOIFI debt, cash and impermissible-income tests work, what each one measures, and how the major index methodologies differ.',
  sections: [
    {
      h: '1. Leverage',
      p: 'Total interest-bearing debt divided by market cap, threshold under 30%. Measures how much of the company\'s market value is financed by riba-based borrowing. Companies with very low debt — Apple, Microsoft, Saudi Aramco — pass easily; capital-heavy banks and utilities almost always fail.',
    },
    {
      h: '2. Liquidity',
      p: 'Cash plus interest-bearing securities divided by market cap, threshold under 30%. Measures how much of the company\'s market value sits in interest-earning assets. Cash-rich tech companies that park reserves in money-market funds can fail this even with zero debt.',
    },
    {
      h: '3. Impermissible income',
      p: 'Interest income plus any other impermissible income, divided by total revenue, threshold under 5%. Interest the company pays is not counted here — the leverage test already covers borrowing. A company under 5% can be cleansed via dividend purification (donate that percentage to charity); above 5%, the contamination is too large to purify.',
    },
    {
      h: 'How the index methodologies differ',
      p: 'Since September 2026 the S&P Shariah and Dow Jones Islamic Market indices use the same 30% debt and cash limits as AAOIFI, measured against a 36-month and 24-month average market cap respectively, and count all interest income in the 5% test. FTSE (Yasaar) measures against total assets instead, with 33.333% limits and an extra test: receivables plus cash under 50% of total assets. AAOIFI never had a separate receivables limit, and S&P and DJIM have dropped theirs.',
    },
    {
      h: 'Two screens, not one',
      p: 'A company can pass every financial ratio and still fail because its primary business is non-permissible (a brewery, a casino, a conventional bank). The qualitative business-activity screen is applied first; financial ratios only matter if the business itself is permissible.',
    },
  ],
  sources: [
    { name: 'AAOIFI Standards (purchase / preview)', url: 'https://aaoifi.com/shariaa-standards/?lang=en' },
    { name: 'S&P Dow Jones Shariah index methodology', url: 'https://www.spglobal.com/spdji/en/index-family/shariah/' },
    { name: 'FTSE Shariah methodology', url: 'https://www.lseg.com/en/ftse-russell/indices/global-shariah' },
  ],
}
