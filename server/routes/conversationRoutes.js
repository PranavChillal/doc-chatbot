const express = require("express");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const PdfDocument = require("../models/PdfDocument");

const router = express.Router();

// POST /api/conversations  { "documentId": "..." (optional) }
router.post("/", async (req, res) => {
  const documentId = req.body?.documentId;
  try {
    if (documentId) {
      if (!mongoose.isValidObjectId(documentId)) {
        return res.status(400).json({ error: "Invalid document id." });
      }
      const exists = await PdfDocument.exists({ _id: documentId });
      if (!exists) {
        return res.status(404).json({ error: "Document not found." });
      }
    }
    const convo = await Conversation.create({ documentId: documentId || undefined });
    res.status(201).json({
      id: convo._id,
      title: convo.title,
      documentId: convo.documentId || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// GET /api/conversations  ->  list chats, most recent first
router.get("/", async (req, res) => {
  try {
    const convos = await Conversation.find()
      .select("-messages")
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json(
      convos.map((c) => ({
        id: c._id,
        title: c.title,
        documentId: c.documentId || null,
        updatedAt: c.updatedAt,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// GET /api/conversations/:id  ->  one chat with all its messages
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid conversation id." });
  }
  try {
    const convo = await Conversation.findById(id);
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found." });
    }
    res.json({
      id: convo._id,
      title: convo.title,
      documentId: convo.documentId || null,
      messages: convo.messages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// DELETE /api/conversations/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid conversation id." });
  }
  try {
    const convo = await Conversation.findByIdAndDelete(id);
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found." });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

module.exports = router;