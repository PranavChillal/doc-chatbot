const mongoose = require("mongoose");

const sourceSchema = new mongoose.Schema(
  {
    number: Number,
    documentId: mongoose.Schema.Types.ObjectId,
    documentName: String,
    pageNumber: Number,
    score: Number,
    snippet: String,
    cited: Boolean,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    sources: { type: [sourceSchema], default: undefined },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    // Random id made by the visitor's browser, so people only see their own chats
    ownerId: { type: String, required: true, index: true },
    title: { type: String, default: "New chat", trim: true, maxlength: 120 },
    // Optional: limit this chat to one document
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "PdfDocument", default: undefined },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);