/**
 * Phase 5B — Semantic ID unit tests.
 *
 * Tests the FNV-1a hash, canonicalization, and semantic ID generation.
 * Key property: equivalent meaning → same semanticId regardless of phrasing.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canonicalize, fnv1a32, semanticId } from "../src/extractor/semantic-id.js";

// ---------------------------------------------------------------------------
// canonicalize()
// ---------------------------------------------------------------------------

describe("canonicalize", () => {
  it("lowercases text", () => {
    assert.equal(canonicalize("Use JWT For Auth"), "use jwt auth");
  });

  it("strips stop words", () => {
    assert.equal(canonicalize("the token is stored in the database"), "token stored database");
  });

  it("normalizes verb forms", () => {
    assert.equal(canonicalize("building a notification system"), "build notification system");
    assert.equal(canonicalize("using Redis for caching"), "use redis caching");
    assert.equal(canonicalize("implementing the plugin API"), "implement plugin api");
    assert.equal(canonicalize("creating a new endpoint"), "create new endpoint");
    assert.equal(canonicalize("adding support for WebSocket"), "add support websocket");
  });

  it("collapses whitespace", () => {
    assert.equal(canonicalize("  multiple   spaces   here  "), "multiple spaces here");
  });

  it("handles empty input", () => {
    assert.equal(canonicalize(""), "");
  });

  it("handles all-stop-word input", () => {
    assert.equal(canonicalize("the a an is are"), "");
  });
});

// ---------------------------------------------------------------------------
// fnv1a32()
// ---------------------------------------------------------------------------

describe("fnv1a32", () => {
  it("produces deterministic output", () => {
    const hash1 = fnv1a32("hello world");
    const hash2 = fnv1a32("hello world");
    assert.equal(hash1, hash2);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = fnv1a32("decision about JWT");
    const hash2 = fnv1a32("decision about session cookies");
    assert.notEqual(hash1, hash2);
  });

  it("returns unsigned 32-bit integer", () => {
    const hash = fnv1a32("test");
    assert.ok(hash >= 0, "hash should be non-negative");
    assert.ok(hash <= 0xFFFFFFFF, "hash should fit in 32 bits");
  });

  it("produces known FNV-1a values", () => {
    // FNV-1a of empty string is the offset basis
    assert.equal(fnv1a32(""), 0x811c9dc5);
  });
});

// ---------------------------------------------------------------------------
// semanticId()
// ---------------------------------------------------------------------------

describe("semanticId", () => {
  it("produces prefix-hash format", () => {
    const sid = semanticId("decision", "Use JWT for authentication");
    assert.match(sid, /^d-[0-9a-f]{8}$/);
  });

  it("uses correct prefix per kind", () => {
    assert.match(semanticId("goal", "Ship v2"), /^g-/);
    assert.match(semanticId("decision", "Use TOML"), /^d-/);
    assert.match(semanticId("constraint", "No breaking changes"), /^c-/);
    assert.match(semanticId("task", "Write tests"), /^t-/);
    assert.match(semanticId("fact", "Stack is Next.js"), /^f-/);
    assert.match(semanticId("hypothesis", "Maybe Redis"), /^h-/);
  });

  it("is deterministic", () => {
    const sid1 = semanticId("decision", "Use SendGrid for email delivery");
    const sid2 = semanticId("decision", "Use SendGrid for email delivery");
    assert.equal(sid1, sid2);
  });

  it("converges on equivalent phrasings — word order", () => {
    // Sorted tokens make order irrelevant
    const sid1 = semanticId("decision", "Use SendGrid for email");
    const sid2 = semanticId("decision", "email SendGrid use for");
    assert.equal(sid1, sid2);
  });

  it("converges on equivalent phrasings — stop words", () => {
    const sid1 = semanticId("decision", "Use JWT for the authentication");
    const sid2 = semanticId("decision", "Use JWT authentication");
    assert.equal(sid1, sid2);
  });

  it("converges on equivalent phrasings — verb forms", () => {
    const sid1 = semanticId("decision", "Using Redis for caching");
    const sid2 = semanticId("decision", "Use Redis for caching");
    assert.equal(sid1, sid2);
  });

  it("converges on equivalent phrasings — case", () => {
    const sid1 = semanticId("decision", "Use TOML config format");
    const sid2 = semanticId("decision", "use toml config format");
    assert.equal(sid1, sid2);
  });

  it("diverges on genuinely different content", () => {
    const sid1 = semanticId("decision", "Use JWT for authentication");
    const sid2 = semanticId("decision", "Use session cookies for authentication");
    assert.notEqual(sid1, sid2);
  });

  it("diverges across different kinds even with same summary", () => {
    const sid1 = semanticId("decision", "Use Redis");
    const sid2 = semanticId("hypothesis", "Use Redis");
    assert.notEqual(sid1, sid2);
  });

  it("handles long summaries", () => {
    const long = "Use the transactional outbox pattern with PostgreSQL table and background worker polling for notification delivery to ensure exactly-once semantics with idempotency keys";
    const sid = semanticId("decision", long);
    assert.match(sid, /^d-[0-9a-f]{8}$/);
  });
});

// ---------------------------------------------------------------------------
// Cross-extractor convergence (the whole point)
// ---------------------------------------------------------------------------

describe("cross-extractor convergence", () => {
  it("rule-phrased and LLM-phrased decisions produce same semanticId", () => {
    // Rule extractor typically captures: "Use JWT for auth tokens"
    // LLM extractor might produce: "JWT used for authentication tokens"
    // After canonicalization + sort: both → "auth jwt tokens use" (approx)
    const ruleSid = semanticId("decision", "Use JWT for auth tokens");
    const llmSid = semanticId("decision", "JWT auth tokens use");
    // These should converge because sorted tokens are the same
    assert.equal(ruleSid, llmSid);
  });

  it("similar but not identical phrasings may diverge (expected)", () => {
    // Significantly different word choice → different hash
    const sid1 = semanticId("decision", "Use PostgreSQL for data storage");
    const sid2 = semanticId("decision", "Choose Postgres as database");
    // These have different tokens after canonicalization, so they diverge.
    // This is expected — semantic hashing is conservative.
    // The fuzzy matcher handles approximate matches.
    assert.notEqual(sid1, sid2);
  });
});
