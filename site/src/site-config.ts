import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'DeltaMind',
  description: 'Active context compaction for AI agents. Typed deltas, structured state, provenance, and working-set budgeting for long-running conversations.',
  logoBadge: 'D',
  brandName: 'DeltaMind',
  repoUrl: 'https://github.com/mcp-tool-shop-org/deltamind',
  footerText: 'MIT Licensed — built by <a href="https://mcp-tool-shop.github.io/" style="color:var(--color-muted);text-decoration:underline">MCP Tool Shop</a>',

  hero: {
    badge: 'Open source',
    headline: 'Store what',
    headlineAccent: 'changed.',
    description: 'Active context compaction for AI agents. Typed deltas replace transcript sprawl with structured, queryable state that stays compact as conversations grow.',
    primaryCta: { href: '#usage', label: 'Get started' },
    secondaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Session', code: "const session = createSession();\nsession.ingestBatch(turns);\nawait session.process();" },
      { label: 'Query', code: "session.stats();\n// { items: 7, decisions: 2,\n//   constraints: 3, openTasks: 1 }" },
      { label: 'Export', code: "session.exportContext({ maxChars: 2000 });\n// Budgeted working set for injection" },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'Why DeltaMind',
      subtitle: 'Transcripts grow linearly. State grows sublinearly.',
      features: [
        {
          title: 'Typed Deltas',
          desc: '11 delta types capture decisions, constraints, tasks, goals, hypotheses, and revisions. No freeform summaries that smear meaning.',
        },
        {
          title: 'Hybrid Extraction',
          desc: 'Rule-based precision meets LLM semantic recall. Both compute stable semantic IDs — equivalent meaning converges regardless of path.',
        },
        {
          title: 'Safety First',
          desc: 'Zero canonization of speculation. Rejections over corruption. Advisory-only memory promotion. The system would rather abstain than poison the ledger.',
        },
      ],
    },
    {
      kind: 'features',
      id: 'architecture',
      title: 'Architecture',
      subtitle: 'Four-pass pipeline, three representations, single source of truth.',
      features: [
        {
          title: 'Event Gate',
          desc: 'Cheap heuristics filter turns worth analyzing. High recall, tolerant of false positives. Saves extraction cost on chatter.',
        },
        {
          title: 'Extract + Reconcile',
          desc: 'Extractors emit candidates. The reconciler decides truth. Duplicates are merged, superseded items are marked, provenance is preserved.',
        },
        {
          title: 'Persistence',
          desc: 'Event log (what happened), snapshot (current truth), markdown (human inspection). Three formats, each with one job.',
        },
      ],
    },
    {
      kind: 'data-table',
      id: 'scaling',
      title: 'Scaling Results',
      subtitle: 'The longer the session, the more DeltaMind earns its keep.',
      columns: ['Metric', 'Short (9-14 turns)', 'Long (56-62 turns)'],
      rows: [
        ['Context vs raw', '18-62%', '12-24%'],
        ['Item growth rate', 'Linear', 'Sublinear (2.9x for 5x turns)'],
        ['Query score', '6/6', '6/6'],
        ['Provenance', 'Full', 'Full'],
      ],
    },
    {
      kind: 'code-cards',
      id: 'usage',
      title: 'Usage',
      cards: [
        {
          title: 'Install',
          code: 'npm install @deltamind/core @deltamind/cli',
        },
        {
          title: 'Create a session',
          code: `import { createSession } from "@deltamind/core";

const session = createSession({ forceRuleOnly: true });

session.ingestBatch([
  { turnId: "t-1", role: "user",
    content: "Build a REST API with TypeScript." },
  { turnId: "t-2", role: "assistant",
    content: "Setting up Express with TypeScript." },
  { turnId: "t-3", role: "user",
    content: "Switch to Fastify instead." },
]);

await session.process();`,
        },
        {
          title: 'Query and export',
          code: `// What's in state?
const stats = session.stats();
// { totalItems: 5, activeDecisions: 1, ... }

// Budgeted context for injection
const ctx = session.exportContext({ maxChars: 2000 });

// Save for later
const snapshot = session.save();`,
        },
        {
          title: 'CLI operations',
          code: `deltamind inspect              # State by kind
deltamind changed --since 5    # What changed
deltamind explain item-3       # Deep-dive
deltamind export --for ai-loadout
deltamind suggest-memory       # Advisory updates
deltamind save && deltamind resume`,
        },
      ],
    },
    {
      kind: 'features',
      id: 'delta-types',
      title: 'Delta Types',
      subtitle: '11 typed state changes — not summaries.',
      features: [
        {
          title: 'Decisions & Goals',
          desc: 'goal_set, decision_made, decision_revised. Settled choices with provenance. Revisions supersede prior decisions while preserving history.',
        },
        {
          title: 'Constraints & Tasks',
          desc: 'constraint_added, constraint_revised (relaxed/tightened/amended), task_opened, task_closed. Boundaries and work items with lifecycle tracking.',
        },
        {
          title: 'Knowledge & Uncertainty',
          desc: 'fact_learned, hypothesis_introduced, branch_created, item_superseded. Facts are stable. Hypotheses stay tentative until explicitly promoted.',
        },
      ],
    },
  ],
};
