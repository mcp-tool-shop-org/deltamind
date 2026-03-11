// DeltaMind Core — store what changed.

export type {
  ActiveContextState,
  ConfidenceTier,
  DecisionMadeDelta,
  DecisionRevisedDelta,
  ConstraintRevisedDelta,
  ConstraintAddedDelta,
  TaskOpenedDelta,
  TaskClosedDelta,
  FactLearnedDelta,
  HypothesisIntroducedDelta,
  BranchCreatedDelta,
  ItemSupersededDelta,
  GoalSetDelta,
  ItemKind,
  ItemScope,
  ItemStatus,
  MemoryDelta,
  MemoryItem,
  ProvenanceEvent,
  SourceRef,
} from "./types.js";

export { createState, queryItems, activeDecisions, activeConstraints, openTasks, supersededItems, unresolvedBranches, changedSince } from "./state.js";
export { reconcile, ReconciliationError } from "./reconciler.js";
export type { ReconcileResult } from "./reconciler.js";

// Phase 2B: Extractor pipeline
export {
  gate, gateBatch,
  extract,
  computeScoreboard,
  runPipeline,
} from "./extractor/index.js";
export type {
  Turn,
  EventSignal,
  EventGateResult,
  ExtractionEvidence,
  CandidateDelta,
  ExtractionResult,
  PipelineResult,
  ExtractorScoreboard,
  DeltaExtractorOptions,
  PipelineOptions,
} from "./extractor/index.js";

// Phase 2B.2: LLM extractor
export {
  llmExtract,
  runLlmPipeline,
  createOllamaProvider,
  createMockProvider,
  buildTargetShortlist,
  resolveTargetLexical,
  formatShortlistForPrompt,
  normalize,
} from "./extractor/index.js";
export type {
  LlmExtractorOptions,
  LlmPipelineOptions,
  LlmProvider,
  TargetCandidate,
  ResolvedTarget,
  NormalizationResult,
  KindMetrics,
  FpSeverity,
  FalsePositive,
} from "./extractor/index.js";

// Phase 2D: Model policy
export { checkModelPolicy, DEFAULT_MODEL, ALLOWED_MODELS, BLOCKED_MODELS } from "./extractor/model-policy.js";
export type { ModelPolicyResult } from "./extractor/model-policy.js";

// Phase 3A: Session runtime
export { createSession } from "./session.js";
export type { Session, SessionOptions, ProcessResult, ContextExport, ContextExportOptions, SessionStats } from "./session.js";

// Phase 3B: Storage / persistence
export {
  createProvenanceWriter,
  serializeProvenance,
  parseProvenance,
  createSnapshot,
  serializeSnapshot,
  parseSnapshot,
  restoreState,
  SNAPSHOT_VERSION,
  renderActiveState,
  renderDecisions,
  renderTasks,
  renderConstraints,
} from "./storage/index.js";
export type {
  ProvenanceLine,
  ProvenanceAccepted,
  ProvenanceRejected,
  ProvenanceCheckpoint,
  ProvenanceWriter,
  StateSnapshot,
  SnapshotItem,
} from "./storage/index.js";

// Phase 4: Adapters
export {
  toLoadoutEntries,
  toLoadoutIndex,
  suggestMemoryUpdates,
  renderMemoryFile,
} from "./adapters/index.js";
export type {
  LoadoutEntry as DeltaLoadoutEntry,
  LoadoutIndex as DeltaLoadoutIndex,
  LoadoutBudget,
  LoadoutAdapterOptions,
  MemoryUpdateSuggestion,
  MemoryUpdateAction,
  MemoryFrontmatter,
  MemorySuggestionOptions,
} from "./adapters/index.js";
