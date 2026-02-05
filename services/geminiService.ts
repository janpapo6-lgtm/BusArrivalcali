
import { GoogleGenAI, Type } from "@google/genai";
import { Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Caché simple en memoria para evitar llamadas redundantes
const aiCache: Record<string, any> = {};

/**
 * Utility for exponential backoff retries.
 */
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

/**
 * Corrects spelling of a location search query using Gemini.
 */
export const correctSearchQuery = async (query: string, lang: Language = 'es') => {
  const cacheKey = `correct-${query}-${lang}`;
  if (aiCache[cacheKey]) return aiCache[cacheKey];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Correct the spelling of this location search query for a map app: "${query}". 
      Return ONLY the corrected location name as a string, no quotes, no extra text. 
      If it's already correct or recognizable, return the same string. Language context: ${lang}.`,
    });

    const result = response.text?.trim() || query;
    aiCache[cacheKey] = result;
    return result;
  } catch (error) {
    return query;
  }
};

export const getDestinationDetails = async (query: string, lang: Language = 'es') => {
  const cacheKey = `details-${query}-${lang}`;
  if (aiCache[cacheKey]) return aiCache[cacheKey];

  const languageName = lang === 'es' ? 'Spanish' : 'English';
  const placeName = query.split(',')[0].trim();
  
  const callApi = async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this destination query: "${query}". Provide the likely stop name and a brief context about why someone would go there or what to look for when arriving by bus. 
      IMPORTANT: All text fields must be in ${languageName}. Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stopName: { type: Type.STRING },
            context: { type: Type.STRING },
            landmarks: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["stopName", "context"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");
    const result = JSON.parse(text);
    aiCache[cacheKey] = result;
    return result;
  };

  try {
    return await retryWithBackoff(callApi);
  } catch (error: any) {
    // Fallback inteligente local si la cuota falla
    const fallback = {
      stopName: placeName,
      context: lang === 'es' 
        ? `Llegada estimada a ${placeName}. El sistema te avisará automáticamente.` 
        : `Estimated arrival at ${placeName}. The system will alert you automatically.`,
      landmarks: []
    };
    return fallback;
  }
};

export const getTravelTips = async (destination: string, lang: Language = 'es') => {
  const cacheKey = `tips-${destination}-${lang}`;
  if (aiCache[cacheKey]) return aiCache[cacheKey];

  const languageName = lang === 'es' ? 'Spanish' : 'English';
  
  const callApi = async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Give me 3 quick tips for a bus traveler arriving at ${destination}. Keep them very short and useful. Response must be in ${languageName}.`,
    });
    const result = response.text || "";
    aiCache[cacheKey] = result;
    return result;
  };

  try {
    return await retryWithBackoff(callApi);
  } catch (error) {
    // Consejos genéricos de alta calidad como fallback
    return lang === 'es' 
      ? "• Prepárate 5 minutos antes de llegar.\n• Verifica tus objetos personales.\n• Ten tu billete o tarjeta lista para salir."
      : "• Get ready 5 minutes before arrival.\n• Double check your personal items.\n• Have your ticket or card ready to exit.";
  }
};
