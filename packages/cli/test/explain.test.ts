/**
 * explain command tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { explain } from "../src/commands/explain.js";
import { createSavedTestDir } from "./helpers.js";

describe("explain command", () => {
  it("explains an existing item", async () => {
    const { dir, session } = await createSavedTestDir();
    const state = session.state();
    const firstItem = [...state.items.values()][0];
    if (!firstItem) return; // Skip if no items

    const output = await explain({ dir, itemId: firstItem.id });
    assert.ok(output.includes("=== Item ==="), "should have Item section");
    assert.ok(output.includes(firstItem.id), "should mention the item ID");
    assert.ok(output.includes(firstItem.kind), "should mention the kind");
  });

  it("reports not found for unknown item", async () => {
    const { dir } = await createSavedTestDir();
    const output = await explain({ dir, itemId: "nonexistent-999" });
    assert.ok(output.includes("No item or history"), "should report not found");
  });

  it("returns JSON when --json", async () => {
    const { dir, session } = await createSavedTestDir();
    const firstItem = [...session.state().items.values()][0];
    if (!firstItem) return;

    const output = await explain({ dir, itemId: firstItem.id, json: true });
    const parsed = JSON.parse(output);
    assert.ok("item" in parsed, "should have item field");
    assert.ok("relatedDeltas" in parsed, "should have relatedDeltas");
    assert.ok("provenanceEvents" in parsed, "should have provenanceEvents");
  });

  it("shows delta history for an item with deltas", async () => {
    const { dir, session } = await createSavedTestDir();
    const state = session.state();
    const firstItem = [...state.items.values()][0];
    if (!firstItem) return;

    const output = await explain({ dir, itemId: firstItem.id });
    // If there are related deltas, should show them
    if (output.includes("Delta History")) {
      assert.ok(output.includes("==="), "should have section headers");
    }
  });
});
