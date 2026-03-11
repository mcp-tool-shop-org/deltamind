/**
 * save + resume command tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resume } from "../src/commands/resume.js";
import { save } from "../src/commands/save.js";
import { createSavedTestDir } from "./helpers.js";

describe("resume command", () => {
  it("loads session and shows stats", async () => {
    const { dir } = await createSavedTestDir();
    const output = await resume({ dir });
    assert.ok(output.includes("Session loaded"), "should confirm session loaded");
    assert.ok(output.includes("Sequence:"), "should show sequence");
    assert.ok(output.includes("Items:"), "should show items count");
  });

  it("returns JSON when --json", async () => {
    const { dir } = await createSavedTestDir();
    const output = await resume({ dir, json: true });
    const parsed = JSON.parse(output);
    assert.ok("seq" in parsed, "should have seq");
    assert.ok("totalItems" in parsed, "should have totalItems");
  });
});

describe("save command", () => {
  it("re-saves an existing session", async () => {
    const { dir } = await createSavedTestDir();
    const output = await save({ dir });
    assert.ok(output.includes("saved") || output.includes("Session"), "should confirm save");
  });

  it("initializes empty session if no .deltamind/", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dm-save-"));
    const output = await save({ dir });
    assert.ok(output.includes("Initialized") || output.includes("saved"), "should confirm init or save");
  });
});
