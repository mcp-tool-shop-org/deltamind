/**
 * LLM provider interface — keeps the library LLM-agnostic.
 *
 * The extractor formats prompts and parses responses.
 * The provider just moves text in and out of a model.
 */

/** A function that sends a prompt to an LLM and returns the response text. */
export type LlmProvider = (prompt: string) => Promise<string>;

/**
 * Create an Ollama-compatible provider.
 * Works with any OpenAI-compatible chat endpoint.
 */
export function createOllamaProvider(opts: {
  model: string;
  baseUrl?: string;
  temperature?: number;
}): LlmProvider {
  const baseUrl = opts.baseUrl ?? "http://localhost:11434";
  const temperature = opts.temperature ?? 0.1; // Low temp for structured extraction

  return async (prompt: string): Promise<string> => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        prompt,
        stream: false,
        options: { temperature },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as { response: string };
    return data.response;
  };
}

/**
 * Create a mock provider for testing. Returns canned responses.
 */
export function createMockProvider(responses: string[]): LlmProvider {
  let idx = 0;
  return async (_prompt: string): Promise<string> => {
    if (idx >= responses.length) return "[]";
    return responses[idx++];
  };
}
