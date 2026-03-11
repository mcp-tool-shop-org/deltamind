/**
 * Dogfood fixture 3: Messy exploratory session.
 *
 * Simulates a brainstorming/research session about building a notification
 * system. Full of half-formed ideas, reversals, contradictions, "maybe"s,
 * and competing approaches. Tests whether the advisory boundary and
 * anti-canonization rules hold under real human chaos.
 *
 * Key chaos signals:
 *   - 5 branches, only 1 resolved
 *   - 3 hypotheses that must NOT become decisions
 *   - Mid-session goal pivot
 *   - "Actually no" reversals
 *   - Tangential facts that shouldn't pollute working set
 */

import type { TranscriptFixture } from "../harness/fixture-types.js";

const ts = "2026-03-11T17:00:00.000Z";

export const dogfoodMessy: TranscriptFixture = {
  name: "dogfood-messy",
  class: "messy",
  description: "32-turn messy brainstorm: notification system exploration with reversals, competing hypotheses, and unresolved branches.",
  turns: [
    // Vague start
    { turnId: "t-1", role: "user", content: "I'm thinking about adding notifications to the app. Not sure what kind yet — push, email, in-app, or some combination." },
    { turnId: "t-2", role: "assistant", content: "Notifications is a broad space. Push, email, and in-app each have different infrastructure needs. What's the primary use case?" },
    { turnId: "t-3", role: "user", content: "Mostly transactional — order confirmations, shipping updates, that kind of thing. But maybe promotional too eventually." },
    { turnId: "t-4", role: "assistant", content: "Transactional first, promotional later. For transactional, email is almost always expected. Push and in-app are nice-to-haves." },

    // First hypothesis — immediately uncertain
    { turnId: "t-5", role: "user", content: "I wonder if we should use a third-party service like SendGrid or Twilio, or build our own. SendGrid is probably easier but I don't love vendor lock-in." },
    { turnId: "t-6", role: "assistant", content: "Build vs buy tradeoff. SendGrid gives you deliverability and analytics out of the box. Building your own means owning the whole pipeline but more ops work." },

    // Branch: architecture
    { turnId: "t-7", role: "user", content: "Another question: should notifications be synchronous (send immediately on event) or async with a queue?" },
    { turnId: "t-8", role: "assistant", content: "For transactional at any volume, a queue is strongly recommended. SQS, RabbitMQ, or even a simple Redis queue." },
    { turnId: "t-9", role: "user", content: "Yeah you're probably right about the queue. But which one? I've used Redis before, RabbitMQ seems overkill, and SQS means AWS lock-in." },

    // Goal pivot — suddenly it's about real-time too
    { turnId: "t-10", role: "user", content: "Actually wait. I also need real-time in-app notifications. Like a notification bell with a dropdown. That changes things." },
    { turnId: "t-11", role: "assistant", content: "Real-time in-app adds WebSocket or SSE requirements. That's a different beast from email/push. You'd need a persistent connection layer." },
    { turnId: "t-12", role: "user", content: "WebSocket or SSE... I've heard SSE is simpler but WebSocket is more flexible. Maybe we don't even need real-time? Polling every 30 seconds might be fine." },

    // Tangential fact
    { turnId: "t-13", role: "user", content: "By the way, our current stack is Next.js frontend, Express backend, PostgreSQL. No Redis currently." },
    { turnId: "t-14", role: "assistant", content: "Good to know the stack context. No Redis means adding a Redis queue would be new infrastructure. PostgreSQL LISTEN/NOTIFY could work for basic pub/sub though." },

    // Hypothesis — maybe Postgres is enough
    { turnId: "t-15", role: "user", content: "Oh interesting, Postgres LISTEN/NOTIFY? Maybe that's all we need for now. We could avoid adding any new infrastructure." },
    { turnId: "t-16", role: "assistant", content: "LISTEN/NOTIFY works for low-volume scenarios. The limitation is it's not durable — if no one is listening when the event fires, it's lost. Fine for real-time bells, bad for emails that must send." },

    // Reversal
    { turnId: "t-17", role: "user", content: "Hmm, lost messages isn't acceptable. Forget LISTEN/NOTIFY. We need something durable." },
    { turnId: "t-18", role: "assistant", content: "Agreed — durability is non-negotiable for transactional notifications. That brings us back to a proper queue or a notifications table with a worker." },

    // New hypothesis — outbox pattern
    { turnId: "t-19", role: "user", content: "What about the transactional outbox pattern? Store notifications in a Postgres table, then a background worker picks them up. No new infrastructure needed." },
    { turnId: "t-20", role: "assistant", content: "Outbox pattern is elegant here. Write notification to a table in the same transaction as the business event. Worker polls the table. Exactly-once semantics with the right idempotency keys." },

    // Almost a decision... but not
    { turnId: "t-21", role: "user", content: "I think I like the outbox pattern. But I'm not committing yet — I need to think about scale. If we get to 10k notifications/hour, will Postgres polling hold up?" },
    { turnId: "t-22", role: "assistant", content: "10k/hour is about 3/second. Postgres can easily handle that with indexed polling. You'd probably need a queue at 100k+/hour. So outbox is safe for now." },

    // Hard constraint emerges
    { turnId: "t-23", role: "user", content: "One thing is non-negotiable: users must be able to opt out of any notification type. GDPR compliance requires it." },
    { turnId: "t-24", role: "assistant", content: "Notification preferences with per-type opt-out. That's a data model concern — you'd need a user_notification_preferences table." },

    // Another branch — notification grouping
    { turnId: "t-25", role: "user", content: "Should we batch notifications or send them individually? Like if someone gets 5 updates in an hour, do we send 5 emails or 1 digest?" },
    { turnId: "t-26", role: "assistant", content: "Digests are better UX but harder to implement — you need a batching window, aggregation logic, and template changes. Individual is simpler to start." },

    // More waffling
    { turnId: "t-27", role: "user", content: "Let's figure that out later. For now, individual sends. But keep the architecture open for digests." },

    // Back to the delivery question
    { turnId: "t-28", role: "user", content: "For email delivery, let's go with SendGrid. The deliverability reputation alone is worth it. We can abstract the provider interface if we want to switch later." },
    { turnId: "t-29", role: "assistant", content: "SendGrid for email with a provider abstraction. Good compromise between pragmatism and flexibility." },

    // Real-time still unresolved
    { turnId: "t-30", role: "user", content: "I still haven't decided on real-time. SSE, WebSocket, or polling. Let me sleep on it." },
    { turnId: "t-31", role: "assistant", content: "No rush — the outbox pattern works regardless of the real-time delivery mechanism. You can add SSE/WS/polling on top later." },

    // Closing — still messy
    { turnId: "t-32", role: "user", content: "OK so to recap where we are: outbox pattern probably, SendGrid for email definitely, real-time TBD, preference opt-outs required. Lots still open." },
  ],
  expectedDeltas: [
    // t-1: vague goal
    { kind: "goal_set", id: "g-1", summary: "Add notification system to the app (push, email, in-app — scope TBD)", confidence: "medium", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    // t-5: branch — build vs buy
    { kind: "branch_created", id: "b-1", alternatives: ["Third-party service (SendGrid/Twilio)", "Build own notification pipeline"], sourceTurns: [{ turnId: "t-5" }], timestamp: ts },
    // t-7: branch — sync vs async
    { kind: "branch_created", id: "b-2", alternatives: ["Synchronous (immediate send)", "Asynchronous (queue-based)"], sourceTurns: [{ turnId: "t-7" }], timestamp: ts },
    // t-10: goal expansion — real-time in-app
    { kind: "goal_set", id: "g-2", summary: "Real-time in-app notifications (notification bell with dropdown)", confidence: "medium", sourceTurns: [{ turnId: "t-10" }], timestamp: ts },
    // t-12: branch — real-time mechanism
    { kind: "branch_created", id: "b-3", alternatives: ["WebSocket", "SSE", "Polling (30s interval)"], sourceTurns: [{ turnId: "t-12" }], timestamp: ts },
    // t-13: stack fact
    { kind: "fact_learned", id: "f-1", summary: "Current stack: Next.js frontend, Express backend, PostgreSQL. No Redis.", confidence: "certain", sourceTurns: [{ turnId: "t-13" }], timestamp: ts },
    // t-15: hypothesis — Postgres LISTEN/NOTIFY
    { kind: "hypothesis_introduced", id: "h-1", summary: "Postgres LISTEN/NOTIFY might be sufficient for notification pub/sub", confidence: "low", sourceTurns: [{ turnId: "t-15" }], timestamp: ts },
    // t-17: hypothesis killed
    { kind: "item_superseded", targetId: "h-1", reason: "Not durable — lost messages unacceptable for transactional notifications", sourceTurns: [{ turnId: "t-17" }], timestamp: ts },
    // t-17: durability constraint
    { kind: "constraint_added", id: "c-1", summary: "Notification delivery must be durable — no lost messages", hard: true, sourceTurns: [{ turnId: "t-17" }], timestamp: ts },
    // t-19: hypothesis — outbox pattern (NOT a decision yet per t-21)
    { kind: "hypothesis_introduced", id: "h-2", summary: "Transactional outbox pattern — store in Postgres table, worker picks up", confidence: "medium", sourceTurns: [{ turnId: "t-19" }], timestamp: ts },
    // t-23: GDPR constraint
    { kind: "constraint_added", id: "c-2", summary: "Users must be able to opt out of any notification type (GDPR)", hard: true, sourceTurns: [{ turnId: "t-23" }], timestamp: ts },
    // t-25: branch — batching
    { kind: "branch_created", id: "b-4", alternatives: ["Individual notifications", "Digest/batch notifications"], sourceTurns: [{ turnId: "t-25" }], timestamp: ts },
    // t-28: ACTUAL decision — SendGrid (partially resolves b-1 for email)
    { kind: "decision_made", id: "d-1", summary: "SendGrid for email delivery with provider abstraction interface", confidence: "high", sourceTurns: [{ turnId: "t-28" }], timestamp: ts },
  ],
  expectedItems: [
    { id: "g-1", kind: "goal", status: "active", summaryContains: "notification", minSourceTurns: 1 },
    { id: "g-2", kind: "goal", status: "active", summaryContains: "real-time", minSourceTurns: 1 },
    // b-1 partially resolved (email → SendGrid) but not fully
    { id: "b-1", kind: "hypothesis", status: "tentative", summaryContains: "SendGrid", minSourceTurns: 1 },
    { id: "b-2", kind: "hypothesis", status: "tentative", summaryContains: "Synchronous", minSourceTurns: 1 },
    { id: "b-3", kind: "hypothesis", status: "tentative", summaryContains: "WebSocket", minSourceTurns: 1 },
    { id: "b-4", kind: "hypothesis", status: "tentative", summaryContains: "Individual", minSourceTurns: 1 },
    { id: "f-1", kind: "fact", status: "active", summaryContains: "Next.js", minSourceTurns: 1 },
    { id: "h-1", kind: "hypothesis", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    { id: "h-2", kind: "hypothesis", status: "tentative", summaryContains: "outbox", minSourceTurns: 1 },
    { id: "c-1", kind: "constraint", status: "active", summaryContains: "durable", minSourceTurns: 1 },
    { id: "c-2", kind: "constraint", status: "active", summaryContains: "opt out", minSourceTurns: 1 },
    { id: "d-1", kind: "decision", status: "active", summaryContains: "SendGrid", minSourceTurns: 1 },
  ],
  expectedQueries: {
    activeDecisionIds: ["d-1"],
    activeConstraintIds: ["c-1", "c-2"],
    openTaskIds: [],
    // h-1 superseded (LISTEN/NOTIFY killed)
    supersededIds: ["h-1"],
    // b-1 (build/buy), b-2 (sync/async), b-3 (WS/SSE/poll), b-4 (batch/individual) — all unresolved
    unresolvedBranchIds: ["b-1", "b-2", "b-3", "b-4"],
  },
};
