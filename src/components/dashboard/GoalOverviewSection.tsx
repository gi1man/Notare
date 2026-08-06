import React, { useState, useMemo } from 'react';
import { Category, Entry, Goal } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { Calendar, X, Target, CheckCircle2, AlertCircle, LayoutGrid } from 'lucide-react';

interface GoalOverviewSectionProps {
  categories: Category[];
  entries: Entry[];
  goals: Goal[];
}

export type OverviewFrequency = 'daily' | 'weekly' | 'monthly';

interface SubcategoryOverviewData {
  parentCategory: Category;
  subcategory: Category;
  goal: Goal;
  actualValue: number;
  targetValue: number;
  completionPct: number;
  entries: Entry[];
}

// Harmonious Theme Palette per Parent Category
const CATEGORY_COLORS: Record<string, { bar: string; hover: string; dot: string; bg: string; text: string }> = {
  'Fitness & Health': {
    bar: 'bg-emerald-500',
    hover: 'hover:bg-emerald-600',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-300',
  },
  Nutrition: {
    bar: 'bg-teal-500',
    hover: 'hover:bg-teal-600',
    dot: 'bg-teal-500',
    bg: 'bg-teal-50 dark:bg-teal-950/60',
    text: 'text-teal-800 dark:text-teal-300',
  },
  'Focused Activities': {
    bar: 'bg-sky-500',
    hover: 'hover:bg-sky-600',
    dot: 'bg-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-950/60',
    text: 'text-sky-800 dark:text-sky-300',
  },
  'Social & Life': {
    bar: 'bg-indigo-500',
    hover: 'hover:bg-indigo-600',
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    text: 'text-indigo-800 dark:text-indigo-300',
  },
  Creativity: {
    bar: 'bg-violet-500',
    hover: 'hover:bg-violet-600',
    dot: 'bg-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/60',
    text: 'text-violet-800 dark:text-violet-300',
  },
  'Business & Work': {
    bar: 'bg-amber-500',
    hover: 'hover:bg-amber-600',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-800 dark:text-amber-300',
  },
  Diversions: {
    bar: 'bg-rose-500',
    hover: 'hover:bg-rose-600',
    dot: 'bg-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-800 dark:text-rose-300',
  },
  'Home Projects': {
    bar: 'bg-orange-500',
    hover: 'hover:bg-orange-600',
    dot: 'bg-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/60',
    text: 'text-orange-800 dark:text-orange-300',
  },
};

const DEFAULT_CATEGORY_COLOR = {
  bar: 'bg-sky-500',
  hover: 'hover:bg-sky-600',
  dot: 'bg-sky-500',
  bg: 'bg-sky-50 dark:bg-sky-950/60',
  text: 'text-sky-800 dark:text-sky-300',
};

export const GoalOverviewSection: React.FC<GoalOverviewSectionProps> = ({
  categories,
  entries,
  goals,
}) => {
  const [frequency, setFrequency] = useState<OverviewFrequency>('daily');
  const [selectedSubDetail, setSelectedSubDetail] = useState<SubcategoryOverviewData | null>(null);

  // Group categories
  const parentCategories = useMemo(
    () => categories.filter((c) => c.parent_id === null && !c.deleted_at),
    [categories]
  );

  const goalsBySubcategory = useMemo(() => {
    const map = new Map<string, Goal[]>();
    goals.forEach((g) => {
      const existing = map.get(g.subcategory_id) || [];
      existing.push(g);
      map.set(g.subcategory_id, existing);
    });
    return map;
  }, [goals]);

  // Current date period bounds
  const currentPeriod = useMemo(() => {
    const now = new Date();
    if (frequency === 'daily') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { label: 'Today', startDate: start, endDate: end };
    } else if (frequency === 'weekly') {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6, 0, 0, 0);
      return { label: 'Current Week', startDate: start, endDate: end };
    } else {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { label: 'Current Month', startDate: start, endDate: end };
    }
  }, [frequency]);

  // Calculate Overview Bar Chart Data for ALL subcategories grouped by parent category
  const allOverviewBars = useMemo(() => {
    const items: SubcategoryOverviewData[] = [];

    parentCategories.forEach((parent) => {
      const parentSubs = categories.filter((c) => c.parent_id === parent.id && !c.deleted_at);

      parentSubs.forEach((sub) => {
        const subGoals = goalsBySubcategory.get(sub.id) || [];
        const goal = subGoals.find((g) => g.frequency === frequency);
        if (!goal) return;

        // Filter entries in current period
        const subEntries = entries.filter((e) => {
          if (e.deleted_at || e.subcategory_id !== sub.id) return false;
          const time = new Date(e.occurred_at).getTime();
          return time >= currentPeriod.startDate.getTime() && time <= currentPeriod.endDate.getTime();
        });

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

        items.push({
          parentCategory: parent,
          subcategory: sub,
          goal,
          actualValue: actualVal,
          targetValue: goal.target_value,
          completionPct: subPct,
          entries: subEntries,
        });
      });
    });

    return items;
  }, [parentCategories, categories, goalsBySubcategory, frequency, currentPeriod, entries]);

  // Distinct active parent categories present in chart for the legend
  const activeLegendCategories = useMemo(() => {
    const set = new Set<string>();
    const parents: Category[] = [];
    allOverviewBars.forEach((bar) => {
      if (!set.has(bar.parentCategory.id)) {
        set.add(bar.parentCategory.id);
        parents.push(bar.parentCategory);
      }
    });
    return parents;
  }, [allOverviewBars]);

  const frequencyGoalCounts = useMemo(() => {
    let daily = 0;
    let weekly = 0;
    let monthly = 0;
    goals.forEach((g) => {
      if (g.frequency === 'daily') daily++;
      else if (g.frequency === 'weekly') weekly++;
      else if (g.frequency === 'monthly') monthly++;
    });
    return { daily, weekly, monthly };
  }, [goals]);

  // Auto-switch frequency if current selection has 0 goals
  React.useEffect(() => {
    if (frequencyGoalCounts[frequency] === 0) {
      if (frequencyGoalCounts.daily > 0) setFrequency('daily');
      else if (frequencyGoalCounts.weekly > 0) setFrequency('weekly');
      else if (frequencyGoalCounts.monthly > 0) setFrequency('monthly');
    }
  }, [frequency, frequencyGoalCounts]);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
      {/* Header & Frequency Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            Goal Overview
          </h3>
        </div>

        {/* Frequency Control Pills */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-bold shrink-0 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={frequencyGoalCounts.daily === 0}
            onClick={() => setFrequency('daily')}
            className={`px-3.5 py-1.5 rounded-lg transition-all tap-target ${
              frequency === 'daily'
                ? 'bg-sky-600 text-white shadow-sm font-bold'
                : frequencyGoalCounts.daily === 0
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            disabled={frequencyGoalCounts.weekly === 0}
            onClick={() => setFrequency('weekly')}
            className={`px-3.5 py-1.5 rounded-lg transition-all tap-target ${
              frequency === 'weekly'
                ? 'bg-sky-600 text-white shadow-sm font-bold'
                : frequencyGoalCounts.weekly === 0
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            disabled={frequencyGoalCounts.monthly === 0}
            onClick={() => setFrequency('monthly')}
            className={`px-3.5 py-1.5 rounded-lg transition-all tap-target ${
              frequency === 'monthly'
                ? 'bg-sky-600 text-white shadow-sm font-bold'
                : frequencyGoalCounts.monthly === 0
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Empty State vs Unified Graph */}
      {allOverviewBars.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm font-semibold italic border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          No {frequency} goals set
        </div>
      ) : (
        <div className="space-y-4">
          {/* Category Color Legend */}
          <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 text-xs font-bold">
            {activeLegendCategories.map((parent) => {
              const theme = CATEGORY_COLORS[parent.name] || DEFAULT_CATEGORY_COLOR;
              return (
                <div key={parent.id} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-full ${theme.dot}`} />
                  <span className="text-slate-700 dark:text-slate-300">{parent.name}</span>
                </div>
              );
            })}
          </div>

          {/* Single Unified Bar Chart */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            {/* Chart Grid with Y-Axis & X-Axis */}
            <div className="flex gap-2 items-start pt-3 pb-1">
              {/* Y-Axis Title Label */}
              <div className="flex items-center justify-center shrink-0 w-3 h-44 select-none">
                <span className="-rotate-90 whitespace-nowrap text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Percent Complete
                </span>
              </div>

              {/* 20% Scale Labels (Y-Axis) - Exactly h-44 (176px) */}
              <div className="relative w-9 h-44 shrink-0 select-none">
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

              {/* Main Chart Canvas Area */}
              <div className="flex-1 space-y-1 overflow-x-auto no-scrollbar">
                <div className="relative h-44 min-w-[280px] border-l border-b border-slate-300 dark:border-slate-700">
                  {/* 20% Thicker Dashed Gridlines */}
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

                  {/* Grouped Subcategory Bars */}
                  <div className="relative z-10 h-full flex items-end gap-2 sm:gap-4 pt-0 pb-0 px-2">
                    {allOverviewBars.map((bar) => {
                      const heightPct = Math.max(6, bar.completionPct);
                      const theme = CATEGORY_COLORS[bar.parentCategory.name] || DEFAULT_CATEGORY_COLOR;

                      return (
                        <button
                          type="button"
                          key={bar.subcategory.id}
                          onClick={() => setSelectedSubDetail(bar)}
                          className="flex-1 group relative h-full flex flex-col justify-end items-center focus:outline-none min-w-[28px]"
                          title={`${bar.parentCategory.name} → ${bar.subcategory.name}: ${bar.completionPct}% Met`}
                        >
                          {/* Bar Fill Colored by Category */}
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full max-w-[44px] rounded-t-md transition-all ${theme.bar} ${theme.hover} shadow-sm group-hover:scale-105`}
                          />

                          {/* Hover Tooltip Bubble */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow z-20 whitespace-nowrap pointer-events-none text-center">
                            <div className="text-[9px] text-slate-400 font-semibold">{bar.parentCategory.name}</div>
                            <div>{bar.subcategory.name}: {bar.completionPct}%</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* X-Axis Subcategory Name Labels */}
                <div className="flex justify-between text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-300 pt-1.5 px-2 min-w-[280px]">
                  {allOverviewBars.map((bar) => (
                    <button
                      type="button"
                      key={bar.subcategory.id}
                      onClick={() => setSelectedSubDetail(bar)}
                      className="flex-1 text-center truncate px-0.5 hover:text-sky-600 dark:hover:text-sky-400"
                      title={`${bar.parentCategory.name}: ${bar.subcategory.name}`}
                    >
                      {bar.subcategory.name}
                    </button>
                  ))}
                </div>

                {/* X-Axis Title Label */}
                <div className="text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-1 select-none">
                  Subcategory
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Detail Modal */}
      {selectedSubDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                  <IconRenderer name={selectedSubDetail.subcategory.icon || 'CircleDot'} className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedSubDetail.subcategory.name}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {selectedSubDetail.parentCategory.name} • {currentPeriod.label} ({frequency})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSubDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Goal Progress Summary */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Goal Completion
                </span>
                <span
                  className={`text-sm font-black px-3 py-1 rounded-full flex items-center gap-1 ${
                    selectedSubDetail.completionPct >= 100
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  }`}
                >
                  {selectedSubDetail.completionPct >= 100 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {selectedSubDetail.actualValue} / {selectedSubDetail.targetValue} ({selectedSubDetail.completionPct}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, selectedSubDetail.completionPct)}%` }}
                  className={`h-full transition-all ${
                    selectedSubDetail.completionPct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>

              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-sky-500" />
                Target: {selectedSubDetail.goal.direction === 'at_least' ? '≥' : '≤'} {selectedSubDetail.goal.target_value} {selectedSubDetail.goal.target_type === 'time' ? 'mins' : 'reps/times'} per {frequency === 'daily' ? 'day' : frequency === 'weekly' ? 'week' : 'month'}
              </div>
            </div>

            {/* Entries List */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Logged Entries ({selectedSubDetail.entries.length})
              </h5>

              {selectedSubDetail.entries.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">No entries logged in this period yet.</div>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {selectedSubDetail.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(entry.occurred_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-bold text-sky-600 dark:text-sky-400">
                        {typeof entry.value === 'number' ? `${entry.value} logged` : 'Completed ✓'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedSubDetail(null)}
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
