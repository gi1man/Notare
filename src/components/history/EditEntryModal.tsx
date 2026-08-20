import React, { useState } from 'react';
import { db } from '../../db';
import { syncEntryToCloud } from '../../db/firestoreSync';
import { Entry, Category, DualNumberValue } from '../../types';
import { Edit3, X, Save } from 'lucide-react';

interface EditEntryModalProps {
  entry: Entry;
  subcategory: Category;
  category: Category | null;
  onClose: () => void;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
  entry,
  subcategory,
  category,
  onClose,
}) => {
  const schema = subcategory.value_schema;

  // Initialize state from existing entry values
  const [noteText, setNoteText] = useState<string>(entry.note_text || '');
  const [transcriptText, setTranscriptText] = useState<string>(entry.transcript || '');
  const [numValue, setNumValue] = useState<string>(
    typeof entry.value === 'number' ? String(entry.value) : ''
  );
  const [boolValue, setBoolValue] = useState<boolean>(
    typeof entry.value === 'boolean' ? entry.value : true
  );

  const initialDual =
    typeof entry.value === 'object' && entry.value !== null && 'value_1' in entry.value
      ? (entry.value as DualNumberValue)
      : { value_1: 120, value_2: 80 };

  const [dual1, setDual1] = useState<string>(String(initialDual.value_1));
  const [dual2, setDual2] = useState<string>(String(initialDual.value_2));

  // Date and Time picker format (YYYY-MM-THH:mm)
  const formatForDateTimeInput = (isoString: string) => {
    const d = new Date(isoString);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [dateTimeStr, setDateTimeStr] = useState<string>(
    formatForDateTimeInput(entry.occurred_at)
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    let updatedValue: any = entry.value;
    if (schema) {
      if (schema.type === 'duration' || schema.type === 'count' || schema.type === 'decimal' || schema.type === 'rating') {
        updatedValue = parseFloat(numValue) || 0;
      } else if (schema.type === 'boolean') {
        updatedValue = boolValue;
      } else if (schema.type === 'dual_number') {
        updatedValue = {
          value_1: parseFloat(dual1) || 0,
          value_2: parseFloat(dual2) || 0,
        };
      }
    }

    const updatedEntry: Entry = {
      ...entry,
      occurred_at: new Date(dateTimeStr).toISOString(),
      value: updatedValue,
      note_text: noteText.trim() || undefined,
      transcript: transcriptText.trim() || undefined,
      updated_at: new Date().toISOString(),
    };

    await db.entries.put(updatedEntry);
    try {
      await syncEntryToCloud(updatedEntry);
    } catch (err) {
      console.warn('Edit sync queued offline:', err);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div>
            {category && (
              <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase">
                {category.name}
              </div>
            )}
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              Edit {subcategory.name} Log
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Timestamp Editor */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Date & Time Logged
            </label>
            <input
              type="datetime-local"
              required
              value={dateTimeStr}
              onChange={(e) => setDateTimeStr(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Dynamic Value Input */}
          {schema && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Value {schema.unit ? `(${schema.unit})` : ''}
              </label>

              {(schema.type === 'duration' || schema.type === 'count' || schema.type === 'decimal' || schema.type === 'rating') && (
                <input
                  type="number"
                  step={schema.type === 'decimal' ? '0.1' : '1'}
                  required
                  value={numValue}
                  onChange={(e) => setNumValue(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-lg"
                />
              )}

              {schema.type === 'boolean' && (
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setBoolValue(true)}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
                      boolValue ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoolValue(false)}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
                      !boolValue ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    No
                  </button>
                </div>
              )}

              {schema.type === 'dual_number' && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={dual1}
                    onChange={(e) => setDual1(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  />
                  <input
                    type="number"
                    value={dual2}
                    onChange={(e) => setDual2(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              )}
            </div>
          )}

          {/* Note Text */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Written Note
            </label>
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Transcript Text */}
          {entry.transcript !== undefined && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                Raw Voice Transcript
                <span className="text-xs font-normal text-slate-500">Auto-generated</span>
              </label>
              <textarea
                rows={2}
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-medium text-sm italic"
                placeholder="What was actually spoken..."
              />
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
