/**
 * The digest email. Table-based and inline-styled throughout — no <style>
 * block, no flexbox/grid, no external fonts — because Outlook renders with
 * Word's engine, not a browser, and anything fancier than that silently
 * breaks there. Every color is inline for the same reason.
 *
 * Structure is themes-first, articles-second: a short synthesis of what's
 * trending, grouped by minerals / friction / both, then the underlying
 * stories as a plain reference list. No numeric score is shown anywhere —
 * the rubric still decides what qualifies and how items are ordered within
 * a theme, but that's a filter, not something a reader needs displayed.
 */
import { MINERAL_KEYWORDS, FRICTION_KEYWORDS } from "./rubric.mjs";

const INK = "#0f172a";
const PAPER = "#ffffff";
const CANVAS = "#f4f1ea";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";
const AMBER = "#d97706";

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

function renderTheme(group, { label, icon, bg, fg, keywordPool }) {
  if (group.length === 0) return "";
  const terms = trendingTerms(group, keywordPool);
  const top = group[0].item;
  const count = group.length;

  return `
  <div style="margin-bottom:18px">
    <span style="display:inline-block;background:${bg};color:${fg};font:bold 12px -apple-system,Helvetica,Arial,sans-serif;padding:4px 10px;border-radius:10px;letter-spacing:.02em">${icon} ${label}</span>
    <div style="font:15px/1.55 -apple-system,Helvetica,Arial,sans-serif;color:${INK};margin-top:8px">
      ${count} ${count === 1 ? "story" : "stories"} today${terms.length ? ` — trending: ${escapeHtml(terms.join(", "))}` : ""}.
      Led by <a href="${escapeHtml(top.link)}" style="color:${AMBER};font-weight:bold;text-decoration:none">${escapeHtml(top.title)}</a>.
    </div>
  </div>`;
}

function renderThemes(ranked) {
  const both = ranked.filter((r) => r.scored.tags.includes("minerals") && r.scored.tags.includes("friction"));
  const mineralsOnly = ranked.filter((r) => r.scored.tags.includes("minerals") && !r.scored.tags.includes("friction"));
  const frictionOnly = ranked.filter((r) => r.scored.tags.includes("friction") && !r.scored.tags.includes("minerals"));

  return [
    renderTheme(both, { label: "Where they overlap", icon: "🪨⚖️", bg: TAG_STYLE.both.bg, fg: TAG_STYLE.both.fg, keywordPool: [...MINERAL_KEYWORDS, ...FRICTION_KEYWORDS] }),
    renderTheme(mineralsOnly, { label: "Minerals", icon: "🪨", bg: TAG_STYLE.minerals.bg, fg: TAG_STYLE.minerals.fg, keywordPool: MINERAL_KEYWORDS }),
    renderTheme(frictionOnly, { label: "Friction", icon: "⚖️", bg: TAG_STYLE.friction.bg, fg: TAG_STYLE.friction.fg, keywordPool: FRICTION_KEYWORDS }),
  ].join("");
}

function renderArticleRow({ item, scored }) {
  const tag = tagFor(scored.tags);
  const summary = (item.summary ?? "").slice(0, 180);

  return `
  <tr>
    <td style="padding:14px 16px;border-top:1px solid ${RULE}">
      <span style="display:inline-block;background:${tag.bg};color:${tag.fg};font:bold 10px -apple-system,Helvetica,Arial,sans-serif;padding:2px 7px;border-radius:8px">${tag.label}</span>
      <div style="font:bold 15px/1.4 Georgia,'Times New Roman',serif;color:${INK};margin:6px 0 2px">
        <a href="${escapeHtml(item.link)}" style="color:${INK};text-decoration:none">${escapeHtml(item.title)}</a>
      </div>
      <div style="font:12px -apple-system,Helvetica,Arial,sans-serif;color:${MUTED};margin-bottom:4px">${escapeHtml(byline(item))}</div>
      ${summary ? `<div style="font:13px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#374151">${escapeHtml(summary)}${item.summary?.length > 180 ? "…" : ""}</div>` : ""}
      <a href="${escapeHtml(item.link)}" style="font:bold 12px -apple-system,Helvetica,Arial,sans-serif;color:${AMBER};text-decoration:none">Read the full story →</a>
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

export function buildDigestHtml({ dateLabel, ranked, health }) {
  const themes = ranked.length > 0 ? renderThemes(ranked) : "";
  const articles = ranked.length > 0 ? ranked.map(renderArticleRow).join("") : "";
  const openingLine =
    ranked.length > 0
      ? `${ranked.length} ${ranked.length === 1 ? "development" : "developments"} made the cut today.`
      : "Nothing cleared the bar today — a quiet day on the beat.";

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
            <td style="padding:20px 24px 4px;font:15px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:${INK}">
              ${openingLine}
            </td>
          </tr>
          ${
            themes
              ? `<tr><td style="padding:14px 24px 0">
                   <div style="font:bold 11px -apple-system,Helvetica,Arial,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px">Key themes</div>
                   ${themes}
                 </td></tr>`
              : ""
          }
          ${
            articles
              ? `<tr><td style="padding:8px 8px 0">
                   <div style="font:bold 11px -apple-system,Helvetica,Arial,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;margin:8px 16px 0">Today's articles</div>
                   <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${articles}</table>
                 </td></tr>`
              : ""
          }
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid ${RULE}">
              <div style="font:bold 11px -apple-system,Helvetica,Arial,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;margin:8px 0 8px">Source health</div>
              <div>${health.map(healthPill).join("")}</div>
              <div style="font:11px -apple-system,Helvetica,Arial,sans-serif;color:#9ca3af;margin-top:12px">Ranked by mineral relevance, friction relevance, source authority, recency and magnitude. Full rubric in the repo README.</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function buildDigestText({ dateLabel, ranked, health }) {
  const lines = [`THE FRICTION LINE — ${dateLabel}`, ""];

  if (ranked.length === 0) {
    lines.push("No developments crossed the threshold today.");
  } else {
    lines.push(`${ranked.length} development(s) made the cut today.`, "");

    const both = ranked.filter((r) => r.scored.tags.includes("minerals") && r.scored.tags.includes("friction"));
    const mineralsOnly = ranked.filter((r) => r.scored.tags.includes("minerals") && !r.scored.tags.includes("friction"));
    const frictionOnly = ranked.filter((r) => r.scored.tags.includes("friction") && !r.scored.tags.includes("minerals"));

    lines.push("KEY THEMES");
    for (const [label, group, keywords] of [
      ["Where they overlap", both, [...MINERAL_KEYWORDS, ...FRICTION_KEYWORDS]],
      ["Minerals", mineralsOnly, MINERAL_KEYWORDS],
      ["Friction", frictionOnly, FRICTION_KEYWORDS],
    ]) {
      if (group.length === 0) continue;
      const terms = trendingTerms(group, keywords);
      lines.push(
        `- ${label}: ${group.length} stor${group.length === 1 ? "y" : "ies"}${terms.length ? ` (trending: ${terms.join(", ")})` : ""} — led by "${group[0].item.title}"`,
      );
    }
    lines.push("");

    lines.push("TODAY'S ARTICLES");
    for (const { item } of ranked) {
      lines.push(`${item.title} — ${byline(item)}`);
      lines.push(item.link);
      if (item.summary) lines.push(item.summary.slice(0, 240));
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
