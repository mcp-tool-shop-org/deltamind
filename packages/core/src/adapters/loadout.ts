/**
 * ai-loadout adapter — exports DeltaMind working set as a loadout session layer.
 *
 * This closes the loop between preloaded context (ai-loadout) and
 * runtime-learned context (DeltaMind). The session layer sits at the
 * top of the loadout stack and contains the live working set.
 *
 * Integration:
 *   const entries = toLoadoutEntries(session);
 *   const index = toLoadoutIndex(session);
 *   // Write index to .claude/loadout/session-index.json
 *   // ai-loadout's resolveLoadout() picks it up as the session layer
 */

import type { ActiveContextState, MemoryItem } from "../types.js";
import {
  activeDecisions,
  activeConstraints,
  openTasks,
  unresolvedBranches,
  queryItems,
} from "../state.js";
import type { Session } from "../session.js";

// ---------------------------------------------------------------------------
// Loadout-compatible types (mirrors ai-loadout's LoadoutEntry + LoadoutIndex)
// These are structural copies — no dependency on ai-loadout package.
// ---------------------------------------------------------------------------

export interface LoadoutEntry {
  id: string;
  path: string;
  keywords: string[];
  patterns: string[];
  priority: "core" | "domain" | "manual";
  summary: string;
  triggers: { task: boolean; plan: boolean; edit: boolean };
  tokens_est: number;
  lines: number;
}

export interface LoadoutBudget {
  always_loaded_est: number;
  on_demand_total_est: number;
  avg_task_load_est: number;
  avg_task_load_observed: number | null;
}

export interface LoadoutIndex {
  version: string;
  generated: string;
  entries: LoadoutEntry[];
  budget: LoadoutBudget;
  source: string;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface LoadoutAdapterOptions {
  /** Base path for generated payload files. Default: ".deltamind" */
  basePath?: string;
  /** Include recent deltas as a separate entry. Default: true */
  includeRecentDeltas?: boolean;
  /** Max recent deltas to include. Default: 10 */
  recentDeltaCount?: number;
  /** Priority for constraint entries. Default: "core" */
  constraintPriority?: "core" | "domain";
  /** Priority for decision entries. Default: "core" */
  decisionPriority?: "core" | "domain";
  /** Priority for task entries. Default: "domain" */
  taskPriority?: "core" | "domain";
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Convert DeltaMind session state into loadout entries.
 * Each active category becomes a loadout entry.
 */
export function toLoadoutEntries(
  session: Session,
  opts: LoadoutAdapterOptions = {},
): LoadoutEntry[] {
  const state = session.state();
  const basePath = opts.basePath ?? ".deltamind";
  const entries: LoadoutEntry[] = [];

  // Constraints → core priority (guardrails always loaded)
  const constraints = activeConstraints(state);
  if (constraints.length > 0) {
    entries.push(itemsToEntry({
      id: "deltamind-constraints",
      items: constraints,
      category: "Active Constraints",
      path: `${basePath}/constraints.md`,
      priority: opts.constraintPriority ?? "core",
      keywords: ["constraint", "limit", "requirement", "rule"],
      patterns: ["constraint_check"],
    }));
  }

  // Decisions → core priority
  const decisions = activeDecisions(state);
  if (decisions.length > 0) {
    entries.push(itemsToEntry({
      id: "deltamind-decisions",
      items: decisions,
      category: "Active Decisions",
      path: `${basePath}/decisions.md`,
      priority: opts.decisionPriority ?? "core",
      keywords: ["decision", "choice", "chose", "selected"],
      patterns: ["decision_context"],
    }));
  }

  // Goals
  const goals = queryItems(state, { kind: "goal", status: "active" });
  if (goals.length > 0) {
    entries.push(itemsToEntry({
      id: "deltamind-goals",
      items: goals,
      category: "Active Goals",
      path: `${basePath}/goals.md`,
      priority: "core",
      keywords: ["goal", "objective", "target"],
      patterns: ["goal_context"],
    }));
  }

  // Tasks → domain priority
  const tasks = openTasks(state);
  if (tasks.length > 0) {
    entries.push(itemsToEntry({
      id: "deltamind-tasks",
      items: tasks,
      category: "Open Tasks",
      path: `${basePath}/tasks.md`,
      priority: opts.taskPriority ?? "domain",
      keywords: ["task", "todo", "work", "pending"],
      patterns: ["task_tracking"],
    }));
  }

  // Branches / hypotheses → domain priority
  const branches = unresolvedBranches(state);
  if (branches.length > 0) {
    entries.push(itemsToEntry({
      id: "deltamind-branches",
      items: branches,
      category: "Unresolved Branches",
      path: `${basePath}/branches.md`,
      priority: "domain",
      keywords: ["branch", "alternative", "option", "hypothesis"],
      patterns: ["branch_resolution"],
    }));
  }

  // Recent deltas → domain priority
  if (opts.includeRecentDeltas !== false) {
    const count = opts.recentDeltaCount ?? 10;
    const recentDeltas = state.deltaLog.slice(-count);
    if (recentDeltas.length > 0) {
      const deltaText = recentDeltas
        .map((d) => {
          const sum = "summary" in d ? (d as { summary: string }).summary : d.kind;
          return `- ${d.kind}: ${sum}`;
        })
        .join("\n");
      const tokens = Math.ceil(deltaText.length / 4);

      entries.push({
        id: "deltamind-recent",
        path: `${basePath}/recent.md`,
        keywords: ["recent", "changed", "update", "delta"],
        patterns: ["recent_changes"],
        priority: "domain",
        summary: `Last ${recentDeltas.length} state changes`,
        triggers: { task: true, plan: true, edit: false },
        tokens_est: tokens,
        lines: recentDeltas.length,
      });
    }
  }

  return entries;
}

/**
 * Generate a full loadout index from the session.
 * This can be written to disk as the session layer index.
 */
export function toLoadoutIndex(
  session: Session,
  opts: LoadoutAdapterOptions = {},
): LoadoutIndex {
  const entries = toLoadoutEntries(session, opts);
  const coreTokens = entries
    .filter((e) => e.priority === "core")
    .reduce((sum, e) => sum + e.tokens_est, 0);
  const domainTokens = entries
    .filter((e) => e.priority === "domain")
    .reduce((sum, e) => sum + e.tokens_est, 0);

  return {
    version: "1.0.0",
    generated: new Date().toISOString(),
    source: "deltamind-session",
    entries,
    budget: {
      always_loaded_est: coreTokens,
      on_demand_total_est: domainTokens,
      avg_task_load_est: coreTokens + Math.ceil(domainTokens * 0.5),
      avg_task_load_observed: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function itemsToEntry(opts: {
  id: string;
  items: MemoryItem[];
  category: string;
  path: string;
  priority: "core" | "domain" | "manual";
  keywords: string[];
  patterns: string[];
}): LoadoutEntry {
  const text = opts.items
    .map((item) => {
      const conf = item.confidence !== "high" ? ` [${item.confidence}]` : "";
      return `- [${item.id}] ${item.summary}${conf}`;
    })
    .join("\n");

  const summary = `${opts.items.length} ${opts.category.toLowerCase()} from session`;

  return {
    id: opts.id,
    path: opts.path,
    keywords: [
      ...opts.keywords,
      ...extractItemKeywords(opts.items),
    ],
    patterns: opts.patterns,
    priority: opts.priority,
    summary,
    triggers: { task: true, plan: true, edit: false },
    tokens_est: Math.ceil(text.length / 4),
    lines: opts.items.length,
  };
}

/** Extract meaningful keywords from item summaries. */
function extractItemKeywords(items: MemoryItem[]): string[] {
  const stopwords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "must", "for", "and", "but",
    "or", "nor", "not", "so", "yet", "both", "with", "from", "into",
    "to", "of", "in", "on", "at", "by", "up", "out", "off", "over",
    "this", "that", "it", "its", "all", "each", "every", "no", "any",
    "use", "using", "used",
  ]);

  const words = new Set<string>();
  for (const item of items) {
    const tokens = item.summary.toLowerCase().split(/\W+/).filter((w) => w.length >= 3);
    for (const t of tokens) {
      if (!stopwords.has(t)) words.add(t);
    }
  }
  return [...words].slice(0, 20); // cap at 20 keywords
}
