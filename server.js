// Import dependencies
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

// Load environment variables
dotenv.config();

// Initialize app
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Root route for testing (GET request)
app.get("/", (req, res) => {
  res.send("✅ AI Business Promoter Backend is running successfully!");
});

// ✅ Main API route (POST request)
app.post("/api/prompt", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt missing" });
  }

  try {
    // Request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    // Handle missing reply case
    const reply = data?.choices?.[0]?.message?.content || "No reply";
    res.json({ reply });
  } catch (error) {
    console.error("❌ Error from OpenAI API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Dynamic PORT (Render compatible)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend is live on port ${PORT}`);
});