import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export const ai = async (message: string) => {
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });
    
    // Adapt response format to match the expected interface
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: response.text
          }
        }]
      })
    };
  } catch (error) {
    console.error("Error communicating with Gemini AI service:", error);
    
    // Return error response in expected format
    return {
      ok: false,
      json: async () => ({
        error: {
          message: error instanceof Error ? error.message : "Unknown error"
        }
      })
    };
  }
};
