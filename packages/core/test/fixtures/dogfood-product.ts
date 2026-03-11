/**
 * Dogfood fixture 2: Product/docs session.
 *
 * Simulates a planning session for a CLI tool's v2 release. Heavy on goals,
 * feature scoping, docs planning, and durable decisions that should promote
 * well to claude-memories. Tests whether the advisory adapter proposes
 * useful updates instead of busywork.
 */

import type { TranscriptFixture } from "../harness/fixture-types.js";

const ts = "2026-03-11T16:00:00.000Z";

export const dogfoodProduct: TranscriptFixture = {
  name: "dogfood-product",
  class: "clean",
  description: "28-turn product planning session: CLI v2 release scoping with goals, feature decisions, docs planning, and revisable priorities.",
  turns: [
    // Goal setting
    { turnId: "t-1", role: "user", content: "Let's plan the v2 release of our CLI tool. The main goal is to add plugin support so third parties can extend functionality." },
    { turnId: "t-2", role: "assistant", content: "Plugin support for v2 — that's a significant architecture change. What kind of plugins are we talking about? Simple commands, or deeper hooks?" },
    { turnId: "t-3", role: "user", content: "Both. Plugins should be able to register new commands AND hook into the execution lifecycle (before/after hooks)." },
    { turnId: "t-4", role: "assistant", content: "Two extension points: command registration and lifecycle hooks. That's a powerful model. Any constraints on the plugin format?" },

    // Architecture decisions
    { turnId: "t-5", role: "user", content: "Plugins must be npm packages. Named @scope/cli-plugin-* for official ones, cli-plugin-* for community. No dynamic require from filesystem." },
    { turnId: "t-6", role: "assistant", content: "npm-based plugin system. Scoped naming convention. No filesystem loading — that's good for security." },
    { turnId: "t-7", role: "user", content: "The plugin API surface must be small. Maximum 5 exported functions per plugin. If a plugin needs more, it's trying to do too much." },
    { turnId: "t-8", role: "assistant", content: "5-function cap per plugin API. That's a good forcing function for simplicity." },

    // Feature scoping
    { turnId: "t-9", role: "user", content: "For v2 we also want to add: 1) config file support (.clirc), 2) shell completions (bash/zsh/fish), 3) improved error messages with suggestions." },
    { turnId: "t-10", role: "assistant", content: "Three additional features for v2: config file, shell completions, better errors. Should we prioritize these relative to plugin support?" },
    { turnId: "t-11", role: "user", content: "Plugin support is P0. Config file is P1 because plugins need it to store their settings. Shell completions P2. Better errors P1 — our users complain about them constantly." },
    { turnId: "t-12", role: "assistant", content: "Priority order: P0 plugins, P1 config + errors, P2 completions. Makes sense — config enables plugins, and error quality is a pain point." },

    // Decision about config format
    { turnId: "t-13", role: "user", content: "Config file format: TOML. We considered YAML but TOML is simpler and less error-prone for users." },
    { turnId: "t-14", role: "assistant", content: "TOML for config. Good choice — indentation-insensitive, typed values, well-supported in Node." },

    // Revision — error handling approach changed
    { turnId: "t-15", role: "user", content: "For error messages, I was going to use a simple lookup table, but after looking at how rustc does it, let's use error codes with linked documentation. Each error gets a unique code like CLI-E001." },
    { turnId: "t-16", role: "assistant", content: "Error codes with docs links — like rustc's approach. Each CLI-E### points to a documentation page with the full explanation and fix suggestions." },

    // Docs planning
    { turnId: "t-17", role: "user", content: "Speaking of docs, we need: 1) Plugin author guide, 2) Migration guide from v1, 3) Updated README, 4) Error code reference." },
    { turnId: "t-18", role: "assistant", content: "Four doc deliverables for v2. The plugin author guide is probably the most important — it's what enables the ecosystem." },

    // Constraint: backwards compat
    { turnId: "t-19", role: "user", content: "Non-negotiable: all v1 commands must work unchanged in v2. Zero breaking changes to existing CLI interface." },
    { turnId: "t-20", role: "assistant", content: "Zero breaking changes to the CLI surface. Internal architecture can change but every v1 command and flag must work identically." },

    // Timeline facts
    { turnId: "t-21", role: "user", content: "Release target: April 15th. Feature freeze is March 30th. Plugin API must be final by March 25th because the beta testers need a stable target." },
    { turnId: "t-22", role: "assistant", content: "Timeline: plugin API freeze March 25, feature freeze March 30, release April 15. That gives beta testers 3 weeks with the stable API." },

    // Revision — completions bumped up
    { turnId: "t-23", role: "user", content: "Actually, bump shell completions to P1. A beta tester just told me that's the #1 request in our feedback channel. Users want tab completion more than anything." },
    { turnId: "t-24", role: "assistant", content: "Shell completions promoted to P1. So our P1 list is now: config, errors, completions. P2 is empty. Everything's either P0 or P1." },

    // Rejected scope
    { turnId: "t-25", role: "user", content: "Someone asked for GUI support — a TUI dashboard. That's explicitly out of scope for v2. Maybe v3." },
    { turnId: "t-26", role: "assistant", content: "TUI dashboard deferred to v3 or later. Keeping v2 focused on the plugin architecture and quality-of-life improvements." },

    // Wrap up
    { turnId: "t-27", role: "user", content: "Good. Let's also make sure all docs go through the technical writer before release. No engineer-written docs ship without review." },
    { turnId: "t-28", role: "assistant", content: "Technical writer review required for all docs. That's a good quality gate. We have plugin guide, migration guide, README, and error reference — four docs need review before April 15." },
  ],
  expectedDeltas: [
    // t-1: primary goal
    { kind: "goal_set", id: "g-1", summary: "CLI v2 release with plugin support for third-party extensions", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    // t-3: plugin scope decision
    { kind: "decision_made", id: "d-1", summary: "Plugins can register commands AND hook into execution lifecycle (before/after hooks)", confidence: "certain", sourceTurns: [{ turnId: "t-3" }], timestamp: ts },
    // t-5: plugin format decision
    { kind: "decision_made", id: "d-2", summary: "Plugins are npm packages: @scope/cli-plugin-* (official), cli-plugin-* (community). No filesystem loading.", confidence: "certain", sourceTurns: [{ turnId: "t-5" }], timestamp: ts },
    // t-7: API surface constraint
    { kind: "constraint_added", id: "c-1", summary: "Maximum 5 exported functions per plugin API", hard: true, sourceTurns: [{ turnId: "t-7" }], timestamp: ts },
    // t-9: additional features (tasks)
    { kind: "task_opened", id: "task-1", summary: "Add config file support (.clirc)", sourceTurns: [{ turnId: "t-9" }], timestamp: ts },
    { kind: "task_opened", id: "task-2", summary: "Add shell completions (bash/zsh/fish)", sourceTurns: [{ turnId: "t-9" }], timestamp: ts },
    { kind: "task_opened", id: "task-3", summary: "Improve error messages with suggestions", sourceTurns: [{ turnId: "t-9" }], timestamp: ts },
    // t-13: config format decision
    { kind: "decision_made", id: "d-3", summary: "TOML for config file format (simpler than YAML, less error-prone)", confidence: "certain", sourceTurns: [{ turnId: "t-13" }], timestamp: ts },
    // t-15: error approach revision — from lookup table to error codes with docs
    { kind: "decision_made", id: "d-4", summary: "Error codes (CLI-E###) with linked documentation pages, inspired by rustc", confidence: "high", sourceTurns: [{ turnId: "t-15" }], timestamp: ts },
    // t-17: docs tasks
    { kind: "task_opened", id: "task-4", summary: "Write plugin author guide", sourceTurns: [{ turnId: "t-17" }], timestamp: ts },
    { kind: "task_opened", id: "task-5", summary: "Write v1 → v2 migration guide", sourceTurns: [{ turnId: "t-17" }], timestamp: ts },
    { kind: "task_opened", id: "task-6", summary: "Update README for v2", sourceTurns: [{ turnId: "t-17" }], timestamp: ts },
    { kind: "task_opened", id: "task-7", summary: "Create error code reference documentation", sourceTurns: [{ turnId: "t-17" }], timestamp: ts },
    // t-19: backwards compat constraint
    { kind: "constraint_added", id: "c-2", summary: "Zero breaking changes to v1 CLI interface — all existing commands and flags must work unchanged", hard: true, sourceTurns: [{ turnId: "t-19" }], timestamp: ts },
    // t-21: timeline facts
    { kind: "fact_learned", id: "f-1", summary: "Plugin API freeze: March 25. Feature freeze: March 30. Release: April 15.", confidence: "certain", sourceTurns: [{ turnId: "t-21" }], timestamp: ts },
    // t-25: rejected scope
    { kind: "fact_learned", id: "f-2", summary: "TUI dashboard explicitly out of scope for v2 — deferred to v3+", confidence: "certain", sourceTurns: [{ turnId: "t-25" }], timestamp: ts },
    // t-27: docs review constraint
    { kind: "constraint_added", id: "c-3", summary: "All docs must pass technical writer review before release", hard: true, sourceTurns: [{ turnId: "t-27" }], timestamp: ts },
  ],
  expectedItems: [
    { id: "g-1", kind: "goal", status: "active", summaryContains: "plugin", minSourceTurns: 1 },
    { id: "d-1", kind: "decision", status: "active", summaryContains: "command", minSourceTurns: 1 },
    { id: "d-2", kind: "decision", status: "active", summaryContains: "npm", minSourceTurns: 1 },
    { id: "d-3", kind: "decision", status: "active", summaryContains: "TOML", minSourceTurns: 1 },
    { id: "d-4", kind: "decision", status: "active", summaryContains: "error code", minSourceTurns: 1 },
    { id: "c-1", kind: "constraint", status: "active", summaryContains: "5", minSourceTurns: 1 },
    { id: "c-2", kind: "constraint", status: "active", summaryContains: "breaking", minSourceTurns: 1 },
    { id: "c-3", kind: "constraint", status: "active", summaryContains: "writer", minSourceTurns: 1 },
    { id: "f-1", kind: "fact", status: "active", summaryContains: "March", minSourceTurns: 1 },
    { id: "f-2", kind: "fact", status: "active", summaryContains: "TUI", minSourceTurns: 1 },
    { id: "task-1", kind: "task", status: "active", summaryContains: "config", minSourceTurns: 1 },
    { id: "task-2", kind: "task", status: "active", summaryContains: "completion", minSourceTurns: 1 },
    { id: "task-3", kind: "task", status: "active", summaryContains: "error", minSourceTurns: 1 },
    { id: "task-4", kind: "task", status: "active", summaryContains: "plugin", minSourceTurns: 1 },
    { id: "task-5", kind: "task", status: "active", summaryContains: "migration", minSourceTurns: 1 },
    { id: "task-6", kind: "task", status: "active", summaryContains: "README", minSourceTurns: 1 },
    { id: "task-7", kind: "task", status: "active", summaryContains: "error", minSourceTurns: 1 },
  ],
  expectedQueries: {
    activeDecisionIds: ["d-1", "d-2", "d-3", "d-4"],
    activeConstraintIds: ["c-1", "c-2", "c-3"],
    openTaskIds: ["task-1", "task-2", "task-3", "task-4", "task-5", "task-6", "task-7"],
    supersededIds: [],
    unresolvedBranchIds: [],
  },
};
