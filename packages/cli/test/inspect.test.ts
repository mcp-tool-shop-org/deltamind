/**
 * inspect command tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inspect } from "../src/commands/inspect.js";
import { createSavedTestDir } from "./helpers.js";

describe("inspect command", () => {
  it("renders active state as markdown", async () => {
    const { dir } = await createSavedTestDir();
    const output = await inspect({ dir });
    assert.ok(output.includes("Active State"), "should have Active State header");
    assert.ok(output.includes("Sequence:"), "should show sequence info");
  });

  it("filters by kind", async () => {
    const { dir, session } = await createSavedTestDir();
    const state = session.state();

    // Find a kind that exists
    const kinds = new Set([...state.items.values()].map((i) => i.kind));
    if (kinds.size > 0) {
      const kind = [...kinds][0];
      const output = await inspect({ dir, kind });
      assert.ok(output.includes(kind), `should mention the kind "${kind}"`);
    }
  });

  it("returns JSON when --json", async () => {
    const { dir } = await createSavedTestDir();
    const output = await inspect({ dir, json: true });
    const parsed = JSON.parse(output);
    assert.ok(Array.isArray(parsed), "JSON output should be an array");
  });

  it("reports empty for non-existent kind", async () => {
    const { dir } = await createSavedTestDir();
    const output = await inspect({ dir, kind: "nonexistent_kind" as never });
    assert.ok(output.includes("No items"), "should report no items");
  });
});
