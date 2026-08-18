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

export interface LongTermTrendData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  colorTheme: 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';
  stat: string;
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

// 2. Long-Term Trends (Rotating Spotlight)
export const getLongTermTrends = (
  entries: Entry[],
  categories: Category[]
): LongTermTrendData | null => {
  const subcategoryMap = new Map<string, Entry[]>();
  entries.forEach((e) => {
    if (e.deleted_at) return;
    const list = subcategoryMap.get(e.subcategory_id) || [];
    list.push(e);
    subcategoryMap.set(e.subcategory_id, list);
  });

  const validSubcategoryIds = new Set<string>();
  const categoryLookup = new Map(categories.map((c) => [c.id, c]));

  subcategoryMap.forEach((list, subId) => {
    if (list.length < 2) return;
    let minT = Infinity;
    let maxT = -Infinity;
    list.forEach((e) => {
      const t = new Date(e.occurred_at).getTime();
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    });
    // Requirement: Must have at least 4 weeks (28 days) of span
    const daysSpan = (maxT - minT) / (1000 * 60 * 60 * 24);
    if (daysSpan >= 28) {
      validSubcategoryIds.add(subId);
    }
  });

  if (validSubcategoryIds.size === 0) return null;

  const candidates: LongTermTrendData[] = [];
  const now = new Date();

  // Option 1: Monthly Growth
  const past30Start = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const prev30Start = past30Start - 30 * 24 * 60 * 60 * 1000;

  let topGrowthSub = '';
  let topGrowthPct = 0;
  let topGrowthLastCnt = 0;
  let topGrowthThisCnt = 0;

  validSubcategoryIds.forEach((subId) => {
    const list = subcategoryMap.get(subId)!;
    let this30 = 0;
    let prev30 = 0;
    list.forEach((e) => {
      const t = new Date(e.occurred_at).getTime();
      if (t >= past30Start) this30++;
      else if (t >= prev30Start && t < past30Start) prev30++;
    });

    if (prev30 > 0 && this30 > prev30) {
      const pct = ((this30 - prev30) / prev30) * 100;
      if (pct > topGrowthPct) {
        topGrowthPct = pct;
        topGrowthSub = subId;
        topGrowthLastCnt = prev30;
        topGrowthThisCnt = this30;
      }
    }
  });

  if (topGrowthSub) {
    const sub = categoryLookup.get(topGrowthSub);
    candidates.push({
      id: 'monthly-growth',
      title: `${Math.round(topGrowthPct)}% Monthly Growth`,
      subtitle: `Long-Term Trend • ${sub?.name}`,
      description: `You logged this ${topGrowthThisCnt} times in the last 30 days, compared to ${topGrowthLastCnt} times in the 30 days prior.`,
      icon: 'TrendingUp',
      colorTheme: 'emerald',
      stat: `+${Math.round(topGrowthPct)}%`,
    });
  }

  // Option 2: Weekly Consistency Streaks
  let longestStreakSub = '';
  let maxConsecutiveWeeks = 0;

  validSubcategoryIds.forEach((subId) => {
    const list = subcategoryMap.get(subId)!;
    const weeklyBuckets = new Set<number>();
    list.forEach((e) => {
      const t = new Date(e.occurred_at).getTime();
      const diff = now.getTime() - t;
      const weeksAgo = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
      weeklyBuckets.add(weeksAgo);
    });

    let currentStreak = 0;
    let w = weeklyBuckets.has(0) ? 0 : 1;
    while (weeklyBuckets.has(w)) {
      currentStreak++;
      w++;
    }

    if (currentStreak >= 4 && currentStreak > maxConsecutiveWeeks) {
      maxConsecutiveWeeks = currentStreak;
      longestStreakSub = subId;
    }
  });

  if (longestStreakSub) {
    const sub = categoryLookup.get(longestStreakSub);
    candidates.push({
      id: 'weekly-streak',
      title: `${maxConsecutiveWeeks} Consecutive Weeks`,
      subtitle: `Consistency Streak • ${sub?.name}`,
      description: `You have successfully logged this activity at least once a week for ${maxConsecutiveWeeks} weeks in a row!`,
      icon: 'CalendarDays',
      colorTheme: 'sky',
      stat: `${maxConsecutiveWeeks} wks`,
    });
  }

  // Option 3: Peak Performance Days
  let bestDaySub = '';
  let bestDayName = '';
  let bestDayPct = 0;
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  validSubcategoryIds.forEach((subId) => {
    const list = subcategoryMap.get(subId)!;
    const past90Start = now.getTime() - 90 * 24 * 60 * 60 * 1000;
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    let total90 = 0;

    list.forEach((e) => {
      const d = new Date(e.occurred_at);
      if (d.getTime() >= past90Start) {
        dayCounts[d.getDay()]++;
        total90++;
      }
    });

    if (total90 >= 10) {
      const maxDayVal = Math.max(...dayCounts);
      const pct = (maxDayVal / total90) * 100;
      if (pct > 30 && pct > bestDayPct) {
        bestDayPct = pct;
        bestDayName = daysOfWeek[dayCounts.indexOf(maxDayVal)];
        bestDaySub = subId;
      }
    }
  });

  if (bestDaySub) {
    const sub = categoryLookup.get(bestDaySub);
    candidates.push({
      id: 'peak-day',
      title: `${bestDayName}s are your best day`,
      subtitle: `Behavioral Trend • ${sub?.name}`,
      description: `Over the past 90 days, ${Math.round(bestDayPct)}% of your logs for this activity happened on a ${bestDayName}.`,
      icon: 'BarChart3',
      colorTheme: 'violet',
      stat: `${Math.round(bestDayPct)}%`,
    });
  }

  if (candidates.length === 0) return null;

  const dateSeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return candidates[dateSeed % candidates.length];
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
