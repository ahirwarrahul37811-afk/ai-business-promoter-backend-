// ✅ PromotionAI - Improved Backend Server (with smart tool handler)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";

// 🧠 Helper: Generate Prompt for Tools
function buildToolPrompt(tool, text) {
  switch (tool) {
    case "rephrase":
      return `Rephrase the following marketing text in a catchy, professional tone while keeping the same meaning:\n\n${text}`;
    case "translate_hinglish":
      return `Translate the following English marketing text into Hinglish (Hindi words in Latin script) while keeping tone and meaning:\n\n${text}`;
    case "hashtags":
      return `Extract 10 short and relevant marketing hashtags (without # in list) from this text:\n\n${text}\n\nReturn them comma-separated.`;
    case "shorten":
      return `Shorten this text to a concise, catchy caption of max 25 words:\n\n${text}`;
    default:
      return `Perform this quick content task: ${tool}\n\n${text}`;
  }
}

// 🧩 Main route
app.post("/api/prompt", async (req, res) => {
  const { prompt, tone, length, businessType, template, creativity, action, tool } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  let finalPrompt = "";
  let maxTokens = 600; // default for main

  // 🧠 Detect if it's a "tool" request
  if (action === "tool" || template === "tool" || tool) {
    const shortPrompt = buildToolPrompt(tool || "general", prompt);
    finalPrompt = shortPrompt;
    maxTokens = 250;
  } else {
    // Normal full content generation
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

// 🎨 Real AI Image Generation using OpenRouter (DALL·E-like)
app.post("/api/image", async (req, res) => {
  const { prompt, style } = req.body;
  if (!prompt) return res.status(400).send("No image prompt provided.");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/dall-e-3",   // 🔥 high-quality AI image model
        prompt: `${prompt}\nStyle: ${style}`,
        size: "1024x1024",
        n: 1,
      }),
    });

    const data = await response.json();
    const images = data?.data?.map(img => img.url).filter(Boolean) || [];

    if (!images.length) throw new Error("No image URLs returned from OpenRouter.");

    res.json({ images });
  } catch (err) {
    console.error("Image generation failed:", err.message);
    // fallback placeholder (safe)
    const safeUrl = `https://placehold.co/512x512?text=${encodeURIComponent(
      prompt.slice(0, 40)
    )}`;
    res.json({ images: [safeUrl] });
  }
});

// 🚀 Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Smart server running at http://localhost:${PORT}`);
});
