/**
 * Long pathological adversarial session (58 turns).
 *
 * Speculation phrased like fact, duplicate decisions with different wording,
 * abandoned branches, stale constraints, task reopenings, reversals,
 * confidence traps, and premature canonization bait.
 */

import type { TranscriptFixture } from "../harness/fixture-types.js";

const ts = "2026-03-11T16:00:00.000Z";

export const longPathological: TranscriptFixture = {
  name: "long-pathological",
  class: "pathological",
  description: "58-turn adversarial session: ML pipeline design with speculation-as-fact, duplicate semantics, abandoned branches, reversals, task reopenings, and confidence traps.",
  turns: [
    // Phase 1: Vague start with speculation
    { turnId: "t-1", role: "user", content: "I'm building an ML inference pipeline. Probably going to use Python." },
    { turnId: "t-2", role: "assistant", content: "Python is the standard for ML. What framework? PyTorch, TensorFlow, or ONNX Runtime?" },
    { turnId: "t-3", role: "user", content: "PyTorch I think. Or maybe ONNX for production. I'm not sure which is better for our case." },
    { turnId: "t-4", role: "assistant", content: "PyTorch for flexibility, ONNX for production performance. You could develop in PyTorch and export to ONNX." },
    { turnId: "t-5", role: "user", content: "Yeah that sounds right. Let's do PyTorch for now and figure out ONNX later." },
    // Phase 2: Constraint introduction with hedging
    { turnId: "t-6", role: "user", content: "Latency should be under 100ms per inference. That's probably important." },
    { turnId: "t-7", role: "assistant", content: "100ms latency target. Is that a hard requirement or a goal?" },
    { turnId: "t-8", role: "user", content: "Hard requirement. The API gateway has a 200ms timeout and we need room for network overhead." },
    { turnId: "t-9", role: "user", content: "Oh and the model needs to run on GPU. We have A100s in production." },
    { turnId: "t-10", role: "assistant", content: "GPU inference on A100s with sub-100ms latency. Got it." },
    // Phase 3: First task, immediately complicated
    { turnId: "t-11", role: "user", content: "Start with the model loading pipeline. Load the model, warm it up, serve requests." },
    { turnId: "t-12", role: "assistant", content: "Working on model loader. Loading weights, moving to GPU, running warmup inference." },
    { turnId: "t-13", role: "assistant", content: "Model loader done. Loads from disk, moves to CUDA, runs 10 warmup inferences." },
    { turnId: "t-14", role: "user", content: "Wait, we might need to load multiple models. Like, an ensemble. Or maybe just one. I haven't decided." },
    { turnId: "t-15", role: "assistant", content: "I'll make the loader support multiple models. Easy to restrict to one later." },
    // Phase 4: Duplicate decisions with different wording
    { turnId: "t-16", role: "user", content: "The API should be FastAPI. It's the fastest Python web framework." },
    { turnId: "t-17", role: "assistant", content: "FastAPI for the API layer. Good choice — async support and automatic OpenAPI docs." },
    { turnId: "t-18", role: "user", content: "For the web server, we need something fast and async. Let's use FastAPI." },
    { turnId: "t-19", role: "assistant", content: "Already set up with FastAPI. We're aligned." },
    // Phase 5: Batching — major branch with twists
    { turnId: "t-20", role: "user", content: "Should we batch inference requests? Batching would improve throughput." },
    { turnId: "t-21", role: "assistant", content: "Dynamic batching is great for throughput. But it adds latency for individual requests since you wait for the batch to fill." },
    { turnId: "t-22", role: "user", content: "True. Let's skip batching for now and add it if we need throughput." },
    { turnId: "t-23", role: "user", content: "Actually, wait. The PM says we'll have 500 concurrent users. We definitely need batching." },
    { turnId: "t-24", role: "assistant", content: "500 concurrent users changes things. Dynamic batching with a short timeout (e.g., 5ms) would help throughput without killing latency." },
    { turnId: "t-25", role: "user", content: "OK let's do dynamic batching. Max batch size 32, timeout 5ms." },
    // Phase 6: Preprocessing — constraint that gets stale
    { turnId: "t-26", role: "user", content: "Input preprocessing must happen on CPU to keep GPU free for inference only." },
    { turnId: "t-27", role: "assistant", content: "CPU preprocessing, GPU inference. Clean separation." },
    { turnId: "t-28", role: "assistant", content: "Preprocessing pipeline done: tokenization, normalization, tensor creation — all on CPU. Tensors moved to GPU just before inference." },
    // Phase 7: Monitoring — task that gets reopened
    { turnId: "t-29", role: "user", content: "Add Prometheus metrics. Latency p50/p95/p99, throughput, error rate." },
    { turnId: "t-30", role: "assistant", content: "Adding Prometheus metrics endpoint. Histogram for latency, counter for requests/errors." },
    { turnId: "t-31", role: "assistant", content: "Metrics done. /metrics endpoint with latency histograms and request counters." },
    { turnId: "t-32", role: "user", content: "Good. Ship it." },
    { turnId: "t-33", role: "user", content: "Wait — the metrics are wrong. We need to measure batched inference latency separately from per-request latency. Reopen that." },
    { turnId: "t-34", role: "assistant", content: "Reopening metrics. Adding separate histograms: batch_inference_seconds and request_latency_seconds." },
    { turnId: "t-35", role: "assistant", content: "Metrics fixed. Two separate latency histograms plus queue depth gauge for the batching system." },
    // Phase 8: Speculation disguised as fact
    { turnId: "t-36", role: "user", content: "We're going to need model versioning. Like, definitely. Multiple model versions running simultaneously with traffic splitting." },
    { turnId: "t-37", role: "assistant", content: "Model versioning with traffic splitting. That's a significant feature — canary deployments for models." },
    { turnId: "t-38", role: "user", content: "Well, we might. The ML team mentioned it but nothing's been decided. Just keep it in mind." },
    { turnId: "t-39", role: "assistant", content: "Noted as a potential future requirement, not committed." },
    // Phase 9: Reversal on preprocessing constraint
    { turnId: "t-40", role: "user", content: "Actually, some preprocessing steps are heavy — like image resizing. Let's allow GPU preprocessing for image models." },
    { turnId: "t-41", role: "assistant", content: "Revising the CPU-only preprocessing constraint. GPU preprocessing allowed for compute-heavy operations like image transforms." },
    // Phase 10: Caching debate
    { turnId: "t-42", role: "user", content: "Should we cache inference results?" },
    { turnId: "t-43", role: "assistant", content: "Depends on the input space. If inputs repeat frequently, caching saves GPU cycles. If they're unique, cache hit rate will be near zero." },
    { turnId: "t-44", role: "user", content: "Our inputs don't repeat much. Skip caching." },
    { turnId: "t-45", role: "user", content: "Hmm, actually, some customers send the same request multiple times. Maybe we should cache after all." },
    { turnId: "t-46", role: "user", content: "You know what, let's add a simple LRU cache. If it doesn't help we'll remove it." },
    { turnId: "t-47", role: "assistant", content: "LRU cache with configurable size. Easy to disable if hit rate is low." },
    // Phase 11: Health checks and graceful shutdown
    { turnId: "t-48", role: "user", content: "We need health checks. Readiness should verify the model is loaded and warm." },
    { turnId: "t-49", role: "assistant", content: "Health checks: /health/live (process alive), /health/ready (model loaded + warmed up)." },
    { turnId: "t-50", role: "user", content: "Add graceful shutdown. Drain the batch queue before stopping." },
    { turnId: "t-51", role: "assistant", content: "Graceful shutdown: stop accepting new requests, drain batch queue, then exit." },
    // Phase 12: Late-stage ONNX question resurfaces
    { turnId: "t-52", role: "user", content: "The ML team just tested ONNX export. Latency drops from 45ms to 18ms. Should we switch to ONNX now?" },
    { turnId: "t-53", role: "assistant", content: "18ms is a huge improvement. ONNX Runtime with CUDA execution provider would be a significant win. But it limits dynamic model features." },
    { turnId: "t-54", role: "user", content: "Let's switch to ONNX Runtime. The performance gain is too big to ignore." },
    // Phase 13: Testing
    { turnId: "t-55", role: "user", content: "Write tests. Integration tests for the API, unit tests for preprocessing, load tests for latency." },
    { turnId: "t-56", role: "assistant", content: "Test suite: pytest for unit/integration, locust for load testing. Testing all endpoints with mock model." },
    { turnId: "t-57", role: "assistant", content: "Tests done. 28 unit tests, 15 integration tests, load test confirming sub-100ms p99 under 500 concurrent users." },
    { turnId: "t-58", role: "user", content: "Perfect. This is ready for staging deployment." },
  ],
  expectedDeltas: [
    // t-1: goal + hedged decision
    { kind: "goal_set", id: "g-1", summary: "Build ML inference pipeline", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    { kind: "hypothesis_introduced", id: "h-1", summary: "Python for implementation (user said 'probably')", confidence: "medium", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    // t-3: framework branch
    { kind: "branch_created", id: "b-1", alternatives: ["PyTorch (flexibility)", "ONNX Runtime (production performance)"], sourceTurns: [{ turnId: "t-3" }], timestamp: ts },
    // t-5: initial PyTorch decision (tentative — "for now")
    { kind: "decision_made", id: "d-1", summary: "Use PyTorch initially, consider ONNX export later", confidence: "medium", sourceTurns: [{ turnId: "t-5" }], timestamp: ts },
    // t-8: latency constraint (upgraded from hedged to hard)
    { kind: "constraint_added", id: "c-1", summary: "Inference latency under 100ms (hard — API gateway has 200ms timeout)", hard: true, sourceTurns: [{ turnId: "t-8" }], timestamp: ts },
    // t-9: GPU constraint
    { kind: "constraint_added", id: "c-2", summary: "Model runs on GPU (A100s in production)", hard: true, sourceTurns: [{ turnId: "t-9" }], timestamp: ts },
    // t-11: model loader task
    { kind: "task_opened", id: "task-1", summary: "Build model loading pipeline", sourceTurns: [{ turnId: "t-11" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-1", resolution: "Loader supports multiple models, CUDA, 10 warmup inferences", sourceTurns: [{ turnId: "t-15" }], timestamp: ts },
    // t-14: ensemble branch (unresolved)
    { kind: "branch_created", id: "b-2", alternatives: ["Single model", "Ensemble of multiple models"], sourceTurns: [{ turnId: "t-14" }], timestamp: ts },
    // t-16: FastAPI decision (t-18 is duplicate — same decision different words)
    { kind: "decision_made", id: "d-2", summary: "FastAPI for the API layer", confidence: "certain", sourceTurns: [{ turnId: "t-16" }], timestamp: ts },
    // t-22 → t-25: batching reversal
    { kind: "decision_made", id: "d-3", summary: "Dynamic batching: max batch 32, timeout 5ms (initially skipped, then added for 500 concurrent users)", confidence: "high", sourceTurns: [{ turnId: "t-25" }], timestamp: ts },
    // t-23: fact — concurrency requirement
    { kind: "fact_learned", id: "f-1", summary: "Expected 500 concurrent users (from PM)", confidence: "high", sourceTurns: [{ turnId: "t-23" }], timestamp: ts },
    // t-26: preprocessing constraint
    { kind: "constraint_added", id: "c-3", summary: "Input preprocessing on CPU only — keep GPU for inference", hard: true, sourceTurns: [{ turnId: "t-26" }], timestamp: ts },
    // t-28: preprocessing task
    { kind: "task_opened", id: "task-2", summary: "Build preprocessing pipeline", sourceTurns: [{ turnId: "t-28" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-2", resolution: "Tokenization, normalization, tensor creation on CPU", sourceTurns: [{ turnId: "t-28" }], timestamp: ts },
    // t-29: metrics task (will be reopened)
    { kind: "task_opened", id: "task-3", summary: "Add Prometheus metrics (latency p50/p95/p99, throughput, errors)", sourceTurns: [{ turnId: "t-29" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-3", resolution: "Metrics endpoint with latency histograms and request counters", sourceTurns: [{ turnId: "t-31" }], timestamp: ts },
    // t-33: REOPEN metrics task
    { kind: "task_opened", id: "task-3b", summary: "Fix metrics: separate batch inference latency from per-request latency", sourceTurns: [{ turnId: "t-33" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-3b", resolution: "Two separate histograms + queue depth gauge", sourceTurns: [{ turnId: "t-35" }], timestamp: ts },
    // t-36-38: speculation disguised as fact → hypothesis NOT decision
    { kind: "hypothesis_introduced", id: "h-2", summary: "Model versioning with traffic splitting may be needed (ML team mentioned, not decided)", confidence: "low", sourceTurns: [{ turnId: "t-38" }], timestamp: ts },
    // t-40: preprocessing constraint revision
    { kind: "item_superseded", targetId: "c-3", reason: "GPU preprocessing needed for heavy operations like image resizing", sourceTurns: [{ turnId: "t-40" }], timestamp: ts },
    { kind: "constraint_added", id: "c-4", summary: "CPU preprocessing by default; GPU allowed for compute-heavy ops (images)", hard: false, sourceTurns: [{ turnId: "t-40" }], timestamp: ts },
    // t-44-46: caching flip-flop → decision
    { kind: "decision_made", id: "d-4", summary: "LRU cache for inference results (configurable, easy to disable)", confidence: "medium", sourceTurns: [{ turnId: "t-46" }], timestamp: ts },
    // t-48-49: health checks
    { kind: "task_opened", id: "task-4", summary: "Implement health checks and graceful shutdown", sourceTurns: [{ turnId: "t-48" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-4", resolution: "/health/live + /health/ready + graceful shutdown with batch queue drain", sourceTurns: [{ turnId: "t-51" }], timestamp: ts },
    // t-54: ONNX switch — resolves the original branch
    { kind: "item_superseded", targetId: "d-1", reason: "ONNX Runtime reduces latency from 45ms to 18ms", sourceTurns: [{ turnId: "t-54" }], timestamp: ts },
    { kind: "item_superseded", targetId: "b-1", reason: "Resolved: ONNX Runtime chosen for production (18ms vs 45ms PyTorch)", sourceTurns: [{ turnId: "t-54" }], timestamp: ts },
    { kind: "decision_made", id: "d-5", summary: "Use ONNX Runtime with CUDA execution provider (18ms latency, down from 45ms PyTorch)", confidence: "certain", sourceTurns: [{ turnId: "t-54" }], timestamp: ts },
    // t-55: testing task
    { kind: "task_opened", id: "task-5", summary: "Write tests: unit, integration, load", sourceTurns: [{ turnId: "t-55" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-5", resolution: "28 unit + 15 integration + load test (sub-100ms p99 at 500 users)", sourceTurns: [{ turnId: "t-57" }], timestamp: ts },
    // t-57: performance fact
    { kind: "fact_learned", id: "f-2", summary: "Load test confirms sub-100ms p99 latency under 500 concurrent users", confidence: "certain", sourceTurns: [{ turnId: "t-57" }], timestamp: ts },
  ],
  expectedItems: [
    { id: "g-1", kind: "goal", status: "active", summaryContains: "ML inference", minSourceTurns: 1 },
    // h-1: Python hypothesis — stays tentative (user said "probably")
    { id: "h-1", kind: "hypothesis", status: "tentative", summaryContains: "Python", minSourceTurns: 1 },
    // b-1: PyTorch vs ONNX — now superseded (ONNX chosen)
    { id: "b-1", kind: "hypothesis", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    // d-1: PyTorch "for now" — superseded by ONNX
    { id: "d-1", kind: "decision", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    { id: "d-2", kind: "decision", status: "active", summaryContains: "FastAPI", minSourceTurns: 1 },
    { id: "d-3", kind: "decision", status: "active", summaryContains: "batching", minSourceTurns: 1 },
    { id: "d-4", kind: "decision", status: "active", summaryContains: "LRU", minSourceTurns: 1 },
    { id: "d-5", kind: "decision", status: "active", summaryContains: "ONNX", minSourceTurns: 1 },
    { id: "c-1", kind: "constraint", status: "active", summaryContains: "100ms", minSourceTurns: 1 },
    { id: "c-2", kind: "constraint", status: "active", summaryContains: "GPU", minSourceTurns: 1 },
    { id: "c-3", kind: "constraint", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    { id: "c-4", kind: "constraint", status: "active", summaryContains: "GPU allowed", minSourceTurns: 1 },
    // b-2: single vs ensemble — STILL UNRESOLVED
    { id: "b-2", kind: "hypothesis", status: "tentative", summaryContains: "Single model", minSourceTurns: 1 },
    // h-2: model versioning — tentative, NOT promoted
    { id: "h-2", kind: "hypothesis", status: "tentative", summaryContains: "versioning", minSourceTurns: 1 },
    { id: "f-1", kind: "fact", status: "active", summaryContains: "500", minSourceTurns: 1 },
    { id: "f-2", kind: "fact", status: "active", summaryContains: "p99", minSourceTurns: 1 },
    { id: "task-1", kind: "task", status: "resolved", summaryContains: "model loading", minSourceTurns: 2 },
    { id: "task-2", kind: "task", status: "resolved", summaryContains: "preprocessing", minSourceTurns: 1 },
    { id: "task-3", kind: "task", status: "resolved", summaryContains: "Prometheus", minSourceTurns: 2 },
    { id: "task-3b", kind: "task", status: "resolved", summaryContains: "batch inference latency", minSourceTurns: 2 },
    { id: "task-4", kind: "task", status: "resolved", summaryContains: "health", minSourceTurns: 2 },
    { id: "task-5", kind: "task", status: "resolved", summaryContains: "tests", minSourceTurns: 2 },
  ],
  expectedQueries: {
    activeDecisionIds: ["d-2", "d-3", "d-4", "d-5"],
    activeConstraintIds: ["c-1", "c-2", "c-4"],
    openTaskIds: [],
    supersededIds: ["b-1", "d-1", "c-3"],
    // b-2 (single vs ensemble) still unresolved; h-1 and h-2 are tentative but NOT branches
    unresolvedBranchIds: ["b-2"],
  },
};
