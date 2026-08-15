import React, { useMemo } from 'react';
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
  const { frequencyGroups } = useMemo(() => {
    const catMap = new Map<string, Category>();
    categories.forEach((c) => catMap.set(c.id, c));

    // Date Boundaries & Dynamic Period Progress Calculation
    const now = new Date();

    // Day of week: 1 (Mon) to 7 (Sun)
    const jsDay = now.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    // Day of month & Total days in current month
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

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
      const freqGoals = goals.filter(
        (g) => g.frequency && g.frequency.toLowerCase() === targetFreq
      );
      if (freqGoals.length === 0) return [];

      const items: GoalItemData[] = freqGoals.map((goal) => {
        const subcat =
          catMap.get(goal.subcategory_id) ||
          ({
            id: goal.subcategory_id,
            parent_id: null,
            name: 'Goal Activity',
            icon: 'Target',
            is_demo: false,
          } as Category);

        const parentCat = subcat.parent_id ? catMap.get(subcat.parent_id) || null : null;

        const logged = entries
          .filter(
            (e) =>
              !e.deleted_at &&
              (e.subcategory_id === goal.subcategory_id || (e as any).category_id === goal.subcategory_id) &&
              new Date(e.occurred_at || (e as any).timestamp || Date.now()).getTime() >= startTime
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

    // Order requested by user: 1. Weekly -> 2. Monthly -> 3. Daily
    const freqGroups: FrequencyGroup[] = [
      {
        frequency: 'weekly',
        label: 'Weekly Goals',
        caption: `Day ${dayOfWeek} of 7`,
        categoryGroups: processGoalsForFrequency('weekly', startOfWeekTime),
      },
      {
        frequency: 'monthly',
        label: 'Monthly Goals',
        caption: `Day ${dayOfMonth} of ${daysInMonth}`,
        categoryGroups: processGoalsForFrequency('monthly', startOfMonthTime),
      },
      {
        frequency: 'daily',
        label: 'Daily Goals',
        categoryGroups: processGoalsForFrequency('daily', startOfTodayTime),
      },
    ].filter((fg) => fg.categoryGroups.length > 0);

    return {
      categoryMap: catMap,
      frequencyGroups: freqGroups,
      currentDayOfWeek: dayOfWeek,
      currentDayOfMonth: dayOfMonth,
      daysInCurrentMonth: daysInMonth,
    };
  }, [goals, entries, categories]);

  if (frequencyGroups.length === 0) {
    return (
      <div className="card-parchment p-8 rounded-2xl shadow-sm text-center space-y-2">
        <BarChart3 className="w-10 h-10 text-slate-400 mx-auto" />
        <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">No Goal Breakdown Available Yet</h4>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Set daily, weekly, or monthly goals to see your performance breakdown!
        </p>
      </div>
    );
  }

  return (
    <div className="card-parchment p-6 rounded-2xl shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-notare-parchment-dark dark:border-slate-700 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#0F4C45] dark:text-emerald-400" />
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
            {/* Frequency Header */}
            <div className="flex items-center justify-between bg-notare-parchment-dark/70 dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                <Calendar className="w-4 h-4 text-[#0F4C45] dark:text-emerald-400" />
                <span>{fg.label}</span>
              </h4>

              {fg.caption && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#0F4C45]/10 text-[#0F4C45] dark:bg-emerald-950 dark:text-emerald-300">
                  {fg.caption}
                </span>
              )}
            </div>

            {/* Parent Category Groups */}
            <div className="space-y-5 pl-1 sm:pl-3">
              {fg.categoryGroups.map((cg, idx) => (
                <div key={cg.parentCategory?.id || idx} className="space-y-3">
                  {/* Parent Category Header */}
                  {cg.parentCategory && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200/50 dark:border-slate-800 pb-1">
                      <IconRenderer
                        name={cg.parentCategory.icon || 'Folder'}
                        className="w-4 h-4 text-[#0F4C45] dark:text-emerald-400"
                      />
                      <span>{cg.parentCategory.name}</span>
                    </div>
                  )}

                  {/* Goal Activity Items — Mobile-First Stacked Layout */}
                  <div className="space-y-3">
                    {cg.items.map((item) => {
                      const unit = item.subcategory?.value_schema?.unit || '';
                      const isCompleted = item.completionPct >= 100;
                      const barWidth = Math.max(2, Math.min(100, item.completionPct));

                      return (
                        <div
                          key={item.goal.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-2"
                        >
                          {/* Row 1: Icon + Name + Percentage */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 rounded-lg bg-notare-parchment dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                                <IconRenderer
                                  name={item.subcategory?.icon || cg.parentCategory?.icon || 'Target'}
                                  className="w-4 h-4 text-[#0F4C45] dark:text-emerald-400"
                                />
                              </div>
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {item.subcategory?.name || 'Goal Activity'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-xs font-extrabold px-2 py-0.5 rounded-md whitespace-nowrap ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {item.completionPct.toFixed(1)}%
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {item.loggedValue}/{item.targetValue}{unit ? ` ${unit}` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Full-width progress bar (always visible on all screen sizes) */}
                          <div className="w-full relative bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800" style={{ height: '22px' }}>
                            {/* 20% Reference Gridlines */}
                            <div className="absolute inset-0 flex pointer-events-none" style={{ justifyContent: 'space-evenly' }}>
                              <span className="h-full" style={{ borderRight: '1px solid rgba(100,116,139,0.2)' }}></span>
                              <span className="h-full" style={{ borderRight: '1px solid rgba(100,116,139,0.2)' }}></span>
                              <span className="h-full" style={{ borderRight: '1px solid rgba(100,116,139,0.2)' }}></span>
                              <span className="h-full" style={{ borderRight: '1px solid rgba(100,116,139,0.2)' }}></span>
                            </div>

                            {/* Bar Fill — min 2% width so even small values are visible */}
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: isCompleted ? '#0F4C45' : '#8FA99B',
                                transition: 'width 0.5s ease',
                              }}
                            />
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

        {/* Global Bottom Percentage Scale Reference Bar */}
        <div className="pt-2 border-t border-notare-parchment-dark dark:border-slate-700 flex justify-between text-[10px] font-extrabold text-slate-400 dark:text-slate-500 tracking-wider">
          <span>0.0%</span>
          <span>20.0%</span>
          <span>40.0%</span>
          <span>60.0%</span>
          <span>80.0%</span>
          <span>100.0%</span>
        </div>
      </div>
    </div>
  );
};
