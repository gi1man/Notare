import { doc, setDoc, getDocs, collection, increment } from 'firebase/firestore';
import { firestoreDb } from './firebaseConfig';
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
 * Generate fresh community insights via Gemini AI.
 *
 * DISABLED: The previous implementation called the Gemini REST API directly
 * from the client using the Firebase API key, which exposes the key to anyone
 * who inspects the bundle. Move this to a Firebase Cloud Function or use
 * Firebase AI Logic (server-side) before re-enabling.
 *
 * TODO: Implement via Firebase Cloud Function:
 *   exports.generateCommunityInsights = onCall(async (data) => { ... });
 */
export const generateGeminiCommunityInsights = async (
  _metrics: Record<string, any>
): Promise<CommunityInsightItem[] | null> => {
  // Disabled — returns null so the UI falls back to DEFAULT_COMMUNITY_INSIGHTS
  return null;
};
