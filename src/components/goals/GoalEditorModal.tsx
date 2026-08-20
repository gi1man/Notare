import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Category, Goal, GoalDirection, GoalFrequency, GoalTargetType } from '../../types';
import { Target, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface GoalEditorModalProps {
  subcategory: Category;
  onClose: () => void;
}

export const GoalEditorModal: React.FC<GoalEditorModalProps> = ({ subcategory, onClose }) => {
  const existingGoal = useLiveQuery(
    async () => {
      const goals = await db.goals.where('subcategory_id').equals(subcategory.id).toArray();
      return goals.find(g => !g.deleted_at);
    },
    [subcategory.id]
  );

  const [direction, setDirection] = useState<GoalDirection>('at_least');
  const [targetType, setTargetType] = useState<GoalTargetType>('time');
  const [targetValue, setTargetValue] = useState<string>('30');
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');

  useEffect(() => {
    if (existingGoal) {
      setDirection(existingGoal.direction);
      setTargetType(existingGoal.target_type);
      setTargetValue(String(existingGoal.target_value));
      setFrequency(existingGoal.frequency);
    } else if (subcategory.value_schema) {
      const type = subcategory.value_schema.type;
      if (type === 'duration') {
        setTargetType('time');
        setTargetValue('30');
      } else if (type === 'count') {
        setTargetType('count');
        setTargetValue('1');
      } else if (type === 'boolean') {
        setTargetType('binary');
        setTargetValue('1');
      }
    }
  }, [existingGoal, subcategory]);

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    const newGoal: Goal = {
      id: existingGoal?.id || `goal-${Date.now()}`,
      subcategory_id: subcategory.id,
      direction,
      target_type: targetType,
      target_value: parseFloat(targetValue) || 1,
      frequency,
      updated_at: new Date().toISOString(),
    };

    await db.goals.put(newGoal);
    onClose();
  };

  const handleDeleteGoal = async () => {
    if (existingGoal) {
      await db.goals.update(existingGoal.id, {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            Set Goal for {subcategory.name}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveGoal} className="space-y-4">
          {/* Goal Direction (Encourage vs Limit) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Goal Direction
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDirection('at_least')}
                className={`p-3.5 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-1 transition-all tap-target ${
                  direction === 'at_least'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" /> At Least (Encourage)
                </div>
                <span className="text-xs font-normal text-slate-500">e.g. Walk ≥ 30 mins</span>
              </button>

              <button
                type="button"
                onClick={() => setDirection('at_most')}
                className={`p-3.5 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-1 transition-all tap-target ${
                  direction === 'at_most'
                    ? 'border-amber-600 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4 text-amber-600" /> At Most (Limit Cap)
                </div>
                <span className="text-xs font-normal text-slate-500">e.g. TV ≤ 60 mins</span>
              </button>
            </div>
          </div>

          {/* Goal Target Frequency */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekly', 'monthly'] as GoalFrequency[]).map((freq) => (
                <button
                  type="button"
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold capitalize transition-all tap-target ${
                    frequency === freq
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Target Value & Unit */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Target Value ({targetType === 'time' ? 'Minutes' : targetType === 'count' ? 'Times' : 'Completion'})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                required
                min="1"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-full text-xl font-bold p-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 shrink-0">
                per {frequency === 'daily' ? 'day' : frequency === 'weekly' ? 'week' : 'month'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            {existingGoal && (
              <button
                type="button"
                onClick={handleDeleteGoal}
                className="py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-sm"
              >
                Remove Goal
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md"
            >
              Save Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
