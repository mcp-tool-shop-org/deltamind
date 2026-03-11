/**
 * deltamind suggest-memory — advisory claude-memories updates.
 *
 * Flags: --min-confidence <tier>, --include-superseded, --json
 */

import { suggestMemoryUpdates, renderMemoryFile } from "@deltamind/core";
import type { MemorySuggestionOptions, ConfidenceTier } from "@deltamind/core";
import { loadSession } from "../io.js";

export interface SuggestMemoryOptions {
  minConfidence?: ConfidenceTier;
  includeSuperSeded?: boolean;
  json?: boolean;
  dir?: string;
}

export async function suggestMemory(opts: SuggestMemoryOptions = {}): Promise<string> {
  const { session } = loadSession(opts.dir);

  const suggestOpts: MemorySuggestionOptions = {};
  if (opts.minConfidence) suggestOpts.minConfidence = opts.minConfidence;
  if (opts.includeSuperSeded) suggestOpts.includeSuperSeded = true;

  const suggestions = suggestMemoryUpdates(session, suggestOpts);

  if (opts.json) return JSON.stringify(suggestions, null, 2);

  if (suggestions.length === 0) {
    return "No memory updates suggested.";
  }

  const sections: string[] = [];
  for (const suggestion of suggestions) {
    sections.push(`--- ${suggestion.action}: ${suggestion.item.id} ---`);
    sections.push(renderMemoryFile(suggestion));
    sections.push("");
  }
  return sections.join("\n").trimEnd();
}
