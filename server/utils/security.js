const rateLimit = require("express-rate-limit");

// --- Who is this visitor? -------------------------------------------------
// There are no accounts, so each browser makes up a random id and sends it in a header.
// Chats are saved under that id, so visitors only see their own chats.
// If no header is sent (like when testing from the terminal), the id is "anonymous".
function getOwnerId(req) {
  const raw = req.get("x-client-id");
  if (!raw) return "anonymous";
  return /^[A-Za-z0-9-]{16,64}$/.test(raw) ? raw : null; // null means "invalid"
}

// --- Demo mode -----------------------------------------------------------
// On the public site (DEMO_MODE=true) nobody can upload or delete documents.
function demoGuard(req, res, next) {
  if (process.env.DEMO_MODE === "true") {
    return res.status(403).json({
      error: "Uploading and deleting documents is turned off in the public demo.",
    });
  }
  next();
}

// --- Rate limits ---------------------------------------------------------
// Per visitor (by IP address): at most 10 AI requests per minute
const perMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a minute and try again." },
});

// For everyone together: at most DAILY_AI_LIMIT AI requests per day.
// This protects your free Google quota. The count is kept in memory,
// so it also resets whenever the server restarts.
let currentDay = new Date().toISOString().slice(0, 10);
let usedToday = 0;

function dailyAiCap(req, res, next) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDay) {
    currentDay = today;
    usedToday = 0;
  }
  const limit = Number(process.env.DAILY_AI_LIMIT) || 150;
  if (usedToday >= limit) {
    return res.status(429).json({
      error: "The demo has reached its daily limit. Please try again tomorrow.",
    });
  }
  usedToday += 1;
  next();
}

module.exports = { getOwnerId, demoGuard, perMinuteLimiter, dailyAiCap };