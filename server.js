,import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();

// ✅ CORS allow for all (Netlify frontend + local testing)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// ✅ Test route
app.get("/", (req, res) => {
  res.send("✅ AI Business Promoter Backend is running fine!");
});

// ✅ ChatGPT route
app.post("/api/prompt", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt missing" });
  }

  try {
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

    if (!data || !data.choices || !data.choices[0]) {
      return res.json({ reply: "No reply received from AI." });
    }

    res.json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.error("❌ Error while fetching from OpenAI:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Port setup for Render
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));