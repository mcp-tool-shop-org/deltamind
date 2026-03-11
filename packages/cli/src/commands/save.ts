/**
 * deltamind save — persist session to .deltamind/.
 *
 * Flags: --from-stdin (initialize from piped snapshot)
 */

import { readFileSync } from "node:fs";
import { createSession, parseSnapshot } from "@deltamind/core";
import { saveSession, saveRawSnapshot, findDeltamindDir, loadSession } from "../io.js";

export interface SaveOptions {
  fromStdin?: boolean;
  dir?: string;
}

export async function save(opts: SaveOptions = {}): Promise<string> {
  if (opts.fromStdin) {
    const input = readFileSync(0, "utf-8"); // fd 0 = stdin
    const dir = saveRawSnapshot(input, opts.dir);
    return `Snapshot saved to ${dir}/snapshot.json`;
  }

  // Load existing session and re-save (captures any provenance from in-memory writer)
  const existing = findDeltamindDir(opts.dir);
  if (!existing) {
    // No existing session — create empty and save
    const session = createSession({ forceRuleOnly: true });
    const dir = saveSession(session, { dir: opts.dir });
    return `Initialized empty session at ${dir}`;
  }

  const { session, provenance, dir } = loadSession(opts.dir);
  saveSession(session, { dir: dir.replace(/[\\/].deltamind$/, ""), provenance });
  return `Session saved to ${dir}`;
}
