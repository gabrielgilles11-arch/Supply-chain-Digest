/**
 * The digest email. Table-based and inline-styled throughout — no <style>
 * block, no flexbox/grid, no external fonts — because Outlook renders with
 * Word's engine, not a browser, and anything fancier than that silently
 * breaks there. Every color is inline for the same reason.
 */

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

/** Green at a strong score, amber in the middle, gray near the qualifying line — a glance tells you which items are the real signal. */
function scoreColor(total) {
  if (total >= 10) return { bg: "#16a34a", fg: "#ffffff" };
  if (total >= 7) return { bg: AMBER, fg: "#ffffff" };
  return { bg: "#9ca3af", fg: "#ffffff" };
}

function byline(item) {
  return item.publisher ?? item.sourceName;
}

function renderCard({ item, scored }) {
  const tag = tagFor(scored.tags);
  const score = scoreColor(scored.total);
  const summary = (item.summary ?? "").slice(0, 220);

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
    <tr>
      <td width="44" valign="top" style="padding:16px 0 16px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="32" height="32" align="center" valign="middle"
          style="width:32px;height:32px;border-radius:16px;background:${score.bg};color:${score.fg};font:bold 14px -apple-system,Helvetica,Arial,sans-serif;">
          ${scored.total}
        </td></tr></table>
      </td>
      <td valign="top" style="padding:16px 16px 16px 12px;border-left:1px solid ${RULE}">
        <span style="display:inline-block;background:${tag.bg};color:${tag.fg};font:bold 11px -apple-system,Helvetica,Arial,sans-serif;padding:3px 8px;border-radius:10px;letter-spacing:.02em">${tag.label}</span>
        <div style="font:bold 17px/1.35 Georgia,'Times New Roman',serif;color:${INK};margin:8px 0 4px">
          ${escapeHtml(item.title)}
        </div>
        <div style="font:12px -apple-system,Helvetica,Arial,sans-serif;color:${MUTED};margin-bottom:6px">
          ${escapeHtml(byline(item))}
        </div>
        ${summary ? `<div style="font:14px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#374151;margin-bottom:10px">${escapeHtml(summary)}${item.summary?.length > 220 ? "…" : ""}</div>` : ""}
        <a href="${escapeHtml(item.link)}" style="font:bold 12px -apple-system,Helvetica,Arial,sans-serif;color:${AMBER};text-decoration:none">Read the full story →</a>
        <div style="font:11px -apple-system,Helvetica,Arial,sans-serif;color:#9ca3af;margin-top:8px">
          minerals ${scored.mineral}/4 · friction ${scored.friction}/4 · source ${scored.authority}/3 · recency ${scored.recency}/2 · magnitude ${scored.magnitude}/2
        </div>
      </td>
    </tr>
  </table>`;
}

function openingLine(ranked) {
  if (ranked.length === 0) return "Nothing cleared the bar today — a quiet day on the beat.";
  const top = ranked[0];
  const plural = ranked.length === 1 ? "development" : "developments";
  return `${ranked.length} ${plural} today. Top of the stack: <strong>${escapeHtml(top.item.title)}</strong>.`;
}

function healthPill(h) {
  const ok = h.ok;
  const bg = ok ? "#dcfce7" : "#fee2e2";
  const fg = ok ? "#166534" : "#991b1b";
  const label = ok ? `${escapeHtml(h.name)} · ${h.count}` : `${escapeHtml(h.name)} · failed`;
  return `<span style="display:inline-block;background:${bg};color:${fg};font:11px -apple-system,Helvetica,Arial,sans-serif;padding:3px 8px;border-radius:10px;margin:2px 4px 2px 0">${ok ? "✓" : "✗"} ${label}</span>`;
}

export function buildDigestHtml({ dateLabel, ranked, health }) {
  const cards = ranked.length > 0 ? ranked.map(renderCard).join("") : `<p style="color:${MUTED};font:14px -apple-system,Helvetica,Arial,sans-serif;padding:0 16px">Check back tomorrow.</p>`;

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
              ${openingLine(ranked)}
            </td>
          </tr>
          <tr><td style="padding:16px 8px 0">${cards}</td></tr>
          <tr>
            <td style="padding:8px 24px 24px;border-top:1px solid ${RULE}">
              <div style="font:bold 11px -apple-system,Helvetica,Arial,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;margin:16px 0 8px">Source health</div>
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
    for (const { item, scored } of ranked) {
      const tag = tagFor(scored.tags).label.replace(/^\W+\s*/u, "");
      lines.push(`[${scored.total}] ${tag} · ${byline(item)}`);
      lines.push(item.title);
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
