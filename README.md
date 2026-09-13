# Supply chain digest

A daily early-warning email for one beat: mineral supply chains and
transatlantic trade friction. It monitors a curated set of sources, scores
every item against a fixed, explainable rubric, and mails the ranked result
through [Resend](https://resend.com) at 8am CET/CEST via a scheduled GitHub
Actions workflow — no server, no database, no dashboard to maintain.

It exists to do the two things that beat actually requires: pull signal out
of noisy, heterogeneous sources (regulatory notices, think-tank commentary,
customs data) on a fixed schedule, and rank what's worth reading against a
rubric that can be stated and defended rather than a black box.

## Sources (`src/sources.mjs`)

| Source | Type | Authority |
| :--- | :--- | :--- |
| Federal Register — critical minerals | official API | 3 |
| Federal Register — defense procurement | official API | 3 |
| CSIS | Google News, `site:csis.org` | 2 |
| GZERO / Eurasia Group | Google News, `site:gzeromedia.com OR site:eurasiagroup.net` | 2 |
| China customs data | Google News, open search + publisher filter | 2 |
| EU trade & minerals | Google News, open search + publisher filter | 2 |

Everything past the Federal Register goes through Google News rather than a
hand-picked RSS URL. The first version pointed straight at
`csis.org/analysis/rss.xml` and `gzeromedia.com/feed`, and both had moved —
404 in production despite looking valid beforehand. `site:` search doesn't
have that failure mode: it can return zero results, never a dead link.

The two fully open queries (China customs, EU trade) don't have a `site:`
restriction, so `requiresTrustedPublisher` in `sources.mjs` runs their
results through `quality.mjs`: Google News tags every headline
`"Title - Publisher"`, and only a header on the allowlist (Reuters,
Bloomberg, the FT, Politico, Nikkei, SCMP, and similar) survives. The first
production run shipped a story from `illustrateddailynews.com` because
nothing was checking who wrote it — this is that fix.

A source going stale (a query returning nothing, a timeout) still doesn't
take the run down — `fetchSources.mjs` catches each one independently, and
the digest's footer shows a health pill per source.

## The rubric (`src/rubric.mjs`)

Every dimension is a keyword or date check — deliberately, so it can be
recited and defended rather than trusted as a black box:

| Dimension | Range | What it measures |
| :--- | :--- | :--- |
| Mineral relevance | 0–4 | Critical-minerals keyword hits (title weighted 2x, body 1x) |
| Friction relevance | 0–4 | Transatlantic-friction keyword hits, same weighting |
| Source authority | 0–3 | Official (3) / think tank or trusted-publisher-filtered news (2), from `sources.mjs` |
| Recency | 0–2 | 2 within 24h, 1 within 72h, 0 beyond |
| Magnitude | 0–2 | A hard number or a ban/restriction verb (2), a soft "considering" (1), neither (0) |

**Qualifies for the digest** when `mineral >= 3` OR `friction >= 3` — a
strong signal on either half of the beat is enough alone. Two moderate
signals qualify together too, but only `if mineral >= 1 AND friction >= 1 AND
total >= 6`: the first production run let a fresh, dollar-figure **EU–India**
tariff story through purely on recency + magnitude + authority, with zero
mineral relevance, because the old `total >= 6` route didn't require either
axis to actually be present. Both axes now have to contribute something.

Qualifying items are ranked by total score, the top 12 are mailed, and only
those are marked "seen" — one bumped by the cap today is still eligible
tomorrow rather than silently dropped. Tests for the rubric and the feed
parsing live in `src/__tests__/`.

## The email (`src/render.mjs`)

Styled as a card per item — a score badge, a colored tag pill (🪨 minerals /
⚖️ friction / both), the headline, a byline (the real publisher when one was
extracted, the source name otherwise), a snippet, and an explicit **"Read the
full story →"** link — on a dark header banner, over a warm off-white
background instead of plain black-on-white.

It's still built as plain inline-styled HTML tables, not a modern CSS layout:
Outlook renders email with Word's layout engine, not a browser, so anything
built with flexbox/grid, a `<style>` block, or a web font would silently
break there. Every color and font is inline for that reason.

## Scheduling and DST

Cron is UTC and can't track the CET/CEST switch on its own, so the workflow
fires twice a day (06:00 and 07:00 UTC) and `src/index.mjs` checks the actual
Europe/Berlin hour before doing anything — only the firing where it reads 8am
sends; the other is a silent no-op. No yearly cron edit required.

## Running it

```sh
npm install
npm test               # 20 tests over the rubric, feed parsing and the publisher filter
npm run digest:dry     # fetches, scores, prints the digest — no secrets needed
npm run digest          # sends for real; needs the env vars below
```

## Required GitHub repo secrets

Set these under Settings → Secrets and variables → Actions:

- `RESEND_API_KEY` — a Resend API key.
- `RESEND_FROM` — sender address. `onboarding@resend.dev` works with no
  domain setup, but Resend's shared sandbox address can only deliver to the
  email address the Resend account itself is registered with.
- `RESEND_TO` — where the digest goes.

## Extending

- **State**: `src/state/seen.json` is de-dup memory (14-day retention),
  committed back by the workflow. Delete it to reset.
- **Adding a source**: add an entry to `src/sources.mjs`. `type: "rss"` and
  `type: "google-news"` both handle RSS 2.0 and Atom (the latter also splits
  the Google News `"Title - Publisher"` suffix); `type: "federal-register"`
  expects the `documents.json` shape. Set `requiresTrustedPublisher: true`
  on any open (non-`site:`-restricted) Google News query.
- **LLM summarization**: out of scope for now — the rubric alone decides
  inclusion and ranking, no API key required. A "why this matters" sentence
  per item could be layered on top later without changing what qualifies.

## Stack

Plain Node (ESM, no framework) · `fast-xml-parser` for RSS/Atom · Vitest ·
GitHub Actions for scheduling · Resend for delivery.

## Licence

[MIT](LICENSE).
