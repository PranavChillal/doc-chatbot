const { getClient, LlmError, toLlmError, sleep } = require("./gemini");
const { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } = require("../config");

// Turns text into vectors using Google's embedding API.
// Documents and questions use different "task types" so that searching works better.

const BATCH_SIZE = 20; // texts per API call
const PAUSE_BETWEEN_BATCHES_MS = 200;
const RETRY_DELAYS_MS = [1000, 3000];

async function embedBatch(texts, taskType) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await getClient().models.embedContent({
        model: EMBEDDING_MODEL,
        // One Content object per text. (A plain list of strings would be merged into ONE embedding.)
        contents: texts.map((text) => ({ role: "user", parts: [{ text }] })),
        config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
      });

      const vectors = (response.embeddings || []).map((e) => e.values);
      const wrongShape =
        vectors.length !== texts.length ||
        vectors.some((v) => !Array.isArray(v) || v.length !== EMBEDDING_DIMENSIONS);
      if (wrongShape) {
        throw new LlmError(
          `Unexpected embedding response: expected ${texts.length} vectors of ${EMBEDDING_DIMENSIONS} numbers, ` +
            `got ${vectors.length} vectors (first has ${vectors[0]?.length ?? 0} numbers)`,
          "config"
        );
      }
      return vectors;
    } catch (err) {
      const llmError = toLlmError(err);
      const retryable = llmError.kind === "unavailable";
      if (!retryable || attempt === RETRY_DELAYS_MS.length) throw llmError;

      console.warn(
        `Embedding call failed (${llmError.kind}): ${llmError.message}. Retrying in ${RETRY_DELAYS_MS[attempt]} ms...`
      );
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

// Embeds many document chunks (used when a PDF is uploaded)
async function embedTexts(texts) {
  if (!process.env.GEMINI_API_KEY) {
    throw new LlmError("GEMINI_API_KEY is missing in .env", "config");
  }
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    if (i > 0) await sleep(PAUSE_BETWEEN_BATCHES_MS);
    const batch = texts.slice(i, i + BATCH_SIZE);
    vectors.push(...(await embedBatch(batch, "RETRIEVAL_DOCUMENT")));
  }
  return vectors;
}

// Embeds one question (used when searching)
async function embedQuery(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new LlmError("GEMINI_API_KEY is missing in .env", "config");
  }
  const [vector] = await embedBatch([text], "RETRIEVAL_QUERY");
  return vector;
}

module.exports = { embedTexts, embedQuery };