const { EMBEDDING_MODEL } = require("../config");

let extractorPromise = null;

async function loadModel() {
  // @huggingface/transformers is an ES module, so we load it with a dynamic import
  const { pipeline } = await import("@huggingface/transformers");
  console.log("Loading embedding model (the first time, it downloads)...");
  const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL);
  console.log("Embedding model ready");
  return extractor;
}

// Load the model once, then reuse it
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = loadModel().catch((err) => {
      extractorPromise = null; // allow a retry next time
      throw err;
    });
  }
  return extractorPromise;
}

// Turns a list of texts into a list of 384-number vectors
async function embedTexts(texts, batchSize = 16) {
  const extractor = await getExtractor();
  const vectors = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const output = await extractor(batch, { pooling: "mean", normalize: true });
    vectors.push(...output.tolist());
  }
  return vectors;
}

async function embedQuery(text) {
  const [vector] = await embedTexts([text]);
  return vector;
}

module.exports = { embedTexts, embedQuery };