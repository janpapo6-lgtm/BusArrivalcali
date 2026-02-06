
import { GoogleGenAI, Type } from "@google/genai";
import { Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Caché simple en memoria
const aiCache: Record<string, any> = {};

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelay: number = 1500
): Promise<T> {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('quota');
      if (i === maxRetries - 1 || !isRateLimit) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; 
    }
  }
  throw new Error("Max retries reached");
}

export const generateMarketingImage = async (type: 'icon' | 'banner') => {
  const prompt = type === 'icon' 
    ? "A professional, minimalist app icon for a bus travel app called 'BusArrival'. Solid blue background, white simplified bus silhouette with a GPS pin on top. 3D render style, high quality, 512x512 look."
    : "A wide marketing banner for a mobile app called 'BusArrival'. A person peacefully sleeping on a modern bus with their smartphone showing a map notification. Sunny city background through the window. Cinematic lighting, professional photography style, 16:9 aspect ratio.";

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: type === 'icon' ? "1:1" : "16:9"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const generateSEODescription = async (lang: Language = 'es') => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Write a high-converting App Store description for 'BusArrival', an app that alerts users before their bus stop. 
    Include: 
    1. Catchy Tagline.
    2. Key Features list (GPS tracking, intelligent alarms, Gemini AI destination analysis).
    3. Why it's better than Google Maps.
    4. Target audience (students, commuters, tourists).
    Language: ${lang === 'es' ? 'Spanish' : 'English'}.
    Return JSON format with fields: tagline, shortDescription, longDescription, keywords.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tagline: { type: Type.STRING },
          shortDescription: { type: Type.STRING },
          longDescription: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["tagline", "shortDescription", "longDescription", "keywords"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

// ... (Resto de funciones anteriores se mantienen igual)
export const correctSearchQuery = async (query: string, lang: Language = 'es') => {
  const cacheKey = `correct-${query}-${lang}`;
  if (aiCache[cacheKey]) return aiCache[cacheKey];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Correct query: "${query}". Return ONLY corrected name. Lang: ${lang}.`,
    });
    const result = response.text?.trim() || query;
    aiCache[cacheKey] = result;
    return result;
  } catch (error) { return query; }
};

export const getDestinationDetails = async (query: string, lang: Language = 'es') => {
  const cacheKey = `details-${query}-${lang}`;
  if (aiCache[cacheKey]) return aiCache[cacheKey];
  const callApi = async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Destination: "${query}". Provide stop name and context. In ${lang === 'es' ? 'Spanish' : 'English'}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stopName: { type: Type.STRING },
            context: { type: Type.STRING },
            landmarks: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["stopName", "context"]
        }
      }
    });
    const result = JSON.parse(response.text || "{}");
    aiCache[cacheKey] = result;
    return result;
  };
  try { return await retryWithBackoff(callApi); } catch (e) {
    return { stopName: query, context: "Estimated arrival.", landmarks: [] };
  }
};

export const getTravelTips = async (destination: string, lang: Language = 'es') => {
  const cacheKey = `tips-${destination}-${lang}`;
  if (aiCache[cacheKey]) return aiCache[cacheKey];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `3 quick bus tips for ${destination} in ${lang === 'es' ? 'Spanish' : 'English'}.`,
    });
    const result = response.text || "";
    aiCache[cacheKey] = result;
    return result;
  } catch (e) { return "Ready 5m before arrival."; }
};
