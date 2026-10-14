const express = require("express");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const PdfDocument = require("../models/PdfDocument");
const { getOwnerId } = require("../utils/security");

const router = express.Router();

const MAX_CONVERSATIONS_PER_OWNER = 30;

// Every route below only touches the visitor's own chats
router.use((req, res, next) => {
  const ownerId = getOwnerId(req);
  if (!ownerId) {
    return res.status(400).json({ error: "Invalid client id." });
  }
  req.ownerId = ownerId;
  next();
});

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

    const count = await Conversation.countDocuments({ ownerId: req.ownerId });
    if (count >= MAX_CONVERSATIONS_PER_OWNER) {
      return res
        .status(400)
        .json({ error: "You have too many chats. Please delete some first." });
    }

    const convo = await Conversation.create({
      ownerId: req.ownerId,
      documentId: documentId || undefined,
    });
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

// GET /api/conversations  ->  list this visitor's chats, most recent first
router.get("/", async (req, res) => {
  try {
    const convos = await Conversation.find({ ownerId: req.ownerId })
      .select("-messages")
      .sort({ updatedAt: -1 })
      .limit(MAX_CONVERSATIONS_PER_OWNER);
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
    const convo = await Conversation.findOne({ _id: id, ownerId: req.ownerId });
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
    const convo = await Conversation.findOneAndDelete({ _id: id, ownerId: req.ownerId });
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