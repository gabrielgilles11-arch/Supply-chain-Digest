/**
 * The digest email. Table-based and inline-styled throughout — no <style>
 * block, no flexbox/grid, no external fonts — because Outlook renders with
 * Word's engine, not a browser, and anything fancier than that silently
 * breaks there. Every color is inline for the same reason.
 *
 * Structure: an outlook paragraph and theme headlines up top, then a
 * magazine-style card per top story (image, headline, analyst blurb, link),
 * then the remaining qualifying items as a compact "also today" list. No
 * numeric score is shown anywhere — the rubric still decides what qualifies
 * and how everything is ordered, but that's a filter, not something a
 * reader needs displayed.
 *
 * `analysis` (from analysis.mjs) is optional and can be null — every place
 * it's used has a rule-based fallback, because a missing ANTHROPIC_API_KEY
 * must never mean a missing digest.
 */
import { MINERAL_KEYWORDS, FRICTION_KEYWORDS } from "./rubric.mjs";

const INK = "#0f172a";
const PAPER = "#ffffff";
const CANVAS = "#f4f1ea";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";
const AMBER = "#d97706";
const SPOTLIGHT_COUNT = 4;

const TAG_STYLE = {
  minerals: { bg: "#fef3c7", fg: "#92400e", label: "🪨 Minerals" },
  friction: { bg: "#dbeafe", fg: "#1e40af", label: "⚖️ Friction" },
  both: { bg: "#ede9fe", fg: "#5b21b6", label: "🪨⚖️ Minerals + Friction" },
};

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function tagFor(tags) {
  if (tags.includes("minerals") && tags.includes("friction")) return TAG_STYLE.both;
  if (tags.includes("minerals")) return TAG_STYLE.minerals;
  if (tags.includes("friction")) return TAG_STYLE.friction;
  return { bg: "#f3f4f6", fg: MUTED, label: "" };
}

function byline(item) {
  return item.publisher ?? item.sourceName;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const ACRONYMS = new Set(["cfius", "cbam"]);

function titleCase(phrase) {
  return phrase
    .split(" ")
    .map((word) => (ACRONYMS.has(word) ? word.toUpperCase() : word.replace(/^\w/, (c) => c.toUpperCase())))
    .join(" ");
}

/** Which of a keyword list actually showed up across a group, ranked by how many stories used each one. */
function trendingTerms(group, keywords) {
  const counts = new Map();
  for (const { item } of group) {
    const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
    for (const kw of keywords) {
      if (text.includes(kw)) counts.set(kw, (counts.get(kw) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([kw]) => titleCase(kw));
}

function themeGroups(ranked) {
  return {
    both: ranked.filter((r) => r.scored.tags.includes("minerals") && r.scored.tags.includes("friction")),
    minerals: ranked.filter((r) => r.scored.tags.includes("minerals") && !r.scored.tags.includes("friction")),
    friction: ranked.filter((r) => r.scored.tags.includes("friction") && !r.scored.tags.includes("minerals")),
  };
}

const THEME_META = {
  both: { label: "Where they overlap", icon: "🪨⚖️", ...TAG_STYLE.both, keywordPool: [...MINERAL_KEYWORDS, ...FRICTION_KEYWORDS] },
  minerals: { label: "Minerals", icon: "🪨", ...TAG_STYLE.minerals, keywordPool: MINERAL_KEYWORDS },
  friction: { label: "Friction", icon: "⚖️", ...TAG_STYLE.friction, keywordPool: FRICTION_KEYWORDS },
};

/** A one-line headline per non-empty theme: the LLM's when analysis ran, a trending-keyword summary otherwise. */
function themeLine(key, group, analysis) {
  if (group.length === 0) return "";
  const meta = THEME_META[key];
  const llmHeadline = analysis?.themeHeadlines?.[key]?.trim();
  const fallback = (() => {
    const terms = trendingTerms(group, meta.keywordPool);
    return `${group.length} ${group.length === 1 ? "story" : "stories"}${terms.length ? ` — trending: ${escapeHtml(terms.join(", "))}` : ""}`;
  })();

  return `
  <div style="margin-bottom:10px">
    <span style="display:inline-block;background:${meta.bg};color:${meta.fg};font:bold 11px -apple-system,Helvetica,Arial,sans-serif;padding:3px 9px;border-radius:10px;letter-spacing:.02em">${meta.icon} ${meta.label}</span>
    <span style="font:14px -apple-system,Helvetica,Arial,sans-serif;color:${INK};margin-left:8px">${llmHeadline ? escapeHtml(llmHeadline) : fallback}</span>
  </div>`;
}

function renderSpotlightCard({ item, scored }, index, analysis) {
  const tag = tagFor(scored.tags);
  const blurb = analysis?.storyBlurbs?.[String(index)]?.trim() || (item.summary ?? "").slice(0, 320);
  const image = item.image
    ? `<img src="${escapeHtml(item.image)}" alt="" width="552" style="width:100%;max-width:552px;border-radius:8px;display:block;margin:10px 0 4px" />
       <div style="font:italic 11px -apple-system,Helvetica,Arial,sans-serif;color:#9ca3af;margin-bottom:8px">Image via ${escapeHtml(hostnameOf(item.link))}</div>`
    : "";

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px">
    <tr><td style="padding:18px;border:1px solid ${RULE};border-radius:10px">
      <span style="display:inline-block;background:${tag.bg};color:${tag.fg};font:bold 11px -apple-system,Helvetica,Arial,sans-serif;padding:3px 9px;border-radius:10px;letter-spacing:.02em">${tag.label}</span>
      <div style="font:bold 19px/1.35 Georgia,'Times New Roman',serif;color:${INK};margin:10px 0 2px">
        <a href="${escapeHtml(item.link)}" style="color:${INK};text-decoration:none">${escapeHtml(item.title)}</a>
      </div>
      <div style="font:12px -apple-system,Helvetica,Arial,sans-serif;color:${MUTED};margin-bottom:2px">${escapeHtml(byline(item))}</div>
      ${image}
      <div style="font:14px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:#374151;margin:8px 0 10px">${escapeHtml(blurb)}</div>
      <a href="${escapeHtml(item.link)}" style="font:bold 12px -apple-system,Helvetica,Arial,sans-serif;color:${AMBER};text-decoration:none">Read the full story →</a>
    </td></tr>
  </table>`;
}

function renderAlsoTodayRow({ item, scored }) {
  const tag = tagFor(scored.tags);
  return `
  <tr>
    <td style="padding:10px 16px;border-top:1px solid ${RULE};font:13px -apple-system,Helvetica,Arial,sans-serif">
      <span style="display:inline-block;background:${tag.bg};color:${tag.fg};font:bold 9px;padding:2px 6px;border-radius:7px;margin-right:6px">${tag.label}</span>
      <a href="${escapeHtml(item.link)}" style="color:${INK};font-weight:bold;text-decoration:none">${escapeHtml(item.title)}</a>
      <span style="color:${MUTED}"> — ${escapeHtml(byline(item))}</span>
    </td>
  </tr>`;
}

function healthPill(h) {
  const ok = h.ok;
  const bg = ok ? "#dcfce7" : "#fee2e2";
  const fg = ok ? "#166534" : "#991b1b";
  const label = ok ? `${escapeHtml(h.name)} · ${h.count}` : `${escapeHtml(h.name)} · failed`;
  return `<span style="display:inline-block;background:${bg};color:${fg};font:11px -apple-system,Helvetica,Arial,sans-serif;padding:3px 8px;border-radius:10px;margin:2px 4px 2px 0">${ok ? "✓" : "✗"} ${label}</span>`;
}

export function buildDigestHtml({ dateLabel, ranked, health, analysis = null }) {
  const groups = themeGroups(ranked);
  const themeLines = ["both", "minerals", "friction"].map((key) => themeLine(key, groups[key], analysis)).join("");

  const outlook =
    analysis?.outlook?.trim() ||
    (ranked.length > 0
      ? `${ranked.length} ${ranked.length === 1 ? "development" : "developments"} made the cut today.`
      : "Nothing cleared the bar today — a quiet day on the beat.");

  const spotlight = ranked.slice(0, SPOTLIGHT_COUNT);
  const rest = ranked.slice(SPOTLIGHT_COUNT);
  const spotlightHtml = spotlight.map((entry, i) => renderSpotlightCard(entry, i, analysis)).join("");
  const restHtml = rest.length > 0 ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rest.map(renderAlsoTodayRow).join("")}</table>` : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${CANVAS}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS}">
      <tr><td align="center" style="padding:24px 12px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:${PAPER};border-radius:12px;overflow:hidden">
          <tr>
            <td style="background:${INK};padding:28px 24px">
              <div style="font:bold 20px -apple-system,Helvetica,Arial,sans-serif;color:#ffffff">🧭 The Friction Line</div>
              <div style="font:13px -apple-system,Helvetica,Arial,sans-serif;color:#cbd5e1;margin-top:4px">Mineral supply chains &amp; transatlantic trade — ${escapeHtml(dateLabel)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 8px">
              <div style="font:bold 11px -apple-system,Helvetica,Arial,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Where this is heading</div>
              <div style="font:15px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:${INK};margin-bottom:16px">${escapeHtml(outlook)}</div>
              ${themeLines}
            </td>
          </tr>
          ${spotlightHtml ? `<tr><td style="padding:8px 24px 0">${spotlightHtml}</td></tr>` : ""}
          ${
            restHtml
              ? `<tr><td style="padding:0 8px 0">
                   <div style="font:bold 11px -apple-system,Helvetica,Arial,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;margin:8px 16px 0">Also today</div>
                   ${restHtml}
                 </td></tr>`
              : ""
          }
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid ${RULE}">
              <div style="font:bold 11px -apple-system,Helvetica,Arial,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;margin:8px 0 8px">Source health</div>
              <div>${health.map(healthPill).join("")}</div>
              <div style="font:11px -apple-system,Helvetica,Arial,sans-serif;color:#9ca3af;margin-top:12px">Ranked by mineral relevance, friction relevance, source authority, recency and magnitude. Full rubric in the repo README.${analysis ? "" : " Analysis below is rule-based (no ANTHROPIC_API_KEY set)."}</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function buildDigestText({ dateLabel, ranked, health, analysis = null }) {
  const lines = [`THE FRICTION LINE — ${dateLabel}`, ""];

  if (ranked.length === 0) {
    lines.push("No developments crossed the threshold today.");
  } else {
    const outlook = analysis?.outlook?.trim() || `${ranked.length} development(s) made the cut today.`;
    lines.push("WHERE THIS IS HEADING", outlook, "");

    const groups = themeGroups(ranked);
    lines.push("KEY THEMES");
    for (const key of ["both", "minerals", "friction"]) {
      const group = groups[key];
      if (group.length === 0) continue;
      const meta = THEME_META[key];
      const headline = analysis?.themeHeadlines?.[key]?.trim() || trendingTerms(group, meta.keywordPool).join(", ");
      lines.push(`- ${meta.label} (${group.length}): ${headline}`);
    }
    lines.push("");

    lines.push("TOP STORIES");
    const spotlight = ranked.slice(0, SPOTLIGHT_COUNT);
    spotlight.forEach(({ item }, i) => {
      const blurb = analysis?.storyBlurbs?.[String(i)]?.trim() || (item.summary ?? "").slice(0, 320);
      lines.push(`${item.title} — ${byline(item)}`, item.link, blurb, "");
    });

    const rest = ranked.slice(SPOTLIGHT_COUNT);
    if (rest.length > 0) {
      lines.push("ALSO TODAY");
      for (const { item } of rest) lines.push(`- ${item.title} — ${byline(item)} (${item.link})`);
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(
    "Sources: " +
      health.map((h) => `${h.ok ? "OK" : "FAIL"} ${h.name}${h.ok ? ` (${h.count})` : ` — ${h.error ?? "failed"}`}`).join(" | "),
  );

  return lines.join("\n");
}
