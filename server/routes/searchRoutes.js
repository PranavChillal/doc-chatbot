const express = require("express");
const mongoose = require("mongoose");
const { searchChunks } = require("../utils/retrieval");
const { TOP_K } = require("../config");

const router = express.Router();

// POST /api/search  { "query": "...", "documentId": "..." (optional) }
// Shows the raw matching chunks and their scores (handy for testing).
router.post("/", async (req, res) => {
  const query = req.body?.query;
  const documentId = req.body?.documentId;

  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Please provide a question in 'query'." });
  }
  if (query.length > 500) {
    return res.status(400).json({ error: "Question is too long (500 characters max)." });
  }
  if (documentId && !mongoose.isValidObjectId(documentId)) {
    return res.status(400).json({ error: "Invalid document id." });
  }

  try {
    const results = await searchChunks(query.trim(), documentId, TOP_K);
    res.json(results);
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).json({ error: "Something went wrong while searching." });
  }
});

module.exports = router;