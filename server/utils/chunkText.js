// Splits one page of text into overlapping chunks of roughly `size` characters.
// It tries to cut at the end of a sentence, otherwise at a space, so words aren't split.
function chunkText(text, { size = 900, overlap = 150, minLength = 20 } = {}) {
  const clean = (text || "").trim();
  const chunks = [];
  if (!clean) return chunks;

  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);

    if (end < clean.length) {
      const minEnd = start + Math.floor(size * 0.6);
      const windowText = clean.slice(minEnd, end);
      const sentenceEnd = Math.max(
        windowText.lastIndexOf(". "),
        windowText.lastIndexOf("? "),
        windowText.lastIndexOf("! ")
      );

      if (sentenceEnd !== -1) {
        end = minEnd + sentenceEnd + 1;
      } else {
        const space = clean.lastIndexOf(" ", end);
        if (space > minEnd) end = space;
      }
    }

    const piece = clean.slice(start, end).trim();
    if (piece.length >= minLength) chunks.push(piece);

    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1); // step back a little so chunks overlap
  }

  return chunks;
}

module.exports = chunkText;