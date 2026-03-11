/**
 * Append-only provenance log — the black box flight recorder.
 *
 * Every accepted delta, rejection, and checkpoint is written as a single
 * JSON line to PROVENANCE.jsonl. This is the event log — what happened.
 *
 * Design:
 * - Append-only: lines are never modified or deleted
 * - Each line is a self-contained JSON object with a sequence number
 * - Replayable: feed events back through reconciler to reconstruct state
 * - Machine-readable: no markdown, no formatting, just structured data
 */

import type { MemoryDelta, ProvenanceEvent } from "../types.js";
import type { CandidateDelta } from "../extractor/types.js";

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export interface ProvenanceAccepted {
  type: "accepted";
  seq: number;
  timestamp: string;
  delta: MemoryDelta;
  itemId: string;
  resultingStatus: string;
}

export interface ProvenanceRejected {
  type: "rejected";
  seq: number;
  timestamp: string;
  delta: MemoryDelta;
  reason: string;
}

export interface ProvenanceCheckpoint {
  type: "checkpoint";
  seq: number;
  timestamp: string;
  totalItems: number;
  totalDeltas: number;
  totalTurns: number;
  contextChars: number;
  rawChars: number;
}

export type ProvenanceLine = ProvenanceAccepted | ProvenanceRejected | ProvenanceCheckpoint;

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

export interface ProvenanceWriter {
  /** Append an accepted delta event. */
  writeAccepted(event: ProvenanceEvent): void;
  /** Append a rejected delta event. */
  writeRejected(delta: MemoryDelta, reason: string, seq: number): void;
  /** Append a checkpoint summary. */
  writeCheckpoint(stats: {
    seq: number;
    totalItems: number;
    totalDeltas: number;
    totalTurns: number;
    contextChars: number;
    rawChars: number;
  }): void;
  /** Flush any buffered writes. */
  flush(): Promise<void>;
  /** Get all lines written so far (for in-memory use / testing). */
  lines(): ProvenanceLine[];
}

/**
 * Create an in-memory provenance writer.
 * For file-backed persistence, wrap this with a file appender.
 */
export function createProvenanceWriter(): ProvenanceWriter {
  const buffer: ProvenanceLine[] = [];

  return {
    writeAccepted(event: ProvenanceEvent): void {
      buffer.push({
        type: "accepted",
        seq: event.seq,
        timestamp: event.timestamp,
        delta: event.delta,
        itemId: event.itemId,
        resultingStatus: event.resultingStatus,
      });
    },

    writeRejected(delta: MemoryDelta, reason: string, seq: number): void {
      buffer.push({
        type: "rejected",
        seq,
        timestamp: delta.timestamp,
        delta,
        reason,
      });
    },

    writeCheckpoint(stats): void {
      buffer.push({
        type: "checkpoint",
        seq: stats.seq,
        timestamp: new Date().toISOString(),
        totalItems: stats.totalItems,
        totalDeltas: stats.totalDeltas,
        totalTurns: stats.totalTurns,
        contextChars: stats.contextChars,
        rawChars: stats.rawChars,
      });
    },

    async flush(): Promise<void> {
      // In-memory: no-op. File-backed would fsync here.
    },

    lines(): ProvenanceLine[] {
      return [...buffer];
    },
  };
}

/**
 * Serialize provenance lines to JSONL format.
 */
export function serializeProvenance(lines: ProvenanceLine[]): string {
  return lines.map((line) => JSON.stringify(line)).join("\n") + "\n";
}

/**
 * Parse JSONL provenance data back into structured lines.
 */
export function parseProvenance(jsonl: string): ProvenanceLine[] {
  return jsonl
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as ProvenanceLine);
}
