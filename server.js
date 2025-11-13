// server.js
// PromotionAI — Full backend: AI text (tools + templates), image gallery, Razorpay, Firebase Admin (ENV), update-user API

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import admin from "firebase-admin";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

// -------------------- Config / Env --------------------
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";
const GALLERY_PATH = process.env.GALLERY_PATH || new URL("./gallery_manifest.json", import.meta.url).pathname;
const PORT = process.env.PORT || 5000;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

// -------------------- Firebase Admin init (from ENV) --------------------
let firestore = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const cfg = typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === "string"
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(cfg),
      });
      console.log("🔥 Firebase Admin initialized from ENV");
    }
    firestore = admin.firestore();
  } else {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_JSON not set — Firestore features will fail until set.");
  }
} catch (err) {
  console.error("❌ Firebase Admin Init Error:", err && err.message ? err.message : err);
}

// -------------------- Helper: tool prompts --------------------
function buildToolPrompt(tool, text) {
  switch ((tool || "").toLowerCase()) {
    case "rephrase":
      return `Rephrase this marketing copy to be more engaging and concise. Preserve meaning:\n\n${text}`;
    case "translate_hinglish":
      return `Translate the following into Hinglish (Hindi in Latin script) while keeping meaning and tone:\n\n${text}`;
    case "hashtags":
      return `Extract up to 10 short relevant marketing hashtags (comma separated, no #) from:\n\n${text}`;
    case "shorten":
      return `Shorten this content to a social media caption <= 25 words:\n\n${text}`;
    case "expand":
      return `Expand this marketing text with details and benefits. Keep it persuasive:\n\n${text}`;
    default:
      return text;
  }
}

// -------------------- Utility: call OpenRouter --------------------
async function callOpenRouter(finalPrompt, maxTokens = 600) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: finalPrompt }],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenRouter error: ${res.status} ${txt}`);
  }
  const json = await res.json();
  const output = json?.choices?.[0]?.message?.content;
  return output || "";
}

// -------------------- API: main prompt (templates + tools) --------------------
app.post("/api/prompt", async (req, res) => {
  try {
    const { prompt, tool, template, tone, length, businessType, creativity, action } = req.body;
    if (!prompt && !tool) return res.status(400).json({ error: "Missing prompt" });

    // tool mode — quick tasks (hashtags, rephrase, shorten, translate_hinglish, expand)
    if (action === "tool" || tool) {
      const tp = buildToolPrompt(tool, prompt);
      const maxTokens = 250;
      const out = await callOpenRouter(tp, maxTokens);
      return res.json({ output: out });
    }

    // full template mode
    const finalPrompt = `
🎯 Template: ${template || "Custom"}
🏢 Business Type: ${businessType || "General"}
💬 Tone: ${tone || "Casual"}
📏 Length: ${length || "Medium"}
🌈 Creativity: ${creativity || 70}%
🧠 User Prompt:
${prompt}

➡️ Generate creative, brand-relevant marketing content. Provide short caption, 3 hashtags (with #), and a longer description. Keep output readable and separated with headings.
`;
    const out = await callOpenRouter(finalPrompt, 800);
    res.json({ output: out });
  } catch (err) {
    console.error("Prompt error:", err && err.message ? err.message : err);
    res.status(500).json({ error: "Prompt failed", details: err.message });
  }
});

// -------------------- API: image (gallery fallback) --------------------
app.post("/api/image", async (req, res) => {
  try {
    const { prompt, template } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt" });

    // try to return images from gallery_manifest.json if present
    try {
      const raw = fs.readFileSync(GALLERY_PATH, "utf-8");
      const gallery = JSON.parse(raw || "{}");
      const cat = (template || "general").toLowerCase();
      const arr = gallery[cat] || gallery["general"] || [];
      if (arr.length > 0) {
        const chosen = arr[Math.floor(Math.random() * arr.length)];
        return res.json({ images: [chosen], source: "gallery" });
      }
    } catch (e) {
      // ignore: use placeholder fallback
    }

    // fallback: placeholder image service
    const placeholder = `https://placehold.co/1024x1024?text=${encodeURIComponent(prompt)}`;
    res.json({ images: [placeholder], source: "placeholder" });
  } catch (err) {
    console.error("Image API error:", err && err.message ? err.message : err);
    res.status(500).json({ error: "Image failed", details: err.message });
  }
});

// -------------------- Razorpay: create order --------------------
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body; // amount in paise recommended
    const opts = {
      amount: amount || 100,
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    };
    const order = await razorpay.orders.create(opts);
    res.json(order);
  } catch (err) {
    console.error("Razorpay create order error:", err && err.message ? err.message : err);
    res.status(500).json({ error: "Order creation failed", details: err.message });
  }
});

// -------------------- Firebase: update-user API --------------------
app.post("/api/update-user", async (req, res) => {
  try {
    if (!firestore) return res.status(500).json({ error: "Firestore not initialized" });

    const { uid, data } = req.body;
    if (!uid || !data) return res.status(400).json({ error: "Missing uid or data" });

    await firestore.collection("users").doc(uid).set(data, { merge: true });
    return res.json({ success: true });
  } catch (err) {
    console.error("update-user error:", err && err.message ? err.message : err);
    res.status(500).json({ error: "Update failed", details: err.message });
  }
});

// -------------------- Optional helper endpoints (usage / tools) --------------------
// Tools endpoint: redirect to tool action for easier frontend calls
app.post("/api/tool", async (req, res) => {
  try {
    const { tool, text } = req.body;
    if (!tool || !text) return res.status(400).json({ error: "Missing tool or text" });
    const prompt = buildToolPrompt(tool, text);
    const out = await callOpenRouter(prompt, 300);
    res.json({ output: out });
  } catch (err) {
    console.error("Tool error:", err && err.message ? err.message : err);
    res.status(500).json({ error: "Tool failed", details: err.message });
  }
});

// -------------------- Health --------------------
app.get("/", (req, res) => {
  res.send("🔥 PromotionAI backend live (AI + Images + Razorpay + Firebase)");
});

// -------------------- Start --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
