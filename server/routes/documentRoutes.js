const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const PdfDocument = require("../models/PdfDocument");
const Chunk = require("../models/Chunk");
const extractPdfText = require("../utils/extractPdfText");
const chunkText = require("../utils/chunkText");
const { embedTexts } = require("../utils/embeddings");

const router = express.Router();

const MAX_FILE_MB = 5;
const MAX_PAGES = 100;

// Keep the uploaded file in memory (we never write it to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1 },
}).single("file");

// Real PDFs start with the bytes "%PDF-". The file extension can be faked, so check this instead.
function looksLikePdf(buffer) {
  return buffer.length > 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

// POST /api/documents  (multipart form, field name: "file")
router.post("/", (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ error: `File is too large. The limit is ${MAX_FILE_MB} MB.` });
      }
      return res
        .status(400)
        .json({ error: "Upload failed. Send one PDF in the 'file' field." });
    }
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Something went wrong." });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No file uploaded. Send a PDF in the 'file' field." });
    }
    if (!looksLikePdf(req.file.buffer)) {
      return res.status(400).json({ error: "Only PDF files are allowed." });
    }

    // 1) Read the PDF. A failure here really can mean a bad PDF.
    let pages;
    try {
      pages = await extractPdfText(req.file.buffer, MAX_PAGES);
    } catch (e) {
      if (e.code === "TOO_MANY_PAGES") {
        return res
          .status(413)
          .json({ error: `PDF is too long. The limit is ${MAX_PAGES} pages.` });
      }
      console.error("PDF extraction failed:", e);
      return res.status(400).json({
        error: "Could not read this PDF. It may be corrupted or password-protected.",
      });
    }

    // 2) Everything below is our own code, so a failure is a server error, not a bad PDF.
    try {
      const characterCount = pages.reduce((sum, p) => sum + p.text.length, 0);

      // Split every page into chunks, remembering which page each chunk came from
      const chunks = [];
      for (const page of pages) {
        for (const text of chunkText(page.text)) {
          chunks.push({ pageNumber: page.pageNumber, chunkIndex: chunks.length, text });
        }
      }

      if (chunks.length === 0) {
        return res.status(422).json({
          error:
            "No readable text found in this PDF. It may be a scanned document made of images.",
        });
      }

      // Turn every chunk into a vector of numbers (this is the slow part)
      const vectors = await embedTexts(chunks.map((c) => c.text));

      const doc = await PdfDocument.create({
        originalName: req.file.originalname.slice(0, 255),
        sizeBytes: req.file.size,
        pageCount: pages.length,
        characterCount,
        chunkCount: chunks.length,
      });

      try {
        await Chunk.insertMany(
          chunks.map((c, i) => ({ ...c, embedding: vectors[i], documentId: doc._id }))
        );
      } catch (insertErr) {
        // Don't leave a half-saved document behind
        await PdfDocument.deleteOne({ _id: doc._id });
        throw insertErr;
      }

      return res.status(201).json({
        id: doc._id,
        originalName: doc.originalName,
        pageCount: doc.pageCount,
        characterCount: doc.characterCount,
        chunkCount: doc.chunkCount,
      });
    } catch (e) {
      console.error("Processing failed:", e);
      return res
        .status(500)
        .json({ error: "Something went wrong while processing the document." });
    }
  });
});

// GET /api/documents  ->  list uploaded documents
router.get("/", async (req, res) => {
  try {
    const docs = await PdfDocument.find().sort({ createdAt: -1 }).limit(100);
    res.json(
      docs.map((d) => ({
        id: d._id,
        originalName: d.originalName,
        sizeBytes: d.sizeBytes,
        pageCount: d.pageCount,
        chunkCount: d.chunkCount,
        createdAt: d.createdAt,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// DELETE /api/documents/:id  ->  remove a document and all of its chunks
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid document id." });
  }
  try {
    const doc = await PdfDocument.findByIdAndDelete(id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }
    await Chunk.deleteMany({ documentId: id });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

module.exports = router;