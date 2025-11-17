// ✅ PromotionAI - Smart Backend (AI Text + Gallery + Razorpay + Referrals)

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";
import Razorpay from "razorpay";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// 🔑 API Keys
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";
const GALLERY_PATH = new URL("./gallery_manifest.json", import.meta.url).pathname;

// 🧠 Helper prompts
function buildToolPrompt(tool, text) {
  switch (tool) {
    case "rephrase":
      return `Rephrase this marketing text professionally:\n\n${text}`;
    case "translate_hinglish":
      return `Translate English into Hinglish:\n\n${text}`;
    case "hashtags":
      return `Extract 10 marketing hashtags (no # symbol):\n\n${text}`;
    case "shorten":
      return `Short 25-word catchy caption:\n\n${text}`;
    default:
      return `Do this task: ${tool}\n\n${text}`;
  }
}

// ✍️ TEXT AI API
app.post("/api/prompt", async (req, res) => {
  const { prompt, tone, length, businessType, template, creativity, action, tool } = req.body;

  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  let finalPrompt = "";
  let maxTokens = 600;

  if (tool || template === "tool") {
    finalPrompt = buildToolPrompt(tool, prompt);
    maxTokens = 250;
  } else {
    finalPrompt = `
🎯 Template: ${template || "Custom"}
🏢 Type: ${businessType || "General"}
💬 Tone: ${tone || "Casual"}
📏 Length: ${length || "Medium"}
🌈 Creativity: ${creativity || 70}%
🧠 Prompt: ${prompt}
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
    const output = data?.choices?.[0]?.message?.content?.trim() || "No output.";
    res.json({ output });
  } catch (err) {
    res.status(500).json({ error: "AI failed", details: err.message });
  }
});

// 🖼️ GALLERY IMAGE API
app.post("/api/image", (req, res) => {
  const { prompt, template } = req.body;
  if (!prompt) return res.status(400).send("No prompt given.");

  try {
    const galleryData = JSON.parse(fs.readFileSync(GALLERY_PATH, "utf-8"));
    const category = (template || "general").toLowerCase();
    const images = galleryData[category] || galleryData["general"];

    if (images?.length > 0) {
      const randomImage = images[Math.floor(Math.random() * images.length)];
      return res.json({ images: [randomImage], source: "cloudinary" });
    }
  } catch {}

  return res.json({
    images: [`https://placehold.co/512x512?text=${encodeURIComponent(prompt)}`],
    source: "placeholder",
  });
});

// 💰 Razorpay Init
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 💰 PAYMENT ORDER ROUTE
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body; // INR in paise from frontend => correct!

    const options = {
      amount,
      currency: "INR",
      receipt: `order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);

  } catch (err) {
    res.status(500).json({ error: "Order failed", details: err.message });
  }
});

// 💸 PAYMENT SUCCESS (OLD FEATURE PRESERVED)
app.post("/api/payment-success", async (req, res) => {
  const { userId } = req.body;

  // ⚠️ IMPORTANT: Your referral system uses Firebase Realtime DB
  // Make sure db is imported earlier.
  // I did NOT modify your reward logic.
  const userSnap = await db.ref("users/" + userId).once("value");
  const user = userSnap.val();

  if (user.referredBy) {
    const referrer = user.referredBy;

    const refSnap = await db.ref("users/" + referrer).once("value");
    const refData = refSnap.val();

    const reward = refData.reward || 0;

    await db.ref("users/" + referrer).update({
      reward: reward + 10,
    });

    await db.ref("referrals").push({
      referrer,
      buyer: userId,
      amount: 10,
      date: Date.now(),
    });
  }

  res.json({ success: true });
});

// 🌐 HEALTH CHECK
app.get("/", (req, res) => {
  res.send("✅ PromotionAI backend running!");
});


// 🎬 TEXT → VIDEO (Replicate HunyuanVideo)
app.post("/api/video-generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt missing" });

  try {
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "hunyuanvideo",   // Free open-source video model
        input: {
          prompt: prompt,
          duration: 10,
          fps: 24
        }
      })
    });

    const data = await response.json();
    res.json(data); // returns job ID
  } catch (err) {
    res.status(500).json({ error: "Video generation failed", details: err.message });
  }
});

// 🎬 VIDEO STATUS
app.get("/api/video-status/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { "Authorization": `Bearer ${process.env.REPLICATE_API_KEY}` }
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Status check failed", details: err.message });
  }
});


// 🚀 START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
