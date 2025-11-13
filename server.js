// ✅ PromotionAI - Smart Backend (AI Text + Cloudinary Gallery + Razorpay Payment)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";
import Razorpay from "razorpay";

// 🔥 NEW: Firebase Admin
import admin from "firebase-admin";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// 🔑 API Keys & Model
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";
const GALLERY_PATH = new URL("./gallery_manifest.json", import.meta.url).pathname;

// ===============================================
// 🔥 NEW: Firebase Admin Setup
// ===============================================
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccount.json"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin Connected");
  } catch (err) {
    console.log("❌ Firebase Admin Error:", err.message);
  }
}

const firestore = admin.firestore();


// ===========================================================
// ✍️ TEXT GENERATION (Same as before — untouched)
// ===========================================================
app.post("/api/prompt", async (req, res) => {
  const { prompt, tone, length, businessType, template, creativity, action, tool } = req.body;

  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  // Smart tool-based prompt builder
  const buildToolPrompt = (tool, text) => {
    switch (tool) {
      case "rephrase": return `Rephrase this text professionally:\n\n${text}`;
      case "translate_hinglish": return `Translate to Hinglish:\n\n${text}`;
      case "hashtags": return `Extract 10 hashtags:\n\n${text}`;
      case "shorten": return `Shorten to 25 words:\n\n${text}`;
      default: return `${tool}: ${text}`;
    }
  };

  let finalPrompt = "";
  let maxTokens = 600;

  if (action === "tool" || tool) {
    finalPrompt = buildToolPrompt(tool, prompt);
    maxTokens = 250;
  } else {
    finalPrompt = `
Template: ${template || "Custom"}
Business: ${businessType || "General"}
Tone: ${tone || "Casual"}
Length: ${length || "Medium"}
Creativity: ${creativity || 70}
User Request:
${prompt}
`;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: finalPrompt }],
        max_tokens: maxTokens,
      }),
    });

    const data = await response.json();
    const output = data?.choices?.[0]?.message?.content?.trim() || "No response.";

    res.json({ output });
  } catch (error) {
    res.status(500).json({ error: "AI request failed", details: error.message });
  }
});


// ===========================================================
// 🖼️ IMAGE API (Same as before — untouched)
// ===========================================================
app.post("/api/image", async (req, res) => {
  const { prompt, template } = req.body;
  if (!prompt) return res.status(400).send("No image prompt provided.");

  try {
    const galleryData = JSON.parse(fs.readFileSync(GALLERY_PATH, "utf-8"));
    const category = (template || "general").toLowerCase();
    const images = galleryData[category] || galleryData["general"] || [];

    if (images.length > 0) {
      const randomImage = images[Math.floor(Math.random() * images.length)];
      return res.json({ images: [randomImage], source: "cloudinary" });
    }

    return res.json({
      images: [`https://placehold.co/512x512?text=${encodeURIComponent(prompt)}`],
      source: "placeholder",
    });

  } catch (err) {
    return res.json({
      images: [`https://placehold.co/512x512?text=${encodeURIComponent(prompt)}`],
      source: "fallback",
    });
  }
});


// ===========================================================
// 💰 Razorpay (Same as before — untouched)
// ===========================================================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post("/api/create-order", async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: 9900,
      currency: "INR",
      receipt: "order_" + Date.now(),
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Order creation failed" });
  }
});


// ===========================================================
// ⭐ NEW: FIREBASE USER AUTO-UPDATE API
// ===========================================================
app.post("/api/update-user", async (req, res) => {
  try {
    const { uid, data } = req.body;

    if (!uid || !data) {
      return res.status(400).json({ error: "Missing uid or data" });
    }

    await firestore.collection("users").doc(uid).set(data, { merge: true });

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ===========================================================
// HEALTH CHECK
// ===========================================================
app.get("/", (req, res) => {
  res.send("🚀 PromotionAI Backend Running");
});


// ===========================================================
// START SERVER
// ===========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Server running on ${PORT}`));
