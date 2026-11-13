// src/services/claudeService.js

const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

// Default models on Groq:
// Vision: qwen/qwen3.8-27b (multimodal with vision support)
// Text: llama-3.3-70b-versatile or qwen/qwen3.8-27b
const DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b";
const DEFAULT_TEXT_MODEL = "llama-3.3-70b-versatile";

// ─────────────────────────────────────────────
// Convert file to base64
// ─────────────────────────────────────────────
async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────
// Safe JSON parser (handles markdown fences and reasoning tags)
// ─────────────────────────────────────────────
function parseJSON(text) {
  if (!text) {
    throw new Error("AI returned empty response");
  }

  // Remove <think>...</think> chain of thought tags if present
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting JSON from code fence or braces
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      cleaned = cleaned
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.error("INVALID JSON:", text);
      throw new Error("AI returned invalid JSON response. Please try again.");
    }
  }
}

// ─────────────────────────────────────────────
// Core Groq API
// ─────────────────────────────────────────────
async function callGroq(messages, model) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "VITE_GROQ_API_KEY is not defined. Please check your .env file or deployment settings.",
    );
  }

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });

  const raw = await response.text();

  if (!response.ok) {
    console.error("GROQ API ERROR:", raw);
    let errMsg = `Groq API Error: ${response.status} ${response.statusText}`;
    try {
      const errObj = JSON.parse(raw);
      if (errObj.error?.message) {
        errMsg = `Groq API Error: ${errObj.error.message}`;
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(errMsg);
  }

  const data = JSON.parse(raw);
  return data.choices?.[0]?.message?.content || "";
}

// ─────────────────────────────────────────────
// MAIN SCAN FUNCTION
// ─────────────────────────────────────────────
export async function analyzeCropImage(file) {
  const image = await fileToDataURL(file);
  const visionModel = import.meta.env.VITE_GROQ_VISION_MODEL || DEFAULT_VISION_MODEL;

  const prompt = `
You are an expert agricultural scientist and crop disease specialist.

Analyze the uploaded crop image carefully.

Return ONLY valid JSON matching this schema:
{
  "cropType": "Name of crop (e.g. Tomato, Corn, Wheat, Potato, Rice, etc.)",
  "diseaseDetected": true,
  "diseaseName": "Accurate disease name or Healthy Crop",
  "severity": "Mild",
  "confidence": "95",
  "affectedParts": "Leaves, Stems, etc.",
  "summary": "Clear explanation of findings and risks",
  "treatment": {
    "organic": [
      "Step 1",
      "Step 2",
      "Step 3"
    ],
    "chemical": [
      "Step 1",
      "Step 2",
      "Step 3"
    ],
    "prevention": [
      "Step 1",
      "Step 2",
      "Step 3"
    ]
  }
}

RULES:
- confidence must be a number string (e.g. "92")
- severity must be one of: "Mild", "Moderate", "Severe"
- treatment arrays must each contain concise bullet recommendations
- Output JSON ONLY, no other preamble or markdown.
`;

  const text = await callGroq(
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: image,
            },
          },
        ],
      },
    ],
    visionModel,
  );

  return parseJSON(text);
}

// ─────────────────────────────────────────────
// WEATHER AI ADVICE
// ─────────────────────────────────────────────
export async function getWeatherAdvice(weather, cropType = "", lang = "English") {
  const textModel = import.meta.env.VITE_GROQ_TEXT_MODEL || DEFAULT_TEXT_MODEL;

  const prompt = `
You are an agricultural weather advisor. Provide farming advice in ${lang}.

Crop: ${cropType || "General Crops"}

Weather Forecast:
- Temperature: ${weather.currentTemp}°C (Min: ${weather.minTemp}°C, Max: ${weather.maxTemp}°C)
- Humidity: ${weather.humidity}%
- Rain Expected: ${weather.willRain ? "Yes" : "No"}
- Conditions: ${weather.conditions}
- Wind Speed: ${weather.windSpeed} m/s

Respond ONLY in valid JSON matching this structure:
{
  "mainAdvice": "Key farming action for today based on this weather",
  "irrigationAdvice": "Irrigation instructions given rain and moisture levels",
  "pestAlert": "Any risk of fungus, mold, or pests in these weather conditions",
  "bestCropForWeather": "Crops that thrive or need care in this weather"
}

Output JSON ONLY.
`;

  const text = await callGroq(
    [
      {
        role: "user",
        content: prompt,
      },
    ],
    textModel,
  );

  return parseJSON(text);
}
