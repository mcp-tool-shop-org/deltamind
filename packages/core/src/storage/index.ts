// Storage — persistence layer

// 3B.1: Provenance log
export {
  createProvenanceWriter,
  serializeProvenance,
  parseProvenance,
} from "./provenance-log.js";
export type {
  ProvenanceLine,
  ProvenanceAccepted,
  ProvenanceRejected,
  ProvenanceCheckpoint,
  ProvenanceWriter,
} from "./provenance-log.js";

// 3B.2: Snapshot
export {
  createSnapshot,
  serializeSnapshot,
  parseSnapshot,
  restoreState,
  SNAPSHOT_VERSION,
} from "./snapshot.js";
export type { StateSnapshot, SnapshotItem } from "./snapshot.js";

// 3B.3: Projections
export {
  renderActiveState,
  renderDecisions,
  renderTasks,
  renderConstraints,
} from "./projections.js";
