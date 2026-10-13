const mongoose = require("mongoose");

const pdfDocumentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true },
    pageCount: { type: Number, required: true },
    characterCount: { type: Number, required: true },
    chunkCount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PdfDocument", pdfDocumentSchema);