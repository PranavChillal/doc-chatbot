module.exports = {
  // Embeddings come from Google's API, so the server doesn't need to run a model itself.
  // If you change the model or dimensions, re-upload your documents and recreate the vector index.
  EMBEDDING_MODEL: "gemini-embedding-2",
  EMBEDDING_DIMENSIONS: 768,
  VECTOR_INDEX_NAME: "chunk_vector_index_v2",
  TOP_K: 5, // how many chunks to retrieve

  // Measured with this embedding model: unrelated questions top out around 0.76,
  // relevant ones start around 0.81. The cutoff sits in the gap.
  // Re-measure if the embedding model changes.
  MIN_SCORE: 0.78,
};