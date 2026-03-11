// Extractor — Phase 2B

export type {
  Turn,
  EventSignal,
  EventGateResult,
  ExtractionEvidence,
  CandidateDelta,
  ExtractionResult,
  PipelineResult,
  ExtractorScoreboard,
  KindMetrics,
  FpSeverity,
  FalsePositive,
  MatchClass,
  MatchClassDistribution,
} from "./types.js";

export { gate, gateBatch } from "./event-gate.js";
export { extract } from "./delta-extractor.js";
export type { DeltaExtractorOptions } from "./delta-extractor.js";
export { computeScoreboard } from "./scoreboard.js";
export { runPipeline } from "./pipeline.js";
export type { PipelineOptions } from "./pipeline.js";

// Phase 2B.2: LLM extractor
export { llmExtract } from "./llm-extractor.js";
export type { LlmExtractorOptions } from "./llm-extractor.js";
export { runLlmPipeline } from "./llm-pipeline.js";
export type { LlmPipelineOptions } from "./llm-pipeline.js";
export type { LlmProvider } from "./llm-provider.js";
export { createOllamaProvider, createMockProvider } from "./llm-provider.js";
export { buildTargetShortlist, resolveTargetLexical, formatShortlistForPrompt } from "./target-resolver.js";
export type { TargetCandidate, ResolvedTarget } from "./target-resolver.js";
export { normalize } from "./normalizer.js";
export type { NormalizationResult } from "./normalizer.js";

// Phase 5B: Semantic identity
export { canonicalize, fnv1a32, semanticId } from "./semantic-id.js";

// Phase 2D: Model policy
export { checkModelPolicy, DEFAULT_MODEL, ALLOWED_MODELS, BLOCKED_MODELS } from "./model-policy.js";
export type { ModelPolicyResult } from "./model-policy.js";
