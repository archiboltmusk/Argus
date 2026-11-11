/**
 * Ollama Local AI Companion Engine
 *
 * Connects directly to local Ollama instance (http://127.0.0.1:11434) for
 * 100% private, zero-cloud-cost on-device AI interactions, spoiler-free
 * cinema lore queries, and scene recaps.
 */

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaQueryResult {
  response: string;
  model: string;
  isLocal: boolean;
  totalDurationMs?: number;
}

const OLLAMA_DEFAULT_URL = "http://127.0.0.1:11434";

/**
 * Checks whether an Ollama daemon is currently running locally
 */
export async function checkOllamaAvailability(
  baseUrl: string = OLLAMA_DEFAULT_URL,
): Promise<{ available: boolean; models: string[] }> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return { available: false, models: [] };
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const models = (data.models || []).map((m) => m.name);
    return { available: true, models };
  } catch {
    return { available: false, models: [] };
  }
}

/**
 * Queries Ollama with strict anti-spoiler boundaries for cinema companion queries
 */
export async function queryOllamaCinemaCompanion(params: {
  question: string;
  filmTitle?: string;
  currentTimestampSec?: number;
  knownCharacters?: string[];
  baseUrl?: string;
  preferredModel?: string;
  signal?: AbortSignal;
}): Promise<OllamaQueryResult> {
  const {
    question,
    filmTitle = "Current Film",
    currentTimestampSec = 0,
    knownCharacters = [],
    baseUrl = OLLAMA_DEFAULT_URL,
    preferredModel,
    signal,
  } = params;

  const { available, models } = await checkOllamaAvailability(baseUrl);
  if (!available || models.length === 0) {
    // Graceful offline fallback
    return {
      response: `[Local AI Offline] Ollama was not detected on ${baseUrl}. Start Ollama locally with 'ollama run llama3.2' for real-time cinema lore and scene explanations.`,
      model: "none",
      isLocal: false,
    };
  }

  // Pick best available model: preferred -> llama3.2 -> mistral -> qwen -> first
  const selectedModel =
    (preferredModel && models.includes(preferredModel) && preferredModel) ||
    models.find((m) => /llama3|mistral|qwen|phi/i.test(m)) ||
    models[0];

  const timeFormatted = `${Math.floor(currentTimestampSec / 60)}:${String(
    Math.floor(currentTimestampSec % 60),
  ).padStart(2, "0")}`;

  const systemPrompt = `You are the Argus Cinema Companion, an expert film and narrative scholar.
The user is currently watching: "${filmTitle}" at timestamp ${timeFormatted} (${Math.round(
    currentTimestampSec,
  )} seconds in).
CRITICAL RULE: NEVER REVEAL SPOILERS, PLOT TWISTS, DEATHS, OR EVENTS THAT OCCUR AFTER ${timeFormatted}.
Only answer using context and character facts known prior to ${timeFormatted}.
${knownCharacters.length > 0 ? `Characters introduced so far: ${knownCharacters.join(", ")}` : ""}
Keep answers concise, engaging, and atmospheric.`;

  const startTime = Date.now();
  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: signal ?? AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: selectedModel,
        prompt: question,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 256,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama HTTP ${res.status}`);
    }

    const data = (await res.json()) as { response?: string; total_duration?: number };
    return {
      response: data.response?.trim() || "No response received from local AI.",
      model: selectedModel,
      isLocal: true,
      totalDurationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const errStr = err instanceof Error ? err.message : String(err);
    return {
      response: `Failed to query local AI: ${errStr}`,
      model: selectedModel,
      isLocal: true,
    };
  }
}
