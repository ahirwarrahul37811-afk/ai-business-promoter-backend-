import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Test route (backend check करने के लिए)
app.get("/", (req, res) => {
  res.send("✅ AI Business Promoter Backend is running fine!");
});

// ✅ ChatGPT API route
app.post("/api/prompt", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt missing" });

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
    res.json({ reply: data.choices?.[0]?.message?.content || "No reply" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Render पर PORT variable यूज़ करो
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));nternal Server Error" });
  }
});

// ✅ Dynamic PORT (Render compatible)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend is live on port ${PORT}`);
});