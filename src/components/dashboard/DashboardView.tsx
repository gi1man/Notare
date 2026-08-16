import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Category } from '../../types';
import { GoalEditorModal } from '../goals/GoalEditorModal';
import { GoalDonutCharts } from './GoalDonutCharts';
import { GroupedGoalPerformanceChart } from './GroupedGoalPerformanceChart';
import { generateDummyData } from '../../db/dummyDataGenerator';
import { Flame, Sparkles } from 'lucide-react';

import { useApp } from '../../context/AppContext';

export const DashboardView: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [editingGoalSub, setEditingGoalSub] = useState<Category | null>(null);

  const categories = useLiveQuery(
    () => db.categories.filter((c) => !c.deleted_at && (settings.is_demo_mode || !c.is_demo)).toArray(),
    [settings.is_demo_mode]
  );
  const entries = useLiveQuery(
    () => db.entries.filter((e) => !e.deleted_at && (settings.is_demo_mode || !e.is_demo)).toArray(),
    [settings.is_demo_mode]
  );
  const goals = useLiveQuery(
    () => db.goals.filter((g) => (settings.is_demo_mode || !g.is_demo)).toArray(),
    [settings.is_demo_mode]
  );

  const { totalLogs, logsThisWeek } = useMemo(() => {
    const total = entries?.length || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekLogs = entries?.filter((e) => new Date(e.occurred_at) >= sevenDaysAgo).length || 0;

    return {
      totalLogs: total,
      logsThisWeek: weekLogs,
    };
  }, [entries]);

  // Loading skeleton while Dexie queries resolve
  if (!categories || !entries || !goals) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      </div>
    );
  }

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
          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
            build v{typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : '2.1.0'} • {typeof __BUILD_DATE__ !== 'undefined' ? new Date(__BUILD_DATE__).toLocaleDateString() : new Date().toLocaleDateString()}
          </p>
        </div>

        <button
          onClick={async () => {
            await generateDummyData();
            await updateSettings({ is_demo_mode: true });
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

      {/* 3-Level Grouped Goal Performance Breakdown Chart */}
      <GroupedGoalPerformanceChart
        goals={goals || []}
        entries={entries || []}
        categories={categories || []}
      />



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
