import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json());

const API_CONFIG = {
  openrouter: {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: process.env.OPENROUTER_API_KEY,
    model: "google/gemini-flash-1.5-8b"
  },
  huggingface: {
    name: "Hugging Face",
    url: "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
    key: process.env.HUGGINGFACE_API_KEY
  },
  gemini: {
    name: "Google Gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    key: process.env.GEMINI_API_KEY
  },
  cohere: {
    name: "Cohere",
    url: "https://api.cohere.ai/v1/generate",
    key: process.env.COHERE_API_KEY,
    model: "command"
  },
  openai: {
    name: "OpenAI",
    url: "https://api.openai.com/v1/chat/completions",
    key: process.env.OPENAI_API_KEY,
    model: "gpt-3.5-turbo"
  }
};

// ✅ Health Check
app.get("/", (req, res) => {
  res.json({
    status: "✅ PromotionAI Backend Running",
    apis: Object.keys(API_CONFIG),
    time: new Date().toISOString()
  });
});

// ✅ Check if API Keys Loaded
app.get("/api/check-keys", (req, res) => {
  const keysStatus = {};
  for (const [api, config] of Object.entries(API_CONFIG)) {
    keysStatus[api] = config.key && config.key.length > 10 ? "✅ Key Loaded" : "❌ Missing or Invalid Key";
  }
  res.json(keysStatus);
});

// ✅ Smart Prompt Builder
function buildPrompt(prompt, template) {
  if (/^[0-9+\-*/().\s]+$/.test(prompt)) {
    try {
      const result = eval(prompt);
      return `The result of ${prompt} is ${result}`;
    } catch {
      return `Invalid math expression: ${prompt}`;
    }
  }

  if (template && template.trim() !== "" && template !== "default") {
    return `You are a marketing copywriter. Write a ${template} for: ${prompt}. Use emojis and hashtags naturally.`;
  }

  return `You are a helpful AI assistant. Answer clearly and naturally for: ${prompt}`;
}

// ✅ Prompt Route
app.post("/api/prompt", async (req, res) => {
  const { prompt, apiPreference = "auto", creativity = 70, template = "default" } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const finalPrompt = buildPrompt(prompt, template);
    let response, usedAPI = "";

    const apiOrder = apiPreference !== "auto" ? [apiPreference] : ["openai", "gemini", "cohere", "openrouter", "huggingface"];

    for (const apiName of apiOrder) {
      const config = API_CONFIG[apiName];
      if (!config?.key) continue;
      try {
        response = await callSpecificAPI(apiName, finalPrompt, creativity);
        usedAPI = apiName;
        break;
      } catch (e) {
        console.log(`${apiName} failed:`, e.message);
      }
    }

    if (!response) throw new Error("All APIs failed");

    res.json({ success: true, reply: response, apiUsed: usedAPI, timestamp: new Date().toISOString() });
  } catch (err) {
    res.json({ success: true, reply: `⚠️ All APIs failed. Default response:\n${prompt}`, apiUsed: "fallback" });
  }
});

// ✅ API Call Functions
async function callSpecificAPI(apiName, prompt, creativity = 70) {
  switch (apiName) {
    case "openai": return callOpenAI(prompt, creativity);
    case "gemini": return callGemini(prompt);
    case "cohere": return callCohere(prompt, creativity);
    case "openrouter": return callOpenRouter(prompt, creativity);
    case "huggingface": return callHuggingFace(prompt);
    default: throw new Error("Unknown API");
  }
}

async function callOpenAI(prompt, creativity) {
  const res = await fetch(API_CONFIG.openai.url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_CONFIG.openai.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: API_CONFIG.openai.model,
      messages: [{ role: "user", content: prompt }],
      temperature: creativity / 100,
      max_tokens: 400
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response from OpenAI";
}

async function callGemini(prompt) {
  const res = await fetch(`${API_CONFIG.gemini.url}?key=${API_CONFIG.gemini.key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";
}

async function callCohere(prompt, creativity) {
  const res = await fetch(API_CONFIG.cohere.url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_CONFIG.cohere.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: API_CONFIG.cohere.model, prompt, temperature: creativity / 100 })
  });
  const data = await res.json();
  return data.generations?.[0]?.text || "No response from Cohere";
}

async function callOpenRouter(prompt, creativity) {
  const res = await fetch(API_CONFIG.openrouter.url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_CONFIG.openrouter.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: API_CONFIG.openrouter.model,
      messages: [{ role: "user", content: prompt }],
      temperature: creativity / 100
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response from OpenRouter";
}

async function callHuggingFace(prompt) {
  const res = await fetch(API_CONFIG.huggingface.url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_CONFIG.huggingface.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: prompt })
  });
  const data = await res.json();
  return data[0]?.generated_text || "No response from HuggingFace";
}

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 PromotionAI Backend running on port ${PORT}`);
});
