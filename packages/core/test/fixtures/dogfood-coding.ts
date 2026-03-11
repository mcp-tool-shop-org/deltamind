/**
 * Dogfood fixture 1: Coding session.
 *
 * Simulates refactoring an authentication module from session-based to JWT.
 * High task churn, decision revisions, constraint tightening, supersession.
 * This is what a real coding session looks like — quick decisions, tool output
 * noise, mid-stream reversals, and incremental task closure.
 */

import type { TranscriptFixture } from "../harness/fixture-types.js";

const ts = "2026-03-11T15:00:00.000Z";

export const dogfoodCoding: TranscriptFixture = {
  name: "dogfood-coding",
  class: "messy",
  description: "35-turn coding session: auth module refactor from sessions to JWT, with task churn, mid-stream reversals, and constraint tightening.",
  turns: [
    // Kickoff — goal + initial decision
    { turnId: "t-1", role: "user", content: "We need to refactor the auth module. It's session-based right now and we're moving to JWT for the new microservice architecture." },
    { turnId: "t-2", role: "assistant", content: "Got it. Moving from session-based auth to JWT. This will affect the login flow, middleware, and all the protected routes." },
    { turnId: "t-3", role: "user", content: "Use jsonwebtoken for signing. Access + refresh token pattern." },
    { turnId: "t-4", role: "assistant", content: "jsonwebtoken for signing, access + refresh tokens. What expiry times?" },
    { turnId: "t-5", role: "user", content: "Access tokens: 30 minutes. Refresh tokens: 7 days. Refresh tokens stored in HttpOnly cookies." },
    { turnId: "t-6", role: "assistant", content: "30 min access / 7 day refresh / HttpOnly cookie storage. Solid. I'll also need to handle token rotation on refresh." },

    // Constraint: backwards compat
    { turnId: "t-7", role: "user", content: "Critical requirement: the old session endpoints need to keep working for 2 weeks during the migration. Both auth paths must coexist." },
    { turnId: "t-8", role: "assistant", content: "Understood — dual auth for 2 weeks. I'll create a hybrid middleware that checks JWT first, falls back to session." },

    // Task 1: strip session from middleware
    { turnId: "t-9", role: "assistant", content: "Starting with the auth middleware. Extracting the session logic into a legacy wrapper and building the JWT path alongside it." },
    { turnId: "t-10", role: "assistant", content: "Auth middleware refactored. JWT verification is the primary path now, session fallback active. Tests updated." },

    // Task 2: token issuance
    { turnId: "t-11", role: "user", content: "Now update the login endpoint to issue JWTs instead of creating sessions." },
    { turnId: "t-12", role: "assistant", content: "Working on POST /auth/login. It'll return { accessToken, refreshToken, expiresIn }. Refresh token set as HttpOnly cookie too." },
    { turnId: "t-13", role: "assistant", content: "Login endpoint updated. Issuing JWTs now. Old session creation still happens in parallel for backwards compat." },

    // Decision revision — someone upstream changes the requirement
    { turnId: "t-14", role: "user", content: "Actually, the team decided refresh tokens should NOT be in cookies. Mobile clients can't use HttpOnly cookies. Put them in the response body only." },
    { turnId: "t-15", role: "assistant", content: "Changed — refresh tokens in response body only, no cookie. Mobile-friendly. I'll update the login and refresh endpoints." },

    // Task 3: refresh endpoint
    { turnId: "t-16", role: "user", content: "Build the token refresh endpoint. POST /auth/refresh with the refresh token in the body." },
    { turnId: "t-17", role: "assistant", content: "POST /auth/refresh implemented. Validates refresh token, checks it hasn't been revoked, issues new access + refresh pair. Old refresh token invalidated (rotation)." },

    // Constraint tightening
    { turnId: "t-18", role: "user", content: "Security review says access tokens need to be 15 minutes, not 30. And we need to add token revocation support." },
    { turnId: "t-19", role: "assistant", content: "Tightened to 15 min access tokens. For revocation, I'll add a token blacklist table — check on every request." },

    // Task 4: revocation
    { turnId: "t-20", role: "user", content: "Use Redis for the blacklist, not a database table. It needs to be fast and tokens auto-expire." },
    { turnId: "t-21", role: "assistant", content: "Redis blacklist with TTL matching token expiry. Added POST /auth/revoke endpoint. Middleware checks blacklist on every request." },

    // Task 5: update all protected routes
    { turnId: "t-22", role: "user", content: "Now go through all the protected routes and make sure they work with the new JWT middleware." },
    { turnId: "t-23", role: "assistant", content: "Auditing protected routes. Found 14 routes across 4 controllers. Updating imports and middleware references." },
    { turnId: "t-24", role: "assistant", content: "All 14 routes updated. Using the new jwtRequired middleware. Tests passing for 12 of 14 — the admin routes need special handling." },
    { turnId: "t-25", role: "user", content: "What's wrong with the admin routes?" },
    { turnId: "t-26", role: "assistant", content: "Admin routes were checking session.user.role directly. JWT tokens don't have roles by default. I need to add role claims to the token payload." },
    { turnId: "t-27", role: "assistant", content: "Added role claim to JWT payload. Admin middleware checks decoded.role === 'admin'. All 14 routes passing now." },

    // Fact learned mid-stream
    { turnId: "t-28", role: "user", content: "Good catch on the roles. FYI, the mobile team says they'll start using the JWT endpoints next Monday." },

    // Task 6: cleanup + final tests
    { turnId: "t-29", role: "user", content: "Run the full test suite and fix anything broken." },
    { turnId: "t-30", role: "assistant", content: "Running full suite. 47 tests... 43 passing, 4 failing. The failures are in the integration tests that still expect session cookies." },
    { turnId: "t-31", role: "assistant", content: "Fixed the 4 failing tests — they were asserting on Set-Cookie headers. Updated to check for JWT in response body instead. 47/47 passing." },

    // Backwards compat constraint update
    { turnId: "t-32", role: "user", content: "Actually make the migration window 4 weeks, not 2. The mobile team needs more time." },
    { turnId: "t-33", role: "assistant", content: "Extended dual-auth migration window to 4 weeks. I'll add a deprecation warning header to session-auth responses." },

    // Wrap up
    { turnId: "t-34", role: "user", content: "Looks solid. Anything else we should handle?" },
    { turnId: "t-35", role: "assistant", content: "Three things to consider: 1) Add JWT to the OpenAPI spec, 2) Document the migration timeline for other teams, 3) Set up monitoring for the legacy session path usage so we know when to remove it. But the core refactor is done." },
  ],
  expectedDeltas: [
    // t-1: goal
    { kind: "goal_set", id: "g-1", summary: "Refactor auth module from session-based to JWT for microservice architecture", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    // t-3: signing library decision
    { kind: "decision_made", id: "d-1", summary: "Use jsonwebtoken library for JWT signing", confidence: "certain", sourceTurns: [{ turnId: "t-3" }], timestamp: ts },
    // t-5: token config decision
    { kind: "decision_made", id: "d-2", summary: "Access tokens 30 min, refresh tokens 7 days, refresh in HttpOnly cookies", confidence: "high", sourceTurns: [{ turnId: "t-5" }], timestamp: ts },
    // t-7: backwards compat constraint
    { kind: "constraint_added", id: "c-1", summary: "Both auth paths (session + JWT) must coexist for 2-week migration window", hard: true, sourceTurns: [{ turnId: "t-7" }], timestamp: ts },
    // t-9: middleware task
    { kind: "task_opened", id: "task-1", summary: "Refactor auth middleware — JWT primary, session fallback", sourceTurns: [{ turnId: "t-9" }], timestamp: ts },
    // t-10: middleware done
    { kind: "task_closed", targetId: "task-1", resolution: "JWT verification primary, session fallback active, tests updated", sourceTurns: [{ turnId: "t-10" }], timestamp: ts },
    // t-11: login endpoint task
    { kind: "task_opened", id: "task-2", summary: "Update login endpoint to issue JWTs", sourceTurns: [{ turnId: "t-11" }], timestamp: ts },
    // t-13: login done
    { kind: "task_closed", targetId: "task-2", resolution: "Login issues JWTs, parallel session creation for backwards compat", sourceTurns: [{ turnId: "t-13" }], timestamp: ts },
    // t-14: DECISION REVISION — no cookies for refresh tokens
    { kind: "decision_revised", targetId: "d-2", summary: "Access tokens 30 min, refresh tokens 7 days, response body only (no cookies — mobile can't use HttpOnly)", confidence: "high", sourceTurns: [{ turnId: "t-14" }], timestamp: ts },
    // t-16: refresh endpoint task
    { kind: "task_opened", id: "task-3", summary: "Build token refresh endpoint (POST /auth/refresh)", sourceTurns: [{ turnId: "t-16" }], timestamp: ts },
    // t-17: refresh done
    { kind: "task_closed", targetId: "task-3", resolution: "Refresh endpoint with token rotation, revocation check", sourceTurns: [{ turnId: "t-17" }], timestamp: ts },
    // t-18: CONSTRAINT TIGHTENED — 15 min, not 30
    { kind: "constraint_revised", targetId: "d-2", summary: "Access token expiry tightened to 15 minutes (security review)", mode: "tightened", sourceTurns: [{ turnId: "t-18" }], timestamp: ts },
    // t-18: also adds revocation requirement
    { kind: "constraint_added", id: "c-2", summary: "Token revocation support required", hard: true, sourceTurns: [{ turnId: "t-18" }], timestamp: ts },
    // t-20: revocation implementation decision
    { kind: "decision_made", id: "d-3", summary: "Redis blacklist for token revocation with TTL auto-expiry", confidence: "high", sourceTurns: [{ turnId: "t-20" }], timestamp: ts },
    // t-20: revocation task
    { kind: "task_opened", id: "task-4", summary: "Implement token revocation with Redis blacklist", sourceTurns: [{ turnId: "t-20" }], timestamp: ts },
    // t-21: revocation done
    { kind: "task_closed", targetId: "task-4", resolution: "Redis blacklist, POST /auth/revoke, middleware check on every request", sourceTurns: [{ turnId: "t-21" }], timestamp: ts },
    // t-22: routes audit task
    { kind: "task_opened", id: "task-5", summary: "Update all 14 protected routes to use JWT middleware", sourceTurns: [{ turnId: "t-22" }], timestamp: ts },
    // t-26: fact — roles not in JWT
    { kind: "fact_learned", id: "f-1", summary: "Admin routes require role claims in JWT payload (were using session.user.role)", confidence: "certain", sourceTurns: [{ turnId: "t-26" }], timestamp: ts },
    // t-27: routes done (including role fix)
    { kind: "task_closed", targetId: "task-5", resolution: "All 14 routes updated, role claims added to JWT payload", sourceTurns: [{ turnId: "t-27" }], timestamp: ts },
    // t-28: fact — mobile timeline
    { kind: "fact_learned", id: "f-2", summary: "Mobile team starts using JWT endpoints next Monday", confidence: "high", sourceTurns: [{ turnId: "t-28" }], timestamp: ts },
    // t-29: test fix task
    { kind: "task_opened", id: "task-6", summary: "Run full test suite and fix failures", sourceTurns: [{ turnId: "t-29" }], timestamp: ts },
    // t-31: tests fixed
    { kind: "task_closed", targetId: "task-6", resolution: "47/47 tests passing — updated session cookie assertions to JWT body checks", sourceTurns: [{ turnId: "t-31" }], timestamp: ts },
    // t-32: CONSTRAINT REVISED — 4 weeks not 2
    { kind: "constraint_revised", targetId: "c-1", summary: "Migration window extended to 4 weeks (mobile team needs more time)", mode: "relaxed", sourceTurns: [{ turnId: "t-32" }], timestamp: ts },
  ],
  expectedItems: [
    { id: "g-1", kind: "goal", status: "active", summaryContains: "JWT", minSourceTurns: 1 },
    { id: "d-1", kind: "decision", status: "active", summaryContains: "jsonwebtoken", minSourceTurns: 1 },
    { id: "d-2", kind: "decision", status: "active", summaryContains: "response body", minSourceTurns: 2 },
    { id: "d-3", kind: "decision", status: "active", summaryContains: "Redis", minSourceTurns: 1 },
    { id: "c-1", kind: "constraint", status: "active", summaryContains: "4 week", minSourceTurns: 2 },
    { id: "c-2", kind: "constraint", status: "active", summaryContains: "revocation", minSourceTurns: 1 },
    { id: "f-1", kind: "fact", status: "active", summaryContains: "role", minSourceTurns: 1 },
    { id: "f-2", kind: "fact", status: "active", summaryContains: "mobile", minSourceTurns: 1 },
    { id: "task-1", kind: "task", status: "resolved", summaryContains: "middleware", minSourceTurns: 2 },
    { id: "task-2", kind: "task", status: "resolved", summaryContains: "login", minSourceTurns: 2 },
    { id: "task-3", kind: "task", status: "resolved", summaryContains: "refresh", minSourceTurns: 2 },
    { id: "task-4", kind: "task", status: "resolved", summaryContains: "revocation", minSourceTurns: 2 },
    { id: "task-5", kind: "task", status: "resolved", summaryContains: "route", minSourceTurns: 2 },
    { id: "task-6", kind: "task", status: "resolved", summaryContains: "test", minSourceTurns: 2 },
  ],
  expectedQueries: {
    activeDecisionIds: ["d-1", "d-2", "d-3"],
    activeConstraintIds: ["c-1", "c-2"],
    openTaskIds: [],
    supersededIds: [],
    unresolvedBranchIds: [],
  },
};
