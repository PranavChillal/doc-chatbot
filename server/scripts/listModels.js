require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

// Usage: node scripts/listModels.js [action]
// Default action is generateContent. Try: node scripts/listModels.js embedContent
const action = process.argv[2] || "generateContent";

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing in .env");
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const pager = await ai.models.list();
  for await (const m of pager) {
    const actions = m.supportedActions || [];
    if (actions.includes(action)) {
      console.log((m.name || "").replace("models/", ""));
    }
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});