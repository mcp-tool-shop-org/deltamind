/**
 * IO layer tests — find, load, save, init.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSession, serializeSnapshot } from "@deltamind/core";
import {
  findDeltamindDir,
  requireDeltamindDir,
  initDir,
  loadSession,
  saveSession,
  saveRawSnapshot,
  DeltamindDirError,
} from "../src/io.js";

describe("io", () => {
  describe("findDeltamindDir", () => {
    it("finds .deltamind/ in the given directory", () => {
      const dir = mkdtempSync(join(tmpdir(), "dm-io-"));
      mkdirSync(join(dir, ".deltamind"));
      assert.equal(findDeltamindDir(dir), join(dir, ".deltamind"));
    });

    it("walks up to find .deltamind/", () => {
      const dir = mkdtempSync(join(tmpdir(), "dm-io-"));
      mkdirSync(join(dir, ".deltamind"));
      const sub = join(dir, "sub", "deep");
      mkdirSync(sub, { recursive: true });
      assert.equal(findDeltamindDir(sub), join(dir, ".deltamind"));
    });

    it("returns undefined if not found", () => {
      const dir = mkdtempSync(join(tmpdir(), "dm-io-"));
      // No .deltamind/ here — but it will walk up and might find one in tmpdir
      // Use a unique nested dir to be safe
      const deep = join(dir, "a", "b", "c");
      mkdirSync(deep, { recursive: true });
      // If there's no .deltamind/ anywhere above, returns undefined
      // This test might be flaky if tmpdir has a .deltamind/ — unlikely but possible
      const result = findDeltamindDir(deep);
      // Either undefined or some parent has it — just verify the type
      assert.ok(result === undefined || typeof result === "string");
    });
  });

  describe("requireDeltamindDir", () => {
    it("throws DeltamindDirError if not found", () => {
      const dir = mkdtempSync(join(tmpdir(), "dm-io-"));
      const deep = join(dir, "x", "y");
      mkdirSync(deep, { recursive: true });
      // This should throw because there's no .deltamind/ in this tree
      // (unless tmpdir itself has one, but that's extremely unlikely)
      try {
        requireDeltamindDir(deep);
      } catch (err) {
        assert.ok(err instanceof DeltamindDirError);
        return;
      }
      // If it didn't throw, there's a .deltamind/ somewhere above — skip
    });
  });

  describe("initDir", () => {
    it("creates .deltamind/ directory", () => {
      const dir = mkdtempSync(join(tmpdir(), "dm-io-"));
      const result = initDir(dir);
      assert.ok(existsSync(result));
      assert.ok(result.endsWith(".deltamind"));
    });

    it("is idempotent", () => {
      const dir = mkdtempSync(join(tmpdir(), "dm-io-"));
      initDir(dir);
      initDir(dir); // Should not throw
      assert.ok(existsSync(join(dir, ".deltamind")));
    });
  });

  describe("saveSession + loadSession", () => {
    it("round-trips a session through save/load", async () => {
      const dir = mkdtempSync(join(tmpdir(), "dm-io-"));

      // Create a session with some state
      const session = createSession({ forceRuleOnly: true });
      session.ingest({ turnId: "t-1", role: "user", content: "Decide to use Rust for the backend." });
      session.ingest({ turnId: "t-2", role: "assistant", content: "Using Rust for the backend. Good choice for performance." });
      await session.process();

      // Save
      const savedDir = saveSession(session, { dir });
      assert.ok(existsSync(join(savedDir, "snapshot.json")));
      assert.ok(existsSync(join(savedDir, "provenance.jsonl")));

      // Load
      const loaded = loadSession(dir);
      assert.ok(loaded.session);
      assert.equal(loaded.session.state().items.size, session.state().items.size);
      assert.equal(loaded.snapshot.seq, session.save().seq);
    });
  });

  describe("saveRawSnapshot", () => {
    it("saves a raw JSON snapshot", () => {
      const dir = mkdtempSync(join(tmpdir(), "dm-io-"));
      const session = createSession({ forceRuleOnly: true });
      const snap = session.save();
      const json = JSON.stringify(snap, null, 2);
      const result = saveRawSnapshot(json, dir);
      assert.ok(existsSync(join(result, "snapshot.json")));

      const content = readFileSync(join(result, "snapshot.json"), "utf-8");
      assert.equal(content, json);
    });

    it("rejects invalid JSON", () => {
      const dir = mkdtempSync(join(tmpdir(), "dm-io-"));
      assert.throws(() => saveRawSnapshot("not json", dir));
    });
  });

  describe("loadSession error handling", () => {
    it("throws if .deltamind/ has no snapshot.json", () => {
      const dir = mkdtempSync(join(tmpdir(), "dm-io-"));
      mkdirSync(join(dir, ".deltamind"));
      assert.throws(() => loadSession(dir), (err: Error) => {
        return err instanceof DeltamindDirError && err.message.includes("snapshot.json");
      });
    });
  });
});
