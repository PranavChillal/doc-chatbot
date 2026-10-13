const mongoose = require("mongoose");
const Chunk = require("../models/Chunk");
const { embedQuery } = require("./embeddings");
const { VECTOR_INDEX_NAME } = require("../config");

// Finds the chunks whose meaning is closest to the question.
// Optionally limited to one document.
async function searchChunks(query, documentId, limit = 5) {
  const queryVector = await embedQuery(query);

  const stage = {
    index: VECTOR_INDEX_NAME,
    path: "embedding",
    queryVector,
    numCandidates: 100,
    limit,
  };
  if (documentId) {
    stage.filter = { documentId: new mongoose.Types.ObjectId(documentId) };
  }

  return Chunk.aggregate([
    { $vectorSearch: stage },
    {
      $project: {
        documentId: 1,
        pageNumber: 1,
        chunkIndex: 1,
        text: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);
}

module.exports = { searchChunks };