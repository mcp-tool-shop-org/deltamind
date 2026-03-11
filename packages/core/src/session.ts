/**
 * DeltaMind Session — the runtime loop.
 *
 * Ingests turns incrementally, runs the full pipeline on each batch,
 * and exposes the live working set for context injection.
 *
 * Usage:
 *   const session = createSession({ provider });
 *   session.ingest({ turnId: "t-1", role: "user", content: "..." });
 *   session.ingest({ turnId: "t-2", role: "assistant", content: "..." });
 *   const result = await session.process();
 *   const ctx = session.exportContext({ maxChars: 2000 });
 */

import type { ActiveContextState, MemoryDelta, MemoryItem } from "./types.js";
import { createState, activeDecisions, activeConstraints, openTasks, unresolvedBranches, supersededItems, changedSince, queryItems } from "./state.js";
import { reconcile } from "./reconciler.js";
import { gateBatch } from "./extractor/event-gate.js";
import { extract as ruleExtract } from "./extractor/delta-extractor.js";
import { runLlmPipeline } from "./extractor/llm-pipeline.js";
import { normalize } from "./extractor/normalizer.js";
import { runPipeline } from "./extractor/pipeline.js";
import type { Turn, CandidateDelta, PipelineResult } from "./extractor/types.js";
import type { LlmProvider } from "./extractor/llm-provider.js";
import { checkModelPolicy, DEFAULT_MODEL } from "./extractor/model-policy.js";
import { createOllamaProvider } from "./extractor/llm-provider.js";
import { createSnapshot, restoreState } from "./storage/snapshot.js";
import { createProvenanceWriter } from "./storage/provenance-log.js";
import type { StateSnapshot } from "./storage/snapshot.js";
import type { ProvenanceWriter } from "./storage/provenance-log.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionOptions {
  /** LLM provider. If omitted, resolved from model/baseUrl or auto-detected. */
  provider?: LlmProvider;
  /** Ollama model name. Resolved via model policy. Ignored if provider is set. */
  model?: string;
  /** Ollama base URL. Default: http://localhost:11434 */
  baseUrl?: string;
  /** Use hybrid mode (LLM + rule-based). Default: true */
  hybridMode?: boolean;
  /** Process turns in batches of this size. 0 = all pending. Default: 0 */
  batchSize?: number;
  /** Restore from a previously saved snapshot. */
  snapshot?: StateSnapshot;
  /**
   * Force rule-based only extraction (no LLM). Useful for debugging/evals.
   * Overrides provider, model, and auto-detect. Default: false
   */
  forceRuleOnly?: boolean;
  /**
   * Auto-detect Ollama and use gemma2:9b if available. Default: false
   * When true, probes Ollama on first process() and uses gemma2:9b if found.
   * Falls back to rule-based silently if Ollama is unavailable.
   * Ignored if forceRuleOnly is true or provider is set.
   */
  autoDetect?: boolean;
}

export interface ProcessResult {
  /** Pipeline result from this batch. */
  pipeline: PipelineResult;
  /** Number of turns processed in this batch. */
  turnsProcessed: number;
  /** Total turns ingested so far. */
  totalTurns: number;
  /** Whether there are more pending turns to process. */
  hasMore: boolean;
}

export interface ContextExport {
  /** Active goals. */
  goals: MemoryItem[];
  /** Active decisions (current, not superseded). */
  decisions: MemoryItem[];
  /** Active constraints. */
  constraints: MemoryItem[];
  /** Open tasks. */
  tasks: MemoryItem[];
  /** Unresolved branches / hypotheses. */
  branches: MemoryItem[];
  /** Recent deltas (newest first). */
  recentDeltas: MemoryDelta[];
  /** Items changed since last export (if tracked). */
  changed: MemoryItem[];
  /** Total items in state. */
  totalItems: number;
  /** Rendered text for context injection. */
  text: string;
  /** Character count of rendered text. */
  chars: number;
}

export interface ContextExportOptions {
  /** Max characters for the exported text. Default: 4000 */
  maxChars?: number;
  /** How many recent deltas to include. Default: 10 */
  recentDeltaCount?: number;
  /** Only include items changed since this ISO timestamp. */
  since?: string;
  /** Include superseded items. Default: false */
  includeSuperSeded?: boolean;
}

export interface SessionStats {
  totalTurns: number;
  totalItems: number;
  totalDeltas: number;
  seq: number;
  processCount: number;
  activeDecisions: number;
  activeConstraints: number;
  openTasks: number;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface Session {
  /** Add a turn to the pending queue. */
  ingest(turn: Turn): void;
  /** Add multiple turns. */
  ingestBatch(turns: Turn[]): void;
  /** Process pending turns through the pipeline. */
  process(): Promise<ProcessResult>;
  /** Export the current working set for context injection. */
  exportContext(opts?: ContextExportOptions): ContextExport;
  /** Get the raw state (for advanced use). */
  state(): ActiveContextState;
  /** Get session stats. */
  stats(): SessionStats;
  /** Query items by filter. */
  query(filter: { kind?: MemoryItem["kind"]; status?: MemoryItem["status"]; tag?: string }): MemoryItem[];
  /** Create a state snapshot for persistence. */
  save(): StateSnapshot;
  /** Get the provenance writer (for accessing event log). */
  provenance(): ProvenanceWriter;
}

export function createSession(opts: SessionOptions = {}): Session {
  // Restore from snapshot or create fresh
  const state = opts.snapshot ? restoreState(opts.snapshot) : createState();
  const pending: Turn[] = [];
  const allTurns: Turn[] = [];
  let processCount = 0;
  let nextId = opts.snapshot ? opts.snapshot.seq + 1 : 1;
  let lastExportTime: string | undefined;

  // Provenance recorder
  const prov = createProvenanceWriter();

  // Resolve provider (sync — auto-detect happens lazily on first process())
  let provider: LlmProvider | undefined = opts.forceRuleOnly ? undefined : resolveProvider(opts);
  let autoDetectAttempted = false;
  const hybridMode = opts.hybridMode ?? true;
  const batchSize = opts.batchSize ?? 0;

  function ingest(turn: Turn): void {
    pending.push(turn);
    allTurns.push(turn);
  }

  function ingestBatch(turns: Turn[]): void {
    for (const t of turns) ingest(t);
  }

  async function process(): Promise<ProcessResult> {
    if (pending.length === 0) {
      return {
        pipeline: emptyPipeline(state),
        turnsProcessed: 0,
        totalTurns: allTurns.length,
        hasMore: false,
      };
    }

    // Auto-detect Ollama on first process() if no provider yet and autoDetect is on
    if (!provider && !autoDetectAttempted && !opts.forceRuleOnly && opts.autoDetect === true) {
      autoDetectAttempted = true;
      provider = await tryAutoDetect(opts.baseUrl);
    }

    // Determine batch
    const batch = batchSize > 0 ? pending.splice(0, batchSize) : pending.splice(0);

    let pipeline: PipelineResult;

    if (provider) {
      // LLM pipeline
      pipeline = await runLlmPipeline(batch, {
        provider,
        initialState: state,
        nextId,
        hybridMode,
      });
    } else {
      // Rule-based only
      pipeline = runPipeline(batch, {
        initialState: state,
        nextId,
      });
    }

    // Advance nextId past whatever was emitted
    const maxEmitted = maxIdFromCandidates(pipeline.candidates);
    if (maxEmitted >= nextId) {
      nextId = maxEmitted + 1;
    }

    // Record provenance
    for (const c of pipeline.accepted) {
      prov.writeAccepted({
        seq: state.seq,
        timestamp: c.delta.timestamp,
        delta: c.delta,
        resultingStatus: "active",
        itemId: "id" in c.delta ? (c.delta as { id: string }).id : ("targetId" in c.delta ? (c.delta as { targetId: string }).targetId : "unknown"),
      });
    }
    for (const r of pipeline.rejected) {
      prov.writeRejected(r.candidate.delta, r.reason, state.seq);
    }

    processCount++;

    return {
      pipeline,
      turnsProcessed: batch.length,
      totalTurns: allTurns.length,
      hasMore: pending.length > 0,
    };
  }

  function exportContext(exportOpts: ContextExportOptions = {}): ContextExport {
    const maxChars = exportOpts.maxChars ?? 4000;
    const recentDeltaCount = exportOpts.recentDeltaCount ?? 10;
    const since = exportOpts.since ?? lastExportTime;

    const goals = queryItems(state, { kind: "goal", status: "active" });
    const decisions = activeDecisions(state);
    const constraints = activeConstraints(state);
    const tasks = openTasks(state);
    const branches = unresolvedBranches(state);
    const changed = since ? changedSince(state, since) : [];

    // Recent deltas (newest first)
    const recentDeltas = state.deltaLog.slice(-recentDeltaCount).reverse();

    // Render text
    const text = renderContext({
      goals, decisions, constraints, tasks, branches,
      recentDeltas, changed, maxChars,
      includeSuperSeded: exportOpts.includeSuperSeded,
      state,
    });

    lastExportTime = new Date().toISOString();

    return {
      goals,
      decisions,
      constraints,
      tasks,
      branches,
      recentDeltas,
      changed,
      totalItems: state.items.size,
      text,
      chars: text.length,
    };
  }

  return {
    ingest,
    ingestBatch,
    process,
    exportContext,
    state: () => state,
    stats: () => ({
      totalTurns: allTurns.length,
      totalItems: state.items.size,
      totalDeltas: state.deltaLog.length,
      seq: state.seq,
      processCount,
      activeDecisions: activeDecisions(state).length,
      activeConstraints: activeConstraints(state).length,
      openTasks: openTasks(state).length,
    }),
    query: (filter) => queryItems(state, filter),
    save: () => createSnapshot(state),
    provenance: () => prov,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveProvider(opts: SessionOptions): LlmProvider | undefined {
  if (opts.forceRuleOnly) return undefined;
  if (opts.provider) return opts.provider;
  if (opts.model === undefined && opts.baseUrl === undefined) return undefined;

  const modelName = opts.model ?? "default";
  const policy = checkModelPolicy(modelName);

  if (!policy.allowed) {
    throw new Error(`Model "${modelName}" blocked by policy: ${policy.reason}`);
  }

  return createOllamaProvider({
    model: policy.model,
    baseUrl: opts.baseUrl ?? "http://localhost:11434",
    temperature: 0.1,
  });
}

/**
 * Probe Ollama for the default model. Returns a provider if available, undefined if not.
 * Silent failure — rule-based fallback is the designed degradation path.
 */
async function tryAutoDetect(baseUrl?: string): Promise<LlmProvider | undefined> {
  const url = baseUrl ?? "http://localhost:11434";
  const policy = checkModelPolicy("default");
  if (!policy.allowed) return undefined;

  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return undefined;
    const data = await res.json() as { models?: Array<{ name: string }> };
    const models = data.models?.map((m) => m.name) ?? [];

    // Check if the default model is available
    if (models.some((m) => m === policy.model || m.startsWith(policy.model + ":"))) {
      return createOllamaProvider({
        model: policy.model,
        baseUrl: url,
        temperature: 0.1,
      });
    }
    return undefined;
  } catch {
    // Ollama not running or unreachable — silent fallback
    return undefined;
  }
}

function maxIdFromCandidates(candidates: CandidateDelta[]): number {
  let max = 0;
  for (const c of candidates) {
    const d = c.delta;
    if ("id" in d) {
      const num = parseInt((d as { id: string }).id.replace(/\D/g, ""), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return max;
}

function emptyPipeline(state: ActiveContextState): PipelineResult {
  return {
    state,
    candidates: [],
    accepted: [],
    rejected: [],
    gateResults: [],
    scoreboard: {
      precision: 1,
      recall: 1,
      prematureCanonizationRate: 0,
      badTargetRate: 0,
      duplicateEmissionRate: 0,
      reconcilerRejectionRate: 0,
      costPerAcceptedDelta: 0,
      byKind: [],
      falsePositives: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Context renderer — budgeted text export
// ---------------------------------------------------------------------------

interface RenderOpts {
  goals: MemoryItem[];
  decisions: MemoryItem[];
  constraints: MemoryItem[];
  tasks: MemoryItem[];
  branches: MemoryItem[];
  recentDeltas: MemoryDelta[];
  changed: MemoryItem[];
  maxChars: number;
  includeSuperSeded?: boolean;
  state: ActiveContextState;
}

function renderContext(opts: RenderOpts): string {
  const sections: string[] = [];

  // Priority order: constraints > decisions > goals > tasks > branches > recent > changed
  // Constraints first because they're the guardrails.

  if (opts.constraints.length > 0) {
    sections.push(renderSection("Constraints", opts.constraints));
  }

  if (opts.decisions.length > 0) {
    sections.push(renderSection("Decisions", opts.decisions));
  }

  if (opts.goals.length > 0) {
    sections.push(renderSection("Goals", opts.goals));
  }

  if (opts.tasks.length > 0) {
    sections.push(renderSection("Open Tasks", opts.tasks));
  }

  if (opts.branches.length > 0) {
    sections.push(renderSection("Unresolved", opts.branches));
  }

  if (opts.recentDeltas.length > 0) {
    const deltaLines = opts.recentDeltas.map((d) => {
      const sum = "summary" in d ? (d as { summary: string }).summary : d.kind;
      return `- ${d.kind}: ${sum}`;
    });
    sections.push(`## Recent Changes\n${deltaLines.join("\n")}`);
  }

  if (opts.changed.length > 0) {
    sections.push(renderSection("Changed Since Last Export", opts.changed));
  }

  if (opts.includeSuperSeded) {
    const sup = supersededItems(opts.state);
    if (sup.length > 0) {
      sections.push(renderSection("Superseded", sup));
    }
  }

  // Budget: join and truncate
  let text = sections.join("\n\n");
  if (text.length > opts.maxChars) {
    text = text.slice(0, opts.maxChars - 4) + "\n...";
  }

  return text;
}

function renderSection(title: string, items: MemoryItem[]): string {
  const lines = items.map((item) => {
    const conf = item.confidence !== "high" ? ` [${item.confidence}]` : "";
    const tags = item.tags?.length ? ` (${item.tags.join(", ")})` : "";
    return `- [${item.id}] ${item.summary}${conf}${tags}`;
  });
  return `## ${title}\n${lines.join("\n")}`;
}
