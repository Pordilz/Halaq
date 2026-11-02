/**
 * The activities Islamic rulings restrict, in one place, so the job screener
 * and the stock screen read them the same way.
 *
 * Each activity carries:
 *   severity     'prohibited' when taking part directly is prohibited;
 *                'differ' where scholars hold different views.
 *   hardEmployer true when no role at a company built on it is permissible.
 *   summary, evidence, employer   the ruling, its sources, and what it means
 *                for a role at a company whose core business it is.
 *   role         patterns for a job title: the job is the activity itself.
 *   text         patterns for a job posting: what the employer does.
 *   describe     patterns for a listed company's business description, kept
 *                to product words so a passing mention doesn't flag it.
 *
 * Patterns run on lowercased text.
 */

export const ACTIVITIES = {
  riba: {
    label: 'Interest (riba)',
    severity: 'prohibited',
    summary:
      'Lending or borrowing at interest is prohibited. The prohibition reaches beyond the lender: the Prophet ﷺ cursed the one who takes riba, the one who pays it, the one who writes the contract and its witnesses.',
    evidence: ['Quran 2:275–279', 'Sahih Muslim 1598'],
    employer:
      'Scholars differ on roles with no part in interest at a conventional bank or lender. The Permanent Committee in Saudi Arabia, among others, holds that any job there supports its core business and should be avoided. Others allow roles such as IT, cleaning or security where there is need, while urging the worker to move on when they can.',
    role: [
      /\bloan(s)? (officer|originator|processor|underwriter|advisor|adviser|specialist|closer|analyst)\b/,
      /\bmortgage\b/,
      /\b(credit|lending|loan) (underwriter|analyst|officer|manager|risk analyst)\b/,
      /\bdebt (collector|collection|recovery)\b/,
      /\bcollections? (agent|officer|specialist|advisor)\b/,
      /\bpayday\b/,
      /\bpawn ?(broker|shop)\b/,
      /\b(debt|leveraged) (capital markets|finance)\b/,
      /\b(fixed income|interest rates?|rates) (trader|trading|sales|structurer)\b/,
      /\bcredit cards?\b/,
    ],
    text: [/\bbank(s|ing)?\b/, /\blend(er|ers|ing)\b/, /\bloans?\b/, /\bmortgages?\b/, /\bcredit cards?\b/, /\binterest rates?\b/, /\bconsumer credit\b/, /\bpayday\b/, /\bpawn ?(broker|shop)s?\b/],
  },

  insurance: {
    label: 'Conventional insurance',
    severity: 'differ',
    summary:
      'The International Islamic Fiqh Academy ruled commercial insurance impermissible because of uncertainty (gharar) and interest, and approved cooperative insurance (takaful) instead. Some scholars allow it where it is required by law or there is no takaful option.',
    evidence: ['IIFA Resolution 9 (2/9), 1985', 'AAOIFI Shariah Standard 26'],
    employer: 'Scholars differ on working for a conventional insurer, especially in roles away from underwriting and claims.',
    role: [
      /\binsurance (underwriter|broker|agent|sales|advisor|adviser|claims)\b/,
      /\b(underwriter|underwriting)\b/,
      /\bclaims (handler|adjuster|assessor|examiner)\b/,
      /\bactuar(y|ial)\b/,
    ],
    text: [/\binsur(ance|er|ers)\b/, /\breinsurance\b/, /\bunderwrit(ing|er)\b/],
  },

  speculation: {
    label: 'Speculative trading',
    severity: 'prohibited',
    summary:
      'Conventional options, futures, CFDs and margin trading sell what the seller doesn’t own, on interest-bearing leverage, with outcomes that work like a wager. The International Islamic Fiqh Academy ruled conventional options and futures impermissible.',
    evidence: ['IIFA Resolution 63 (1/7), 1992', 'Sunan Abi Dawud 3503'],
    employer:
      'Scholars differ on support roles at a brokerage whose business is leveraged or derivative trading; most advise avoiding work that markets or runs it.',
    role: [
      /\b(derivatives?|options|futures|volatility|cfds?|forex|fx) (trader|trading|dealer|structurer|sales)\b/,
      /\bproprietary trader\b/,
      /\bspread betting\b/,
      /\bcrypto (derivatives|futures|margin)\b/,
    ],
    text: [/\bderivatives\b/, /\bcfds?\b/, /\bcontracts? for difference\b/, /\bspread betting\b/, /\b(options|futures|forex|margin|leveraged) trading\b/],
  },

  alcohol: {
    label: 'Alcohol',
    severity: 'prohibited',
    summary:
      'Intoxicants are prohibited, and so is helping them reach people: the Prophet ﷺ cursed the one who presses wine, carries it, serves it, sells it and buys it, as well as the one who drinks it.',
    evidence: ['Quran 5:90–91', 'Sunan Abi Dawud 3674'],
    employer:
      'Working in a permissible role at a brewer, distiller or bar group is where scholars differ. Many advise against it because the company exists to sell alcohol; others allow roles with no hand in producing, selling or serving it.',
    role: [
      /\bbar ?(tender|man|maid|back|staff|supervisor|manager|team|lead|server|associate)\b/,
      /\bmixologist\b/,
      /\bsommelier\b/,
      /\bbrew(er|master|ery|ing)\b/,
      /\bdistill(er|ery)\b/,
      /\bwine ?(maker|making|steward|advisor|consultant|sales|rep|merchant)\b/,
      /\b(beer|spirits|wine|liquor|alcohol) (sales|brand|rep|representative|merchandiser|buyer|ambassador)\b/,
      /\bcellar ?(man|hand|person|master)\b/,
      /\bpub\b/,
      /\bnight ?club\b/,
      /\b(liquor store|off[- ]licen[cs]e|bottle shop)\b/,
    ],
    text: [/\bbrew(ery|eries|er|ers|ing)\b/, /\bdistill(ery|eries|er|ers)\b/, /\bbeers?\b/, /\bwines?\b/, /\bspirits\b/, /\bpubs?\b/, /\bcocktails?\b/, /\balcohol(ic)?\b/, /\bnight ?clubs?\b/, /\bliquor\b/],
    describe: [/\b(beers?|wines?|spirits|whisk(e)?y|vodka|tequila|liquors?|alcoholic beverages|brewing|breweries|distiller(y|ies)|hard seltzer|ciders?)\b/],
  },

  gambling: {
    label: 'Gambling',
    severity: 'prohibited',
    summary: 'Gambling (maysir) is prohibited alongside intoxicants, and running or promoting it shares in the sin.',
    evidence: ['Quran 5:90–91', 'Quran 2:219'],
    employer: 'Scholars differ on permissible roles at a betting or casino company. Many advise against it, since the company’s income is gambling revenue.',
    role: [
      /\bcasino\b/,
      /\bcroupier\b/,
      /\bpit boss\b/,
      /\b(table games|blackjack|poker|roulette) dealer\b/,
      /\bsports ?book\b/,
      /\bbetting\b/,
      /\bbook(maker|ie)\b/,
      /\bodds ?compiler\b/,
      /\b(i)?gaming floor\b/,
      /\bslots?\b.*\b(technician|attendant|host)\b/,
      /\blottery\b/,
      /\bbingo\b/,
      /\bfantasy sports\b/,
    ],
    text: [/\bcasinos?\b/, /\bbetting\b/, /\bgambling\b/, /\bsports ?book\b/, /\bigaming\b/, /\bbingo\b/, /\blotter(y|ies)\b/, /\bwager(s|ing)?\b/, /\bfantasy sports\b/],
    describe: [/\b(casinos?|sports ?betting|sports ?books?|wagering|igaming|lotter(y|ies)|slot machines|gaming machines|pari-?mutuel|bingo|online betting)\b/],
  },

  pork: {
    label: 'Pork',
    severity: 'prohibited',
    summary: 'Pork is prohibited to eat, and the Prophet ﷺ prohibited trading in it.',
    evidence: ['Quran 2:173', 'Sahih al-Bukhari 2236'],
    employer: 'Scholars differ on roles away from the pork itself at a company built on pork products; most advise avoiding it.',
    role: [/\bpork\b/, /\b(pig|swine|hog) (farm|farmer|unit|stockperson|stockman)\b/],
    text: [/\bpork\b/, /\bbacon\b/, /\bham\b/, /\bpig(s)?\b/, /\bswine\b/],
    describe: [/\b(pork|bacon|hogs|swine)\b/],
  },

  adult: {
    label: 'Adult content',
    severity: 'prohibited',
    hardEmployer: true,
    summary: 'Producing, selling or promoting pornography and sexual services is prohibited, as is spreading indecency among people.',
    evidence: ['Quran 17:32', 'Quran 24:19', 'Quran 24:30–31'],
    employer: 'A company whose business is adult content or sexual services is not a permissible employer for any role.',
    role: [
      /\badult (content|entertainment|industry|film|performer|model)\b/,
      /\bporn/,
      /\b(cam|webcam) (model|performer)\b/,
      /\b(stripper|exotic dancer|pole dancer)\b/,
      /^escorts?$|\bescort (girl|agency|model)\b/,
      /\bsex (shop|store|worker)\b/,
    ],
    text: [/\badult (content|entertainment|films?|industry|store)\b/, /\bpornograph(y|ic)\b/, /\bstrip clubs?\b/, /\bgentlemen'?s clubs?\b/, /\bwebcam models?\b/, /\bsex (toys?|shop|store)\b/, /\bescort (agency|services)\b/],
    describe: [/\b(adult entertainment|pornograph(y|ic)|adult content|adult films?|strip clubs?|gentlemen'?s clubs?|adult-oriented)\b/],
  },

  tobacco: {
    label: 'Tobacco and recreational drugs',
    severity: 'prohibited',
    summary:
      'Most contemporary scholars hold that smoking and recreational drugs are prohibited because of the harm they cause, which makes selling and promoting them prohibited too. Some older opinions held tobacco to be disliked rather than prohibited.',
    evidence: ['Quran 2:195', 'Sunan Ibn Majah 2340'],
    employer: 'Scholars differ on roles at a tobacco or cannabis company that have no part in the product itself.',
    role: [/\btobacco(nist)?\b/, /\bcigar(ette)?s?\b/, /\bvap(e|ing)\b/, /\bcannabis\b/, /\bbudtender\b/, /\bcannabis dispensary\b/, /\b(shisha|hookah)\b/, /\bsmoke shop\b/],
    text: [/\btobacco\b/, /\bcigarettes?\b/, /\bvap(e|es|ing)\b/, /\bnicotine\b/, /\bcannabis\b/, /\bmarijuana\b/, /\b(shisha|hookah)\b/],
    describe: [/\b(tobacco|cigarettes?|cigars?|e-?cigarettes?|vapou?r products|vaping|nicotine|cannabis|marijuana|heated tobacco)\b/],
  },

  weapons: {
    label: 'Weapons',
    severity: 'differ',
    summary:
      'Making and selling weapons isn’t prohibited in itself, since lawful defence needs them. Selling them to those who will use them in oppression or civil strife is prohibited, as is any part in harming non-combatants, so scholars weigh who the weapons go to and how they are used.',
    evidence: ['Quran 5:2', 'Quran 2:190', 'Sahih al-Bukhari, Book of Sales: selling weapons in times of strife'],
    employer:
      'Scholars differ on working for an arms maker. The question is who buys its weapons and what they are used for, which the boycott lists below may speak to.',
    role: [
      /\bweapons? (engineer|technician|systems?|specialist|designer|integration)\b/,
      /\b(armou?rer|gunsmith)\b/,
      /\bfirearms?\b/,
      /\b(ammunition|munitions|ordnance|warhead|missile|artillery|small arms|torpedo)\b/,
    ],
    text: [/\bfirearms?\b/, /\bhandguns?\b/, /\brifles?\b/, /\bammunition\b/, /\bmunitions\b/, /\bmissiles?\b/, /\bwarheads?\b/, /\bweapons?( systems?)?\b/, /\bdefen[cs]e contractor\b/, /\bartillery\b/, /\barmou?red vehicles?\b/, /\bordnance\b/],
    describe: [/\b(firearms?|handguns?|pistols|rifles|shotguns|ammunition|munitions|missiles?|warheads?|weapons?( systems?)?|artillery|ordnance|torpedoes|combat vehicles|fighter (jets|aircraft))\b/],
  },

  indiscriminate: {
    label: 'Indiscriminate weapons',
    severity: 'prohibited',
    hardEmployer: true,
    summary:
      'Weapons that can’t tell soldiers from civilians, such as cluster munitions, landmines and nuclear, chemical or biological weapons, kill those Islam forbids targeting: the Prophet ﷺ forbade killing women and children in war.',
    evidence: ['Quran 5:32', 'Quran 2:205', 'Sahih al-Bukhari 3015'],
    employer: 'A company that makes indiscriminate weapons is not a permissible employer for any role.',
    role: [/\b(cluster munitions?|landmines?|anti-personnel mines?|white phosphorus)\b/, /\b(nuclear|chemical|biological) weapons?\b/],
    text: [/\b(cluster munitions?|landmines?|anti-personnel mines?|white phosphorus)\b/, /\b(nuclear|chemical|biological) weapons?\b/],
    describe: [/\b(cluster munitions?|landmines?|anti-personnel mines?|white phosphorus)\b/, /\b(nuclear|chemical|biological) weapons?\b/],
  },

  music: {
    label: 'Music',
    severity: 'differ',
    summary:
      'The four schools of law mostly held musical instruments to be prohibited, citing the hadith that warns of people who will make them lawful. Some scholars permit instruments with decent lyrics, and the voice alone (as in nasheeds) is widely permitted.',
    evidence: ['Sahih al-Bukhari 5590', 'Quran 31:6'],
    employer:
      'Roles at a record label, music streaming service or concert promoter are where scholars differ, following their view on music itself.',
    role: [
      /\bmusician\b/,
      /\bmusic (producer|teacher|tutor|director|editor|supervisor)\b/,
      /\b(dj|disc jockey)\b/,
      /\b(pianist|guitarist|drummer|violinist|cellist|bassist|keyboardist|organist)\b/,
      /\b(recording|session) (artist|musician)\b/,
      /\ba ?& ?r\b/,
    ],
    text: [/\brecord labels?\b/, /\bmusic (industry|publishing|streaming|label)\b/, /\brecorded music\b/, /\bconcerts?\b/, /\blive music\b/],
    describe: [/\b(recorded music|music publishing|record labels?|concert promotion|music streaming|live music)\b/],
  },

  fortune: {
    label: 'Fortune-telling and magic',
    severity: 'prohibited',
    hardEmployer: true,
    summary:
      'Claiming knowledge of the unseen through astrology, tarot or psychic readings is prohibited, and so is earning from it. Magic and spells are prohibited in the Quran.',
    evidence: ['Quran 27:65', 'Quran 2:102', 'Sahih Muslim 2230'],
    employer: 'A company built on fortune-telling or magic is not a permissible employer.',
    role: [/\b(psychic|tarot|astrolog(er|y)|clairvoyant|medium reader|fortune teller|numerologist|palm reader|spell ?caster|witch(craft)?)\b/],
    text: [/\b(psychic|tarot|astrology|horoscopes?|fortune telling|numerology|palm reading|black magic|witchcraft|spells?|occult|clairvoyan(t|ce))\b/],
    describe: [/\b(astrology|horoscopes?|psychic readings?|tarot)\b/],
  },
}

// ── Wider vocabularies ──────────────────────────────────────────────────

/**
 * Words a business's own site or posting uses when the activity is what it
 * sells. Each strong hit counts twice, so a page that is plainly an adult
 * site, a casino or a brewery reads as that business on two of them.
 */
const STRONG = {
  adult: [
    /\bporn/, /\bhentai\b/, /\bxxx\b/, /\bnsfw\b/, /\bsexually explicit\b/, /\bexplicit (sexual|content|videos?|images)\b/,
    /\bsexual activity\b/, /\bnudity\b/, /\bnude\b/, /\badult (website|site|videos?|movies?|cams?|chat)\b/,
    /\bage[- ]restricted (material|content|videos?)\b/, /\bcam ?girls?\b/, /\bescort (agency|agencies|services|girls?)\b/, /\bfetish\b/, /\berotic(a)?\b/, /\bhook ?ups?\b/,
    /\bonlyfans\b/, /\bsex (videos?|chat|cams?|dating)\b/,
  ],
  gambling: [/\bcasino\b/, /\bjackpots?\b/, /\b(slot machines|online slots|slot games)\b/, /\broulette\b/, /\bblackjack\b/, /\bpoker\b/, /\bsports ?book\b/, /\bplace (a |your )?bets?\b/, /\bfree spins\b/, /\b(betting|best|boosted) odds\b/, /\bgamble\b/],
  alcohol: [/\bwhisk(e)?y\b/, /\bvodka\b/, /\btequila\b/, /\bgin\b/, /\brum\b/, /\blagers?\b/, /\bales?\b/, /\bcraft beer\b/, /\bliquor\b/, /\bbrewery\b/, /\bdistillery\b/, /\bwinery\b/],
  tobacco: [/\bcigars?\b/, /\be-?cigarettes?\b/, /\bvapes?\b/, /\bthc\b/, /\bcannabis dispensar(y|ies)\b/, /\bpsilocybin\b/, /\bmagic mushrooms\b/, /\bkratom\b/],
  weapons: [/\bguns?\b/, /\bfirearms?\b/, /\bammo\b/, /\bammunition\b/, /\bpistols?\b/, /\brifles?\b/, /\bshotguns?\b/],
  speculation: [/\bbinary options\b/, /\bcopy trading\b/, /\bleverage(d)? (trading|up to)\b/, /\b(trade|trading) (cfds|forex|fx)\b/],
  riba: [/\bpayday loans?\b/, /\b(representative apr|[1-9]\d*(\.\d+)?% apr)\b/, /\bborrow (up to|from)\b/, /\bpersonal loans?\b/, /\bloan calculator\b/],
  fortune: [/\bhoroscopes?\b/, /\btarot readings?\b/, /\bpsychic readings?\b/, /\blove spells?\b/],
  music: [/\b(stream|listen to) music\b/, /\bplaylists?\b/, /\bconcert tickets\b/],
  pork: [/\bpork\b/, /\bbacon\b/],
}

/**
 * Names that tell you the business on their own: brands and the words a
 * company or website name is built from. Matched against the employer's
 * name and the link's address. `brands` count wherever they appear;
 * `words` only count when the company isn't a listing with a known industry,
 * since a listed "Bank of …" is better judged by its industry.
 */
const NAMES = {
  adult: {
    brands: /\b(pornhub|xvideos|xhamster|xnxx|redtube|youporn|brazzers|onlyfans|fansly|manyvids|chaturbate|stripchat|bongacams|livejasmin|myfreecams|camsoda|cam4|aylo|mindgeek|playboy|hustler|adultfriendfinder|ashley ?madison|nhentai|e-?hentai|rule ?34|spankbang|eporner|tube8|clips4sale|naughty ?america|bangbros|realitykings|vivid entertainment)\b/,
    words: /\b(porn\w*|hentai\w*|xxx\w*|nsfw|sex|sexcams?|sexchat|sexshop|erotic\w*|fetish|escort (agency|services)|camgirls?|nudes?|stripclub|gentlemen'?s club|brothel|adult(cams?|chat|videos?|store|toys?))\b/,
  },
  gambling: {
    brands: /\b(bet365|william ?hill|ladbrokes|coral|paddy ?power|betfair|sky ?bet|betway|betfred|unibet|888(casino|poker|sport)?|pokerstars|draftkings|fanduel|betmgm|caesars (sportsbook|casino)|entain|flutter|kindred|evoke|bovada|bwin|partypoker|ggpoker|national lottery|camelot|allwyn|gamesys|playtech|evolution gaming|light ?& ?wonder|scientific games|international game technology|las vegas sands|wynn|mgm resorts|genting|crown resorts|tabcorp|sportsbet|stake\.com|roobet|bc\.game|rollbit|duelbits|ladbrokes coral|betvictor|boylesports|mr ?green|leovegas|casumo)\b/,
    words: /\b(casinos?|bet(ting|s)?|bookmakers?|bookies|poker|slots|bingo|lotter(y|ies)|sportsbooks?|wager\w*|jackpot\w*|roulette|blackjack|gambling)\b/,
  },
  alcohol: {
    brands: /\b(diageo|ab ?inbev|anheuser-?busch|heineken|carlsberg|molson coors|pernod ricard|brown-?forman|constellation brands|campari|r[eé]my cointreau|beam suntory|suntory|bacardi|asahi|kirin|sapporo|brewdog|guinness|budweiser|corona|smirnoff|johnnie walker|jack daniel'?s|jameson|absolut|moet hennessy|treasury wine|accolade wines|greene king|marston'?s|mitchells (& |and )?butlers|wetherspoon|fuller'?s|stonegate|young'?s)\b/,
    words: /\b(brew(ery|eries|ing|ers?|dog)|distill(ery|eries|ers?)|winer(y|ies)|wines?|vineyards?|beers?|liquors?|pubs?|taverns?|cocktail bars?|wine bars?|whisk(e)?y|vodka|tequila)\b/,
  },
  tobacco: {
    brands: /\b(philip morris|british american tobacco|imperial brands|japan tobacco|altria|juul|vuse|iqos|marlboro|elf ?bar|lost mary|curaleaf|tilray|canopy growth|aurora cannabis|trulieve|cronos group|swedish match|scandinavian tobacco)\b/,
    words: /\b(tobacco\w*|cigars?|cigarettes?|vapes?|vaping|smoke ?shop|shisha|hookah|cannabis|marijuana|thc)\b/,
  },
  riba: {
    brands: /\b(barclays|hsbc|lloyds|natwest|santander|jp ?morgan|chase|bank of america|wells fargo|citi(group|bank)?|goldman sachs|morgan stanley|capital one|american express|amex|monzo|starling|revolut|nationwide building society|halifax|tsb|metro bank|virgin money|wonga|quickquid|provident financial|amigo loans|oakam|lending ?club|sofi|upstart|rocket mortgage|quicken loans|ocwen|onemain|credit karma)\b/,
    words: /\b(banks?|banking|bancorp|bancshares|lenders?|lending|loans?|mortgages?|payday|pawn\w*|credit union|building society|savings and loan)\b/,
  },
  insurance: {
    brands: /\b(aviva|axa|allianz|prudential|legal (& |and )?general|zurich|geico|state farm|progressive|allstate|metlife|aig|chubb|lloyd'?s of london|admiral|direct line|hiscox|aon|marsh|willis towers watson|munich re|swiss re|hannover re|aflac|travelers|liberty mutual|nationwide mutual)\b/,
    words: /\b(insurance|insurers?|assurance|reinsurance|underwriters?)\b/,
  },
  speculation: {
    brands: /\b(etoro|plus500|ig group|cmc markets|pepperstone|oanda|forex\.com|avatrade|xm\.com|exness|ic markets|deriv|iq ?option|pocket option)\b/,
    words: /\b(forex|cfds?|binary options|spread betting)\b/,
  },
  weapons: {
    brands: /\b(lockheed( martin)?|raytheon|rtx|bae systems|northrop( grumman)?|general dynamics|elbit|rafael|israel aerospace|rheinmetall|thales|leonardo|saab|kongsberg|mbda|smith (& |and )?wesson|sturm,? ruger|ruger|colt|glock|sig sauer|heckler (& |and )?koch|remington|winchester|beretta|anduril|l3 ?harris|huntington ingalls|nammo|fn herstal|hanwha aerospace|kraus-?maffei|nexter|knds|bharat dynamics|norinco|rostec|kalashnikov|olin)\b/,
    words: /\b(guns?|gunsmiths?|firearms?|arms (dealer|manufacturer)|ammo|ammunition|munitions?|armou?ry|defen[cs]e systems|missiles?|tactical arms)\b/,
  },
  fortune: {
    brands: /\b(co[–-]?star astrology|kasamba|keen psychics?|california psychics|psychic source)\b/,
    words: /\b(psychics?|tarot|astrolog\w*|horoscopes?|fortune ?tell\w*|clairvoyan\w*|witchcraft|spells|occult)\b/,
  },
  music: {
    brands: /\b(universal music|sony music|warner music|spotify|deezer|soundcloud|tidal|live nation|ticketmaster|bmg rights)\b/,
    words: /\b(record labels?|music (group|publishing|streaming))\b/,
  },
  pork: {
    brands: /\b(smithfield|wh group|t[oö]nnies|danish crown|vion|tulip|cranswick|hormel)\b/,
    words: /\b(pork|bacon|hogs?|piggery|swine)\b/,
  },
  indiscriminate: { brands: null, words: /\b(cluster munitions?|landmines?|nuclear weapons?|chemical weapons?|biological weapons?)\b/ },
}

for (const [id, patterns] of Object.entries(STRONG)) ACTIVITIES[id].strong = patterns
for (const [id, names] of Object.entries(NAMES)) ACTIVITIES[id].names = names

export const ACTIVITY_IDS = Object.keys(ACTIVITIES)

/** Yahoo industries mapped to the activity they are, and whether it is the core business. */
export const INDUSTRY_ACTIVITIES = [
  [/\b(banks?|mortgage finance|credit services|consumer finance|capital markets|savings)\b/, 'riba', true],
  [/\binsurance\b/, 'insurance', true],
  [/\b(brewers|breweries|wineries|distilleries|distillers)\b/, 'alcohol', true],
  [/\b(gambling|casinos)\b/, 'gambling', true],
  [/\btobacco\b/, 'tobacco', true],
  [/\badult\b/, 'adult', true],
  [/\bpork\b/, 'pork', true],
  // Aerospace and defence mixes civil aircraft with arms, so it only flags.
  [/\baerospace (and|&|-)? ?defen[cs]e\b/, 'weapons', false],
]

/**
 * Business activities a description talks about, from the `describe`
 * patterns. Interest and insurance are left to the industry and the
 * financial ratios, since most companies mention credit somewhere.
 */
export function describedActivities(description) {
  const t = String(description || '').toLowerCase()
  if (!t) return []
  return ACTIVITY_IDS.filter(id => ACTIVITIES[id].describe?.some(p => p.test(t)))
}

export function activityLabels(ids) {
  const labels = ids.map(id => ACTIVITIES[id].label.toLowerCase())
  if (labels.length <= 1) return labels[0] || ''
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`
}
