require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const documentRoutes = require("./routes/documentRoutes");
const searchRoutes = require("./routes/searchRoutes");
const chatRoutes = require("./routes/chatRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const { demoGuard, perMinuteLimiter, dailyAiCap } = require("./utils/security");

const app = express();

// Hosts like Render put a proxy in front of the app.
// This makes req.ip the visitor's real address, so rate limits work per visitor.
app.set("trust proxy", 1);

// On the live server, set CLIENT_ORIGIN to your website's address so only it can call the API.
// While it's not set (local development), any origin is allowed.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : true }));

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// In demo mode, uploading and deleting documents is switched off
app.post("/api/documents", demoGuard, perMinuteLimiter);
app.delete("/api/documents/:id", demoGuard);

app.use("/api/documents", documentRoutes);
app.use("/api/search", perMinuteLimiter, dailyAiCap, searchRoutes);
app.use("/api/chat", perMinuteLimiter, dailyAiCap, chatRoutes);
app.use("/api/conversations", conversationRoutes);

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});