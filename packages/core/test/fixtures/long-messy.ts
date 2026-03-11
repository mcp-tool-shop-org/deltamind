/**
 * Long messy collaboration session (62 turns).
 *
 * Design system for a component library. Repetition, backtracking,
 * "actually," reopened decisions, conflicting constraints, multiple branches,
 * tool noise, and changing requirements.
 */

import type { TranscriptFixture } from "../harness/fixture-types.js";

const ts = "2026-03-11T15:00:00.000Z";

export const longMessy: TranscriptFixture = {
  name: "long-messy",
  class: "messy",
  description: "62-turn design system build: component library with backtracking, reopened decisions, conflicting constraints, and changing requirements.",
  turns: [
    // Phase 1: Initial direction
    { turnId: "t-1", role: "user", content: "We need a design system for our product. A component library that all teams can use." },
    { turnId: "t-2", role: "assistant", content: "Great idea. What framework are you targeting? React, Vue, or framework-agnostic web components?" },
    { turnId: "t-3", role: "user", content: "React. All our apps are React." },
    { turnId: "t-4", role: "assistant", content: "React it is. Should we use an existing foundation like Radix or build from scratch?" },
    { turnId: "t-5", role: "user", content: "Let's use Radix for accessibility primitives and build our styling on top." },
    { turnId: "t-6", role: "assistant", content: "Good choice — Radix handles a11y, we handle the look and feel." },
    // Phase 2: Styling approach — first branch
    { turnId: "t-7", role: "user", content: "For styling, I'm thinking Tailwind. But some team members prefer CSS Modules. What do you think?" },
    { turnId: "t-8", role: "assistant", content: "Both are valid. Tailwind is faster for utility-first composition. CSS Modules give more isolation. Do you want colocation or separation?" },
    { turnId: "t-9", role: "user", content: "Let's go with Tailwind. Speed matters more right now." },
    { turnId: "t-10", role: "assistant", content: "Tailwind it is. I'll set up the theme tokens as Tailwind config extensions." },
    // Phase 3: Tokens and theming
    { turnId: "t-11", role: "user", content: "We need dark mode support from day one. Non-negotiable." },
    { turnId: "t-12", role: "assistant", content: "Dark mode from day one. I'll use CSS custom properties for the token layer so themes can swap at runtime." },
    { turnId: "t-13", role: "user", content: "The color palette should follow our brand guide. I'll send the colors later." },
    { turnId: "t-14", role: "assistant", content: "Noted — waiting for brand colors. I'll use placeholder tokens for now." },
    { turnId: "t-15", role: "user", content: "Actually, the dark mode needs to respect system preferences AND have a manual toggle." },
    { turnId: "t-16", role: "assistant", content: "Both system preference detection and manual toggle. I'll implement prefers-color-scheme with a localStorage override." },
    // Phase 4: Component inventory — start building
    { turnId: "t-17", role: "user", content: "Let's start with core components: Button, Input, Select, Dialog, Toast." },
    { turnId: "t-18", role: "assistant", content: "Starting with the five core components. I'll build Button first since everything depends on it." },
    { turnId: "t-19", role: "assistant", content: "Button component done. Variants: primary, secondary, ghost, destructive. Sizes: sm, md, lg. Loading state with spinner." },
    { turnId: "t-20", role: "user", content: "Add an outline variant too. And icon-only support." },
    { turnId: "t-21", role: "assistant", content: "Added outline variant and icon-only mode with proper aria-label requirement." },
    // Phase 5: First backtrack — styling approach
    { turnId: "t-22", role: "user", content: "I've been talking to the team. Some people really hate Tailwind in component libraries. They say it makes the components hard to customize." },
    { turnId: "t-23", role: "assistant", content: "That's a valid concern. Tailwind class names are hard to override from the consuming app. Alternatives: CSS-in-JS like Stitches, or a CVA (class-variance-authority) pattern that keeps Tailwind but makes variants composable." },
    { turnId: "t-24", role: "user", content: "What about using CVA? We keep Tailwind but get better variant composition." },
    { turnId: "t-25", role: "assistant", content: "CVA is a good middle ground. You keep Tailwind's utility classes but variants become programmatic. It's what shadcn/ui uses." },
    { turnId: "t-26", role: "user", content: "Yeah, let's switch to CVA with Tailwind. Restyle the Button with CVA." },
    { turnId: "t-27", role: "assistant", content: "Restyling Button with CVA. This changes our styling decision from raw Tailwind to CVA + Tailwind." },
    // Phase 6: More components
    { turnId: "t-28", role: "assistant", content: "Button restyled with CVA. Now working on Input component." },
    { turnId: "t-29", role: "assistant", content: "Input done. Supports label, error message, helper text, disabled state." },
    { turnId: "t-30", role: "user", content: "The Input needs to handle form validation. Use react-hook-form integration." },
    { turnId: "t-31", role: "assistant", content: "Noted. I'll add a FormField wrapper that integrates with react-hook-form's Controller." },
    { turnId: "t-32", role: "assistant", content: "FormField wrapper done. Works with react-hook-form and zod validation." },
    { turnId: "t-33", role: "user", content: "Oh right, we need form validation. Use zod for schemas. That's a hard requirement." },
    { turnId: "t-34", role: "assistant", content: "Zod is already integrated via the FormField wrapper. We're aligned." },
    // Phase 7: Distribution debate — major branch
    { turnId: "t-35", role: "user", content: "How should we distribute this? npm package or monorepo with copy-paste like shadcn?" },
    { turnId: "t-36", role: "assistant", content: "Two very different approaches. npm package gives you versioning and dependency management. Copy-paste gives teams full ownership and customization." },
    { turnId: "t-37", role: "user", content: "The VP wants npm package for consistency. But our frontend lead wants copy-paste for flexibility. I need to figure this out." },
    { turnId: "t-38", role: "assistant", content: "Both have merits. Would a hybrid work? Publish an npm package with the base components, but allow teams to eject individual components if they need deep customization?" },
    { turnId: "t-39", role: "user", content: "That hybrid approach sounds good actually. Let me run it by the team." },
    // Phase 8: More component work while branch is open
    { turnId: "t-40", role: "assistant", content: "While the distribution decision is pending, I'll keep building components. Working on Select." },
    { turnId: "t-41", role: "assistant", content: "Select component done. Uses Radix Select primitive. Supports groups, search/filter, multi-select." },
    { turnId: "t-42", role: "user", content: "Dialog next. Make sure it traps focus and supports nested dialogs." },
    { turnId: "t-43", role: "assistant", content: "Dialog done. Radix Dialog primitive, focus trap, nested dialog support, close on escape, overlay click to close." },
    { turnId: "t-44", role: "assistant", content: "Toast component done. Auto-dismiss timer, action button, stack management for multiple toasts." },
    // Phase 9: Testing constraint
    { turnId: "t-45", role: "user", content: "Every component must have Storybook stories and unit tests. No exceptions." },
    { turnId: "t-46", role: "assistant", content: "Hard requirement: Storybook + unit tests for every component. I'll go back and add stories for Button, Input, FormField." },
    { turnId: "t-47", role: "user", content: "Stories and tests for all components. Every component. I already said that right?" },
    { turnId: "t-48", role: "assistant", content: "Yes, confirmed — every component gets Storybook stories and unit tests. Working through the backlog now." },
    // Phase 10: Distribution resolved
    { turnId: "t-49", role: "user", content: "OK the team decided: npm package for the base system, but we'll also publish a CLI that can eject components into a project. Best of both worlds." },
    { turnId: "t-50", role: "assistant", content: "Great resolution. npm package for install, CLI for eject. I'll set up the package structure and build pipeline." },
    // Phase 11: Accessibility audit
    { turnId: "t-51", role: "user", content: "We need WCAG 2.1 AA compliance. That's a hard requirement from legal." },
    { turnId: "t-52", role: "assistant", content: "WCAG 2.1 AA compliance. Radix handles most a11y primitives. I'll audit color contrast ratios, keyboard navigation, and screen reader announcements." },
    { turnId: "t-53", role: "user", content: "Add an accessibility audit to the CI pipeline too." },
    { turnId: "t-54", role: "assistant", content: "Adding axe-core to the test suite for automated a11y checks. Will run on every PR." },
    // Phase 12: Second backtrack — dark mode complexity
    { turnId: "t-55", role: "user", content: "The brand team just told me they want THREE themes, not two. Light, dark, and a high-contrast mode for accessibility." },
    { turnId: "t-56", role: "assistant", content: "Three themes: light, dark, high-contrast. This changes the theming architecture — we need a proper theme provider, not just a dark mode toggle." },
    { turnId: "t-57", role: "user", content: "Yeah, update the theming to support arbitrary themes. The three are just the default set." },
    { turnId: "t-58", role: "assistant", content: "Expanding to a full theme provider that supports arbitrary theme definitions. The three built-in themes become presets." },
    // Phase 13: Wrapping up
    { turnId: "t-59", role: "user", content: "Where are we on stories and tests?" },
    { turnId: "t-60", role: "assistant", content: "Stories complete for all 5 core components + FormField. Unit tests: Button (8), Input (6), FormField (10), Select (12), Dialog (8), Toast (7) — 51 tests total." },
    { turnId: "t-61", role: "user", content: "Good. Add a changelog and bump to v0.1.0 for the first internal release." },
    { turnId: "t-62", role: "assistant", content: "CHANGELOG.md created, version bumped to 0.1.0. Ready for internal release." },
  ],
  expectedDeltas: [
    // Goal
    { kind: "goal_set", id: "g-1", summary: "Build shared design system / component library for all teams", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    // Framework decision
    { kind: "decision_made", id: "d-1", summary: "React-based component library", confidence: "certain", sourceTurns: [{ turnId: "t-3" }], timestamp: ts },
    // Foundation
    { kind: "decision_made", id: "d-2", summary: "Radix UI for accessibility primitives", confidence: "high", sourceTurns: [{ turnId: "t-5" }], timestamp: ts },
    // Styling — first attempt
    { kind: "decision_made", id: "d-3", summary: "Tailwind for styling", confidence: "high", sourceTurns: [{ turnId: "t-9" }], timestamp: ts },
    // Dark mode constraint
    { kind: "constraint_added", id: "c-1", summary: "Dark mode support from day one", hard: true, sourceTurns: [{ turnId: "t-11" }], timestamp: ts },
    // Dark mode implementation
    { kind: "decision_made", id: "d-4", summary: "CSS custom properties for theme tokens, system preference + manual toggle", confidence: "high", sourceTurns: [{ turnId: "t-12" }], timestamp: ts },
    // Button task
    { kind: "task_opened", id: "task-1", summary: "Build Button component", sourceTurns: [{ turnId: "t-18" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-1", resolution: "Button done: primary/secondary/ghost/destructive/outline variants, sm/md/lg sizes, loading state, icon-only", sourceTurns: [{ turnId: "t-21" }], timestamp: ts },
    // Styling revision — Tailwind → CVA + Tailwind
    { kind: "item_superseded", targetId: "d-3", reason: "Team concerns about Tailwind customizability in component libraries", sourceTurns: [{ turnId: "t-26" }], timestamp: ts },
    { kind: "decision_made", id: "d-5", summary: "CVA (class-variance-authority) + Tailwind for component styling", confidence: "high", sourceTurns: [{ turnId: "t-26" }], timestamp: ts },
    // Input task
    { kind: "task_opened", id: "task-2", summary: "Build Input component", sourceTurns: [{ turnId: "t-28" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-2", resolution: "Input done with label, error, helper text, disabled state", sourceTurns: [{ turnId: "t-29" }], timestamp: ts },
    // Form validation decision
    { kind: "decision_made", id: "d-6", summary: "react-hook-form + zod for form validation", confidence: "high", sourceTurns: [{ turnId: "t-30" }], timestamp: ts },
    // Zod constraint (t-33 repeats this, dedup)
    { kind: "constraint_added", id: "c-2", summary: "Zod required for form validation schemas", hard: true, sourceTurns: [{ turnId: "t-33" }], timestamp: ts },
    // FormField task
    { kind: "task_opened", id: "task-3", summary: "Build FormField wrapper for react-hook-form integration", sourceTurns: [{ turnId: "t-31" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-3", resolution: "FormField works with react-hook-form Controller + zod", sourceTurns: [{ turnId: "t-32" }], timestamp: ts },
    // Distribution branch
    { kind: "branch_created", id: "b-1", alternatives: ["npm package (VP wants consistency)", "copy-paste like shadcn (frontend lead wants flexibility)", "hybrid: npm + eject CLI"], sourceTurns: [{ turnId: "t-37" }], timestamp: ts },
    // Select task
    { kind: "task_opened", id: "task-4", summary: "Build Select component", sourceTurns: [{ turnId: "t-40" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-4", resolution: "Select done: Radix primitive, groups, search/filter, multi-select", sourceTurns: [{ turnId: "t-41" }], timestamp: ts },
    // Dialog task
    { kind: "task_opened", id: "task-5", summary: "Build Dialog component", sourceTurns: [{ turnId: "t-42" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-5", resolution: "Dialog done: focus trap, nested support, escape close, overlay click", sourceTurns: [{ turnId: "t-43" }], timestamp: ts },
    // Toast task
    { kind: "task_opened", id: "task-6", summary: "Build Toast component", sourceTurns: [{ turnId: "t-44" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-6", resolution: "Toast done: auto-dismiss, action button, stack management", sourceTurns: [{ turnId: "t-44" }], timestamp: ts },
    // Testing constraint (t-47 is duplicate, dedup)
    { kind: "constraint_added", id: "c-3", summary: "Every component must have Storybook stories and unit tests", hard: true, sourceTurns: [{ turnId: "t-45" }], timestamp: ts },
    // Distribution resolved
    { kind: "item_superseded", targetId: "b-1", reason: "Team decided: npm package + eject CLI (hybrid approach)", sourceTurns: [{ turnId: "t-49" }], timestamp: ts },
    { kind: "decision_made", id: "d-7", summary: "npm package for base system + CLI for component ejection", confidence: "certain", sourceTurns: [{ turnId: "t-49" }], timestamp: ts },
    // WCAG constraint
    { kind: "constraint_added", id: "c-4", summary: "WCAG 2.1 AA compliance (legal requirement)", hard: true, sourceTurns: [{ turnId: "t-51" }], timestamp: ts },
    // CI accessibility
    { kind: "decision_made", id: "d-8", summary: "axe-core in CI for automated accessibility audits on every PR", confidence: "high", sourceTurns: [{ turnId: "t-53" }], timestamp: ts },
    // Theming revision — dark mode → full theme provider
    { kind: "decision_revised", targetId: "d-4", summary: "Full theme provider with arbitrary theme support; light/dark/high-contrast as built-in presets", sourceTurns: [{ turnId: "t-57" }], timestamp: ts },
    // Testing task
    { kind: "task_opened", id: "task-7", summary: "Write Storybook stories and unit tests for all components", sourceTurns: [{ turnId: "t-46" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-7", resolution: "Stories for all 6 components, 51 unit tests total", sourceTurns: [{ turnId: "t-60" }], timestamp: ts },
    // Release task
    { kind: "task_opened", id: "task-8", summary: "Prepare v0.1.0 internal release", sourceTurns: [{ turnId: "t-61" }], timestamp: ts },
    { kind: "task_closed", targetId: "task-8", resolution: "CHANGELOG + version bump to v0.1.0", sourceTurns: [{ turnId: "t-62" }], timestamp: ts },
  ],
  expectedItems: [
    { id: "g-1", kind: "goal", status: "active", summaryContains: "design system", minSourceTurns: 1 },
    { id: "d-1", kind: "decision", status: "active", summaryContains: "React", minSourceTurns: 1 },
    { id: "d-2", kind: "decision", status: "active", summaryContains: "Radix", minSourceTurns: 1 },
    { id: "d-3", kind: "decision", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    { id: "d-4", kind: "decision", status: "active", summaryContains: "theme provider", minSourceTurns: 2 },
    { id: "d-5", kind: "decision", status: "active", summaryContains: "CVA", minSourceTurns: 1 },
    { id: "d-6", kind: "decision", status: "active", summaryContains: "react-hook-form", minSourceTurns: 1 },
    { id: "d-7", kind: "decision", status: "active", summaryContains: "npm", minSourceTurns: 1 },
    { id: "d-8", kind: "decision", status: "active", summaryContains: "axe", minSourceTurns: 1 },
    { id: "c-1", kind: "constraint", status: "active", summaryContains: "Dark mode", minSourceTurns: 1 },
    { id: "c-2", kind: "constraint", status: "active", summaryContains: "Zod", minSourceTurns: 1 },
    { id: "c-3", kind: "constraint", status: "active", summaryContains: "Storybook", minSourceTurns: 1 },
    { id: "c-4", kind: "constraint", status: "active", summaryContains: "WCAG", minSourceTurns: 1 },
    { id: "b-1", kind: "hypothesis", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    { id: "task-1", kind: "task", status: "resolved", summaryContains: "Button", minSourceTurns: 2 },
    { id: "task-2", kind: "task", status: "resolved", summaryContains: "Input", minSourceTurns: 2 },
    { id: "task-3", kind: "task", status: "resolved", summaryContains: "FormField", minSourceTurns: 2 },
    { id: "task-4", kind: "task", status: "resolved", summaryContains: "Select", minSourceTurns: 2 },
    { id: "task-5", kind: "task", status: "resolved", summaryContains: "Dialog", minSourceTurns: 2 },
    { id: "task-6", kind: "task", status: "resolved", summaryContains: "Toast", minSourceTurns: 1 },
    { id: "task-7", kind: "task", status: "resolved", summaryContains: "stories", minSourceTurns: 2 },
    { id: "task-8", kind: "task", status: "resolved", summaryContains: "v0.1.0", minSourceTurns: 2 },
  ],
  expectedQueries: {
    activeDecisionIds: ["d-1", "d-2", "d-4", "d-5", "d-6", "d-7", "d-8"],
    activeConstraintIds: ["c-1", "c-2", "c-3", "c-4"],
    openTaskIds: [],
    supersededIds: ["d-3", "b-1"],
    unresolvedBranchIds: [],
  },
};
