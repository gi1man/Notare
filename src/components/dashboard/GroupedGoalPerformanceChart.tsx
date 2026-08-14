import React from 'react';
import { Goal, Entry, Category } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { BarChart3, Calendar } from 'lucide-react';

interface GroupedGoalPerformanceChartProps {
  goals: Goal[];
  entries: Entry[];
  categories: Category[];
}

interface GoalItemData {
  goal: Goal;
  subcategory: Category;
  parentCategory: Category | null;
  loggedValue: number;
  targetValue: number;
  completionPct: number; // 0 to 100
}

interface CategoryGroup {
  parentCategory: Category | null;
  items: GoalItemData[];
}

interface FrequencyGroup {
  frequency: string;
  label: string;
  caption?: string;
  categoryGroups: CategoryGroup[];
}

export const GroupedGoalPerformanceChart: React.FC<GroupedGoalPerformanceChartProps> = ({
  goals,
  entries,
  categories,
}) => {
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  // Date Boundaries & Dynamic Period Progress Calculation
  const now = new Date();

  // Day of week: 1 (Mon) to 7 (Sun)
  const jsDay = now.getDay();
  const currentDayOfWeek = jsDay === 0 ? 7 : jsDay;

  // Day of month & Total days in current month
  const currentDayOfMonth = now.getDate();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const startOfTodayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const startOfWeekTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0).getTime();
  const startOfMonthTime = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();

  // Helper to extract numeric value from entry
  const getEntryNumericValue = (entry: Entry): number => {
    if (typeof entry.value === 'number') return entry.value;
    if (typeof entry.value === 'boolean') return entry.value ? 1 : 0;
    if (typeof entry.value === 'object' && entry.value !== null && 'value_1' in entry.value) {
      return entry.value.value_1;
    }
    return 1;
  };

  // Helper to compute individual percent completion for a single goal
  const computeIndividualPct = (logged: number, target: number, direction: 'at_least' | 'at_most'): number => {
    if (direction === 'at_least') {
      if (target <= 0) return 100;
      const rawPct = (logged / target) * 100;
      return Math.min(100, Math.max(0, Math.round(rawPct * 10) / 10));
    } else {
      if (logged === 0) return 100;
      if (logged <= target) return 100;
      const overPct = (target / logged) * 100;
      return Math.max(0, Math.round(overPct * 10) / 10);
    }
  };

  // Helper to process goals for a frequency
  const processGoalsForFrequency = (
    targetFreq: 'daily' | 'weekly' | 'monthly',
    startTime: number
  ): CategoryGroup[] => {
    const freqGoals = goals.filter((g) => g.frequency === targetFreq);
    if (freqGoals.length === 0) return [];

    const items: GoalItemData[] = freqGoals.map((goal) => {
      const subcat = categoryMap.get(goal.subcategory_id)!;
      const parentCat = subcat ? categoryMap.get(subcat.parent_id || '') || null : null;

      const logged = entries
        .filter(
          (e) =>
            e.subcategory_id === goal.subcategory_id &&
            !e.deleted_at &&
            new Date(e.occurred_at).getTime() >= startTime
        )
        .reduce((sum, e) => sum + getEntryNumericValue(e), 0);

      const targetVal = goal.target_value;
      const pct = computeIndividualPct(logged, targetVal, goal.direction);

      return {
        goal,
        subcategory: subcat,
        parentCategory: parentCat,
        loggedValue: logged,
        targetValue: targetVal,
        completionPct: pct,
      };
    });

    // Group items by Parent Category
    const groupsMap = new Map<string, { parent: Category | null; items: GoalItemData[] }>();
    items.forEach((item) => {
      const parentId = item.parentCategory ? item.parentCategory.id : 'uncategorized';
      if (!groupsMap.has(parentId)) {
        groupsMap.set(parentId, { parent: item.parentCategory, items: [] });
      }
      groupsMap.get(parentId)!.items.push(item);
    });

    return Array.from(groupsMap.values()).map((g) => ({
      parentCategory: g.parent,
      items: g.items,
    }));
  };

  // Build the 3 Frequency Groups in order: Daily -> Weekly -> Monthly
  const frequencyGroups: FrequencyGroup[] = [
    {
      frequency: 'daily',
      label: 'Daily Goals',
      categoryGroups: processGoalsForFrequency('daily', startOfTodayTime),
    },
    {
      frequency: 'weekly',
      label: 'Weekly Goals',
      caption: `Day ${currentDayOfWeek} of 7`,
      categoryGroups: processGoalsForFrequency('weekly', startOfWeekTime),
    },
    {
      frequency: 'monthly',
      label: 'Monthly Goals',
      caption: `Day ${currentDayOfMonth} of ${daysInCurrentMonth}`,
      categoryGroups: processGoalsForFrequency('monthly', startOfMonthTime),
    },
  ].filter((fg) => fg.categoryGroups.length > 0);

  if (frequencyGroups.length === 0) {
    return null; // Don't render if no goals exist
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Goal Performance Breakdown
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Grouped by frequency and category (0% – 100% completion target)
          </p>
        </div>
      </div>

      {/* Frequency Groups Stack */}
      <div className="space-y-8">
        {frequencyGroups.map((fg) => (
          <div key={fg.frequency} className="space-y-4">
            {/* Frequency Group Header (Horizontal & Dynamic Caption) */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{fg.label}</span>
              </h4>

              {fg.caption && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {fg.caption}
                </span>
              )}
            </div>

            {/* Parent Category Groups */}
            <div className="space-y-5 pl-2 sm:pl-4">
              {fg.categoryGroups.map((cg, idx) => (
                <div key={cg.parentCategory?.id || idx} className="space-y-3">
                  {/* Horizontal Parent Category Label */}
                  {cg.parentCategory && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
                      <IconRenderer
                        name={cg.parentCategory.icon || 'Folder'}
                        className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                      />
                      <span>{cg.parentCategory.name}</span>
                    </div>
                  )}

                  {/* Goal Activity Items Rows */}
                  <div className="space-y-3">
                    {cg.items.map((item) => {
                      const unit = item.subcategory?.value_schema?.unit || '';
                      const isCompleted = item.completionPct >= 100;

                      return (
                        <div
                          key={item.goal.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        >
                          {/* Activity Item Name & Icon */}
                          <div className="sm:w-48 flex items-center gap-2 shrink-0">
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 shrink-0">
                              <IconRenderer
                                name={item.subcategory?.icon || 'Target'}
                                className="w-4 h-4"
                              />
                            </div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {item.subcategory?.name || 'Goal Activity'}
                            </span>
                          </div>

                          {/* Horizontal Progress Bar Track */}
                          <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                            {/* 10% Reference Gridlines */}
                            <div className="absolute inset-0 flex justify-between pointer-events-none px-1 opacity-20">
                              <span className="h-full border-r border-slate-400"></span>
                              <span className="h-full border-r border-slate-400"></span>
                              <span className="h-full border-r border-slate-400"></span>
                              <span className="h-full border-r border-slate-400"></span>
                              <span className="h-full border-r border-slate-400"></span>
                            </div>

                            {/* Animated Fill Bar */}
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCompleted
                                  ? 'bg-emerald-500 dark:bg-emerald-400'
                                  : 'bg-emerald-600 dark:bg-sky-500'
                              }`}
                              style={{ width: `${Math.min(100, item.completionPct)}%` }}
                            />
                          </div>

                          {/* Percent & Numeric Ratio Stats */}
                          <div className="sm:w-36 flex items-center justify-between sm:justify-end gap-2 text-right shrink-0">
                            <span
                              className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
                              }`}
                            >
                              {item.completionPct.toFixed(1)}%
                            </span>

                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {item.loggedValue} / {item.targetValue} {unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
