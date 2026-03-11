#!/usr/bin/env node

/**
 * DeltaMind CLI — operator handles for session inspection and debugging.
 *
 * Usage: deltamind <command> [options]
 *
 * Commands:
 *   inspect          Show active state grouped by kind
 *   export           Budgeted working-set text or ai-loadout JSON
 *   suggest-memory   Advisory claude-memories updates
 *   save             Persist session to .deltamind/
 *   resume           Load session, show health summary
 *   replay           Walk provenance log chronologically
 *   changed          What changed since seq/turn/timestamp
 *   explain          Deep-dive on a single item
 */

import { parseArgs } from "node:util";
import { inspect } from "./commands/inspect.js";
import { exportCmd } from "./commands/export.js";
import { resume } from "./commands/resume.js";
import { save } from "./commands/save.js";
import { changed } from "./commands/changed.js";
import { explain } from "./commands/explain.js";
import { replay } from "./commands/replay.js";
import { suggestMemory } from "./commands/suggest-memory.js";
import { DeltamindDirError } from "./io.js";

const USAGE = `Usage: deltamind <command> [options]

Commands:
  inspect          Show active state grouped by kind
  export           Budgeted working-set text or ai-loadout JSON
  suggest-memory   Advisory claude-memories updates
  save             Persist session to .deltamind/
  resume           Load session, show health summary
  replay           Walk provenance log chronologically
  changed          What changed since seq/turn/timestamp
  explain          Deep-dive on a single item

Global flags:
  --json           Machine-readable JSON output
  --help           Show this help message`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(USAGE + "\n");
    return;
  }

  // Strip the command from args for parseArgs
  const rest = args.slice(1);

  try {
    let output: string;

    switch (command) {
      case "inspect": {
        const { values } = parseArgs({
          args: rest,
          options: {
            kind: { type: "string" },
            json: { type: "boolean", default: false },
          },
          strict: false,
        });
        output = await inspect({
          kind: values.kind as string | undefined,
          json: values.json as boolean,
        });
        break;
      }

      case "export": {
        const { values } = parseArgs({
          args: rest,
          options: {
            "max-chars": { type: "string" },
            for: { type: "string" },
            json: { type: "boolean", default: false },
          },
          strict: false,
        });
        output = await exportCmd({
          maxChars: values["max-chars"] ? parseInt(values["max-chars"] as string, 10) : undefined,
          format: values.for === "ai-loadout" ? "ai-loadout" : "text",
          json: values.json as boolean,
        });
        break;
      }

      case "suggest-memory": {
        const { values } = parseArgs({
          args: rest,
          options: {
            "min-confidence": { type: "string" },
            "include-superseded": { type: "boolean", default: false },
            json: { type: "boolean", default: false },
          },
          strict: false,
        });
        output = await suggestMemory({
          minConfidence: values["min-confidence"] as "high" | "medium" | "low" | undefined,
          includeSuperSeded: values["include-superseded"] as boolean,
          json: values.json as boolean,
        });
        break;
      }

      case "save": {
        const { values } = parseArgs({
          args: rest,
          options: {
            "from-stdin": { type: "boolean", default: false },
          },
          strict: false,
        });
        output = await save({
          fromStdin: values["from-stdin"] as boolean,
        });
        break;
      }

      case "resume": {
        const { values } = parseArgs({
          args: rest,
          options: {
            json: { type: "boolean", default: false },
          },
          strict: false,
        });
        output = await resume({ json: values.json as boolean });
        break;
      }

      case "replay": {
        const { values } = parseArgs({
          args: rest,
          options: {
            since: { type: "string" },
            type: { type: "string" },
            json: { type: "boolean", default: false },
          },
          strict: false,
        });
        output = await replay({
          since: values.since !== undefined ? parseInt(values.since as string, 10) : undefined,
          type: values.type as "accepted" | "rejected" | "checkpoint" | undefined,
          json: values.json as boolean,
        });
        break;
      }

      case "changed": {
        const { values } = parseArgs({
          args: rest,
          options: {
            since: { type: "string" },
            json: { type: "boolean", default: false },
          },
          strict: false,
        });
        if (!values.since) {
          process.stderr.write("Error: --since is required for `changed`.\n");
          process.exit(1);
        }
        output = await changed({
          since: values.since as string,
          json: values.json as boolean,
        });
        break;
      }

      case "explain": {
        const { values, positionals } = parseArgs({
          args: rest,
          options: {
            json: { type: "boolean", default: false },
          },
          allowPositionals: true,
          strict: false,
        });
        const itemId = positionals[0];
        if (!itemId) {
          process.stderr.write("Error: <item-id> is required for `explain`.\n");
          process.exit(1);
        }
        output = await explain({
          itemId,
          json: values.json as boolean,
        });
        break;
      }

      default:
        process.stderr.write(`Unknown command: ${command}\n\n${USAGE}\n`);
        process.exit(1);
    }

    process.stdout.write(output + "\n");
  } catch (err) {
    if (err instanceof DeltamindDirError) {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(2);
    }
    throw err;
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
