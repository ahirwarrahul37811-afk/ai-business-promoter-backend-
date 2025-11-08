// ✅ PromotionAI - Smart Backend with Gallery + AI Image
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";
const GALLERY_PATH = new URL('./gallery_manifest.json', import.meta.url).pathname;

// 🧠 Helper: Build Smart Prompt for AI tools
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

// 🧩 Text AI Endpoint
app.post("/api/prompt", async (req, res) => {
  const { prompt, tone, length, businessType, template, creativity, action, tool } = req.body;

  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  let finalPrompt = "";
  let maxTokens = 600;

  if (action === "tool" || template === "tool" || tool) {
    const shortPrompt = buildToolPrompt(tool || "general", prompt);
    finalPrompt = shortPrompt;
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
    const output =
      data?.choices?.[0]?.message?.content?.trim() || "No output received from model.";
    res.json({ output });
  } catch (error) {
    console.error("AI Error:", error.message);
    res.status(500).json({ error: "AI request failed", details: error.message });
  }
});

// 🎨 Image AI Endpoint
app.post("/api/image", async (req, res) => {
  const { prompt, template } = req.body;
  if (!prompt) return res.status(400).send("No image prompt provided.");

  // Try AI Image first
  try {
    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/dall-e-3",
        prompt: `${prompt}`,
        size: "1024x1024",
        n: 1,
      }),
    });

    const data = await response.json();
    const images = data?.data?.map(img => img.url).filter(Boolean) || [];

    if (images.length > 0) {
      return res.json({ images, source: "ai" });
    }
  } catch (err) {
    console.warn("AI image generation failed, using gallery fallback...");
  }

  // 🖼️ Fallback: Local/Cloudinary Gallery (JSON)
  try {
    const galleryData = JSON.parse(fs.readFileSync(GALLERY_PATH, "utf-8"));
    const category = (template || "general").toLowerCase();

    const images = galleryData[category] || galleryData["general"] || [];

    if (images.length > 0) {
      const randomImage = images[Math.floor(Math.random() * images.length)];
      return res.json({ images: [randomImage], source: "gallery", template: category });
    } else {
      return res.json({
        images: [`https://placehold.co/512x512?text=${encodeURIComponent(prompt)}`],
        source: "placeholder"
      });
    }
  } catch (galleryErr) {
    console.error("Gallery error:", galleryErr.message);
    return res.json({
      images: [`https://placehold.co/512x512?text=${encodeURIComponent(prompt)}`],
      source: "fallback"
    });
  }
});

// 🚀 Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ PromotionAI backend running at http://localhost:${PORT}`);
});