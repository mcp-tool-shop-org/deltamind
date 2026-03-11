/**
 * export command tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { exportCmd } from "../src/commands/export.js";
import { createSavedTestDir } from "./helpers.js";

describe("export command", () => {
  it("exports context text", async () => {
    const { dir } = await createSavedTestDir();
    const output = await exportCmd({ dir });
    assert.ok(typeof output === "string");
    assert.ok(output.length > 0, "should produce non-empty text");
  });

  it("respects maxChars budget", async () => {
    const { dir } = await createSavedTestDir();
    const output = await exportCmd({ dir, maxChars: 100 });
    assert.ok(output.length <= 104, "should respect maxChars (with possible trailing ...)");
  });

  it("exports JSON", async () => {
    const { dir } = await createSavedTestDir();
    const output = await exportCmd({ dir, json: true });
    const parsed = JSON.parse(output);
    assert.ok("text" in parsed, "should have text field");
    assert.ok("totalItems" in parsed, "should have totalItems field");
  });

  it("exports ai-loadout format", async () => {
    const { dir } = await createSavedTestDir();
    const output = await exportCmd({ dir, format: "ai-loadout" });
    const parsed = JSON.parse(output);
    assert.ok("version" in parsed || "entries" in parsed, "should have loadout structure");
  });
});
