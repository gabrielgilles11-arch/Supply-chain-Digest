/**
 * Best-effort hero images. Only run against the handful of stories that
 * actually make the top of the email — fetching a full article page per
 * item isn't cheap, and most of the day's 100+ raw items never need one.
 *
 * A Google News link is a redirect, not the article itself; `fetch` follows
 * it by default, so the HTML that comes back is (almost always) the real
 * publisher's page. When it isn't, or the page has no og:image, the story
 * just renders without one — a missing picture breaks nothing, an image
 * fetch is never allowed to fail the run.
 */

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 300_000; // og:image lives in <head>; nothing past it is worth downloading
const USER_AGENT = "Mozilla/5.0 (compatible; SupplyChainDigest/1.0)";

const META_IMAGE_RE =
  /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["']/i;

async function fetchPartial(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "User-Agent": USER_AGENT } });
    if (!res.ok || !res.body) return "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    let bytes = 0;
    while (bytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    await reader.cancel().catch(() => {});
    return html;
  } finally {
    clearTimeout(timer);
  }
}

/** Extracts an og:image/twitter:image URL from a chunk of HTML. Exported for testing without a network call. */
export function extractImageUrl(html, pageUrl) {
  const match = META_IMAGE_RE.exec(html);
  const raw = match?.[1] ?? match?.[2];
  if (!raw) return null;
  try {
    return new URL(raw, pageUrl).toString();
  } catch {
    return null;
  }
}

async function findHeroImage(url) {
  try {
    const html = await fetchPartial(url);
    return extractImageUrl(html, url);
  } catch {
    return null;
  }
}

/** Mutates nothing — returns a new array with `.image` (a URL, or null) set on the first `limit` entries. */
export async function attachHeroImages(rankedEntries, limit = 6) {
  const withImages = await Promise.all(
    rankedEntries.map(async (entry, i) => {
      if (i >= limit) return entry;
      const image = await findHeroImage(entry.item.link);
      return { ...entry, item: { ...entry.item, image } };
    }),
  );
  return withImages;
}
