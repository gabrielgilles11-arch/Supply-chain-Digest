/**
 * The one part of this pipeline that isn't a keyword rule: a single daily
 * Claude call that reads today's qualifying stories plus the last week's
 * history and writes the analyst-voice prose a keyword rubric structurally
 * can't — an outlook paragraph, a one-line headline per theme, and a short
 * "why it matters / where it's headed" blurb per story.
 *
 * Dormant by default, the same way the paywall in the sibling Convi app is
 * dormant rather than half-built: no ANTHROPIC_API_KEY, no call, no error —
 * `generateAnalysis` returns null and render.mjs falls back to the plain
 * rule-based text it always had. Flipping this on later is adding one
 * secret, not a rewrite.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 30_000;

function buildPrompt({ ranked, history }) {
  const stories = ranked
    .map(({ item, scored }, i) => `[${i}] (${scored.tags.join("+") || "none"}) "${item.title}" — ${item.publisher ?? item.sourceName}\n${item.summary ?? ""}`)
    .join("\n\n");

  const recentTitles = history
    .filter((h) => Date.now() - new Date(h.date).getTime() <= 7 * 24 * 3_600_000)
    .map((h) => `- ${h.title}`)
    .join("\n") || "(no history yet)";

  return `You are writing the analysis section of a daily intelligence digest on ONE beat: mineral supply chains and transatlantic trade friction (tariffs, export controls, investment screening, critical minerals policy between the US, EU and China).

TODAY'S QUALIFYING STORIES (index, tags, headline, publisher, summary):
${stories}

STORIES FROM THE PAST 7 DAYS (for trend context — reference these only if a real pattern connects them to today; don't force a connection that isn't there):
${recentTitles}

Write in a measured geopolitical-risk-analyst register: hedge appropriately ("likely," "worth watching," "if X follows through"), never invent a fact not in the material above, and never state a prediction as certain.

Respond with ONLY a JSON object (no markdown fences, no commentary before or after), matching exactly this shape:
{
  "outlook": "3-5 sentences on where this beat is heading, grounded in today's stories and, where a real pattern exists, the past week's.",
  "themeHeadlines": { "both": "short punchy headline or empty string if no story has both tags", "minerals": "short punchy headline or empty string if none", "friction": "short punchy headline or empty string if none" },
  "storyBlurbs": { "0": "2-3 sentence analyst paragraph on why this story matters and what to watch next", "1": "...", "...": "one entry per story index above" }
}`;
}

async function callClaude(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  } finally {
    clearTimeout(timer);
  }
}

/** Strips a markdown code fence if the model added one despite being told not to. */
export function parseAnalysisResponse(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const parsed = JSON.parse(cleaned);
  if (typeof parsed.outlook !== "string" || typeof parsed.themeHeadlines !== "object" || typeof parsed.storyBlurbs !== "object") {
    throw new Error("Analysis response missing required fields");
  }
  return parsed;
}

/**
 * Returns { outlook, themeHeadlines, storyBlurbs } or null — null whenever
 * there's no key, no stories to analyze, or the call/parse fails for any
 * reason. Every failure mode falls back silently; a broken analysis layer
 * must never break the digest itself.
 */
export async function generateAnalysis({ ranked, history }) {
  if (!process.env.ANTHROPIC_API_KEY || ranked.length === 0) return null;
  try {
    const raw = await callClaude(buildPrompt({ ranked, history }));
    return parseAnalysisResponse(raw);
  } catch (err) {
    console.error(`Analysis generation failed, falling back to rule-based text: ${err.message}`);
    return null;
  }
}
