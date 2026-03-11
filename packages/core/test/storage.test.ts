/**
 * Phase 3B — Persistence layer tests.
 *
 * Tests provenance log, snapshots, projections, and save/load round-trip.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../src/session.js";
import {
  createProvenanceWriter,
  serializeProvenance,
  parseProvenance,
  createSnapshot,
  serializeSnapshot,
  parseSnapshot,
  restoreState,
  renderActiveState,
  renderDecisions,
  renderTasks,
  renderConstraints,
} from "../src/storage/index.js";
import { createState } from "../src/state.js";
import { reconcile } from "../src/reconciler.js";
import type { Turn } from "../src/extractor/types.js";
import { cleanLinear } from "./fixtures/clean-linear.js";
import { longLinear } from "./fixtures/long-linear.js";
import { revisionPack } from "./fixtures/revision-pack.js";
import type { TranscriptFixture } from "./harness/fixture-types.js";

function fixtureToTurns(fixture: TranscriptFixture): Turn[] {
  return fixture.turns.map((t) => ({ turnId: t.turnId, role: t.role, content: t.content }));
}

// ---------------------------------------------------------------------------
// 3B.1 — Provenance log
// ---------------------------------------------------------------------------

describe("Provenance log", () => {
  it("records accepted and rejected events", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const lines = session.provenance().lines();
    assert.ok(lines.length > 0, "should have provenance lines");

    const accepted = lines.filter((l) => l.type === "accepted");
    const rejected = lines.filter((l) => l.type === "rejected");
    assert.ok(accepted.length > 0, "should have accepted events");
    // Rejected may be 0 on clean fixture, that's fine

    // Each accepted has required fields
    for (const a of accepted) {
      assert.ok(a.seq > 0 || a.seq === 0, "seq is a number");
      assert.ok(a.timestamp, "has timestamp");
      assert.ok(a.delta, "has delta");
      assert.ok(a.itemId, "has itemId");
    }
  });

  it("serializes and parses JSONL round-trip", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const lines = session.provenance().lines();
    const jsonl = serializeProvenance(lines);

    // JSONL format: one JSON object per line
    const lineCount = jsonl.trim().split("\n").length;
    assert.equal(lineCount, lines.length, "line count matches");

    // Parse back
    const parsed = parseProvenance(jsonl);
    assert.equal(parsed.length, lines.length, "parsed count matches");

    // Verify structure preserved
    for (let i = 0; i < lines.length; i++) {
      assert.equal(parsed[i].type, lines[i].type, `type matches at index ${i}`);
      assert.equal(parsed[i].seq, lines[i].seq, `seq matches at index ${i}`);
    }
  });

  it("standalone writer records checkpoints", () => {
    const writer = createProvenanceWriter();
    writer.writeCheckpoint({
      seq: 42,
      totalItems: 10,
      totalDeltas: 25,
      totalTurns: 100,
      contextChars: 1500,
      rawChars: 8000,
    });

    const lines = writer.lines();
    assert.equal(lines.length, 1);
    assert.equal(lines[0].type, "checkpoint");
    if (lines[0].type === "checkpoint") {
      assert.equal(lines[0].totalItems, 10);
      assert.equal(lines[0].totalTurns, 100);
    }
  });
});

// ---------------------------------------------------------------------------
// 3B.2 — Snapshot
// ---------------------------------------------------------------------------

describe("Snapshot", () => {
  it("creates snapshot from state", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const snapshot = session.save();
    assert.equal(snapshot.version, 1);
    assert.ok(snapshot.timestamp);
    assert.ok(snapshot.seq > 0);
    assert.ok(snapshot.items.length > 0, "should have items");
    assert.ok(snapshot.deltaLog.length > 0, "should have delta log");
  });

  it("serializes to deterministic JSON", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const s1 = serializeSnapshot(session.save());
    const s2 = serializeSnapshot(session.save());

    // Items should be in same order (sorted by id)
    const snap1 = parseSnapshot(s1);
    const snap2 = parseSnapshot(s2);
    assert.deepEqual(
      snap1.items.map((i) => i.id),
      snap2.items.map((i) => i.id),
      "item order is deterministic",
    );
  });

  it("round-trips through serialize/parse", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const original = session.save();
    const json = serializeSnapshot(original);
    const restored = parseSnapshot(json);

    assert.equal(restored.version, original.version);
    assert.equal(restored.seq, original.seq);
    assert.equal(restored.items.length, original.items.length);
    assert.equal(restored.deltaLog.length, original.deltaLog.length);

    // Item content preserved
    for (let i = 0; i < original.items.length; i++) {
      assert.equal(restored.items[i].id, original.items[i].id);
      assert.equal(restored.items[i].kind, original.items[i].kind);
      assert.equal(restored.items[i].summary, original.items[i].summary);
      assert.equal(restored.items[i].status, original.items[i].status);
    }
  });

  it("rejects wrong version", () => {
    const badJson = JSON.stringify({ version: 999, items: [], deltaLog: [], seq: 0, timestamp: "" });
    assert.throws(() => parseSnapshot(badJson), /version mismatch/);
  });
});

// ---------------------------------------------------------------------------
// 3B.3 — Projections
// ---------------------------------------------------------------------------

describe("Projections", () => {
  it("renders ACTIVE_STATE.md with all sections", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const md = renderActiveState(session.state());
    assert.ok(md.includes("# Active State"), "has title");
    assert.ok(md.includes("Sequence:"), "has sequence");
    // Should have at least one section
    assert.ok(
      md.includes("## Goals") || md.includes("## Decisions") || md.includes("## Constraints") || md.includes("## Open Tasks"),
      "has at least one category section",
    );
  });

  it("renders DECISIONS.md", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const md = renderDecisions(session.state());
    assert.ok(md.includes("# Decisions"), "has title");
  });

  it("renders TASKS.md", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const md = renderTasks(session.state());
    assert.ok(md.includes("# Tasks"), "has title");
  });

  it("renders CONSTRAINTS.md", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const md = renderConstraints(session.state());
    assert.ok(md.includes("# Constraints"), "has title");
  });

  it("projections are deterministic", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const md1 = renderActiveState(session.state());
    const md2 = renderActiveState(session.state());
    assert.equal(md1, md2, "same state produces same markdown");
  });
});

// ---------------------------------------------------------------------------
// 3B.4 — Save/load round-trip
// ---------------------------------------------------------------------------

describe("Save/load round-trip", () => {
  it("restores state from snapshot", async () => {
    const session1 = createSession();
    session1.ingestBatch(fixtureToTurns(cleanLinear));
    await session1.process();

    const snapshot = session1.save();
    const state = restoreState(snapshot);

    assert.equal(state.seq, session1.stats().seq);
    assert.equal(state.items.size, session1.stats().totalItems);
    assert.equal(state.deltaLog.length, session1.stats().totalDeltas);
  });

  it("resumed session produces same export", async () => {
    // Create and process original session
    const session1 = createSession();
    session1.ingestBatch(fixtureToTurns(cleanLinear));
    await session1.process();

    const ctx1 = session1.exportContext({ maxChars: 10000 });
    const snapshot = session1.save();

    // Resume from snapshot
    const session2 = createSession({ snapshot });
    const ctx2 = session2.exportContext({ maxChars: 10000 });

    // Structural comparison: same items
    assert.equal(ctx2.totalItems, ctx1.totalItems, "same item count");
    assert.equal(ctx2.goals.length, ctx1.goals.length, "same goals");
    assert.equal(ctx2.decisions.length, ctx1.decisions.length, "same decisions");
    assert.equal(ctx2.constraints.length, ctx1.constraints.length, "same constraints");
    assert.equal(ctx2.tasks.length, ctx1.tasks.length, "same tasks");

    // Same item IDs
    const ids1 = [...session1.state().items.keys()].sort();
    const ids2 = [...session2.state().items.keys()].sort();
    assert.deepEqual(ids2, ids1, "same item IDs after restore");
  });

  it("resumed session can continue processing", async () => {
    // Process first half
    const session1 = createSession();
    const turns = fixtureToTurns(longLinear);
    const mid = Math.floor(turns.length / 2);

    session1.ingestBatch(turns.slice(0, mid));
    await session1.process();
    const snapshot = session1.save();

    // Resume and process second half
    const session2 = createSession({ snapshot });
    session2.ingestBatch(turns.slice(mid));
    const result = await session2.process();

    assert.ok(result.turnsProcessed > 0, "processed second half");
    assert.ok(
      session2.stats().totalItems >= session1.stats().totalItems,
      "resumed session has at least as many items",
    );
  });

  it("full serialize → parse → restore → export stability", async () => {
    const session1 = createSession();
    session1.ingestBatch(fixtureToTurns(revisionPack));
    await session1.process();

    // Serialize to JSON string
    const json = serializeSnapshot(session1.save());

    // Parse back
    const snapshot = parseSnapshot(json);

    // Restore into new session
    const session2 = createSession({ snapshot });

    // Compare
    assert.equal(session2.stats().totalItems, session1.stats().totalItems);
    assert.equal(session2.stats().totalDeltas, session1.stats().totalDeltas);
    assert.equal(session2.stats().seq, session1.stats().seq);

    // Export should produce content
    const ctx = session2.exportContext({ maxChars: 10000 });
    assert.ok(ctx.text.length > 0, "resumed export has content");

    // Provenance log should be fresh (new session, no events yet)
    assert.equal(session2.provenance().lines().length, 0, "fresh provenance on resume");
  });

  it("provenance survives serialization", async () => {
    const session = createSession();
    session.ingestBatch(fixtureToTurns(cleanLinear));
    await session.process();

    const lines = session.provenance().lines();
    const jsonl = serializeProvenance(lines);
    const restored = parseProvenance(jsonl);

    assert.equal(restored.length, lines.length);
    for (let i = 0; i < lines.length; i++) {
      assert.equal(restored[i].type, lines[i].type);
    }
  });
});
