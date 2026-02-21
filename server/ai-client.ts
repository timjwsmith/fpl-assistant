/**
 * AI provider abstraction.
 *
 * Provider priority (first matching env var wins):
 *  1. AI_INTEGRATIONS_OPENAI_API_KEY  → OpenAI via Replit AI Integrations (model: gpt-5)
 *  2. ANTHROPIC_API_KEY               → Anthropic Claude (model: claude-opus-4-5 or ANTHROPIC_MODEL)
 *  3. OPENAI_API_KEY                  → Standard OpenAI (model: gpt-4o)
 *
 * All callers use the single exported helper:
 *   getAIJsonResponse(prompt, maxTokens?) → Promise<string>  // always returns a JSON string
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

type Provider = "openai-replit" | "anthropic" | "openai-standard";

function detectProvider(): Provider {
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) return "openai-replit";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai-standard";
  throw new Error(
    "No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or " +
      "AI_INTEGRATIONS_OPENAI_API_KEY (Replit) in your environment."
  );
}

const provider: Provider = detectProvider();

const PROVIDER_LABELS: Record<Provider, string> = {
  "openai-replit": "OpenAI via Replit AI Integrations (gpt-5)",
  anthropic: `Anthropic Claude (${process.env.ANTHROPIC_MODEL ?? "claude-opus-4-5"})`,
  "openai-standard": "OpenAI standard (gpt-4o)",
};
console.log(`[ai-client] Using ${PROVIDER_LABELS[provider]}`);

// Initialise the appropriate client lazily so that missing keys for unused
// providers don't cause startup errors.
const openaiClient =
  provider === "openai-replit" || provider === "openai-standard"
    ? new OpenAI({
        baseURL:
          provider === "openai-replit"
            ? process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
            : undefined,
        apiKey:
          provider === "openai-replit"
            ? process.env.AI_INTEGRATIONS_OPENAI_API_KEY
            : process.env.OPENAI_API_KEY,
      })
    : null;

const anthropicClient =
  provider === "anthropic"
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

/**
 * Send a prompt to the configured AI provider and return a JSON string.
 * The caller is responsible for JSON.parse()-ing the result.
 */
export async function getAIJsonResponse(
  prompt: string,
  maxTokens = 1000
): Promise<string> {
  if (provider === "openai-replit" || provider === "openai-standard") {
    const model = provider === "openai-replit" ? "gpt-5" : "gpt-4o";
    const response = await openaiClient!.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens,
    });
    return response.choices[0].message.content ?? "{}";
  }

  // Anthropic path
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-5";
  const message = await anthropicClient!.messages.create({
    model,
    max_tokens: maxTokens,
    system:
      "You are a helpful assistant. Always respond with valid JSON only — " +
      "no markdown fences, no explanation, just the raw JSON object.",
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "{}";
}
