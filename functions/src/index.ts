import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const generateDailyInsights = onSchedule({
  schedule: "every day 00:00",
  secrets: [geminiApiKey]
}, async (event) => {
  const apiKey = geminiApiKey.value();
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY secret is not set.");
    return;
  }

  const db = getFirestore();
  
  // 1. Fetch raw usage counters from `community_totals`
  const totalsRef = db.collection("community_totals");
  const snapshot = await totalsRef.get();
  
  const metrics: Record<string, any> = {};
  snapshot.forEach((doc: any) => {
    metrics[doc.id] = doc.data();
  });

  if (Object.keys(metrics).length === 0) {
    console.log("No community metrics found. Skipping generation.");
    return;
  }

  // 2. Format the metrics into a prompt for Gemini
  const prompt = `
You are a data analyst for a habit-tracking application. Below is the current anonymized global usage data for all users across various categories.
Data:
${JSON.stringify(metrics, null, 2)}

Based strictly on this data, generate exactly 3 interesting, motivational, and highly specific insights. 
CRITICAL RULES:
1. Do NOT hallucinate data. If the dataset is extremely small (e.g., only 1 or 2 entries total), acknowledge that the community is just getting started and generate encouraging insights about being an early adopter or setting the pace for the community.
2. If there is enough data, find obscure patterns, unique angles, or non-obvious correlations rather than just stating the most obvious stats.
3. Return the result strictly as a JSON array of objects, with NO markdown formatting, NO backticks, and NO additional text. 
4. Each object must have exactly these keys:
- "title": A short, punchy title (string)
- "description": A 1-2 sentence explanation of the trend or insight (string)
- "icon": A Lucide React icon name representing the insight (e.g. "Zap", "Users", "Clock", "Flame", "Star") (string)
`;

  try {
    // 3. Fetch available models dynamically
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    const data = await response.json();
    
    const flashModels = data.models
      .filter((m: any) => 
        m.name.includes("flash") && 
        m.supportedGenerationMethods.includes("generateContent")
      )
      .map((m: any) => m.name.replace("models/", ""))
      .sort((a: string, b: string) => b.localeCompare(a, undefined, { numeric: true }));

    const modelsToTry = flashModels.slice(0, 3);
    if (modelsToTry.length === 0) {
      throw new Error("No supported Flash models found in the API.");
    }

    let result = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: { temperature: 1.0 }
        });
        result = await model.generateContent(prompt);
        console.log(`Successfully generated insights using model: ${modelName}`);
        break; // Stop trying if successful
      } catch (err) {
        console.warn(`Model ${modelName} failed. Trying next...`, (err as any).message);
      }
    }

    if (!result) {
      throw new Error("All Gemini models failed. Please verify your API key and AI Studio account access.");
    }

    const text = result.response.text();
    
    // Parse the JSON array. (Removing markdown backticks if Gemini includes them despite instructions)
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const insightsArray = JSON.parse(cleanText);

    // 4. Save the generated JSON to the global_state document
    await db.doc("global_state/community_insights").set({
      insights: insightsArray,
      updated_at: new Date().toISOString()
    });

    console.log("Successfully generated and saved daily community insights.");
  } catch (error) {
    console.error("Error generating daily insights:", error);
  }
});
