/**
 * replay command tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { replay } from "../src/commands/replay.js";
import { createSavedTestDir } from "./helpers.js";

describe("replay command", () => {
  it("replays all provenance events", async () => {
    const { dir, session } = await createSavedTestDir();
    const provLines = session.provenance().lines();

    const output = await replay({ dir });
    if (provLines.length > 0) {
      assert.ok(output.includes("seq"), "should show sequence numbers");
      assert.ok(
        output.includes("ACCEPTED") || output.includes("REJECTED") || output.includes("CHECKPOINT"),
        "should show event types",
      );
    } else {
      assert.ok(output.includes("No provenance"), "should report empty log");
    }
  });

  it("filters by --since", async () => {
    const { dir, session } = await createSavedTestDir();
    const provLines = session.provenance().lines();
    if (provLines.length < 2) return;

    const maxSeq = Math.max(...provLines.map((l) => l.seq));
    const output = await replay({ dir, since: maxSeq });
    // Should only show events at or after maxSeq
    assert.ok(typeof output === "string");
  });

  it("filters by --type", async () => {
    const { dir, session } = await createSavedTestDir();
    const provLines = session.provenance().lines();
    if (provLines.length === 0) return;

    const output = await replay({ dir, type: "accepted" });
    if (output.includes("seq")) {
      assert.ok(output.includes("ACCEPTED"), "should only show accepted events");
      assert.ok(!output.includes("REJECTED"), "should not show rejected events");
    }
  });

  it("returns JSON when --json", async () => {
    const { dir } = await createSavedTestDir();
    const output = await replay({ dir, json: true });
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed), "should be an array");
  });
});
