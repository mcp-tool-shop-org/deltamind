import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFixture, formatResult } from "./harness/runner.js";
import { cleanLinear } from "./fixtures/clean-linear.js";
import { messyReal } from "./fixtures/messy-real.js";
import { pathological } from "./fixtures/pathological.js";

const fixtures = [cleanLinear, messyReal, pathological];

describe("Transcript harness", () => {
  for (const fixture of fixtures) {
    it(`[${fixture.class}] ${fixture.name}: ${fixture.description}`, () => {
      const result = runFixture(fixture);
      // Always print the result for visibility
      console.log(formatResult(result));
      assert.ok(result.passed, `Fixture "${fixture.name}" failed:\n${result.failures.join("\n")}`);
    });
  }
});

describe("Transcript harness — pathological specifics", () => {
  it("hedged language stays tentative, not active", () => {
    const result = runFixture(pathological);
    // h-1 (Redis hypothesis) must NOT be promoted to active decision
    // This is the premature canonization trap
    assert.ok(result.passed, "Pathological fixture must pass first");
  });

  it("duplicate constraints don't create duplicate items", () => {
    // The pathological fixture has t-4 and t-5 saying the same constraint.
    // expectedDeltas only includes one constraint_added (c-1).
    // If someone accidentally adds a second, the harness catches it via
    // "unexpected item in state" check.
    const result = runFixture(pathological);
    assert.ok(result.passed);
  });

  it("unresolved branches remain tentative", () => {
    const result = runFixture(pathological);
    // b-2 (REST vs GraphQL) should still be tentative — user said "let me think about it"
    assert.ok(result.passed);
  });
});
