import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Category } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { GoalEditorModal } from '../goals/GoalEditorModal';
import { GoalDonutCharts } from './GoalDonutCharts';
import { GoalOverviewSection } from './GoalOverviewSection';
import { GoalTrendSection } from './GoalTrendSection';
import { generateDummyData } from '../../db/dummyDataGenerator';
import { Flame, Trophy, Target, Sparkles } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const [editingGoalSub, setEditingGoalSub] = useState<Category | null>(null);
  const categories = useLiveQuery(() => db.categories.filter((c) => !c.deleted_at).toArray());
  const entries = useLiveQuery(() => db.entries.filter((e) => !e.deleted_at).toArray());
  const goals = useLiveQuery(() => db.goals.toArray());

  const categoryMap = new Map<string, Category>();
  categories?.forEach((c) => categoryMap.set(c.id, c));

  const goalMap = new Map<string, any>();
  goals?.forEach((g) => goalMap.set(g.subcategory_id, g));

  // Compute total entries count & entries this week
  const totalLogs = entries?.length || 0;

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const logsThisWeek = entries?.filter((e) => new Date(e.occurred_at) >= sevenDaysAgo).length || 0;

  const subcategories = categories?.filter((c) => c.parent_id !== null) || [];

  // Count logs per subcategory in the past 7 days
  const weeklySubcategoryCounts = new Map<string, number>();
  entries?.forEach((e) => {
    if (new Date(e.occurred_at) >= sevenDaysAgo) {
      const current = weeklySubcategoryCounts.get(e.subcategory_id) || 0;
      weeklySubcategoryCounts.set(e.subcategory_id, current + 1);
    }
  });

  // Filter subcategories to show ONLY those with activity in the past week
  const activeWeeklySubcategories = subcategories.filter(
    (sub) => (weeklySubcategoryCounts.get(sub.id) || 0) > 0
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Dashboard Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reporting Dashboard
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Trends, activity streaks, and data export
          </p>
        </div>

        <button
          onClick={async () => {
            await generateDummyData();
            alert('Loaded 14 days of sample entries and goals!');
          }}
          className="px-3.5 py-2 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl transition-all tap-target flex items-center gap-1.5 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          Load Sample Data
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card-parchment p-6 rounded-2xl shadow-sm space-y-2">
          <div className="text-xs font-bold text-notare-ink dark:text-notare-sage uppercase tracking-wider">
            Total Logged
          </div>
          <div className="text-3xl font-extrabold text-notare-charcoal dark:text-notare-parchment">
            {totalLogs}
          </div>
          <div className="text-xs text-slate-500">Activities recorded</div>
        </div>

        <div className="card-parchment p-6 rounded-2xl shadow-sm space-y-2">
          <div className="text-xs font-bold text-notare-sage dark:text-notare-sage uppercase tracking-wider">
            Past 7 Days
          </div>
          <div className="text-3xl font-extrabold text-notare-charcoal dark:text-notare-parchment">
            {logsThisWeek}
          </div>
          <div className="text-xs text-slate-500">Entries this week</div>
        </div>

        <div className="col-span-2 sm:col-span-1 card-parchment p-6 rounded-2xl shadow-sm space-y-2">
          <div className="text-xs font-bold text-notare-terracotta uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-4 h-4 fill-notare-terracotta text-notare-terracotta" /> Active Goals
          </div>
          <div className="text-3xl font-extrabold text-notare-charcoal dark:text-notare-parchment">
            {goals?.length || 0}
          </div>
          <div className="text-xs text-slate-500">Habits with goals set</div>
        </div>
      </div>

      {/* Interactive Goal Met Donut Charts */}
      <GoalDonutCharts
        entries={entries || []}
        goals={goals || []}
        categories={categories || []}
      />

      {/* Goal Overview Section (Subcategories on X-Axis, Percent Complete on Y-Axis) */}
      <GoalOverviewSection
        categories={categories || []}
        entries={entries || []}
        goals={goals || []}
      />

      {/* Goal Trend Section (Past 30 Days / 12 Weeks / 12 Months Trellised Bar Chart) */}
      <GoalTrendSection
        categories={categories || []}
        entries={entries || []}
        goals={goals || []}
      />

      {/* Activity Streaks & Summaries (Past 7 Days) */}
      <div className="card-parchment p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" /> Past Week Activity Summaries
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Only showing activities updated in the past 7 days
            </p>
          </div>
        </div>

        {activeWeeklySubcategories.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-slate-500 dark:text-slate-400 text-sm">
            No activities logged in the past week yet! Log an entry to see your weekly summary here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeWeeklySubcategories.map((sub) => {
              const count = weeklySubcategoryCounts.get(sub.id) || 0;
              const parentCat = categoryMap.get(sub.parent_id || '');
              const goal = goalMap.get(sub.id);

              return (
                <div
                  key={sub.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                        <IconRenderer name={sub.icon || parentCat?.icon || 'Activity'} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-base">
                          {sub.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {parentCat?.name}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400">
                        {count} {count === 1 ? 'log' : 'logs'}
                      </div>
                      <div className="text-xs text-slate-500">Past 7 days</div>
                    </div>
                  </div>

                  {/* Goal Status Badge & Edit Button */}
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2 text-xs">
                    {goal ? (
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-md ${
                          goal.direction === 'at_least'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        <Target className="w-3.5 h-3.5" />
                        Goal: {goal.direction === 'at_least' ? '≥' : '≤'} {goal.target_value} {goal.target_type === 'time' ? 'm' : 'x'}/{goal.frequency === 'daily' ? 'day' : goal.frequency === 'weekly' ? 'week' : 'month'}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium italic">No goal set</span>
                    )}

                    <button
                      onClick={() => setEditingGoalSub(sub)}
                      className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <Target className="w-3.5 h-3.5" />
                      {goal ? 'Edit Goal' : 'Set Goal'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Goal Editor Modal */}
      {editingGoalSub && (
        <GoalEditorModal
          subcategory={editingGoalSub}
          onClose={() => setEditingGoalSub(null)}
        />
      )}
    </div>
  );
};
