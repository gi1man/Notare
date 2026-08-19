import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();

// Ensure the API key is passed into the environment
const apiKey = process.env.GEMINI_API_KEY;

export const generateDailyInsights = onSchedule("every day 00:00", async (event) => {
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set.");
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

Based on this data, generate exactly 3 interesting, motivational, and highly specific insights.
Return the result strictly as a JSON array of objects, with NO markdown formatting, NO backticks, and NO additional text. 
Each object must have exactly these keys:
- "title": A short, punchy title (string)
- "description": A 1-2 sentence explanation of the trend or insight (string)
- "icon": A Lucide React icon name representing the insight (e.g. "Zap", "Users", "Clock", "Flame", "Star") (string)
`;

  try {
    // 3. Call the Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
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
