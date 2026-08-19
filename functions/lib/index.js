"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyInsights = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const generative_ai_1 = require("@google/generative-ai");
admin.initializeApp();
// Ensure the API key is passed into the environment
const apiKey = process.env.GEMINI_API_KEY;
exports.generateDailyInsights = (0, scheduler_1.onSchedule)("every day 00:00", async (event) => {
    if (!apiKey) {
        console.error("GEMINI_API_KEY environment variable is not set.");
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    // 1. Fetch raw usage counters from `community_totals`
    const totalsRef = db.collection("community_totals");
    const snapshot = await totalsRef.get();
    const metrics = {};
    snapshot.forEach((doc) => {
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
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
    }
    catch (error) {
        console.error("Error generating daily insights:", error);
    }
});
//# sourceMappingURL=index.js.map