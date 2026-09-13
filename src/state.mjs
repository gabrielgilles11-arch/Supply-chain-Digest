/**
 * Two small JSON files, both committed back to the repo by the workflow —
 * no database for something this small.
 *
 * seen.json: cross-run de-duplication. A feed re-lists the same story for
 * days; without memory, the digest would too.
 *
 * history.json: a rolling log of what was actually mailed (title, tags,
 * link, date) — separate from seen.json because it answers a different
 * question. seen.json says "don't show this again"; history.json is what
 * analysis.mjs reads to talk about a real trend across the past week
 * ("third gallium story in four days") instead of inventing one.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const STATE_PATH = path.join(import.meta.dirname, "state", "seen.json");
const HISTORY_PATH = path.join(import.meta.dirname, "state", "history.json");
const RETENTION_DAYS = 14;
const HISTORY_MAX_ENTRIES = 200;

export function hashItem(item) {
  const normalized = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return createHash("sha256").update(`${item.sourceId}:${normalized}`).digest("hex").slice(0, 16);
}

export function loadSeen() {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

/** Drops entries older than the retention window so the file doesn't grow forever. */
export function pruneAndSave(seen, newHashes, now = new Date()) {
  const cutoff = now.getTime() - RETENTION_DAYS * 24 * 3_600_000;
  const merged = { ...seen };
  for (const hash of newHashes) merged[hash] = now.toISOString();

  const kept = Object.fromEntries(Object.entries(merged).filter(([, seenAt]) => new Date(seenAt).getTime() >= cutoff));

  mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(kept, null, 2) + "\n");
  return kept;
}

export function loadHistory() {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(HISTORY_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Appends today's mailed items, drops anything past the retention window, and caps total length. */
export function appendHistoryAndSave(history, rankedEntries, now = new Date()) {
  const cutoff = now.getTime() - RETENTION_DAYS * 24 * 3_600_000;
  const todays = rankedEntries.map(({ item, scored }) => ({
    date: now.toISOString(),
    title: item.title,
    link: item.link,
    tags: scored.tags,
  }));

  const merged = [...history, ...todays]
    .filter((entry) => new Date(entry.date).getTime() >= cutoff)
    .slice(-HISTORY_MAX_ENTRIES);

  mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  writeFileSync(HISTORY_PATH, JSON.stringify(merged, null, 2) + "\n");
  return merged;
}
