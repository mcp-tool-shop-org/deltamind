/**
 * deltamind resume — load session, show health summary.
 *
 * Flags: --json
 */

import { loadSession } from "../io.js";
import { formatStats } from "../format.js";

export interface ResumeOptions {
  json?: boolean;
  dir?: string;
}

export async function resume(opts: ResumeOptions = {}): Promise<string> {
  const { session, dir } = loadSession(opts.dir);
  const stats = session.stats();

  if (opts.json) {
    return JSON.stringify({ dir, ...stats }, null, 2);
  }

  const lines: string[] = [];
  lines.push(`Session loaded from ${dir}`);
  lines.push("");
  lines.push(formatStats(stats));
  return lines.join("\n");
}
