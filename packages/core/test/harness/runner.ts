/**
 * Transcript harness runner.
 *
 * Takes a fixture, feeds its expectedDeltas through the reconciler,
 * then validates the resulting state against gold labels.
 *
 * This validates the RECONCILER, not the extractor. The extractor
 * is a separate pipeline stage that will be tested independently.
 * Here we assume extraction is perfect (gold deltas) and ask:
 * "does the reconciler produce the right state?"
 */

import assert from "node:assert/strict";
import { createState, reconcile, activeDecisions, activeConstraints, openTasks, supersededItems, unresolvedBranches } from "../../src/index.js";
import type { ActiveContextState } from "../../src/index.js";
import type { TranscriptFixture, ExpectedItem } from "./fixture-types.js";

export interface HarnessResult {
  fixture: string;
  class: string;
  passed: boolean;
  failures: string[];
  /** Rejected deltas from reconciliation (debugging gold). */
  rejected: Array<{ kind: string; reason: string }>;
  /** Final state stats. */
  stats: {
    totalItems: number;
    activeItems: number;
    supersededItems: number;
    tentativeItems: number;
    resolvedItems: number;
    deltaLogSize: number;
  };
}

/** Run a single fixture through the harness. */
export function runFixture(fixture: TranscriptFixture): HarnessResult {
  const state = createState();
  const { events, rejected } = reconcile(state, fixture.expectedDeltas);
  const failures: string[] = [];

  // --- Validate expected items ---
  for (const expected of fixture.expectedItems) {
    const item = state.items.get(expected.id);
    if (!item) {
      failures.push(`Missing item: ${expected.id} (expected ${expected.kind})`);
      continue;
    }
    if (item.kind !== expected.kind) {
      failures.push(`Item ${expected.id}: expected kind "${expected.kind}", got "${item.kind}"`);
    }
    if (item.status !== expected.status) {
      failures.push(`Item ${expected.id}: expected status "${expected.status}", got "${item.status}"`);
    }
    if (!item.summary.toLowerCase().includes(expected.summaryContains.toLowerCase())) {
      failures.push(`Item ${expected.id}: summary "${item.summary}" does not contain "${expected.summaryContains}"`);
    }
    if (item.sourceTurns.length < expected.minSourceTurns) {
      failures.push(`Item ${expected.id}: expected >= ${expected.minSourceTurns} source turns, got ${item.sourceTurns.length}`);
    }
  }

  // --- Validate query answers ---
  const q = fixture.expectedQueries;

  const actualDecisionIds = activeDecisions(state).map((i) => i.id).sort();
  const expectedDecisionIds = [...q.activeDecisionIds].sort();
  if (JSON.stringify(actualDecisionIds) !== JSON.stringify(expectedDecisionIds)) {
    failures.push(`Active decisions: expected [${expectedDecisionIds}], got [${actualDecisionIds}]`);
  }

  const actualConstraintIds = activeConstraints(state).map((i) => i.id).sort();
  const expectedConstraintIds = [...q.activeConstraintIds].sort();
  if (JSON.stringify(actualConstraintIds) !== JSON.stringify(expectedConstraintIds)) {
    failures.push(`Active constraints: expected [${expectedConstraintIds}], got [${actualConstraintIds}]`);
  }

  const actualTaskIds = openTasks(state).map((i) => i.id).sort();
  const expectedTaskIds = [...q.openTaskIds].sort();
  if (JSON.stringify(actualTaskIds) !== JSON.stringify(expectedTaskIds)) {
    failures.push(`Open tasks: expected [${expectedTaskIds}], got [${actualTaskIds}]`);
  }

  const actualSupersededIds = supersededItems(state).map((i) => i.id).sort();
  const expectedSupersededIds = [...q.supersededIds].sort();
  if (JSON.stringify(actualSupersededIds) !== JSON.stringify(expectedSupersededIds)) {
    failures.push(`Superseded items: expected [${expectedSupersededIds}], got [${actualSupersededIds}]`);
  }

  const actualBranchIds = unresolvedBranches(state).map((i) => i.id).sort();
  const expectedBranchIds = [...q.unresolvedBranchIds].sort();
  if (JSON.stringify(actualBranchIds) !== JSON.stringify(expectedBranchIds)) {
    failures.push(`Unresolved branches: expected [${expectedBranchIds}], got [${actualBranchIds}]`);
  }

  // --- Check no unexpected items exist ---
  const expectedIds = new Set(fixture.expectedItems.map((e) => e.id));
  for (const [id] of state.items) {
    if (!expectedIds.has(id)) {
      failures.push(`Unexpected item in state: ${id}`);
    }
  }

  // --- Provenance invariant: every item must have source turns ---
  for (const [id, item] of state.items) {
    if (item.sourceTurns.length === 0) {
      failures.push(`Provenance violation: item ${id} has no source turns`);
    }
  }

  // --- Stats ---
  const stats = computeStats(state);

  return {
    fixture: fixture.name,
    class: fixture.class,
    passed: failures.length === 0,
    failures,
    rejected: rejected.map((r) => ({ kind: r.delta.kind, reason: r.reason })),
    stats,
  };
}

function computeStats(state: ActiveContextState) {
  let active = 0, superseded = 0, tentative = 0, resolved = 0;
  for (const item of state.items.values()) {
    switch (item.status) {
      case "active": active++; break;
      case "superseded": superseded++; break;
      case "tentative": tentative++; break;
      case "resolved": resolved++; break;
    }
  }
  return {
    totalItems: state.items.size,
    activeItems: active,
    supersededItems: superseded,
    tentativeItems: tentative,
    resolvedItems: resolved,
    deltaLogSize: state.deltaLog.length,
  };
}

/** Pretty-print a harness result. */
export function formatResult(result: HarnessResult): string {
  const lines: string[] = [];
  const icon = result.passed ? "PASS" : "FAIL";
  lines.push(`[${icon}] ${result.fixture} (${result.class})`);
  lines.push(`  Items: ${result.stats.totalItems} total | ${result.stats.activeItems} active | ${result.stats.supersededItems} superseded | ${result.stats.tentativeItems} tentative | ${result.stats.resolvedItems} resolved`);
  lines.push(`  Deltas applied: ${result.stats.deltaLogSize} | Rejected: ${result.rejected.length}`);

  if (result.rejected.length > 0) {
    lines.push(`  Rejected deltas:`);
    for (const r of result.rejected) {
      lines.push(`    - ${r.kind}: ${r.reason}`);
    }
  }

  if (!result.passed) {
    lines.push(`  Failures:`);
    for (const f of result.failures) {
      lines.push(`    - ${f}`);
    }
  }

  return lines.join("\n");
}
