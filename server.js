// ✅ PromotionAI - Smart Backend (AI Text + Cloudinary Gallery + Razorpay Payment)
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

// 🔑 API Keys & Model
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";
const GALLERY_PATH = new URL("./gallery_manifest.json", import.meta.url).pathname;

// 🧠 Helper: Smart prompt builder for tools
function buildToolPrompt(tool, text) {
  switch (tool) {
    case "rephrase":
      return `Rephrase this marketing text in a catchy, professional tone:\n\n${text}`;
    case "translate_hinglish":
      return `Translate this English marketing text into Hinglish (Hindi words in Latin script):\n\n${text}`;
    case "hashtags":
      return `Extract 10 short, relevant marketing hashtags (without # symbol) from this text:\n\n${text}\n\nReturn them comma-separated.`;
    case "shorten":
      return `Shorten this content to a catchy caption of max 25 words:\n\n${text}`;
    default:
      return `Perform this quick marketing task: ${tool}\n\n${text}`;
  }
}

// ✍️ TEXT GENERATION API (OpenRouter)
app.post("/api/prompt", async (req, res) => {
  const { prompt, tone, length, businessType, template, creativity, action, tool } = req.body;

  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  let finalPrompt = "";
  let maxTokens = 600;

  if (action === "tool" || template === "tool" || tool) {
    finalPrompt = buildToolPrompt(tool || "general", prompt);
    maxTokens = 250;
  } else {
    finalPrompt = `
🎯 Template: ${template || "Custom"}
🏢 Business Type: ${businessType || "General"}
💬 Tone: ${tone || "Casual"}
📏 Length: ${length || "Medium"}
🌈 Creativity: ${creativity || 70}%
🧠 User Prompt: ${prompt}

➡️ Generate creative, brand-relevant, and engaging marketing content based on the details above.
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
    const output = data?.choices?.[0]?.message?.content?.trim() || "No output received from AI.";
    res.json({ output });
  } catch (error) {
    console.error("AI Error:", error.message);
    res.status(500).json({ error: "AI request failed", details: error.message });
  }
});

// 🖼️ CLOUDINARY IMAGE API (Gallery Based)
app.post("/api/image", async (req, res) => {
  const { prompt, template } = req.body;
  if (!prompt) return res.status(400).send("No image prompt provided.");

  try {
    const galleryData = JSON.parse(fs.readFileSync(GALLERY_PATH, "utf-8"));
    const category = (template || "general").toLowerCase();
    const images = galleryData[category] || galleryData["general"] || [];

    if (images.length > 0) {
      const randomImage = images[Math.floor(Math.random() * images.length)];
      return res.json({ images: [randomImage], source: "cloudinary", template: category });
    } else {
      return res.json({
        images: [`https://placehold.co/512x512?text=${encodeURIComponent(prompt)}`],
        source: "placeholder",
      });
    }
  } catch (err) {
    console.error("Gallery error:", err.message);
    return res.json({
      images: [`https://placehold.co/512x512?text=${encodeURIComponent(prompt)}`],
      source: "fallback",
    });
  }
});

// 💰 RAZORPAY PAYMENT INTEGRATION
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Order API (for frontend)
app.post("/api/create-order", async (req, res) => {
  const options = {
    amount: 9900, // ₹99 = 99 INR * 100
    currency: "INR",
    receipt: `order_rcptid_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    console.log("✅ Razorpay order created:", order.id);
    res.status(200).json(order);
  } catch (error) {
    console.error("❌ Razorpay order creation failed:", error.message);
    res.status(500).json({ error: "Order creation failed", details: error.message });
  }
});

// 🩺 Health Check Route (For Render test)
app.get("/", (req, res) => {
  res.send("✅ PromotionAI backend is live and running perfectly!");
});

// 🚀 START SERVER (PORT 5000)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ PromotionAI backend running at http://localhost:${PORT}`);
});
