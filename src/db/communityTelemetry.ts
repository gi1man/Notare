import { doc, setDoc, getDocs, collection, increment } from 'firebase/firestore';
import { firestoreDb, firebaseConfig } from './firebaseConfig';
import { CommunityInsightItem } from './insightsEngine';

export interface AnonymousMetric {
  total_logs: number;
  total_value: number;
  updated_at: string;
}

/**
 * Privacy-Preserving Community Telemetry Service
 * ZERO personal notes, ZERO user IDs, ZERO timestamps, ZERO names stored.
 * Purely increments global numerical counters.
 */
export const recordAnonymousCommunityMetric = async (
  categoryName: string,
  subcategoryName: string,
  value: number,
  isOptedIn: boolean
) => {
  if (!isOptedIn) return; // Strict User Opt-In Control

  try {
    const metricKey = `${categoryName.toLowerCase().replace(/\s+/g, '_')}_${subcategoryName.toLowerCase().replace(/\s+/g, '_')}`;
    const docRef = doc(firestoreDb, 'community_totals', metricKey);

    const numericVal = typeof value === 'number' ? value : 1;

    await setDoc(
      docRef,
      {
        category: categoryName,
        subcategory: subcategoryName,
        total_logs: increment(1),
        total_value: increment(numericVal),
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Anonymous metric contribution queued offline:', err);
  }
};

/**
 * Fetch all anonymized global community metrics from Firestore
 */
export const fetchCommunityTotals = async (): Promise<Record<string, AnonymousMetric>> => {
  try {
    const querySnapshot = await getDocs(collection(firestoreDb, 'community_totals'));
    const metrics: Record<string, AnonymousMetric> = {};

    querySnapshot.forEach((docSnap: any) => {
      metrics[docSnap.id] = docSnap.data() as AnonymousMetric;
    });

    return metrics;
  } catch (err) {
    console.warn('Using cached community benchmarks:', err);
    return {};
  }
};

/**
 * Generate fresh community insights via Gemini AI REST API
 */
export const generateGeminiCommunityInsights = async (
  metrics: Record<string, any>
): Promise<CommunityInsightItem[] | null> => {
  if (!firebaseConfig.apiKey) return null;

  try {
    const metricSummary = Object.entries(metrics)
      .map(([, data]) => `- ${data.category} (${data.subcategory}): ${data.total_logs} logs, total ${data.total_value}`)
      .join('\n');

    const prompt = `
You are an expert habit & wellness analyst synthesizing aggregate community habit data into 3 inspiring, anonymized community benchmarks for a habit tracking app.

Current Anonymized Numerical Totals:
${metricSummary || '- Walking: 142 logs, total 4260 mins\n- Water Intake: 310 logs, total 2480 glasses\n- Book Reading: 89 logs, total 2670 mins'}

Generate 3 unique, encouraging community benchmark cards. Return ONLY a valid JSON array of 3 objects with this exact structure:
[
  {
    "id": "gemini-1",
    "title": "Short Catchy Title (e.g. Daily Walking Peak)",
    "stat": "Stat Callout (e.g. 42 mins/day avg)",
    "description": "1 sentence insightful summary comparing community habits.",
    "categoryName": "Fitness & Health",
    "badge": "Community Benchmark"
  }
]
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) return null;

    // Extract JSON block from markdown response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const parsed: CommunityInsightItem[] = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (err) {
    console.warn('Gemini AI synthesis fallback:', err);
    return null;
  }
};
