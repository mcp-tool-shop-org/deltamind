// Adapters — ecosystem integration

// 4A: ai-loadout
export { toLoadoutEntries, toLoadoutIndex } from "./loadout.js";
export type { LoadoutEntry, LoadoutIndex, LoadoutBudget, LoadoutAdapterOptions } from "./loadout.js";

// 4B: claude-memories
export { suggestMemoryUpdates, renderMemoryFile } from "./memories.js";
export type {
  MemoryUpdateSuggestion,
  MemoryUpdateAction,
  MemoryFrontmatter,
  MemorySuggestionOptions,
} from "./memories.js";
