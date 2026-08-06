import React, { useState } from 'react';
import { Goal, Entry, Category } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { X, CheckCircle2, AlertCircle, PieChart } from 'lucide-react';

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

  // Compute Daily Progress for each Goal
  const dailyProgressList: GoalItemProgress[] = goals.map((goal) => {
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

  // Compute Weekly Progress for each Goal
  const weeklyProgressList: GoalItemProgress[] = goals.map((goal) => {
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

    // Weekly target value calculation
    const targetValue = goal.frequency === 'daily' ? goal.target_value * 7 : goal.target_value;
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

  // Calculate Overall Average Completion Percentage across all goals
  const dailyAveragePct =
    dailyProgressList.length > 0
      ? Math.round(dailyProgressList.reduce((acc, curr) => acc + curr.completionPct, 0) / dailyProgressList.length)
      : 0;

  const weeklyAveragePct =
    weeklyProgressList.length > 0
      ? Math.round(weeklyProgressList.reduce((acc, curr) => acc + curr.completionPct, 0) / weeklyProgressList.length)
      : 0;

  // Split Completed vs In-Progress/Due items for detailed lists
  const dailyCompletedItems = dailyProgressList.filter((p) => p.isCompleted);
  const dailyDueItems = dailyProgressList.filter((p) => !p.isCompleted);

  const weeklyCompletedItems = weeklyProgressList.filter((p) => p.isCompleted);
  const weeklyDueItems = weeklyProgressList.filter((p) => !p.isCompleted);

  // SVG Donut Component
  const RenderDonutSVG = ({
    averagePct,
    onSegmentClick,
  }: {
    averagePct: number;
    onSegmentClick: (type: 'completed' | 'due') => void;
  }) => {
    if (goals.length === 0) {
      return (
        <div className="w-36 h-36 rounded-full border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400 font-bold">
          No Goals Set
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
      </div>

      {/* Side-by-Side Donut Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Today's Goals Donut */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center space-y-4">
          <div className="text-center">
            <h4 className="font-bold text-lg text-slate-900 dark:text-white">Today's Goals</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average % completion across daily goals</p>
          </div>

          <RenderDonutSVG
            averagePct={dailyAveragePct}
            onSegmentClick={(type) =>
              setSelectedSegment({
                title: "Today's Goals",
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
                  title: "Today's Goals",
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
                  title: "Today's Goals",
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

        {/* Card 2: This Week's Goals Donut */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center space-y-4">
          <div className="text-center">
            <h4 className="font-bold text-lg text-slate-900 dark:text-white">This Week's Goals</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average % completion across weekly goals</p>
          </div>

          <RenderDonutSVG
            averagePct={weeklyAveragePct}
            onSegmentClick={(type) =>
              setSelectedSegment({
                title: "This Week's Goals",
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
                  title: "This Week's Goals",
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
                  title: "This Week's Goals",
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
      </div>

      {/* Segment Detail Pop-up Modal */}
      {selectedSegment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {selectedSegment.type === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-rose-500" />
                  )}
                  {selectedSegment.title} — {selectedSegment.type === 'completed' ? 'Completed Goals' : 'In Progress / Due Goals'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Overall Average Met: <strong className="text-sky-600 dark:text-sky-400">{selectedSegment.averagePct}%</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedSegment(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Goal Items with Individual Percent Completion */}
            <div className="space-y-3">
              {selectedSegment.items.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No items in this segment!
                </div>
              ) : (
                selectedSegment.items.map((item) => (
                  <div
                    key={item.goal.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                        <IconRenderer
                          name={item.subcategory?.icon || item.parentCategory?.icon || 'Activity'}
                          className="w-5 h-5"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-base text-slate-900 dark:text-white">
                          {item.subcategory?.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.parentCategory?.name} · {item.goal.direction === 'at_least' ? 'At Least (Encourage)' : 'At Most (Limit)'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {item.loggedValue} / {item.targetValue} {item.goal.target_type === 'time' ? 'mins' : 'x'}
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.isCompleted
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          }`}
                        >
                          {item.completionPct}% {item.isCompleted ? '✓ Met' : 'Progress'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedSegment(null)}
              className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
