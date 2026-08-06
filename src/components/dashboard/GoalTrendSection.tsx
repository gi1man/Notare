import React, { useState, useMemo } from 'react';
import { Category, Entry, Goal } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { Calendar, X, BarChart2, CheckCircle2, AlertCircle } from 'lucide-react';

interface GoalTrendSectionProps {
  categories: Category[];
  entries: Entry[];
  goals: Goal[];
}

export type TrendFrequency = 'daily' | 'weekly' | 'monthly';

interface PeriodBin {
  id: string;
  label: string; // e.g. "Jul 24" or "W29" or "Jul '26"
  startDate: Date;
  endDate: Date;
}

interface TrendBarData {
  period: PeriodBin;
  completionPct: number; // 0 - 100
  itemsCount: number;
}

interface SelectedBarDetail {
  category: Category;
  period: PeriodBin;
  completionPct: number;
  subItems: {
    subcategory: Category;
    goal: Goal;
    actualValue: number;
    targetValue: number;
    completionPct: number;
    entries: Entry[];
  }[];
}

// Helper to format date ranges
const formatDateShort = (d: Date) => {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Generate Period Bins
const generateBins = (freq: TrendFrequency): PeriodBin[] => {
  const bins: PeriodBin[] = [];
  const now = new Date();

  if (freq === 'daily') {
    // Past 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      bins.push({
        id: `day-${i}`,
        label: i === 0 ? 'Today' : formatDateShort(d),
        startDate: start,
        endDate: end,
      });
    }
  } else if (freq === 'weekly') {
    // Past 12 weeks (ending on current Sunday or today)
    for (let i = 11; i >= 0; i--) {
      const dayOffset = i * 7;
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset, 23, 59, 59);
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6, 0, 0, 0);
      bins.push({
        id: `week-${i}`,
        label: i === 0 ? 'This Wk' : `${formatDateShort(start)}`,
        startDate: start,
        endDate: end,
      });
    }
  } else {
    // Past 12 months
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      bins.push({
        id: `month-${i}`,
        label: start.toLocaleDateString('en-US', { month: 'short' }),
        startDate: start,
        endDate: end,
      });
    }
  }

  return bins;
};

export const GoalTrendSection: React.FC<GoalTrendSectionProps> = ({
  categories,
  entries,
  goals,
}) => {
  const [frequency, setFrequency] = useState<TrendFrequency>('daily');
  const [selectedDetail, setSelectedDetail] = useState<SelectedBarDetail | null>(null);

  // Group parent categories & subcategories
  const parentCategories = useMemo(
    () => categories.filter((c) => c.parent_id === null && !c.deleted_at),
    [categories]
  );

  const subcategoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => {
      if (c.parent_id !== null) map.set(c.id, c);
    });
    return map;
  }, [categories]);

  const goalsBySubcategory = useMemo(() => {
    const map = new Map<string, Goal[]>();
    goals.forEach((g) => {
      const existing = map.get(g.subcategory_id) || [];
      existing.push(g);
      map.set(g.subcategory_id, existing);
    });
    return map;
  }, [goals]);

  // Generate period bins
  const periodBins = useMemo(() => generateBins(frequency), [frequency]);

  // Calculate Trellised Bar Chart Data by Category
  const trellisedData = useMemo(() => {
    return parentCategories.map((parent) => {
      // Find all subcategories belonging to this parent
      const parentSubs = categories.filter((c) => c.parent_id === parent.id && !c.deleted_at);
      const parentSubIds = new Set(parentSubs.map((s) => s.id));

      // Find goals for these subcategories strictly matching current frequency
      const matchingGoals: { subcategory: Category; goal: Goal }[] = [];
      parentSubs.forEach((sub) => {
        const subGoals = goalsBySubcategory.get(sub.id) || [];
        const freqGoal = subGoals.find((g) => g.frequency === frequency);
        if (freqGoal) {
          matchingGoals.push({ subcategory: sub, goal: freqGoal });
        }
      });

      // Calculate bar for each period bin
      const bars: TrendBarData[] = periodBins.map((bin) => {
        if (matchingGoals.length === 0) {
          return { period: bin, completionPct: 0, itemsCount: 0 };
        }

        // Filter entries in this bin
        const binEntries = entries.filter((e) => {
          if (e.deleted_at || !parentSubIds.has(e.subcategory_id)) return false;
          const time = new Date(e.occurred_at).getTime();
          return time >= bin.startDate.getTime() && time <= bin.endDate.getTime();
        });

        // Compute individual completion %
        let totalPctSum = 0;

        matchingGoals.forEach(({ subcategory, goal }) => {
          const subEntries = binEntries.filter((e) => e.subcategory_id === subcategory.id);

          let loggedVal = 0;
          subEntries.forEach((e) => {
            if (typeof e.value === 'number') loggedVal += e.value;
            else if (e.value && typeof e.value === 'object' && 'number' in e.value) {
              loggedVal += Number(e.value.number) || 0;
            } else if (e.value === true) {
              loggedVal += 1;
            }
          });

          let subPct = 0;
          if (goal.direction === 'at_most') {
            subPct = loggedVal <= goal.target_value ? 100 : Math.round((goal.target_value / loggedVal) * 100);
          } else {
            subPct = Math.min(100, Math.round((loggedVal / goal.target_value) * 100));
          }

          totalPctSum += subPct;
        });

        const avgPct = Math.round(totalPctSum / matchingGoals.length);

        return {
          period: bin,
          completionPct: avgPct,
          itemsCount: matchingGoals.length,
        };
      });

      return {
        parentCategory: parent,
        goalsCount: matchingGoals.length,
        bars,
      };
    }).filter((item) => item.goalsCount > 0); // Only show categories with goals
  }, [parentCategories, categories, goalsBySubcategory, periodBins, entries, frequency]);

  // Handle Bar Click -> Open Detail Modal
  const handleBarClick = (parentCat: Category, bar: TrendBarData) => {
    const parentSubs = categories.filter((c) => c.parent_id === parentCat.id && !c.deleted_at);
    const binEntries = entries.filter((e) => {
      if (e.deleted_at) return false;
      const sub = subcategoryMap.get(e.subcategory_id);
      if (!sub || sub.parent_id !== parentCat.id) return false;
      const time = new Date(e.occurred_at).getTime();
      return time >= bar.period.startDate.getTime() && time <= bar.period.endDate.getTime();
    });

    const subItems = parentSubs.map((sub) => {
      const subGoals = goalsBySubcategory.get(sub.id) || [];
      const goal = subGoals.find((g) => g.frequency === frequency);
      if (!goal) return null;

      const subEntries = binEntries.filter((e) => e.subcategory_id === sub.id);

      let actualVal = 0;
      subEntries.forEach((e) => {
        if (typeof e.value === 'number') actualVal += e.value;
        else if (e.value && typeof e.value === 'object' && 'number' in e.value) {
          actualVal += Number(e.value.number) || 0;
        } else if (e.value === true) {
          actualVal += 1;
        }
      });

      let subPct = 0;
      if (goal.direction === 'at_most') {
        subPct = actualVal <= goal.target_value ? 100 : Math.round((goal.target_value / actualVal) * 100);
      } else {
        subPct = Math.min(100, Math.round((actualVal / goal.target_value) * 100));
      }

      return {
        subcategory: sub,
        goal,
        actualValue: actualVal,
        targetValue: goal.target_value,
        completionPct: subPct,
        entries: subEntries,
      };
    }).filter(Boolean) as SelectedBarDetail['subItems'];

    setSelectedDetail({
      category: parentCat,
      period: bar.period,
      completionPct: bar.completionPct,
      subItems,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
      {/* Header & Frequency Selector Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            Goal Trend
          </h3>
        </div>

        {/* Frequency Control Pills */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-bold shrink-0 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setFrequency('daily')}
            className={`px-3.5 py-1.5 rounded-lg transition-all tap-target ${
              frequency === 'daily'
                ? 'bg-sky-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setFrequency('weekly')}
            className={`px-3.5 py-1.5 rounded-lg transition-all tap-target ${
              frequency === 'weekly'
                ? 'bg-sky-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setFrequency('monthly')}
            className={`px-3.5 py-1.5 rounded-lg transition-all tap-target ${
              frequency === 'monthly'
                ? 'bg-sky-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Trellised Bar Charts Grid */}
      {trellisedData.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm font-semibold italic border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          No {frequency} goals set
        </div>
      ) : (
        <div className="space-y-6">
          {trellisedData.map(({ parentCategory, bars }) => (
            <div
              key={parentCategory.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-3"
            >
              {/* Category Title Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <IconRenderer name={parentCategory.icon} className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  {parentCategory.name}
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  Tap any bar for breakdown
                </span>
              </div>

              {/* Bar Chart Grid with 20% Scales & Gridlines */}
              <div className="flex gap-2 items-start pt-3 pb-1">
                {/* Y-Axis Title Label */}
                <div className="flex items-center justify-center shrink-0 w-3 h-36 select-none">
                  <span className="-rotate-90 whitespace-nowrap text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Percent Complete
                  </span>
                </div>

                {/* 20% Scale Labels (Y-Axis) - Exactly h-36 (144px) matching chart height */}
                <div className="relative w-9 h-36 shrink-0 select-none">
                  {[100, 80, 60, 40, 20, 0].map((val) => {
                    const topPos = 100 - val;
                    return (
                      <span
                        key={val}
                        style={{ top: `${topPos}%` }}
                        className="absolute right-1 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-none"
                      >
                        {val}%
                      </span>
                    );
                  })}
                </div>

                {/* Main Chart Area */}
                <div className="flex-1 space-y-1">
                  <div className="relative h-36 border-l border-b border-slate-300 dark:border-slate-700">
                    {/* 20% Thicker Dashed Gridlines - Exactly Aligned */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[100, 80, 60, 40, 20, 0].map((val) => {
                        const topPos = 100 - val;
                        return (
                          <div
                            key={val}
                            style={{ top: `${topPos}%` }}
                            className={`absolute left-0 right-0 ${
                              val === 0
                                ? 'border-b border-slate-300 dark:border-slate-700'
                                : 'border-b-2 border-dashed border-slate-300/80 dark:border-slate-700/80'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Bars Container */}
                    <div className="relative z-10 h-full flex items-end gap-1 sm:gap-1.5 pt-0 pb-0 px-1">
                      {bars.map((bar) => {
                        const heightPct = Math.max(6, bar.completionPct); // Min height so 0% is clickable
                        let barColorClass = 'bg-rose-500 hover:bg-rose-600';
                        if (bar.completionPct >= 80) barColorClass = 'bg-emerald-500 hover:bg-emerald-600';
                        else if (bar.completionPct >= 50) barColorClass = 'bg-amber-500 hover:bg-amber-600';

                        return (
                          <button
                            type="button"
                            key={bar.period.id}
                            onClick={() => handleBarClick(parentCategory, bar)}
                            className="flex-1 group relative h-full flex flex-col justify-end items-center focus:outline-none"
                            title={`${bar.period.label}: ${bar.completionPct}% Met`}
                          >
                            {/* Bar Fill */}
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full rounded-t-md transition-all ${barColorClass} shadow-sm group-hover:scale-105`}
                            />

                            {/* Hover Tooltip Bubble */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow z-20 whitespace-nowrap pointer-events-none">
                              {bar.period.label}: {bar.completionPct}%
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* X-Axis Period Labels */}
                  <div className="flex justify-between text-[9px] sm:text-[10px] font-bold text-slate-400 px-0.5">
                    <span>{bars[0]?.period.label}</span>
                    <span>{bars[Math.floor(bars.length / 2)]?.period.label}</span>
                    <span>{bars[bars.length - 1]?.period.label}</span>
                  </div>

                  {/* X-Axis Title Label */}
                  <div className="text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-0.5 select-none">
                    {frequency === 'daily' ? 'Day' : frequency === 'weekly' ? 'Week' : 'Month'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bar Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <IconRenderer name={selectedDetail.category.icon} className="w-5 h-5 text-sky-600" />
                  {selectedDetail.category.name}
                </h4>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  {formatDateShort(selectedDetail.period.startDate)} – {formatDateShort(selectedDetail.period.endDate)}
                </p>
              </div>

              <button
                onClick={() => setSelectedDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Completion Summary Score Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Overall Period Goal Met
              </span>
              <span
                className={`text-base font-black px-3 py-1 rounded-full ${
                  selectedDetail.completionPct >= 80
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : selectedDetail.completionPct >= 50
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                }`}
              >
                {selectedDetail.completionPct}%
              </span>
            </div>

            {/* Subcategories Breakdown List */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Item Breakdown
              </h5>

              {selectedDetail.subItems.length === 0 ? (
                <div className="text-xs text-slate-400 italic">No subcategory goals configured.</div>
              ) : (
                selectedDetail.subItems.map((item) => {
                  const isMet = item.completionPct >= 100;
                  return (
                    <div
                      key={item.subcategory.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                          <IconRenderer name={item.subcategory.icon || 'CircleDot'} className="w-4 h-4 text-sky-600" />
                          {item.subcategory.name}
                        </div>

                        <span
                          className={`text-xs font-bold flex items-center gap-1 ${
                            isMet
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isMet ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {item.actualValue} / {item.targetValue} ({item.completionPct}%)
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, item.completionPct)}%` }}
                          className={`h-full transition-all ${
                            isMet ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                      </div>

                      {/* Logged Entries Count */}
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {item.entries.length} logged {item.entries.length === 1 ? 'entry' : 'entries'} in this period.
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setSelectedDetail(null)}
              className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
