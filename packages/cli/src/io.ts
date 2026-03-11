/**
 * .deltamind/ directory I/O — find, load, save, init.
 *
 * Searched upward from cwd like .git/.
 * Contains: snapshot.json + provenance.jsonl
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  createSession,
  parseSnapshot,
  serializeSnapshot,
  parseProvenance,
  serializeProvenance,
} from "@deltamind/core";
import type { Session, StateSnapshot, ProvenanceLine } from "@deltamind/core";

const DIR_NAME = ".deltamind";
const SNAPSHOT_FILE = "snapshot.json";
const PROVENANCE_FILE = "provenance.jsonl";

// ---------------------------------------------------------------------------
// Find .deltamind/
// ---------------------------------------------------------------------------

/**
 * Walk up from startDir looking for .deltamind/.
 * Returns the full path to the directory, or undefined if not found.
 */
export function findDeltamindDir(startDir?: string): string | undefined {
  let dir = startDir ?? process.cwd();
  const root = dirname(dir) === dir ? dir : undefined; // handle root immediately

  while (true) {
    const candidate = join(dir, DIR_NAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined; // reached filesystem root
    dir = parent;
  }
}

/**
 * Find .deltamind/ or throw with a helpful message.
 */
export function requireDeltamindDir(startDir?: string): string {
  const dir = findDeltamindDir(startDir);
  if (!dir) {
    throw new DeltamindDirError(
      "No .deltamind/ directory found (searched upward from cwd).\n" +
        "Run `deltamind save` in a session to create one, or `deltamind save --from-stdin` to initialize from a snapshot.",
    );
  }
  return dir;
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

/**
 * Create .deltamind/ in the given directory (defaults to cwd).
 * Returns the created path. No-op if already exists.
 */
export function initDir(baseDir?: string): string {
  const dir = join(baseDir ?? process.cwd(), DIR_NAME);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export interface LoadResult {
  session: Session;
  snapshot: StateSnapshot;
  provenance: ProvenanceLine[];
  dir: string;
}

/**
 * Load a session from .deltamind/.
 * Reads snapshot.json, creates a session from it,
 * and reads provenance.jsonl if present.
 */
export function loadSession(startDir?: string): LoadResult {
  const dir = requireDeltamindDir(startDir);
  const snapshotPath = join(dir, SNAPSHOT_FILE);

  if (!existsSync(snapshotPath)) {
    throw new DeltamindDirError(
      `Found .deltamind/ at ${dir} but no ${SNAPSHOT_FILE}.\n` +
        "The session may not have been saved yet.",
    );
  }

  const snapshotJson = readFileSync(snapshotPath, "utf-8");
  const snapshot = parseSnapshot(snapshotJson);
  const session = createSession({ snapshot, forceRuleOnly: true });

  // Provenance is optional (might not exist yet)
  const provPath = join(dir, PROVENANCE_FILE);
  const provenance: ProvenanceLine[] = existsSync(provPath)
    ? parseProvenance(readFileSync(provPath, "utf-8"))
    : [];

  return { session, snapshot, provenance, dir };
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

/**
 * Save a session to .deltamind/ (creates the dir if needed).
 * Writes snapshot.json and appends to provenance.jsonl.
 */
export function saveSession(
  session: Session,
  opts?: { dir?: string; provenance?: ProvenanceLine[] },
): string {
  const dir = initDir(opts?.dir);
  const snapshot = session.save();

  writeFileSync(join(dir, SNAPSHOT_FILE), serializeSnapshot(snapshot), "utf-8");

  // Provenance: append new lines from the in-memory writer
  const newLines = session.provenance().lines();
  const existingLines = opts?.provenance ?? [];
  const allLines = [...existingLines, ...newLines];
  writeFileSync(join(dir, PROVENANCE_FILE), serializeProvenance(allLines), "utf-8");

  return dir;
}

/**
 * Save a raw snapshot (e.g. from stdin) to .deltamind/.
 */
export function saveRawSnapshot(snapshotJson: string, baseDir?: string): string {
  // Validate it parses
  parseSnapshot(snapshotJson);
  const dir = initDir(baseDir);
  writeFileSync(join(dir, SNAPSHOT_FILE), snapshotJson, "utf-8");
  return dir;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class DeltamindDirError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeltamindDirError";
  }
}
