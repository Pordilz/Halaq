export default {
  id: 'purification',
  icon: 'volunteer_activism',
  category: 'Purification',
  readTime: '6 min',
  title: 'Dividend purification — what to donate, when, and why',
  summary:
    'How to compute the purification amount on a dividend, why capital gains aren\'t purified, and the dominant scholarly position.',
  sections: [
    {
      h: 'What is purification?',
      p: 'Purification (تطهير) is the act of donating to charity the portion of a dividend that derives from non-permissible activities — typically interest income earned on the company\'s cash reserves. It does not transform haram income into halal: the act is one of cleansing the investor\'s holdings, not the company\'s.',
    },
    {
      h: 'How Halaq computes the rate',
      p: 'We compute interest income ÷ total revenue from the trailing-twelve-month income statement (the latest annual statement when TTM isn\'t available). Only income the company earned from interest counts — interest it pays isn\'t purified by shareholders. That percentage is the purification rate for any dividend received during that period. Example: a company with a 1.8% rate and a $250 dividend → donate $4.50. The Purification tab on each stock does this for your share count.',
    },
    {
      h: 'Capital gains vs dividends',
      p: 'The dominant AAOIFI position is that purification applies only to dividends, not to capital gains. The reasoning: dividends are a direct distribution of company income (which contains some non-permissible revenue), whereas capital gains reflect market sentiment about future cash flows, not the cash flows themselves. Some scholars disagree — when in doubt, consult your scholar.',
    },
    {
      h: 'Where to donate',
      p: 'Purification donations should not be given as zakat (different obligations); they should not be given to ineligible recipients (your immediate family). Mosques, water projects, and educational charities are common destinations. Keep records: zakat-eligible giving and purification-eligible giving are tracked separately.',
    },
  ],
  sources: [
    { name: 'AAOIFI Shariah Standard No. 21 — Financial Papers (Shares and Bonds)', url: 'https://aaoifi.com/shariaa-standards/?lang=en' },
    { name: 'Mufti Taqi Usmani — An Introduction to Islamic Finance', url: 'https://muftitaqiusmani.com' },
    { name: 'IIFA — International Islamic Fiqh Academy resolutions', url: 'https://iifa-aifi.org/en/' },
  ],
}
