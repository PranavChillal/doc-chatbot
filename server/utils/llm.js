const { getClient, LlmError, toLlmError, sleep } = require("./gemini");

// Writes answers. Only this file and gemini.js know which AI provider is used.

const ATTEMPTS_PER_MODEL = 2; // try each model twice before moving on
const RETRY_DELAY_MS = 1000;

// The main model first, then any backups listed in GEMINI_FALLBACK_MODELS
function modelsToTry() {
  const primary = process.env.GEMINI_MODEL;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [primary, ...fallbacks.filter((m) => m !== primary)];
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