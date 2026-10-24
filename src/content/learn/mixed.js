export default {
  id: 'mixed',
  icon: 'business_center',
  category: 'Methodology',
  readTime: '6 min',
  title: 'Mixed-revenue businesses — the 5% test',
  summary:
    'How airlines, hotels, supermarkets and tech giants get screened when they sell some non-permissible items but most of their revenue is fine.',
  sections: [
    {
      h: 'The principle',
      p: 'A company whose primary business is permissible can still have a slice of revenue from non-permissible activities — a supermarket selling alcohol, a hotel offering room-service liquor, an airline showing a film with adult content. AAOIFI permits these holdings if the non-permissible revenue is under 5% of total revenue and the investor purifies the corresponding dividend percentage.',
    },
    {
      h: 'How Halaq estimates this',
      p: 'Public companies rarely break out non-permissible revenue cleanly, so the measurable part of the 5% test is interest income. When a company doesn\'t report it separately we use its other non-operating income as an estimate, and when neither is available the test is marked unavailable rather than passed. Every ratio shows whether it was reported or estimated, and an estimate alone never marks a stock non-compliant — it shows as Unverified until you run Verify. Mixed businesses (hotels, media, retail) are flagged for review, because their impermissible sales lines aren\'t in the data.',
    },
    {
      h: 'Common confusions',
      p: 'A holding by a permissible parent in a non-permissible subsidiary still counts. So does a minority stake by a permissible business in an alcohol producer. When in doubt, look at the segments breakdown in the 10-K / annual report.',
    },
  ],
  sources: [
    { name: 'AAOIFI Shariah Standard No. 21 — Financial Papers (Shares and Bonds)', url: 'https://aaoifi.com/shariaa-standards/?lang=en' },
    { name: 'S&P Dow Jones Islamic Market Index — methodology', url: 'https://www.spglobal.com/spdji/en/index-family/shariah/' },
    { name: 'FTSE Shariah Global Equity Index — methodology', url: 'https://www.lseg.com/en/ftse-russell/indices/global-shariah' },
  ],
}
