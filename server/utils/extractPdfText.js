// Reads a PDF (as a Buffer) and returns [{ pageNumber, text }, ...]
async function extractPdfText(buffer, maxPages = 100) {
  // pdfjs-dist is an ES module, so we load it with a dynamic import
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;

  try {
    if (pdf.numPages > maxPages) {
      const err = new Error(`PDF has more than ${maxPages} pages`);
      err.code = "TOO_MANY_PAGES";
      throw err;
    }

    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push({ pageNumber: n, text });
      page.cleanup();
    }
    return pages;
  } finally {
    // Cleanup is done on the loading task, not on the document
    await loadingTask.destroy();
  }
}

module.exports = extractPdfText;