/**
 * The curated source list. `authority` feeds straight into the rubric:
 * 3 = official/regulatory, 2 = everything else here — a think tank, or a
 * news search already filtered down to wire services and major outlets by
 * `requiresTrustedPublisher` (see below). Nothing in this list is
 * unfiltered general news; that's what let a content-farm story through
 * the first version.
 *
 * Everything except the Federal Register goes through Google News rather
 * than a hand-picked RSS URL. The first version pointed straight at
 * csis.org/analysis/rss.xml and gzeromedia.com/feed and both 404'd in
 * production — sites move their feed paths without notice, and a hardcoded
 * URL has no way to notice. `site:` search is more resilient to that: it
 * fails closed to zero results, never a dead link, and Google News' own
 * crawl already tracks each site's current publishing paths.
 *
 * `requiresTrustedPublisher: true` marks the two sources that are genuinely
 * open web search (China customs, EU trade) rather than site-restricted —
 * fetchSources.mjs runs those through the publisher allowlist in
 * quality.mjs so a random content-farm reprint can't outrank a wire story
 * just for being fresher.
 */
export const SOURCES = [
  {
    id: "federal-register-critical-minerals",
    name: "Federal Register — critical minerals",
    type: "federal-register",
    url: "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=critical+minerals&order=newest&per_page=20",
    authority: 3,
  },
  {
    id: "federal-register-defense-procurement",
    name: "Federal Register — defense procurement",
    type: "federal-register",
    url: "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bagencies%5D%5B%5D=defense-department&conditions%5Bterm%5D=procurement&order=newest&per_page=20",
    authority: 3,
  },
  {
    id: "csis-analysis",
    name: "CSIS",
    type: "google-news",
    url: "https://news.google.com/rss/search?q=site:csis.org+(minerals+OR+%22rare+earth%22+OR+China+OR+tariff+OR+%22trade+war%22+OR+Europe+OR+%22critical+minerals%22)+when:10d&hl=en-US&gl=US&ceid=US:en",
    authority: 2,
  },
  {
    id: "gzero-eurasia-group",
    name: "GZERO / Eurasia Group",
    type: "google-news",
    url: "https://news.google.com/rss/search?q=(site:gzeromedia.com+OR+site:eurasiagroup.net)+(minerals+OR+China+OR+tariff+OR+Europe+OR+%22trade+war%22+OR+%22critical+minerals%22)+when:10d&hl=en-US&gl=US&ceid=US:en",
    authority: 2,
  },
  {
    id: "china-customs-proxy",
    name: "China customs data",
    type: "google-news",
    url: "https://news.google.com/rss/search?q=%22China+customs%22+(export+OR+import+OR+trade+OR+minerals+OR+%22rare+earth%22)+when:10d&hl=en-US&gl=US&ceid=US:en",
    authority: 2,
    requiresTrustedPublisher: true,
  },
  {
    id: "eu-commission-trade-proxy",
    name: "EU trade & minerals",
    type: "google-news",
    url: "https://news.google.com/rss/search?q=(%22European+Commission%22+OR+%22EU%22)+(transatlantic+OR+%22United+States%22+OR+%22trade+war%22+OR+CBAM+OR+%22critical+raw+materials%22+OR+%22rare+earth%22+OR+lithium+OR+cobalt+OR+gallium+OR+germanium+OR+%22export+control%22+OR+CFIUS)+when:7d&hl=en-US&gl=US&ceid=US:en",
    authority: 2,
    requiresTrustedPublisher: true,
  },
];
