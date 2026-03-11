/**
 * ActiveContextState factory and helpers.
 */

import type { ActiveContextState, ItemKind, ItemScope, ItemStatus, MemoryItem } from "./types.js";

/** Create a fresh empty state. */
export function createState(): ActiveContextState {
  return {
    items: new Map(),
    deltaLog: [],
    seq: 0,
  };
}

/** Get all items matching a filter. */
export function queryItems(
  state: ActiveContextState,
  filter: {
    kind?: ItemKind;
    status?: ItemStatus;
    scope?: ItemScope;
    tag?: string;
  },
): MemoryItem[] {
  const results: MemoryItem[] = [];
  for (const item of state.items.values()) {
    if (filter.kind && item.kind !== filter.kind) continue;
    if (filter.status && item.status !== filter.status) continue;
    if (filter.scope && item.scope !== filter.scope) continue;
    if (filter.tag && !(item.tags ?? []).includes(filter.tag)) continue;
    results.push(item);
  }
  return results;
}

/** Get active decisions. */
export function activeDecisions(state: ActiveContextState): MemoryItem[] {
  return queryItems(state, { kind: "decision", status: "active" });
}

/** Get active constraints. */
export function activeConstraints(state: ActiveContextState): MemoryItem[] {
  return queryItems(state, { kind: "constraint", status: "active" });
}

/** Get open tasks. */
export function openTasks(state: ActiveContextState): MemoryItem[] {
  return queryItems(state, { kind: "task", status: "active" });
}

/** Get superseded items. */
export function supersededItems(state: ActiveContextState): MemoryItem[] {
  return queryItems(state, { status: "superseded" });
}

/** Get unresolved branches (hypothesis items tagged "branch" that are still tentative). */
export function unresolvedBranches(state: ActiveContextState): MemoryItem[] {
  return queryItems(state, { kind: "hypothesis", status: "tentative", tag: "branch" });
}

/** Get items touched since a given ISO timestamp. */
export function changedSince(state: ActiveContextState, since: string): MemoryItem[] {
  const results: MemoryItem[] = [];
  for (const item of state.items.values()) {
    if (item.lastTouched >= since) {
      results.push(item);
    }
  }
  return results.sort((a, b) => a.lastTouched.localeCompare(b.lastTouched));
}
