const { GoogleGenAI, ApiError } = require("@google/genai");

// Everything shared by the AI calls (answers and embeddings) lives here:
// the client, our own error type, and the translation of library errors into it.

class LlmError extends Error {
  constructor(message, kind) {
    super(message);
    this.name = "LlmError";
    // "config" | "rate_limit" | "auth" | "model" | "empty" | "timeout" | "unavailable"
    this.kind = kind;
  }
}

const REQUEST_TIMEOUT_MS = 20000; // give up on one request after 20 seconds

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { getClient, LlmError, toLlmError, sleep };