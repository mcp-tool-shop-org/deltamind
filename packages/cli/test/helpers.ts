/**
 * Shared test helpers for CLI tests.
 *
 * Creates temp dirs with .deltamind/ containing known sessions.
 */

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createSession,
  serializeSnapshot,
  serializeProvenance,
} from "@deltamind/core";
import type { Session, ProvenanceLine } from "@deltamind/core";

/**
 * Create a temp dir with a .deltamind/ directory containing a saved session
 * with some known state.
 */
export function createTestDir(): { dir: string; session: Session; provenance: ProvenanceLine[] } {
  const dir = mkdtempSync(join(tmpdir(), "deltamind-cli-test-"));
  const dmDir = join(dir, ".deltamind");
  mkdirSync(dmDir);

  // Build a session with known state
  const session = createSession({ forceRuleOnly: true });
  session.ingestBatch([
    { turnId: "t-1", role: "user", content: "We need to build a REST API using Express. This is our main goal." },
    { turnId: "t-2", role: "assistant", content: "I'll help you build a REST API using Express. Let's decide to use TypeScript for type safety." },
    { turnId: "t-3", role: "user", content: "Good. Also add a constraint: no external database — use SQLite only." },
    { turnId: "t-4", role: "assistant", content: "Understood. SQLite only, no external databases. I'll set up the project structure. First task: initialize the Express project with TypeScript configuration." },
    { turnId: "t-5", role: "user", content: "Actually, let's switch from Express to Fastify. It's faster and has better TypeScript support." },
    { turnId: "t-6", role: "assistant", content: "Good call. Switching to Fastify. The previous Express decision is superseded. Task: set up Fastify with TypeScript." },
  ]);

  // Process synchronously (rule-based is sync internally but returns Promise)
  let processPromise: ReturnType<typeof session.process>;
  processPromise = session.process();

  // Since rule-based is sync under the hood, the promise resolves immediately
  // but we need to actually await it. We'll save after processing.
  return { dir, session, provenance: [] };
}

/**
 * Create and fully save a test session. Returns the base dir path.
 * This is async because session.process() returns a Promise.
 */
export async function createSavedTestDir(): Promise<{ dir: string; session: Session }> {
  const dir = mkdtempSync(join(tmpdir(), "deltamind-cli-test-"));
  const dmDir = join(dir, ".deltamind");
  mkdirSync(dmDir);

  const session = createSession({ forceRuleOnly: true });
  session.ingestBatch([
    { turnId: "t-1", role: "user", content: "We need to build a REST API using Express. This is our main goal." },
    { turnId: "t-2", role: "assistant", content: "I'll help you build a REST API using Express. Let's decide to use TypeScript for type safety." },
    { turnId: "t-3", role: "user", content: "Good. Also add a constraint: no external database — use SQLite only." },
    { turnId: "t-4", role: "assistant", content: "Understood. SQLite only, no external databases. I'll set up the project structure. First task: initialize the Express project with TypeScript configuration." },
    { turnId: "t-5", role: "user", content: "Actually, let's switch from Express to Fastify. It's faster and has better TypeScript support." },
    { turnId: "t-6", role: "assistant", content: "Good call. Switching to Fastify. The previous Express decision is superseded. Task: set up Fastify with TypeScript." },
  ]);

  await session.process();

  // Save snapshot
  const snapshot = session.save();
  writeFileSync(join(dmDir, "snapshot.json"), serializeSnapshot(snapshot), "utf-8");

  // Save provenance
  const provLines = session.provenance().lines();
  if (provLines.length > 0) {
    writeFileSync(join(dmDir, "provenance.jsonl"), serializeProvenance(provLines), "utf-8");
  }

  return { dir, session };
}

/**
 * Create an empty .deltamind/ dir with no snapshot (for error testing).
 */
export function createEmptyTestDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "deltamind-cli-test-"));
  const dmDir = join(dir, ".deltamind");
  mkdirSync(dmDir);
  return dir;
}
