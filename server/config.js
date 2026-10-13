module.exports = {
  EMBEDDING_MODEL: "onnx-community/all-MiniLM-L6-v2-ONNX",
  EMBEDDING_DIMENSIONS: 384,
  VECTOR_INDEX_NAME: "chunk_vector_index",
  TOP_K: 5, // how many chunks to retrieve
  MIN_SCORE: 0.55, // chunks scoring below this count as "not relevant"
};