/**
 * claude-memories adapter — promotes stable session state to durable memory.
 *
 * Advisory mode: suggests updates, does not auto-write.
 * The caller decides which suggestions to apply.
 *
 * Integration:
 *   const suggestions = suggestMemoryUpdates(session);
 *   // Review suggestions, then apply selected ones:
 *   for (const s of suggestions.filter(s => s.approved)) {
 *     applyMemoryUpdate(s, memoryDir);
 *   }
 */

import type { MemoryItem, MemoryDelta } from "../types.js";
import { activeDecisions, activeConstraints, queryItems } from "../state.js";
import type { Session } from "../session.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemoryUpdateAction = "create" | "update" | "supersede";

export interface MemoryUpdateSuggestion {
  /** What action to take. */
  action: MemoryUpdateAction;
  /** Item that drives this suggestion. */
  item: MemoryItem;
  /** Suggested memory type (maps to claude-memories frontmatter). */
  memoryType: "project" | "reference" | "feedback" | "user";
  /** Suggested file name (kebab-case, no extension). */
  fileName: string;
  /** Suggested frontmatter. */
  frontmatter: MemoryFrontmatter;
  /** Suggested file content (markdown body). */
  content: string;
  /** Suggested MEMORY.md line. */
  indexLine: string;
  /** Why this was suggested. */
  reason: string;
  /** Confidence in this suggestion. */
  confidence: "high" | "medium" | "low";
}

export interface MemoryFrontmatter {
  name: string;
  description: string;
  type: "project" | "reference" | "feedback" | "user";
}

export interface MemorySuggestionOptions {
  /** Only suggest items with this minimum confidence. Default: "high" */
  minConfidence?: "low" | "medium" | "high" | "certain";
  /** Only suggest items with at least this many source turns. Default: 2 */
  minSourceTurns?: number;
  /** Exclude items with these tags. Default: ["branch"] */
  excludeTags?: string[];
  /** Include superseded items as supersession suggestions. Default: false */
  includeSuperSeded?: boolean;
}

// ---------------------------------------------------------------------------
// Suggestion engine
// ---------------------------------------------------------------------------

const CONFIDENCE_ORDER = ["low", "medium", "high", "certain"] as const;

function confidenceAtLeast(
  actual: string,
  minimum: string,
): boolean {
  return CONFIDENCE_ORDER.indexOf(actual as typeof CONFIDENCE_ORDER[number]) >=
    CONFIDENCE_ORDER.indexOf(minimum as typeof CONFIDENCE_ORDER[number]);
}

/**
 * Generate advisory memory update suggestions from session state.
 * Does NOT write anything — returns suggestions for human review.
 */
export function suggestMemoryUpdates(
  session: Session,
  opts: MemorySuggestionOptions = {},
): MemoryUpdateSuggestion[] {
  const state = session.state();
  const minConf = opts.minConfidence ?? "high";
  const minTurns = opts.minSourceTurns ?? 2;
  const excludeTags = new Set(opts.excludeTags ?? ["branch"]);
  const suggestions: MemoryUpdateSuggestion[] = [];

  // Collect promotable items
  const candidates = [...state.items.values()].filter((item) => {
    // Must meet confidence threshold
    if (!confidenceAtLeast(item.confidence, minConf)) return false;

    // Must have enough provenance
    if (item.sourceTurns.length < minTurns) return false;

    // Exclude tagged items
    if (item.tags?.some((t) => excludeTags.has(t))) return false;

    // Only active items (tentative/superseded are too volatile)
    if (item.status !== "active" && item.status !== "resolved") return false;

    return true;
  });

  for (const item of candidates) {
    const suggestion = itemToSuggestion(item);
    if (suggestion) suggestions.push(suggestion);
  }

  // Superseded items → suggest marking as superseded in memory
  if (opts.includeSuperSeded) {
    const superseded = [...state.items.values()].filter(
      (i) => i.status === "superseded",
    );
    for (const item of superseded) {
      suggestions.push({
        action: "supersede",
        item,
        memoryType: "project",
        fileName: toFileName(item),
        frontmatter: {
          name: item.summary,
          description: `[SUPERSEDED] ${item.summary}`,
          type: "project",
        },
        content: `${item.summary}\n\n**Status:** Superseded\n**Source turns:** ${item.sourceTurns.map((s) => s.turnId).join(", ")}`,
        indexLine: `[SUPERSEDED] ${item.summary} → \`memory/${toFileName(item)}.md\``,
        reason: `Item ${item.id} was superseded during session`,
        confidence: "high",
      });
    }
  }

  return suggestions;
}

/**
 * Render a suggestion as a complete memory file content (frontmatter + body).
 */
export function renderMemoryFile(suggestion: MemoryUpdateSuggestion): string {
  const fm = suggestion.frontmatter;
  return [
    "---",
    `name: ${fm.name}`,
    `description: ${fm.description}`,
    `type: ${fm.type}`,
    "---",
    "",
    suggestion.content,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function itemToSuggestion(item: MemoryItem): MemoryUpdateSuggestion | null {
  const memoryType = kindToMemoryType(item.kind);
  if (!memoryType) return null;

  const fileName = toFileName(item);
  const description = truncate(item.summary, 100);
  const sourceTurns = item.sourceTurns.map((s) => s.turnId).join(", ");

  return {
    action: "create",
    item,
    memoryType,
    fileName,
    frontmatter: {
      name: item.summary,
      description: `${item.kind}: ${description}`,
      type: memoryType,
    },
    content: [
      `# ${item.summary}`,
      "",
      `**Kind:** ${item.kind}`,
      `**Status:** ${item.status}`,
      `**Confidence:** ${item.confidence}`,
      `**Source turns:** ${sourceTurns}`,
      ...(item.tags?.length ? [`**Tags:** ${item.tags.join(", ")}`] : []),
    ].join("\n"),
    indexLine: `${item.summary} → \`memory/${fileName}.md\``,
    reason: `${item.kind} with ${item.sourceTurns.length} source turns, confidence: ${item.confidence}`,
    confidence: item.confidence === "certain" || item.confidence === "high" ? "high" : "medium",
  };
}

function kindToMemoryType(kind: MemoryItem["kind"]): MemoryUpdateSuggestion["memoryType"] | null {
  switch (kind) {
    case "decision":
    case "goal":
    case "constraint":
    case "task":
      return "project";
    case "fact":
      return "reference";
    default:
      // hypothesis, rejected_option, open_question, etc. — not promotable
      return null;
  }
}

function toFileName(item: MemoryItem): string {
  return item.summary
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 3) + "...";
}
