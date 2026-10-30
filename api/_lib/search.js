/**
 * Picks which Yahoo search results to offer. Halaq screens listings worldwide,
 * so nothing is limited to particular markets. The only results dropped are
 * secondary quotes of a company's main listing: US over-the-counter ADRs and
 * German regional venues (Telkom Indonesia's TLKM.JK also appears as PTI.MU,
 * PTI.HA and PTI.HM). They're kept when a company has nothing else.
 */

const SECONDARY_VENUES = new Set([
  'PNK', 'OQB', 'OQX', 'OEM', 'OID', 'OTC', // US over-the-counter
  'MUN', 'HAN', 'HAM', 'DUS', 'STU', 'BER', 'FRA', // German regional (Xetra is GER)
]);

const MAX_RESULTS = 8;

export function pickSearchResults(quotes) {
  const listed = (Array.isArray(quotes) ? quotes : []).filter(
    item => item?.symbol && (item.quoteType === 'EQUITY' || item.quoteType === 'ETF')
  );
  const primary = listed.filter(item => !SECONDARY_VENUES.has(item.exchange));
  return (primary.length ? primary : listed).slice(0, MAX_RESULTS).map(item => ({
    symbol: item.symbol,
    name: item.shortname || item.longname || item.symbol,
    exchange: item.exchDisp || item.exchange || '',
    type: item.quoteType,
  }));
}
