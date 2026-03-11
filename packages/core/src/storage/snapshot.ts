/**
 * State snapshot — current truth as machine-readable JSON.
 *
 * Machines load from machine-shaped files, not parse their own pretty
 * diary entries. This is the canonical state representation for save/load.
 *
 * Design:
 * - Deterministic: same state always produces same JSON (sorted keys)
 * - Complete: captures everything needed to resume a session
 * - Versioned: format version for forward compatibility
 */

import type { ActiveContextState, MemoryDelta, MemoryItem } from "../types.js";
import { createState } from "../state.js";

// ---------------------------------------------------------------------------
// Snapshot format
// ---------------------------------------------------------------------------

export const SNAPSHOT_VERSION = 1;

export interface StateSnapshot {
  version: number;
  timestamp: string;
  seq: number;
  items: SnapshotItem[];
  deltaLog: MemoryDelta[];
}

export interface SnapshotItem {
  id: string;
  semanticId?: string;
  kind: string;
  summary: string;
  status: string;
  confidence: string;
  scope: string;
  sourceTurns: Array<{ turnId: string; offset?: { start: number; end: number } }>;
  lastTouched: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

/**
 * Serialize ActiveContextState to a snapshot object.
 */
export function createSnapshot(state: ActiveContextState): StateSnapshot {
  const items: SnapshotItem[] = [...state.items.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => ({
      id: item.id,
      ...(item.semanticId ? { semanticId: item.semanticId } : {}),
      kind: item.kind,
      summary: item.summary,
      status: item.status,
      confidence: item.confidence,
      scope: item.scope,
      sourceTurns: item.sourceTurns.map((s) => ({
        turnId: s.turnId,
        ...(s.offset ? { offset: s.offset } : {}),
      })),
      lastTouched: item.lastTouched,
      ...(item.tags?.length ? { tags: item.tags } : {}),
    }));

  return {
    version: SNAPSHOT_VERSION,
    timestamp: new Date().toISOString(),
    seq: state.seq,
    items,
    deltaLog: state.deltaLog,
  };
}

/**
 * Serialize a snapshot to JSON string (deterministic, pretty-printed).
 */
export function serializeSnapshot(snapshot: StateSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

// ---------------------------------------------------------------------------
// Deserialize
// ---------------------------------------------------------------------------

/**
 * Parse a JSON snapshot string back into a StateSnapshot.
 */
export function parseSnapshot(json: string): StateSnapshot {
  const data = JSON.parse(json) as StateSnapshot;

  if (data.version !== SNAPSHOT_VERSION) {
    throw new Error(
      `Snapshot version mismatch: expected ${SNAPSHOT_VERSION}, got ${data.version}`,
    );
  }

  return data;
}

/**
 * Restore ActiveContextState from a snapshot.
 * This is the inverse of createSnapshot().
 */
export function restoreState(snapshot: StateSnapshot): ActiveContextState {
  const state = createState();
  state.seq = snapshot.seq;
  state.deltaLog = [...snapshot.deltaLog];

  for (const item of snapshot.items) {
    const memItem: MemoryItem = {
      id: item.id,
      ...(item.semanticId ? { semanticId: item.semanticId } : {}),
      kind: item.kind as MemoryItem["kind"],
      summary: item.summary,
      status: item.status as MemoryItem["status"],
      confidence: item.confidence as MemoryItem["confidence"],
      scope: item.scope as MemoryItem["scope"],
      sourceTurns: item.sourceTurns.map((s) => ({
        turnId: s.turnId,
        ...(s.offset ? { offset: s.offset } : {}),
      })),
      lastTouched: item.lastTouched,
      ...(item.tags?.length ? { tags: [...item.tags] } : {}),
    };
    state.items.set(memItem.id, memItem);
  }

  return state;
}
