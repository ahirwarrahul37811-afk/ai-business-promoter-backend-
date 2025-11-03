// ✅ Free & Fast AI using OpenRouter + Image generation

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 🌐 Test Route
app.get("/", (req, res) => {
  res.send("✅ OpenRouter Free AI Backend is running fine!");
});

// ✨ AI Text Chat Route
app.post("/api/prompt", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt missing" });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://your-site.com/",
        "X-Title": "AI Business Promoter"
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct", // ✅ Free + Fast
        messages: [
          { role: "system", content: "You are a helpful assistant that generates social media posts, ads, and marketing content." },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("❌ OpenRouter Error:", data.error);
      return res.json({ reply: "⚠️ AI Error: " + data.error.message });
    }

    const reply = data?.choices?.[0]?.message?.content || "⚠️ No reply received from AI.";
    res.json({ reply });
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ reply: "⚠️ Server error, please try again." });
  }
});

// 🖼️ AI Image Generation Route
app.post("/api/image", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt missing for image" });

  try {
    // Using OpenRouter Stable Diffusion model
    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "stabilityai/stable-diffusion-xl-base-1.0",
        prompt: prompt,
        size: "512x512",
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("❌ Image API Error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const imageUrl = data?.data?.[0]?.url;
    res.json({ imageUrl });
  } catch (err) {
    console.error("❌ Image Server Error:", err);
    res.status(500).json({ error: "⚠️ Failed to generate image" });
  }
});

// ⚙️ Port setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ OpenRouter Server running on port ${PORT}`));
