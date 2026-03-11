/**
 * Semantic content hashing for stable identity.
 *
 * Two items with equivalent meaning should produce the same semanticId
 * regardless of which extractor found them or how they were phrased.
 *
 * Algorithm:
 *   1. Canonicalize the summary (lowercase, strip stop words, normalize verbs)
 *   2. Sort tokens alphabetically (order-independent)
 *   3. FNV-1a 32-bit hash of the sorted token string
 *   4. Prefix with kind initial: "d-a3f7c012" for a decision
 *
 * FNV-1a was chosen for: simplicity, no dependencies, good distribution,
 * deterministic across platforms.
 */

import type { ItemKind } from "../types.js";

// ---------------------------------------------------------------------------
// Stop words and verb normalization
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "to", "for", "of", "in", "on", "at", "by", "with", "from",
  "and", "or", "but", "not", "no", "so", "if", "then", "than",
  "that", "this", "it", "its", "we", "our", "they", "their",
  "will", "would", "should", "could", "can", "may", "might",
  "do", "does", "did", "has", "have", "had",
]);

const VERB_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/\busing\b/g, "use"],
  [/\bbuilding\b/g, "build"],
  [/\bwriting\b/g, "write"],
  [/\bcreating\b/g, "create"],
  [/\bimplementing\b/g, "implement"],
  [/\badding\b/g, "add"],
  [/\brunning\b/g, "run"],
  [/\bmaking\b/g, "make"],
  [/\bsending\b/g, "send"],
  [/\bstoring\b/g, "store"],
  [/\bswitching\b/g, "switch"],
  [/\bchanging\b/g, "change"],
  [/\breplacing\b/g, "replace"],
  [/\bremoving\b/g, "remove"],
  [/\bupdating\b/g, "update"],
];

// ---------------------------------------------------------------------------
// Canonicalization — single source of truth
// ---------------------------------------------------------------------------

/**
 * Canonicalize text for semantic comparison.
 * Lowercase, strip stop words, normalize verb forms, collapse whitespace.
 */
export function canonicalize(text: string): string {
  let result = text.toLowerCase();

  // Normalize verb forms
  for (const [pattern, replacement] of VERB_NORMALIZATIONS) {
    result = result.replace(pattern, replacement);
  }

  // Strip stop words
  result = result
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
    .join(" ");

  // Collapse whitespace and trim
  return result.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// FNV-1a 32-bit hash
// ---------------------------------------------------------------------------

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * FNV-1a 32-bit hash. Deterministic, no dependencies.
 * Returns unsigned 32-bit integer.
 */
export function fnv1a32(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0; // >>> 0 keeps it unsigned 32-bit
  }
  return hash >>> 0;
}

// ---------------------------------------------------------------------------
// Semantic ID
// ---------------------------------------------------------------------------

/** Kind prefix map — single char per kind for compact IDs. */
const KIND_PREFIX: Record<string, string> = {
  fact: "f",
  preference: "p",
  goal: "g",
  decision: "d",
  hypothesis: "h",
  rejected_option: "r",
  open_question: "q",
  task: "t",
  dependency: "dep",
  risk: "rsk",
  constraint: "c",
  artifact: "a",
};

/**
 * Generate a stable semantic ID from kind + summary.
 *
 * Same meaning → same ID, regardless of extractor or phrasing order.
 * Format: `<prefix>-<8-char hex hash>` e.g. `d-a3f7c012`
 */
export function semanticId(kind: ItemKind | string, summary: string): string {
  const prefix = KIND_PREFIX[kind] ?? kind.charAt(0);
  const canonical = canonicalize(summary);
  const tokens = canonical.split(/\s+/).filter(Boolean).sort().join(" ");
  const hash = fnv1a32(tokens);
  return `${prefix}-${hash.toString(16).padStart(8, "0")}`;
}
