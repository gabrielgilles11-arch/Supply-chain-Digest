/**
 * Google News wraps every result as "Headline - Publisher" and mixes real
 * reporting with content-farm reprints. This is what turned "high-authority
 * feed" into "random SEO site" in the first digest: a Brussels-India tariff
 * story from illustrateddailynews.com scored well on recency and magnitude
 * with nothing checking who actually wrote it.
 *
 * `splitGoogleNewsTitle` recovers the publisher so it can be displayed and
 * checked; `passesTrustedPublisher` is the check, applied only to the two
 * sources that are genuinely open web search (see sources.mjs) — the
 * site-restricted queries (CSIS, GZERO) don't need it, they can only return
 * that one domain.
 */

const TRUSTED_PUBLISHERS = [
  "reuters",
  "bloomberg",
  "financial times",
  "wall street journal",
  "associated press",
  "ap news",
  "politico",
  "axios",
  "semafor",
  "nikkei",
  "south china morning post",
  "scmp",
  "the guardian",
  "cnbc",
  "foreign policy",
  "foreign affairs",
  "the economist",
  "deutsche welle",
  "euractiv",
  "mining.com",
  "s&p global",
  "the diplomat",
  "defense news",
  "breaking defense",
  "al jazeera",
  "npr",
  "bbc",
  "new york times",
  "washington post",
  "handelsblatt",
  "le monde",
  "the japan times",
  "kyodo news",
  "taipei times",
  "caixin",
  "xinhua",
  "global times",
  "cgtn",
  "the hill",
  "time",
];

/** Returns { title, publisher } — publisher is null when the title has no " - X" suffix. */
export function splitGoogleNewsTitle(rawTitle) {
  const idx = rawTitle.lastIndexOf(" - ");
  if (idx === -1) return { title: rawTitle, publisher: null };
  return { title: rawTitle.slice(0, idx).trim(), publisher: rawTitle.slice(idx + 3).trim() };
}

export function isTrustedPublisher(publisher) {
  if (!publisher) return false;
  const lower = publisher.toLowerCase();
  return TRUSTED_PUBLISHERS.some((name) => lower.includes(name));
}
