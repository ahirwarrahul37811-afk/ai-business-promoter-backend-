// ✅ Enhanced AI Backend with 5 APIs + OpenRouter Base
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 🌐 5 Different AI APIs Configuration
const API_CONFIG = {
    // 1. OpenRouter (Primary - Your Existing Working API)
    openrouter: {
        url: "https://openrouter.ai/api/v1/chat/completions",
        key: process.env.OPENROUTER_API_KEY,
        models: {
            text: "mistralai/mixtral-8x7b-instruct", // ✅ Free + Fast
            creative: "google/gemini-flash-1.5-8b",   // ✅ Creative content
            professional: "anthropic/claude-3-haiku"  // ✅ Professional tone
        },
        headers: {
            "HTTP-Referer": "https://your-site.com/",
            "X-Title": "AI Business Promoter"
        }
    },
    
    // 2. Hugging Face (Backup - Free)
    huggingface: {
        url: "https://api-inference.huggingface.co/models",
        key: process.env.HUGGINGFACE_API_KEY,
        models: {
            text: "microsoft/DialoGPT-medium",
            creative: "microsoft/DialoGPT-large",
            professional: "facebook/blenderbot-400M-distill"
        }
    },
    
    // 3. Google Gemini (Alternative)
    gemini: {
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        key: process.env.GEMINI_API_KEY,
        model: "gemini-pro"
    },
    
    // 4. Cohere (Professional)
    cohere: {
        url: "https://api.cohere.ai/v1/generate",
        key: process.env.COHERE_API_KEY,
        model: "command"
    },
    
    // 5. OpenAI Compatible (Fallback)
    openai: {
        url: "https://api.openai.com/v1/chat/completions", 
        key: process.env.OPENAI_API_KEY,
        model: "gpt-3.5-turbo"
    }
};

// 🌐 Test Route (Updated)
app.get("/", (req, res) => {
    res.json({ 
        status: "✅ AI Business Promoter Backend Running",
        available_apis: Object.keys(API_CONFIG),
        primary_api: "openrouter",
        features: ["text-generation", "multi-api-fallback", "image-generation"]
    });
});

// 🔧 API Status Check
app.get("/api/status", async (req, res) => {
    const status = {};
    
    for (const [apiName, config] of Object.entries(API_CONFIG)) {
        try {
            if (!config.key) {
                status[apiName] = { status: "❌ Not Configured", error: "API key missing" };
                continue;
            }

            const testPrompt = "Hello, respond with 'OK' if working.";
            const response = await callAPI(apiName, testPrompt, true);
            status[apiName] = { 
                status: "✅ Working", 
                response: "API responsive",
                model: config.models?.text || config.model
            };
        } catch (error) {
            status[apiName] = { 
                status: "❌ Failed", 
                error: error.message,
                suggestion: "Check API key or try different API"
            };
        }
    }
    
    res.json(status);
});

// ✨ ENHANCED AI Text Chat Route (5 APIs Support)
app.post("/api/prompt", async (req, res) => {
    const { prompt, apiPreference = "auto", creativity = 70 } = req.body;
    
    if (!prompt) return res.status(400).json({ error: "Prompt missing" });

    try {
        let response;
        let usedAPI = "";
        let responseTime = 0;

        // API preference based selection
        if (apiPreference !== "auto" && API_CONFIG[apiPreference]) {
            if (!API_CONFIG[apiPreference].key) {
                throw new Error(`${apiPreference} API key not configured`);
            }
            
            const startTime = Date.now();
            response = await callAPI(apiPreference, prompt, false, creativity);
            responseTime = Date.now() - startTime;
            usedAPI = apiPreference;
        } else {
            // Auto fallback through all APIs
            for (const [apiName, config] of Object.entries(API_CONFIG)) {
                if (!config.key) continue;
                
                try {
                    const startTime = Date.now();
                    response = await callAPI(apiName, prompt, false, creativity);
                    responseTime = Date.now() - startTime;
                    usedAPI = apiName;
                    break; // Stop at first successful API
                } catch (error) {
                    console.log(`❌ ${apiName} failed:`, error.message);
                    continue;
                }
            }
        }

        if (!response) {
            throw new Error("All configured APIs failed to respond");
        }

        res.json({ 
            reply: response,
            apiUsed: usedAPI,
            responseTime: responseTime,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error("❌ All APIs failed:", err);
        res.status(500).json({ 
            error: "AI services are currently unavailable",
            fallback: "Please try again in a few moments or check API configurations"
        });
    }
});

// 🖼️ AI Image Generation Route (Your Existing - Working)
app.post("/api/image", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt missing for image" });

    try {
        // Using OpenRouter Stable Diffusion model (Your existing working code)
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
        res.json({ 
            imageUrl,
            apiUsed: "openrouter",
            model: "stabilityai/stable-diffusion-xl-base-1.0"
        });
    } catch (err) {
        console.error("❌ Image Server Error:", err);
        res.status(500).json({ error: "⚠️ Failed to generate image" });
    }
});

// 🔧 Smart Template Suggestions
app.post("/api/templates/suggest", (req, res) => {
    const { businessType } = req.body;
    
    const templateSuggestions = {
        ecommerce: ['product', 'adcopy', 'facebook', 'email'],
        restaurant: ['instagram', 'facebook', 'adcopy', 'twitter'],
        service: ['email', 'facebook', 'product', 'adcopy'],
        realestate: ['facebook', 'instagram', 'adcopy', 'email'],
        healthcare: ['blog', 'facebook', 'email', 'adcopy'],
        education: ['blog', 'email', 'facebook', 'video'],
        default: ['facebook', 'instagram', 'twitter', 'email']
    };
    
    const suggestions = templateSuggestions[businessType] || templateSuggestions.default;
    
    res.json({
        businessType,
        suggestedTemplates: suggestions,
        message: `For ${businessType} business, these templates work best`
    });
});

// 🔄 Batch Content Generation
app.post("/api/batch-generate", async (req, res) => {
    const { prompt, templates = ['facebook', 'instagram', 'twitter', 'email'] } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: "Prompt missing" });
    }

    try {
        const results = {};
        
        for (const template of templates) {
            try {
                const templatePrompt = generateTemplatePrompt(template, prompt);
                const response = await callAPI("openrouter", templatePrompt); // Use OpenRouter for batch
                results[template] = {
                    content: response,
                    status: "success",
                    template: template
                };
            } catch (error) {
                results[template] = {
                    content: "",
                    status: "failed",
                    error: error.message,
                    template: template
                };
            }
            
            // Delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        res.json({
            originalPrompt: prompt,
            generatedContent: results,
            totalTemplates: templates.length,
            successful: Object.values(results).filter(r => r.status === "success").length,
            apiUsed: "openrouter"
        });

    } catch (err) {
        console.error("❌ Batch generation failed:", err);
        res.status(500).json({ error: "Batch generation failed" });
    }
});

// 🔧 Utility Functions
async function callAPI(apiName, prompt, isTest = false, creativity = 70) {
    const config = API_CONFIG[apiName];
    if (!config || !config.key) {
        throw new Error(`API ${apiName} not configured`);
    }

    // Adjust temperature based on creativity
    const temperature = creativity / 100;

    switch (apiName) {
        case "openrouter":
            return await callOpenRouter(prompt, config, isTest, temperature);
        case "huggingface":
            return await callHuggingFace(prompt, config, isTest);
        case "gemini":
            return await callGemini(prompt, config, isTest);
        case "cohere":
            return await callCohere(prompt, config, isTest, temperature);
        case "openai":
            return await callOpenAI(prompt, config, isTest, temperature);
        default:
            throw new Error(`Unknown API: ${apiName}`);
    }
}

// ✅ OpenRouter API Call (Your Existing Working Code - Enhanced)
async function callOpenRouter(prompt, config, isTest = false, temperature = 0.7) {
    const systemMessage = isTest 
        ? "You are a test assistant. Respond with 'OK' if working."
        : "You are a expert business content creator specializing in social media posts, ads, marketing content, and business promotion. Create engaging, professional, and effective content.";

    const response = await fetch(config.url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.key}`,
            ...config.headers
        },
        body: JSON.stringify({
            model: config.models.text,
            messages: [
                { 
                    role: "system", 
                    content: systemMessage
                },
                { role: "user", content: prompt }
            ],
            max_tokens: 1000,
            temperature: temperature
        })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(`OpenRouter: ${data.error.message}`);
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
        throw new Error("No response generated from OpenRouter");
    }

    return isTest ? "OK" : reply;
}

// 🤗 Hugging Face API Call
async function callHuggingFace(prompt, config, isTest = false) {
    const testPrompt = isTest ? "Hello, respond with 'OK'" : prompt;
    
    const response = await fetch(
        `${config.url}/${config.models.text}`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: testPrompt,
                parameters: {
                    max_length: isTest ? 10 : 500,
                    temperature: 0.7,
                    do_sample: true
                }
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Hugging Face: ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data[0]?.generated_text;
    
    if (!reply) {
        throw new Error("No response generated from Hugging Face");
    }

    return isTest ? "OK" : reply;
}

// 🔷 Google Gemini API Call
async function callGemini(prompt, config, isTest = false) {
    const testPrompt = isTest ? "Respond with OK" : prompt;
    
    const response = await fetch(`${config.url}?key=${config.key}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: testPrompt
                }]
            }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Gemini: ${data.error.message}`);
    }

    const reply = data.candidates[0]?.content?.parts[0]?.text;
    if (!reply) {
        throw new Error("No response generated from Gemini");
    }

    return isTest ? "OK" : reply;
}

// 🔵 Cohere API Call
async function callCohere(prompt, config, isTest = false, temperature = 0.7) {
    const testPrompt = isTest ? "Say OK" : prompt;
    
    const response = await fetch(config.url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${config.key}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            prompt: testPrompt,
            model: config.model,
            max_tokens: isTest ? 5 : 500,
            temperature: temperature,
            stop_sequences: isTest ? [] : undefined
        })
    });

    if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.message) {
        throw new Error(`Cohere: ${data.message}`);
    }

    const reply = data.generations[0]?.text;
    if (!reply) {
        throw new Error("No response generated from Cohere");
    }

    return isTest ? "OK" : reply.trim();
}

// ⚡ OpenAI API Call
async function callOpenAI(prompt, config, isTest = false, temperature = 0.7) {
    const systemMessage = isTest 
        ? "You are a test assistant. Respond with 'OK'."
        : "You are a expert business content creator.";

    const response = await fetch(config.url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${config.key}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: config.model,
            messages: [
                { 
                    role: "system", 
                    content: systemMessage
                },
                { role: "user", content: prompt }
            ],
            max_tokens: isTest ? 5 : 500,
            temperature: temperature
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
        throw new Error(`OpenAI: ${data.error.message}`);
    }

    const reply = data.choices[0]?.message?.content;
    if (!reply) {
        throw new Error("No response generated from OpenAI");
    }

    return isTest ? "OK" : reply;
}

// 📝 Template Prompt Generator
function generateTemplatePrompt(template, message) {
    const prompts = {
        facebook: `Create an engaging Facebook post about: ${message}. Include hashtags and call-to-action.`,
        instagram: `Write an Instagram caption for: ${message}. Make it visually descriptive with relevant hashtags.`,
        twitter: `Create a Twitter post about: ${message}. Keep it under 280 characters with 2-3 hashtags.`,
        email: `Write a marketing email about: ${message}. Include subject line and professional body.`,
        product: `Create a product description for: ${message}. Highlight features and benefits.`,
        adcopy: `Write persuasive ad copy for: ${message}. Include attention-grabbing headline and CTA.`,
        blog: `Write a blog post about: ${message}. Include compelling title and main points.`,
        video: `Create a video script about: ${message}. Include engaging narrative and visual cues.`
    };
    
    return prompts[template] || `Write content about: ${message}`;
}

// ⚙️ Server Setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 AI Business Promoter Backend running on port ${PORT}`);
    console.log(`📊 Available APIs: ${Object.keys(API_CONFIG).join(', ')}`);
    console.log(`🔑 OpenRouter: ${process.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Not Configured'}`);
    console.log(`🔑 HuggingFace: ${process.env.HUGGINGFACE_API_KEY ? '✅ Configured' : '❌ Not Configured'}`);
    console.log(`🔑 Gemini: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not Configured'}`);
    console.log(`🔑 Cohere: ${process.env.COHERE_API_KEY ? '✅ Configured' : '❌ Not Configured'}`);
    console.log(`🔑 OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not Configured'}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/`);
});
