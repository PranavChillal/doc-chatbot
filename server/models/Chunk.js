const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PdfDocument",
      required: true,
      index: true,
    },
    pageNumber: { type: Number, required: true },
    chunkIndex: { type: Number, required: true }, // order within the document
    text: { type: String, required: true },
    // 384 numbers describing the meaning of the text. Hidden by default because it's long.
    embedding: { type: [Number], default: undefined, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chunk", chunkSchema);