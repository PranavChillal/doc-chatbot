const { GoogleGenAI, ApiError } = require("@google/genai");

// All the AI-provider details live in this one file.
// To switch providers later, only this file changes.

class LlmError extends Error {
  constructor(message, kind) {
    super(message);
    this.name = "LlmError";
    // "config" | "rate_limit" | "auth" | "model" | "empty" | "timeout" | "unavailable"
    this.kind = kind;
  }
}

const REQUEST_TIMEOUT_MS = 20000; // give up on one request after 20 seconds
const ATTEMPTS_PER_MODEL = 2; // try each model twice before moving on
const RETRY_DELAY_MS = 1000;

let client = null;
function getClient() {
  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    });
  }
  return client;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The main model first, then any backups listed in GEMINI_FALLBACK_MODELS
function modelsToTry() {
  const primary = process.env.GEMINI_MODEL;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

// Turns any error from the AI library into one of our own error kinds
function toLlmError(err) {
  if (err instanceof LlmError) return err;
  if (err instanceof ApiError) {
    if (err.status === 429) return new LlmError(err.message, "rate_limit");
    if (err.status === 401 || err.status === 403) return new LlmError(err.message, "auth");
    if (err.status === 404) return new LlmError(err.message, "model");
    if (err.status === 400 && /api key/i.test(err.message)) {
      return new LlmError(err.message, "auth");
    }
  }
  const message = (err && err.message) || "AI request failed";
  const timedOut =
    err?.name === "AbortError" ||
    err?.name === "TimeoutError" ||
    /timed? ?out|timeout|aborted/i.test(message);
  if (timedOut) return new LlmError("The AI request timed out.", "timeout");
  return new LlmError(message, "unavailable");
}

// Ask one specific model, retrying briefly if it's just busy
async function tryModel(model, systemInstruction, prompt) {
  for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
    try {
      const response = await getClient().models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction, temperature: 0.2, maxOutputTokens: 2048 },
      });

      const text = response.text;
      if (!text || !text.trim()) {
        throw new LlmError("The AI returned an empty answer.", "empty");
      }
      return text.trim();
    } catch (err) {
      const llmError = toLlmError(err);

      // Only temporary problems are worth retrying the same model
      const retryable = llmError.kind === "unavailable" || llmError.kind === "empty";
      if (!retryable || attempt === ATTEMPTS_PER_MODEL) throw llmError;

      console.warn(
        `Model ${model} failed (${llmError.kind}): ${llmError.message}. Retrying in ${RETRY_DELAY_MS} ms...`
      );
      await sleep(RETRY_DELAY_MS);
    }
  }
}

async function generateAnswer({ systemInstruction, prompt }) {
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) {
    throw new LlmError("GEMINI_API_KEY or GEMINI_MODEL is missing in .env", "config");
  }

  const models = modelsToTry();
  let lastError;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await tryModel(model, systemInstruction, prompt);
    } catch (err) {
      lastError = err;
      // A rejected key won't be fixed by trying another model
      if (err.kind === "auth" || err.kind === "config") throw err;

      const hasNext = i < models.length - 1;
      console.warn(
        `Model ${model} gave up (${err.kind}).${hasNext ? ` Trying ${models[i + 1]}...` : ""}`
      );
    }
  }

  throw lastError;
}

module.exports = { generateAnswer, LlmError };