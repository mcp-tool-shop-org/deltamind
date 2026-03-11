// DeltaMind Core — store what changed.

export type {
  ActiveContextState,
  ConfidenceTier,
  DecisionMadeDelta,
  DecisionRevisedDelta,
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
