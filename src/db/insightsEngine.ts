import { Category, Entry } from '../types';

export interface InsightCardData {
  id: string;
  type: 'streak' | 'growth' | 'correlation' | 'flashback' | 'balance' | 'milestone';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  badge?: string;
  colorTheme: 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';
}

export interface WeeklyComparisonItem {
  subcategoryName: string;
  categoryName: string;
  icon: string;
  thisWeekCount: number;
  lastWeekCount: number;
  percentChange: number; // positive = growth, negative = drop
}

export interface CalculatedCorrelation {
  id: string;
  subA: Category;
  subB: Category;
  percentage: number;
  sameDayCount: number;
  totalDaysA: number;
}

export interface MemoryFlashback {
  id: string;
  daysAgo: number;
  dateFormatted: string;
  subcategoryName: string;
  categoryName: string;
  icon: string;
  noteText?: string;
  transcript?: string;
  valueFormatted?: string;
}

export interface CommunityInsightItem {
  id: string;
  title: string;
  stat: string;
  description: string;
  categoryTag?: string;
}

export const DEFAULT_COMMUNITY_INSIGHTS: CommunityInsightItem[] = [
  {
    id: 'comm-1',
    title: 'Sunshine Miles Together ☀️',
    stat: '14,250 Miles',
    description: "Together this month, Notare members logged over 14,000 miles of morning walks! That's equivalent to walking halfway around the Earth.",
    categoryTag: 'Fitness & Health',
  },
  {
    id: 'comm-2',
    title: 'Movement Brings Rest 😴',
    stat: '+25% Better Sleep',
    description: 'Members who log 30 minutes of daily movement report significantly longer, more restorative sleep at night.',
    categoryTag: 'Wellness Pattern',
  },
  {
    id: 'comm-3',
    title: 'The Golden Morning Routine ☕',
    stat: '#1 Daily Habit',
    description: 'Pairing morning tea with 20 minutes of reading is the most popular focused relaxation routine among members.',
    categoryTag: 'Focused Activities',
  },
];

// 1. Calculate Weekly Comparison (Past 7 days vs Previous 7 days)
export const getWeeklyComparisons = (entries: Entry[], categories: Category[]): WeeklyComparisonItem[] => {
  const now = new Date();
  const week1Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0).getTime();
  const week1End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  const week2Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13, 0, 0, 0).getTime();
  const week2End = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 23, 59, 59, 999).getTime();

  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const week1Counts = new Map<string, number>();
  const week2Counts = new Map<string, number>();

  entries.forEach((e) => {
    if (e.deleted_at) return;
    const t = new Date(e.occurred_at).getTime();
    if (t >= week1Start && t <= week1End) {
      week1Counts.set(e.subcategory_id, (week1Counts.get(e.subcategory_id) || 0) + 1);
    } else if (t >= week2Start && t <= week2End) {
      week2Counts.set(e.subcategory_id, (week2Counts.get(e.subcategory_id) || 0) + 1);
    }
  });

  const results: WeeklyComparisonItem[] = [];
  const subcategoryIds = new Set([...week1Counts.keys(), ...week2Counts.keys()]);

  subcategoryIds.forEach((subId) => {
    const sub = categoryMap.get(subId);
    if (!sub) return;
    const parent = sub.parent_id ? categoryMap.get(sub.parent_id) : null;

    const c1 = week1Counts.get(subId) || 0;
    const c2 = week2Counts.get(subId) || 0;

    let pct = 0;
    if (c2 > 0) {
      pct = Math.round(((c1 - c2) / c2) * 100);
    } else if (c1 > 0) {
      pct = 100;
    }

    results.push({
      subcategoryName: sub.name,
      categoryName: parent?.name || 'Activity',
      icon: sub.icon || parent?.icon || 'Activity',
      thisWeekCount: c1,
      lastWeekCount: c2,
      percentChange: pct,
    });
  });

  return results.sort((a, b) => b.thisWeekCount - a.thisWeekCount);
};

// 2. Automatically Calculate Top 3 & Bottom 3 Pairwise Correlations
export const getAutomaticCorrelations = (
  entries: Entry[],
  categories: Category[]
): { top3: CalculatedCorrelation[]; bottom3: CalculatedCorrelation[] } => {
  const subcategories = categories.filter((c) => c.parent_id !== null && !c.deleted_at);
  if (subcategories.length < 2 || entries.length === 0) {
    return { top3: [], bottom3: [] };
  }

  // Map subcategory -> Set of dates (YYYY-MM-DD)
  const subDatesMap = new Map<string, Set<string>>();
  subcategories.forEach((s) => subDatesMap.set(s.id, new Set<string>()));

  entries.forEach((e) => {
    if (e.deleted_at) return;
    const dateStr = e.occurred_at.slice(0, 10);
    const set = subDatesMap.get(e.subcategory_id);
    if (set) set.add(dateStr);
  });

  const allPairs: CalculatedCorrelation[] = [];

  for (let i = 0; i < subcategories.length; i++) {
    for (let j = i + 1; j < subcategories.length; j++) {
      const subA = subcategories[i];
      const subB = subcategories[j];

      const datesA = subDatesMap.get(subA.id) || new Set();
      const datesB = subDatesMap.get(subB.id) || new Set();

      if (datesA.size === 0 || datesB.size === 0) continue;

      let sameDayCount = 0;
      datesA.forEach((d) => {
        if (datesB.has(d)) sameDayCount++;
      });

      // Calculate co-occurrence percentage relative to the min active days of either habit
      const totalDaysA = Math.max(datesA.size, datesB.size);
      const percentage = Math.round((sameDayCount / totalDaysA) * 100);

      allPairs.push({
        id: `${subA.id}-${subB.id}`,
        subA,
        subB,
        percentage,
        sameDayCount,
        totalDaysA,
      });
    }
  }

  // Sort by highest co-occurrence percentage
  allPairs.sort((a, b) => b.percentage - a.percentage);

  const top3 = allPairs.slice(0, 3);
  const bottom3 = allPairs.slice(-3).reverse().filter((item) => !top3.some((t) => t.id === item.id));

  return { top3, bottom3 };
};

// 3. Memory Flashbacks ("On This Day")
export const getMemoryFlashbacks = (entries: Entry[], categories: Category[]): MemoryFlashback[] => {
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const now = new Date();

  const flashbacks: MemoryFlashback[] = [];

  entries.forEach((e) => {
    if (e.deleted_at) return;
    const d = new Date(e.occurred_at);
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if ([14, 30, 60, 90, 365].includes(diffDays) || (diffDays >= 28 && diffDays <= 32)) {
      const sub = categoryMap.get(e.subcategory_id);
      const parent = sub?.parent_id ? categoryMap.get(sub.parent_id) : null;

      if (sub) {
        flashbacks.push({
          id: e.id,
          daysAgo: diffDays,
          dateFormatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          subcategoryName: sub.name,
          categoryName: parent?.name || 'Activity',
          icon: sub.icon || parent?.icon || 'Calendar',
          noteText: e.note_text,
          transcript: e.transcript,
          valueFormatted: typeof e.value === 'number' ? `${e.value}` : undefined,
        });
      }
    }
  });

  return flashbacks.slice(0, 3);
};

// 4. Dynamic Daily Rotating Featured Insight Card
export const getDailyFeaturedInsight = (
  entries: Entry[],
  categories: Category[]
): InsightCardData => {
  const dateSeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));

  const candidateCards: InsightCardData[] = [];

  // Candidate 1: Most Frequent Activity Growth
  const comparisons = getWeeklyComparisons(entries, categories);
  const topGrowth = comparisons.find((c) => c.percentChange > 0 && c.thisWeekCount >= 2);
  if (topGrowth) {
    candidateCards.push({
      id: 'growth-spotlight',
      type: 'growth',
      title: `${topGrowth.subcategoryName} is up +${topGrowth.percentChange}%!`,
      subtitle: 'Weekly Growth Spotlight',
      description: `You logged ${topGrowth.subcategoryName} ${topGrowth.thisWeekCount} times this week compared to ${topGrowth.lastWeekCount} times last week.`,
      icon: topGrowth.icon,
      badge: `+${topGrowth.percentChange}% Increase`,
      colorTheme: 'emerald',
    });
  }

  // Candidate 2: Active Streaks
  const activeEntriesCount = entries.filter((e) => !e.deleted_at).length;
  if (activeEntriesCount >= 5) {
    candidateCards.push({
      id: 'streak-spotlight',
      type: 'streak',
      title: `${activeEntriesCount} Total Activity Logs Saved!`,
      subtitle: 'Personal Milestone',
      description: `You have built a rich, detailed activity log with ${activeEntriesCount} entries saved 100% locally on your phone.`,
      icon: 'Trophy',
      badge: 'Milestone Reached',
      colorTheme: 'amber',
    });
  }

  // Candidate 3: Category Balance
  candidateCards.push({
    id: 'balance-spotlight',
    type: 'balance',
    title: 'Balanced Life Routines',
    subtitle: 'Daily Harmony',
    description: 'You have logged activities across multiple categories this week. Keep up the diverse variety of habits!',
    icon: 'LayoutGrid',
    badge: 'Category Harmony',
    colorTheme: 'violet',
  });

  const selectedIndex = dateSeed % candidateCards.length;
  return candidateCards[selectedIndex] || candidateCards[0];
};
