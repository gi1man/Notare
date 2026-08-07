import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useApp } from '../../context/AppContext';
import { Entry, Category } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { EditEntryModal } from './EditEntryModal';
import { Search, Trash2, Calendar, FileText, Mic, Edit3 } from 'lucide-react';

export const HistoryList: React.FC = () => {
  const { settings, triggerUndoToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Fetch all categories for lookup & filter pills
  const categories = useLiveQuery(
    () => db.categories.filter((c) => !c.deleted_at && (settings.is_demo_mode || !c.is_demo)).toArray(),
    [settings.is_demo_mode]
  );

  // Fetch entries sorted by occurred_at descending
  const entries = useLiveQuery(async () => {
    let list = await db.entries
      .filter((e) => !e.deleted_at && (settings.is_demo_mode || !e.is_demo))
      .toArray();

    return list.sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );
  }, [settings.is_demo_mode]);

  const categoryMap = new Map<string, Category>();
  categories?.forEach((c) => categoryMap.set(c.id, c));

  // Filter entries based on search query and category filter pill
  const filteredEntries = entries?.filter((entry) => {
    const subcat = categoryMap.get(entry.subcategory_id);
    const parentCat = subcat ? categoryMap.get(subcat.parent_id || '') : null;

    // Category filter
    if (selectedCatFilter !== 'all') {
      if (parentCat?.id !== selectedCatFilter && subcat?.id !== selectedCatFilter) {
        return false;
      }
    }

    // Substring Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const subName = subcat?.name.toLowerCase() || '';
      const parentName = parentCat?.name.toLowerCase() || '';
      const note = entry.note_text?.toLowerCase() || '';
      const transcript = entry.transcript?.toLowerCase() || '';

      return (
        subName.includes(q) ||
        parentName.includes(q) ||
        note.includes(q) ||
        transcript.includes(q)
      );
    }

    return true;
  });

  const handleDeleteEntry = async (entry: Entry) => {
    const subcat = categoryMap.get(entry.subcategory_id);
    const parentCat = subcat ? categoryMap.get(subcat.parent_id || '') : null;

    // Delete from DB
    await db.entries.delete(entry.id);

    // Trigger Undo toast
    triggerUndoToast(
      entry,
      parentCat?.name || 'Activity',
      subcat?.name || 'Item'
    );
  };

  const topCategories = categories?.filter((c) => c.parent_id === null) || [];

  const formatValueDisplay = (entry: Entry, subcat?: Category) => {
    if (entry.value === null || entry.value === undefined) return null;
    const schema = subcat?.value_schema;

    if (typeof entry.value === 'boolean') {
      return entry.value ? '✅ Yes' : '❌ No';
    }

    if (typeof entry.value === 'object' && 'value_1' in entry.value) {
      return `${entry.value.value_1} / ${entry.value.value_2} ${schema?.unit || ''}`;
    }

    if (typeof entry.value === 'number') {
      return `${entry.value} ${schema?.unit || schema?.label || ''}`;
    }

    return String(entry.value);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${timeStr}`;

    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr} at ${timeStr}`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header & Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Activity History
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Search and review your past activity logs
        </p>
      </div>

      {/* Top Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by keyword, note, or transcript..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-medium shadow-sm"
        />
      </div>

      {/* Category Filter Pills (Horizontal Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCatFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-all tap-target ${
            selectedCatFilter === 'all'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          All Activities
        </button>

        {topCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatFilter(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 flex items-center gap-2 transition-all tap-target ${
              selectedCatFilter === cat.id
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <IconRenderer name={cat.icon} className="w-4 h-4" />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Log Feed */}
      <div className="space-y-4">
        {filteredEntries?.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
              No entries found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {searchQuery ? 'Try adjusting your search query.' : 'Log an activity to see your history here!'}
            </p>
          </div>
        ) : (
          filteredEntries?.map((entry) => {
            const subcat = categoryMap.get(entry.subcategory_id);
            const parentCat = subcat ? categoryMap.get(subcat.parent_id || '') : null;
            const valueStr = formatValueDisplay(entry, subcat);

            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
              >
                {/* Entry Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                      <IconRenderer name={subcat?.icon || parentCat?.icon || 'Activity'} className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="font-bold text-lg text-slate-900 dark:text-white">
                        {subcat?.name || 'Activity'}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {parentCat?.name} · {formatDate(entry.occurred_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingEntry(entry)}
                      aria-label="Edit entry"
                      className="p-2 text-slate-400 hover:text-sky-600 transition-colors tap-target"
                      title="Edit entry"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleDeleteEntry(entry)}
                      aria-label="Delete entry"
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors tap-target"
                      title="Delete entry"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Value Badge */}
                {valueStr && (
                  <div className="inline-block px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-extrabold text-sm">
                    {valueStr}
                  </div>
                )}

                {/* Written Note Snippet */}
                {entry.note_text && (
                  <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p>{entry.note_text}</p>
                  </div>
                )}

                {/* Voice Transcript Snippet */}
                {entry.transcript && (
                  <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl italic border-l-4 border-sky-500">
                    <Mic className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    <p>"{entry.transcript}"</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          subcategory={categoryMap.get(editingEntry.subcategory_id)!}
          category={
            categoryMap.get(
              categoryMap.get(editingEntry.subcategory_id)?.parent_id || ''
            ) || null
          }
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
};
