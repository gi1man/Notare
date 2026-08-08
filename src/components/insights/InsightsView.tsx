import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { IconRenderer } from '../common/IconRenderer';
import {
  getDailyFeaturedInsight,
  getWeeklyComparisons,
  getAutomaticCorrelations,
  getMemoryFlashbacks,
  DEFAULT_COMMUNITY_INSIGHTS,
  CommunityInsightItem,
} from '../../db/insightsEngine';
import { fetchCommunityTotals, generateGeminiCommunityInsights } from '../../db/communityTelemetry';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  Zap,
  Clock,
  PieChart,
  Heart,
  Link,
  Unlink,
  Globe,
  RefreshCw,
  Bot,
  Lock,
  Settings,
} from 'lucide-react';

import { useApp } from '../../context/AppContext';

export const InsightsView: React.FC = () => {
  const { settings, setActiveTab } = useApp();
  const categories = useLiveQuery(
    () => db.categories.filter((c) => !c.deleted_at && (settings.is_demo_mode || !c.is_demo)).toArray(),
    [settings.is_demo_mode]
  );
  const entries = useLiveQuery(
    () => db.entries.filter((e) => !e.deleted_at && (settings.is_demo_mode || !e.is_demo)).toArray(),
    [settings.is_demo_mode]
  );

  const [communityInsights, setCommunityInsights] = useState<CommunityInsightItem[]>(
    DEFAULT_COMMUNITY_INSIGHTS
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Daily Rotating Featured Discovery Card
  const featuredInsight = useMemo(
    () => getDailyFeaturedInsight(entries || [], categories || []),
    [entries, categories]
  );

  // Weekly Comparison Items
  const weeklyComparisons = useMemo(
    () => getWeeklyComparisons(entries || [], categories || []),
    [entries, categories]
  );

  // Top 3 & Bottom 3 Automatic Correlations
  const { top3: top3Correlations, bottom3: bottom3Correlations } = useMemo(
    () => getAutomaticCorrelations(entries || [], categories || []),
    [entries, categories]
  );

  // Memory Flashbacks
  const flashbacks = useMemo(
    () => getMemoryFlashbacks(entries || [], categories || []),
    [entries, categories]
  );

  // Category Balance Distribution (Past 30 Days)
  const categoryDistribution = useMemo(() => {
    if (!entries || !categories) return [];
    const parentCats = categories.filter((c) => c.parent_id === null);
    const subMap = new Map(categories.map((c) => [c.id, c]));

    const counts = new Map<string, number>();
    let total30DayLogs = 0;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    entries.forEach((e) => {
      const time = new Date(e.occurred_at).getTime();
      if (time >= thirtyDaysAgo) {
        const sub = subMap.get(e.subcategory_id);
        const parentId = sub?.parent_id;
        if (parentId) {
          counts.set(parentId, (counts.get(parentId) || 0) + 1);
          total30DayLogs++;
        }
      }
    });

    return parentCats
      .map((p) => {
        const cnt = counts.get(p.id) || 0;
        const pct = total30DayLogs > 0 ? Math.round((cnt / total30DayLogs) * 100) : 0;
        return { parent: p, count: cnt, percentage: pct };
      })
      .sort((a, b) => b.count - a.count);
  }, [entries, categories]);

  // Handle Refreshing Community Discoveries
  const handleRefreshCommunity = async () => {
    setIsRefreshing(true);
    try {
      const totals = await fetchCommunityTotals();
      const aiGenerated = await generateGeminiCommunityInsights(totals);
      if (aiGenerated && aiGenerated.length > 0) {
        setCommunityInsights(aiGenerated);
      } else {
        setCommunityInsights([...DEFAULT_COMMUNITY_INSIGHTS].reverse());
      }
    } catch {
      setCommunityInsights([...DEFAULT_COMMUNITY_INSIGHTS].reverse());
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          Life Insights & Patterns
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Personal habits, weekly growth, and daily discovery patterns
        </p>
      </div>

      {/* 🌟 Daily Featured Discovery Card (Rotates every 24h) */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-xl space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            {featuredInsight.subtitle}
          </span>
          <span className="text-xs font-medium text-sky-100 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Rotates Daily
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-2xl font-black">{featuredInsight.title}</h3>
          <p className="text-sm text-sky-100 leading-relaxed font-medium">
            {featuredInsight.description}
          </p>
        </div>

        {featuredInsight.badge && (
          <div className="pt-1">
            <span className="inline-block px-3 py-1 bg-white text-sky-900 font-extrabold text-xs rounded-lg shadow">
              {featuredInsight.badge}
            </span>
          </div>
        )}
      </div>

      {/* 🌐 Community Discoveries & Benchmarks (Gemini AI) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-sky-200 dark:border-sky-900/60 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-sky-600 dark:text-sky-400" />
              Community Benchmarks & Stories
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
              <Bot className="w-3.5 h-3.5 text-indigo-500" /> Powered by Gemini AI • Anonymized aggregate discoveries
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {settings.telemetry_opt_in && (
              <button
                type="button"
                onClick={handleRefreshCommunity}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900/80 transition-all tap-target"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              settings.telemetry_opt_in
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {settings.telemetry_opt_in ? 'Active ✓' : 'Locked 🔒'}
            </span>
          </div>
        </div>

        {!settings.telemetry_opt_in ? (
          /* Reciprocity Lock Teaser Card */
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold text-base">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Unlock Community Insights & Benchmarks</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
              You can see community habit benchmarks and AI-synthesized stories by opting in to share your anonymized numerical totals. It is <strong>100% private</strong> — only un-linkable numerical totals (e.g. +1 walk) are shared, with zero personal notes, names, or user IDs stored.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="py-3 px-5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 tap-target"
            >
              <Settings className="w-4 h-4" />
              Enable Anonymous Community Stats in Settings ⚙️
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {communityInsights.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  {item.categoryTag && (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 font-extrabold text-[10px] uppercase tracking-wider">
                      {item.categoryTag}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-black text-sky-600 dark:text-sky-400">
                    {item.stat}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📈 "This Week vs. Last Week" Comparison Grid */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            This Week vs. Last Week
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparing your logged activities in the past 7 days against the prior 7 days
          </p>
        </div>

        {weeklyComparisons.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-400 text-xs italic">
            Log entries across multiple days to unlock weekly comparisons!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {weeklyComparisons.slice(0, 6).map((item) => {
              const isUp = item.percentChange >= 0;
              return (
                <div
                  key={item.subcategoryName}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 shrink-0">
                      <IconRenderer name={item.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.subcategoryName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.thisWeekCount} this wk vs {item.lastWeekCount} last wk
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${
                      isUp
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                    }`}
                  >
                    {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isUp ? `+${item.percentChange}%` : `${item.percentChange}%`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🔗 Top 3 & Bottom 3 Activity Correlations */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500" />
            Activity Correlations
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automatically discovered same-day habit co-occurrences
          </p>
        </div>

        {/* Top 3 Correlations */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Link className="w-4 h-4" /> Top 3 Strongest Associations
          </h4>

          {top3Correlations.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">
              Log activities across multiple days to automatically discover top habit associations.
            </div>
          ) : (
            <div className="space-y-2">
              {top3Correlations.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <IconRenderer name={item.subA.icon} className="w-4 h-4 text-emerald-600" />
                    <span>{item.subA.name}</span>
                    <span className="text-slate-400">&</span>
                    <IconRenderer name={item.subB.icon} className="w-4 h-4 text-emerald-600" />
                    <span>{item.subB.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-500 font-medium">
                      Co-occurred on {item.sameDayCount} days
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-600 text-white font-extrabold rounded-lg shadow-sm">
                      {item.percentage}% Same Day
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom 3 Correlations */}
        {bottom3Correlations.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Unlink className="w-4 h-4 text-slate-400" /> Lowest Associations (Independent Habits)
            </h4>

            <div className="space-y-2">
              {bottom3Correlations.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <IconRenderer name={item.subA.icon} className="w-4 h-4 text-slate-400" />
                    <span>{item.subA.name}</span>
                    <span className="text-slate-400">&</span>
                    <IconRenderer name={item.subB.icon} className="w-4 h-4 text-slate-400" />
                    <span>{item.subB.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 font-medium">
                      Co-occurred on {item.sameDayCount} days
                    </span>
                    <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold rounded-lg">
                      {item.percentage}% Same Day
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🎡 30-Day Life Category Balance Distribution */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-6 h-6 text-violet-500" />
            30-Day Life Balance Distribution
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            How your logged activity time is distributed across categories over the past 30 days
          </p>
        </div>

        {categoryDistribution.length === 0 ? (
          <div className="text-xs text-slate-400 italic text-center py-4">
            No activities logged in the past 30 days yet.
          </div>
        ) : (
          <div className="space-y-3">
            {categoryDistribution.map(({ parent, count, percentage }) => (
              <div key={parent.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span className="flex items-center gap-2">
                    <IconRenderer name={parent.icon} className="w-4 h-4 text-sky-600" />
                    {parent.name}
                  </span>
                  <span>{count} logs ({percentage}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${percentage}%` }}
                    className="h-full bg-sky-600 dark:bg-sky-500 rounded-full transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📸 Memory Flashbacks ("On This Day") */}
      {flashbacks.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-amber-500" />
              Memory Flashbacks
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reflect on past activity entries from your log history
            </p>
          </div>

          <div className="space-y-3">
            {flashbacks.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                  <span className="flex items-center gap-2">
                    <IconRenderer name={item.icon} className="w-4 h-4 text-amber-600" />
                    {item.subcategoryName} ({item.categoryName})
                  </span>
                  <span>{item.daysAgo} Days Ago ({item.dateFormatted})</span>
                </div>
                {(item.noteText || item.transcript) && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                    "{item.noteText || item.transcript}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
