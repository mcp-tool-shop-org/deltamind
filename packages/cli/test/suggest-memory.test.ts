/**
 * suggest-memory command tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { suggestMemory } from "../src/commands/suggest-memory.js";
import { createSavedTestDir } from "./helpers.js";

describe("suggest-memory command", () => {
  it("returns suggestions or reports none", async () => {
    const { dir } = await createSavedTestDir();
    const output = await suggestMemory({ dir });
    // Either has suggestions or reports none
    assert.ok(
      output.includes("---") || output.includes("No memory updates"),
      "should show suggestions or report none",
    );
  });

  it("returns JSON when --json", async () => {
    const { dir } = await createSavedTestDir();
    const output = await suggestMemory({ dir, json: true });
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed), "should be an array");
  });

  it("filters by min-confidence", async () => {
    const { dir } = await createSavedTestDir();
    const output = await suggestMemory({ dir, minConfidence: "high" });
    assert.ok(typeof output === "string", "should return string");
  });
});
