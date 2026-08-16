import React, { useState } from 'react';
import { Goal, Entry, Category } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { X, CheckCircle2, AlertCircle, PieChart, Share2 } from 'lucide-react';
import { shareGoalSummaryCard } from '../../utils/shareCard';

interface GoalDonutChartsProps {
  goals: Goal[];
  entries: Entry[];
  categories: Category[];
}

export interface GoalItemProgress {
  goal: Goal;
  subcategory: Category;
  parentCategory: Category | null;
  loggedValue: number;
  targetValue: number;
  completionPct: number; // 0 to 100%
  isCompleted: boolean;
}

export const GoalDonutCharts: React.FC<GoalDonutChartsProps> = ({ goals, entries, categories }) => {
  const [selectedSegment, setSelectedSegment] = useState<{
    title: string;
    type: 'completed' | 'due' | 'all';
    averagePct: number;
    items: GoalItemProgress[];
  } | null>(null);

  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  // Date Boundaries (Local Timezone)
  const now = new Date();
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
      return Math.min(100, Math.max(0, Math.round(rawPct)));
    } else {
      // Limit Cap goal (e.g. TV <= 60 mins)
      if (logged === 0) return 100; // Under limit
      if (logged <= target) return 100; // Stayed under limit cap
      const overPct = (target / logged) * 100; // Exceeded limit cap
      return Math.max(0, Math.round(overPct));
    }
  };

  // 1. Filter goals strictly by frequency
  const dailyGoals = goals.filter((g) => g.frequency === 'daily');
  const weeklyGoals = goals.filter((g) => g.frequency === 'weekly');
  const monthlyGoals = goals.filter((g) => g.frequency === 'monthly');

  // Compute Daily Progress ONLY for daily goals
  const dailyProgressList: GoalItemProgress[] = dailyGoals.map((goal) => {
    const subcat = categoryMap.get(goal.subcategory_id)!;
    const parentCat = subcat ? categoryMap.get(subcat.parent_id || '') || null : null;

    const loggedToday = entries
      .filter(
        (e) =>
          e.subcategory_id === goal.subcategory_id &&
          !e.deleted_at &&
          new Date(e.occurred_at).getTime() >= startOfTodayTime
      )
      .reduce((sum, e) => sum + getEntryNumericValue(e), 0);

    const targetValue = goal.target_value;
    const completionPct = computeIndividualPct(loggedToday, targetValue, goal.direction);
    const isCompleted = completionPct >= 100;

    return {
      goal,
      subcategory: subcat,
      parentCategory: parentCat,
      loggedValue: loggedToday,
      targetValue,
      completionPct,
      isCompleted,
    };
  });

  // Compute Weekly Progress ONLY for weekly goals
  const weeklyProgressList: GoalItemProgress[] = weeklyGoals.map((goal) => {
    const subcat = categoryMap.get(goal.subcategory_id)!;
    const parentCat = subcat ? categoryMap.get(subcat.parent_id || '') || null : null;

    const loggedThisWeek = entries
      .filter(
        (e) =>
          e.subcategory_id === goal.subcategory_id &&
          !e.deleted_at &&
          new Date(e.occurred_at).getTime() >= startOfWeekTime
      )
      .reduce((sum, e) => sum + getEntryNumericValue(e), 0);

    const targetValue = goal.target_value;
    const completionPct = computeIndividualPct(loggedThisWeek, targetValue, goal.direction);
    const isCompleted = completionPct >= 100;

    return {
      goal,
      subcategory: subcat,
      parentCategory: parentCat,
      loggedValue: loggedThisWeek,
      targetValue,
      completionPct,
      isCompleted,
    };
  });

  // Compute Monthly Progress ONLY for monthly goals
  const monthlyProgressList: GoalItemProgress[] = monthlyGoals.map((goal) => {
    const subcat = categoryMap.get(goal.subcategory_id)!;
    const parentCat = subcat ? categoryMap.get(subcat.parent_id || '') || null : null;

    const loggedThisMonth = entries
      .filter(
        (e) =>
          e.subcategory_id === goal.subcategory_id &&
          !e.deleted_at &&
          new Date(e.occurred_at).getTime() >= startOfMonthTime
      )
      .reduce((sum, e) => sum + getEntryNumericValue(e), 0);

    const targetValue = goal.target_value;
    const completionPct = computeIndividualPct(loggedThisMonth, targetValue, goal.direction);
    const isCompleted = completionPct >= 100;

    return {
      goal,
      subcategory: subcat,
      parentCategory: parentCat,
      loggedValue: loggedThisMonth,
      targetValue,
      completionPct,
      isCompleted,
    };
  });

  // Calculate Overall Average Completion Percentage across goals
  const dailyAveragePct =
    dailyProgressList.length > 0
      ? Math.round(dailyProgressList.reduce((acc, curr) => acc + curr.completionPct, 0) / dailyProgressList.length)
      : 0;

  const weeklyAveragePct =
    weeklyProgressList.length > 0
      ? Math.round(weeklyProgressList.reduce((acc, curr) => acc + curr.completionPct, 0) / weeklyProgressList.length)
      : 0;

  const monthlyAveragePct =
    monthlyProgressList.length > 0
      ? Math.round(monthlyProgressList.reduce((acc, curr) => acc + curr.completionPct, 0) / monthlyProgressList.length)
      : 0;

  // Split Completed vs In-Progress/Due items for detailed lists
  const dailyCompletedItems = dailyProgressList.filter((p) => p.isCompleted);
  const dailyDueItems = dailyProgressList.filter((p) => !p.isCompleted);

  const weeklyCompletedItems = weeklyProgressList.filter((p) => p.isCompleted);
  const weeklyDueItems = weeklyProgressList.filter((p) => !p.isCompleted);

  const monthlyCompletedItems = monthlyProgressList.filter((p) => p.isCompleted);
  const monthlyDueItems = monthlyProgressList.filter((p) => !p.isCompleted);

  const hasAnyGoals = dailyGoals.length > 0 || weeklyGoals.length > 0 || monthlyGoals.length > 0;

  // SVG Donut Component
  const RenderDonutSVG = ({
    averagePct,
    totalCount,
    onSegmentClick,
  }: {
    averagePct: number;
    totalCount: number;
    onSegmentClick: (type: 'completed' | 'due') => void;
  }) => {
    if (totalCount === 0) {
      return (
        <div className="w-36 h-36 rounded-full border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400 font-bold text-center p-2">
          No Goals
        </div>
      );
    }

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const completedStroke = (averagePct / 100) * circumference;
    const dueStroke = circumference - completedStroke;

    return (
      <div className="relative w-40 h-40 flex items-center justify-center cursor-pointer">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Due / Remaining Segment (Red Background) */}
          {dueStroke > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#ef4444" // Rose Red
              strokeWidth="16"
              strokeDasharray={`${circumference}`}
              strokeDashoffset="0"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onSegmentClick('due')}
            />
          )}

          {/* Completed Segment (Green Foreground) */}
          {completedStroke > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#10b981" // Emerald Green
              strokeWidth="16"
              strokeDasharray={`${completedStroke} ${circumference}`}
              strokeDashoffset="0"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onSegmentClick('completed')}
            />
          )}
        </svg>

        {/* Center Text Badge */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center cursor-pointer"
          onClick={() => onSegmentClick('completed')}
        >
          <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
            {averagePct}%
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
            Avg Met
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <PieChart className="w-6 h-6 text-sky-600 dark:text-sky-400" /> Goal Performance (Average % Met)
        </h3>
        {hasAnyGoals && (
          <button
            onClick={() => shareGoalSummaryCard({
              daily: { items: dailyProgressList, averagePct: dailyAveragePct },
              weekly: { items: weeklyProgressList, averagePct: weeklyAveragePct },
              monthly: { items: monthlyProgressList, averagePct: monthlyAveragePct },
            })}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors tap-target"
            title="Share goal progress"
          >
            <Share2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {!hasAnyGoals ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <PieChart className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">No Goals Set</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Set daily, weekly, or monthly goals to see your performance donut charts!
          </p>
        </div>
      ) : (
        /* Donut Cards Grid (Only rendered if matching goals exist) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Daily Goals Donut (Only displayed if daily goals exist) */}
          {dailyGoals.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center space-y-4">
              <div className="text-center">
                <h4 className="font-bold text-lg text-slate-900 dark:text-white">Daily Goals</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Average % completion across daily goals</p>
              </div>

              <RenderDonutSVG
                averagePct={dailyAveragePct}
                totalCount={dailyProgressList.length}
                onSegmentClick={(type) =>
                  setSelectedSegment({
                    title: "Daily Goals",
                    type,
                    averagePct: dailyAveragePct,
                    items: type === 'completed' ? dailyCompletedItems : dailyDueItems,
                  })
                }
              />

              {/* Segment Legend Buttons */}
              <div className="flex justify-center gap-3 text-xs font-bold w-full pt-2">
                <button
                  onClick={() =>
                    setSelectedSegment({
                      title: "Daily Goals",
                      type: 'completed',
                      averagePct: dailyAveragePct,
                      items: dailyCompletedItems,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                >
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  Completed ({dailyCompletedItems.length})
                </button>

                <button
                  onClick={() =>
                    setSelectedSegment({
                      title: "Daily Goals",
                      type: 'due',
                      averagePct: dailyAveragePct,
                      items: dailyDueItems,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                >
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                  In Progress ({dailyDueItems.length})
                </button>
              </div>
            </div>
          )}

          {/* Weekly Goals Donut (Only displayed if weekly goals exist) */}
          {weeklyGoals.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center space-y-4">
              <div className="text-center">
                <h4 className="font-bold text-lg text-slate-900 dark:text-white">Weekly Goals</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Average % completion across weekly goals</p>
              </div>

              <RenderDonutSVG
                averagePct={weeklyAveragePct}
                totalCount={weeklyProgressList.length}
                onSegmentClick={(type) =>
                  setSelectedSegment({
                    title: "Weekly Goals",
                    type,
                    averagePct: weeklyAveragePct,
                    items: type === 'completed' ? weeklyCompletedItems : weeklyDueItems,
                  })
                }
              />

              {/* Segment Legend Buttons */}
              <div className="flex justify-center gap-3 text-xs font-bold w-full pt-2">
                <button
                  onClick={() =>
                    setSelectedSegment({
                      title: "Weekly Goals",
                      type: 'completed',
                      averagePct: weeklyAveragePct,
                      items: weeklyCompletedItems,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                >
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  Completed ({weeklyCompletedItems.length})
                </button>

                <button
                  onClick={() =>
                    setSelectedSegment({
                      title: "Weekly Goals",
                      type: 'due',
                      averagePct: weeklyAveragePct,
                      items: weeklyDueItems,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                >
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                  In Progress ({weeklyDueItems.length})
                </button>
              </div>
            </div>
          )}

          {/* Monthly Goals Donut (Only displayed if monthly goals exist) */}
          {monthlyGoals.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center space-y-4">
              <div className="text-center">
                <h4 className="font-bold text-lg text-slate-900 dark:text-white">Monthly Goals</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Average % completion across monthly goals</p>
              </div>

              <RenderDonutSVG
                averagePct={monthlyAveragePct}
                totalCount={monthlyProgressList.length}
                onSegmentClick={(type) =>
                  setSelectedSegment({
                    title: "Monthly Goals",
                    type,
                    averagePct: monthlyAveragePct,
                    items: type === 'completed' ? monthlyCompletedItems : monthlyDueItems,
                  })
                }
              />

              {/* Segment Legend Buttons */}
              <div className="flex justify-center gap-3 text-xs font-bold w-full pt-2">
                <button
                  onClick={() =>
                    setSelectedSegment({
                      title: "Monthly Goals",
                      type: 'completed',
                      averagePct: monthlyAveragePct,
                      items: monthlyCompletedItems,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                >
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  Completed ({monthlyCompletedItems.length})
                </button>

                <button
                  onClick={() =>
                    setSelectedSegment({
                      title: "Monthly Goals",
                      type: 'due',
                      averagePct: monthlyAveragePct,
                      items: monthlyDueItems,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                >
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                  In Progress ({monthlyDueItems.length})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Segment Breakdown Modal */}
      {selectedSegment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedSegment.title}</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      selectedSegment.type === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {selectedSegment.type === 'completed' ? 'Completed Goals' : 'In Progress / Due'}
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Detailed status breakdown ({selectedSegment.items.length} items)
                </p>
              </div>

              <button
                onClick={() => setSelectedSegment(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedSegment.items.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                No items in this category.
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedSegment.items.map((item) => (
                  <div
                    key={item.goal.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                        <IconRenderer
                          name={item.subcategory?.icon || item.parentCategory?.icon || 'Target'}
                          className="w-5 h-5"
                        />
                      </div>

                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.subcategory?.name || 'Goal Activity'}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500">
                          {item.parentCategory?.name || 'Category'} • Target:{' '}
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {item.targetValue} {item.subcategory?.value_schema?.unit || ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-extrabold flex items-center justify-end gap-1 ${
                          item.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {item.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        )}
                        <span>{item.completionPct}%</span>
                      </div>

                      <div className="text-[11px] font-medium text-slate-500">
                        Logged: <span className="font-bold">{item.loggedValue}</span> / {item.targetValue}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
