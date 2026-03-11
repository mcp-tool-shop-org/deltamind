/**
 * Long linear build session (56 turns).
 *
 * A project moves from vague idea to concrete decisions. Several tasks close,
 * a couple decisions get revised, constraints tighten. Realistic coding session
 * with tool output noise, repeated confirmations, and natural progression.
 */

import type { TranscriptFixture } from "../harness/fixture-types.js";

const ts = "2026-03-11T14:00:00.000Z";

export const longLinear: TranscriptFixture = {
  name: "long-linear",
  class: "clean",
  description: "56-turn project build: REST API from idea to deployed, with task progression, constraint tightening, and two decision revisions.",
  turns: [
    // Phase: project inception
    { turnId: "t-1", role: "user", content: "I want to build a REST API for a bookmark manager. Users should be able to save, tag, and search bookmarks." },
    { turnId: "t-2", role: "assistant", content: "Got it — a bookmark manager API with save, tag, and search functionality. Let me think about the stack." },
    { turnId: "t-3", role: "user", content: "Use Node.js with Express. TypeScript of course." },
    { turnId: "t-4", role: "assistant", content: "Node.js + Express + TypeScript. Good choice. What about the database?" },
    { turnId: "t-5", role: "user", content: "PostgreSQL. We'll use Prisma as the ORM." },
    { turnId: "t-6", role: "assistant", content: "PostgreSQL with Prisma ORM. I'll set up the schema with bookmarks, tags, and users tables." },
    // Phase: constraints
    { turnId: "t-7", role: "user", content: "Important: all endpoints must require authentication. No public endpoints." },
    { turnId: "t-8", role: "assistant", content: "Understood — every endpoint requires auth. I'll set up JWT middleware." },
    { turnId: "t-9", role: "user", content: "Use JWT with refresh tokens. Access tokens expire in 15 minutes." },
    { turnId: "t-10", role: "assistant", content: "JWT with refresh tokens, 15-minute access token expiry. That's a solid auth setup." },
    { turnId: "t-11", role: "user", content: "Oh and rate limiting. 100 requests per minute per user." },
    { turnId: "t-12", role: "assistant", content: "Rate limiting at 100 req/min per user. I'll use express-rate-limit with a Redis store." },
    // Phase: scaffolding task
    { turnId: "t-13", role: "assistant", content: "Let me scaffold the project now. Setting up the directory structure, tsconfig, and package.json." },
    { turnId: "t-14", role: "assistant", content: "Scaffold complete. Created src/, prisma/, test/ directories. TypeScript configured. Express installed." },
    { turnId: "t-15", role: "user", content: "Looks good. Now set up the Prisma schema." },
    // Phase: database schema task
    { turnId: "t-16", role: "assistant", content: "Working on the Prisma schema. I'll create User, Bookmark, and Tag models with proper relations." },
    { turnId: "t-17", role: "assistant", content: "Prisma schema done. User has many Bookmarks, Bookmark has many Tags (many-to-many via BookmarkTag join table). Added indexes on url and createdAt." },
    { turnId: "t-18", role: "user", content: "Add a description field to bookmarks too. Max 500 characters." },
    { turnId: "t-19", role: "assistant", content: "Added description field to Bookmark model with @db.VarChar(500). Migration created and applied." },
    // Phase: auth implementation
    { turnId: "t-20", role: "user", content: "Great. Now implement the auth endpoints — register, login, refresh, logout." },
    { turnId: "t-21", role: "assistant", content: "Working on auth. POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout." },
    { turnId: "t-22", role: "assistant", content: "Auth endpoints done. Using bcrypt for password hashing, jsonwebtoken for JWT. Refresh tokens stored in the database." },
    { turnId: "t-23", role: "user", content: "Can you add email verification? Actually, no — skip that for MVP. We can add it later." },
    { turnId: "t-24", role: "assistant", content: "Noted — no email verification for MVP. We'll keep it simple." },
    // Phase: CRUD implementation
    { turnId: "t-25", role: "user", content: "Now the bookmark CRUD. Create, read, update, delete. Standard REST patterns." },
    { turnId: "t-26", role: "assistant", content: "Implementing bookmark CRUD. POST /bookmarks, GET /bookmarks, GET /bookmarks/:id, PUT /bookmarks/:id, DELETE /bookmarks/:id." },
    { turnId: "t-27", role: "assistant", content: "CRUD endpoints done. All routes protected by auth middleware. Pagination on the list endpoint (default 20 per page)." },
    { turnId: "t-28", role: "user", content: "Good. Add tag management — users should be able to add/remove tags on bookmarks." },
    { turnId: "t-29", role: "assistant", content: "Tag management: POST /bookmarks/:id/tags, DELETE /bookmarks/:id/tags/:tagId. Tags auto-created if they don't exist." },
    // Phase: search
    { turnId: "t-30", role: "user", content: "Now search. Full-text search across bookmark titles, descriptions, and URLs. Also filter by tags." },
    { turnId: "t-31", role: "assistant", content: "Implementing search. GET /bookmarks/search?q=term&tags=tag1,tag2. Using PostgreSQL full-text search with ts_vector." },
    { turnId: "t-32", role: "assistant", content: "Search endpoint done. Full-text search on title + description + url. Tag filtering with AND logic. Results sorted by relevance score." },
    // Phase: first decision revision — rate limiting store
    { turnId: "t-33", role: "user", content: "Actually, I don't want to run Redis just for rate limiting. Can we use an in-memory store instead?" },
    { turnId: "t-34", role: "assistant", content: "Good call — Redis is overkill just for rate limiting on a single instance. I'll switch to the in-memory store from express-rate-limit. If you scale horizontally later, you can add Redis back." },
    // Phase: testing
    { turnId: "t-35", role: "user", content: "Time for tests. Write integration tests for all endpoints." },
    { turnId: "t-36", role: "assistant", content: "Setting up test infrastructure. Using vitest with supertest for HTTP testing. Test database via Docker Compose." },
    { turnId: "t-37", role: "assistant", content: "Writing auth tests first — register, login, refresh, logout, and unauthorized access." },
    { turnId: "t-38", role: "assistant", content: "Auth tests done — 8 test cases passing. Now working on bookmark CRUD tests." },
    { turnId: "t-39", role: "assistant", content: "Bookmark CRUD tests done — 12 test cases. Including pagination, auth required, not-found handling." },
    { turnId: "t-40", role: "assistant", content: "Tag management tests done — 6 test cases. Auto-creation, removal, duplicate handling." },
    { turnId: "t-41", role: "assistant", content: "Search tests done — 8 test cases. Full-text matching, tag filtering, relevance sorting, empty results." },
    { turnId: "t-42", role: "user", content: "How many tests total?" },
    { turnId: "t-43", role: "assistant", content: "34 integration tests total, all passing. Auth: 8, CRUD: 12, Tags: 6, Search: 8." },
    // Phase: error handling refinement
    { turnId: "t-44", role: "user", content: "Add proper error responses. Every error should have a code, message, and hint field." },
    { turnId: "t-45", role: "assistant", content: "Implementing structured error responses: { code: string, message: string, hint: string }. Custom error classes for validation, auth, not-found, and rate-limit errors." },
    { turnId: "t-46", role: "assistant", content: "Error handling done. All endpoints return structured errors. Added a global error handler middleware." },
    // Phase: second decision revision — auth token expiry
    { turnId: "t-47", role: "user", content: "Actually, 15 minutes for access tokens is too short. Make it 1 hour. Our users won't be dealing with sensitive data." },
    { turnId: "t-48", role: "assistant", content: "Access token expiry changed from 15 minutes to 1 hour. Updated the JWT config and the relevant tests." },
    // Phase: deployment prep
    { turnId: "t-49", role: "user", content: "Let's prep for deployment. Add a Dockerfile and health check endpoint." },
    { turnId: "t-50", role: "assistant", content: "Working on deployment. Multi-stage Dockerfile, health check at GET /health (no auth required — exception to the auth constraint)." },
    { turnId: "t-51", role: "user", content: "The health check can be public, that's fine." },
    { turnId: "t-52", role: "assistant", content: "Dockerfile and health check done. The health endpoint returns { status: 'ok', version: '1.0.0' }." },
    // Phase: documentation
    { turnId: "t-53", role: "user", content: "Generate an OpenAPI spec from the routes." },
    { turnId: "t-54", role: "assistant", content: "OpenAPI 3.0 spec generated. All endpoints documented with request/response schemas, auth requirements, and error responses." },
    { turnId: "t-55", role: "user", content: "Perfect. I think we're ready to deploy. Any last things?" },
    { turnId: "t-56", role: "assistant", content: "Everything looks solid. 34 tests passing, structured errors, auth on all endpoints (except health), rate limiting, Docker ready, OpenAPI spec generated. Good to ship." },
  ],
  expectedDeltas: [
    // t-1: goal
    { kind: "goal_set", id: "g-1", summary: "Build REST API for bookmark manager (save, tag, search)", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    // t-3: decisions
    { kind: "decision_made", id: "d-1", summary: "Use Node.js with Express, TypeScript", confidence: "certain", sourceTurns: [{ turnId: "t-3" }], timestamp: ts },
    // t-5: database decision
    { kind: "decision_made", id: "d-2", summary: "PostgreSQL with Prisma ORM", confidence: "certain", sourceTurns: [{ turnId: "t-5" }], timestamp: ts },
    // t-7: auth constraint
    { kind: "constraint_added", id: "c-1", summary: "All endpoints require authentication (no public endpoints)", hard: true, sourceTurns: [{ turnId: "t-7" }], timestamp: ts },
    // t-9: auth decision
    { kind: "decision_made", id: "d-3", summary: "JWT with refresh tokens, 15-minute access token expiry", confidence: "high", sourceTurns: [{ turnId: "t-9" }], timestamp: ts },
    // t-11: rate limit constraint
    { kind: "constraint_added", id: "c-2", summary: "Rate limiting: 100 requests per minute per user", hard: true, sourceTurns: [{ turnId: "t-11" }], timestamp: ts },
    // t-12: rate limit implementation decision
    { kind: "decision_made", id: "d-4", summary: "Use express-rate-limit with Redis store for rate limiting", confidence: "high", sourceTurns: [{ turnId: "t-12" }], timestamp: ts },
    // t-13: scaffold task
    { kind: "task_opened", id: "task-1", summary: "Scaffold project structure", sourceTurns: [{ turnId: "t-13" }], timestamp: ts },
    // t-14: scaffold done
    { kind: "task_closed", targetId: "task-1", resolution: "Directory structure, tsconfig, packages set up", sourceTurns: [{ turnId: "t-14" }], timestamp: ts },
    // t-16: prisma schema task
    { kind: "task_opened", id: "task-2", summary: "Create Prisma database schema", sourceTurns: [{ turnId: "t-16" }], timestamp: ts },
    // t-17: schema done (but modified in t-18/19)
    { kind: "task_closed", targetId: "task-2", resolution: "User, Bookmark, Tag models with relations and indexes. Description field added (500 char max)", sourceTurns: [{ turnId: "t-19" }], timestamp: ts },
    // t-18: fact — description constraint
    { kind: "constraint_added", id: "c-3", summary: "Bookmark description max 500 characters", hard: true, sourceTurns: [{ turnId: "t-18" }], timestamp: ts },
    // t-20: auth task
    { kind: "task_opened", id: "task-3", summary: "Implement auth endpoints (register, login, refresh, logout)", sourceTurns: [{ turnId: "t-20" }], timestamp: ts },
    // t-22: auth done
    { kind: "task_closed", targetId: "task-3", resolution: "Auth endpoints complete — bcrypt hashing, JWT, refresh tokens in DB", sourceTurns: [{ turnId: "t-22" }], timestamp: ts },
    // t-23: rejected option
    { kind: "fact_learned", id: "f-1", summary: "Email verification skipped for MVP — deferred to later", confidence: "certain", sourceTurns: [{ turnId: "t-23" }], timestamp: ts },
    // t-25: CRUD task
    { kind: "task_opened", id: "task-4", summary: "Implement bookmark CRUD endpoints", sourceTurns: [{ turnId: "t-25" }], timestamp: ts },
    // t-27: CRUD done
    { kind: "task_closed", targetId: "task-4", resolution: "CRUD complete with auth middleware, pagination (20/page)", sourceTurns: [{ turnId: "t-27" }], timestamp: ts },
    // t-28: tags task
    { kind: "task_opened", id: "task-5", summary: "Implement tag management on bookmarks", sourceTurns: [{ turnId: "t-28" }], timestamp: ts },
    // t-29: tags done
    { kind: "task_closed", targetId: "task-5", resolution: "Add/remove tags, auto-creation of new tags", sourceTurns: [{ turnId: "t-29" }], timestamp: ts },
    // t-30: search task
    { kind: "task_opened", id: "task-6", summary: "Implement full-text search with tag filtering", sourceTurns: [{ turnId: "t-30" }], timestamp: ts },
    // t-32: search done
    { kind: "task_closed", targetId: "task-6", resolution: "PostgreSQL ts_vector search on title+desc+url, tag AND filtering, relevance sorting", sourceTurns: [{ turnId: "t-32" }], timestamp: ts },
    // t-33: FIRST DECISION REVISION — rate limiting store
    { kind: "item_superseded", targetId: "d-4", reason: "Redis overkill for single-instance rate limiting", sourceTurns: [{ turnId: "t-33" }], timestamp: ts },
    { kind: "decision_made", id: "d-5", summary: "Use in-memory store for rate limiting (switch to Redis if scaling horizontally)", confidence: "high", sourceTurns: [{ turnId: "t-33" }], timestamp: ts },
    // t-35: testing task
    { kind: "task_opened", id: "task-7", summary: "Write integration tests for all endpoints", sourceTurns: [{ turnId: "t-35" }], timestamp: ts },
    // t-36: testing infrastructure decision
    { kind: "decision_made", id: "d-6", summary: "Vitest + supertest for testing, Docker Compose for test DB", confidence: "high", sourceTurns: [{ turnId: "t-36" }], timestamp: ts },
    // t-43: tests done
    { kind: "task_closed", targetId: "task-7", resolution: "34 integration tests passing (auth:8, CRUD:12, tags:6, search:8)", sourceTurns: [{ turnId: "t-43" }], timestamp: ts },
    // t-44: error handling task
    { kind: "task_opened", id: "task-8", summary: "Add structured error responses (code/message/hint)", sourceTurns: [{ turnId: "t-44" }], timestamp: ts },
    // t-44: error shape constraint
    { kind: "constraint_added", id: "c-4", summary: "All errors must have { code, message, hint } shape", hard: true, sourceTurns: [{ turnId: "t-44" }], timestamp: ts },
    // t-46: error handling done
    { kind: "task_closed", targetId: "task-8", resolution: "Structured errors with global error handler middleware", sourceTurns: [{ turnId: "t-46" }], timestamp: ts },
    // t-47: SECOND DECISION REVISION — token expiry
    { kind: "decision_revised", targetId: "d-3", summary: "JWT with refresh tokens, 1-hour access token expiry (changed from 15 min)", confidence: "high", sourceTurns: [{ turnId: "t-47" }], timestamp: ts },
    // t-49: deployment task
    { kind: "task_opened", id: "task-9", summary: "Deployment prep — Dockerfile and health check", sourceTurns: [{ turnId: "t-49" }], timestamp: ts },
    // t-50: health check exception to auth constraint
    { kind: "fact_learned", id: "f-2", summary: "GET /health is public (approved exception to auth constraint)", confidence: "certain", sourceTurns: [{ turnId: "t-50" }], timestamp: ts },
    // t-52: deployment done
    { kind: "task_closed", targetId: "task-9", resolution: "Multi-stage Dockerfile + /health endpoint done", sourceTurns: [{ turnId: "t-52" }], timestamp: ts },
    // t-53: docs task
    { kind: "task_opened", id: "task-10", summary: "Generate OpenAPI spec", sourceTurns: [{ turnId: "t-53" }], timestamp: ts },
    // t-54: docs done
    { kind: "task_closed", targetId: "task-10", resolution: "OpenAPI 3.0 spec with all endpoints, schemas, auth, errors", sourceTurns: [{ turnId: "t-54" }], timestamp: ts },
  ],
  expectedItems: [
    { id: "g-1", kind: "goal", status: "active", summaryContains: "bookmark", minSourceTurns: 1 },
    { id: "d-1", kind: "decision", status: "active", summaryContains: "Express", minSourceTurns: 1 },
    { id: "d-2", kind: "decision", status: "active", summaryContains: "PostgreSQL", minSourceTurns: 1 },
    { id: "d-3", kind: "decision", status: "active", summaryContains: "1-hour", minSourceTurns: 2 },
    { id: "d-4", kind: "decision", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    { id: "d-5", kind: "decision", status: "active", summaryContains: "in-memory", minSourceTurns: 1 },
    { id: "d-6", kind: "decision", status: "active", summaryContains: "Vitest", minSourceTurns: 1 },
    { id: "c-1", kind: "constraint", status: "active", summaryContains: "authentication", minSourceTurns: 1 },
    { id: "c-2", kind: "constraint", status: "active", summaryContains: "100", minSourceTurns: 1 },
    { id: "c-3", kind: "constraint", status: "active", summaryContains: "500", minSourceTurns: 1 },
    { id: "c-4", kind: "constraint", status: "active", summaryContains: "code", minSourceTurns: 1 },
    { id: "f-1", kind: "fact", status: "active", summaryContains: "email", minSourceTurns: 1 },
    { id: "f-2", kind: "fact", status: "active", summaryContains: "health", minSourceTurns: 1 },
    { id: "task-1", kind: "task", status: "resolved", summaryContains: "Scaffold", minSourceTurns: 2 },
    { id: "task-2", kind: "task", status: "resolved", summaryContains: "Prisma", minSourceTurns: 2 },
    { id: "task-3", kind: "task", status: "resolved", summaryContains: "auth", minSourceTurns: 2 },
    { id: "task-4", kind: "task", status: "resolved", summaryContains: "CRUD", minSourceTurns: 2 },
    { id: "task-5", kind: "task", status: "resolved", summaryContains: "tag", minSourceTurns: 2 },
    { id: "task-6", kind: "task", status: "resolved", summaryContains: "search", minSourceTurns: 2 },
    { id: "task-7", kind: "task", status: "resolved", summaryContains: "test", minSourceTurns: 2 },
    { id: "task-8", kind: "task", status: "resolved", summaryContains: "error", minSourceTurns: 2 },
    { id: "task-9", kind: "task", status: "resolved", summaryContains: "Deployment", minSourceTurns: 2 },
    { id: "task-10", kind: "task", status: "resolved", summaryContains: "OpenAPI", minSourceTurns: 2 },
  ],
  expectedQueries: {
    activeDecisionIds: ["d-1", "d-2", "d-3", "d-5", "d-6"],
    activeConstraintIds: ["c-1", "c-2", "c-3", "c-4"],
    openTaskIds: [],
    supersededIds: ["d-4"],
    unresolvedBranchIds: [],
  },
};
