/**
 * Model policy — executable model-selection rules.
 *
 * Default: gemma2:9b (best precision/recall, zero high-FPs, fastest inference)
 * Allowed alternates: qwen2.5:14b (conservative), phi4:14b (aggressive)
 * Blocked: llama3.1:8b (14.3% canonization on pathological — invents certainty)
 */

/** Models that have been validated for delta extraction. */
export const ALLOWED_MODELS = [
  "gemma2:9b",
  "qwen2.5:14b",
  "phi4:14b",
  "qwen2.5:7b",
] as const;

/** The recommended default for production use. */
export const DEFAULT_MODEL = "gemma2:9b" as const;

/** Models explicitly blocked — documented reasons. */
export const BLOCKED_MODELS: ReadonlyMap<string, string> = new Map([
  ["llama3.1:8b", "14.3% canonization on pathological — promotes hedged statements to decisions"],
]);

export interface ModelPolicyResult {
  allowed: boolean;
  model: string;
  reason?: string;
}

/**
 * Check whether a model is approved for delta extraction.
 * Returns the effective model (resolves "default" to gemma2:9b).
 */
export function checkModelPolicy(model: string): ModelPolicyResult {
  if (model === "default") {
    return { allowed: true, model: DEFAULT_MODEL };
  }

  // Check blocked list (prefix match — "llama3.1:8b" blocks "llama3.1:8b-q4" etc.)
  for (const [blocked, reason] of BLOCKED_MODELS) {
    if (model.startsWith(blocked.split(":")[0]) && model.includes(blocked.split(":")[1])) {
      return { allowed: false, model, reason };
    }
  }

  return { allowed: true, model };
}
