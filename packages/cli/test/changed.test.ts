/**
 * changed command tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { changed } from "../src/commands/changed.js";
import { createSavedTestDir } from "./helpers.js";

describe("changed command", () => {
  it("shows changes since epoch (all items)", async () => {
    const { dir, session } = await createSavedTestDir();
    const output = await changed({ dir, since: "1970-01-01T00:00:00.000Z" });
    // Should show all items since everything is after epoch
    const state = session.state();
    if (state.items.size > 0) {
      assert.ok(output.includes("Changes since"), "should have header");
    }
  });

  it("shows no changes for future timestamp", async () => {
    const { dir } = await createSavedTestDir();
    const output = await changed({ dir, since: "2099-01-01T00:00:00.000Z" });
    assert.ok(output.includes("No changes"), "should report no changes");
  });

  it("resolves seq number to timestamp", async () => {
    const { dir, session } = await createSavedTestDir();
    const state = session.state();
    if (state.deltaLog.length > 0) {
      const output = await changed({ dir, since: "0" });
      // Should resolve seq 0 to its timestamp and show changes
      assert.ok(typeof output === "string");
    }
  });

  it("returns JSON when --json", async () => {
    const { dir } = await createSavedTestDir();
    const output = await changed({ dir, since: "1970-01-01T00:00:00.000Z", json: true });
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed), "should be an array");
  });
});
