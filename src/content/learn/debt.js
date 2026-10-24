export default {
  id: 'debt',
  icon: 'account_balance',
  category: 'Basics',
  readTime: '5 min',
  title: 'Why debt thresholds exist',
  summary:
    'Reading a balance sheet the halal way: what counts as interest-bearing debt, where the one-third benchmark comes from, and why AAOIFI draws the line at 30%.',
  sections: [
    {
      h: 'What "debt" means here',
      p: 'On a balance sheet, debt for Shariah purposes is interest-bearing financial debt: bonds, term loans, revolving credit, finance leases. It does not include trade payables, deferred revenue or pension liabilities — those are operational and free of riba. Halaq uses the company\'s reported "total debt" line which already filters operational liabilities out.',
    },
    {
      h: 'Why a third — and why 30%?',
      p: 'The benchmark is rooted in the prophetic guidance "the third is much" (الثلث كثير), which scholars have used as a measure of what is "substantial": more than one-third is too significant to overlook, less is tolerable in the secondary-market shareholding context. FTSE still applies one-third (of total assets). AAOIFI Standard 21 sets a stricter 30% of market cap for both debt and interest-bearing cash, and since September 2026 the S&P and Dow Jones Islamic indices use 30% as well.',
    },
  ],
  sources: [
    { name: 'AAOIFI Shariah Standard No. 21 — Financial Papers (Shares and Bonds)', url: 'https://aaoifi.com/shariaa-standards/?lang=en' },
    { name: 'Mufti Taqi Usmani — An Introduction to Islamic Finance', url: 'https://muftitaqiusmani.com' },
    { name: 'IFSB — Islamic Financial Services Board', url: 'https://www.ifsb.org/published.php' },
  ],
}
