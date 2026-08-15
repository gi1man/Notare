import { db } from './index';

// Export full backup as JSON file (all tables)
export const exportDataJSON = async () => {
  const entries = await db.entries.toArray();
  const categories = await db.categories.toArray();
  const goals = await db.goals.toArray();
  const settings = await db.meta.get('settings');

  const fullBackup = {
    exported_at: new Date().toISOString(),
    version: '2.1.0',
    categories,
    goals,
    entries,
    settings: settings?.value || null,
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `notare_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

// Export CSV file
export const exportDataCSV = async () => {
  const entries = await db.entries.toArray();
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const headers = ['id', 'category', 'subcategory', 'occurred_at', 'value', 'note_text', 'transcript'];
  const rows = entries.map((e) => {
    const sub = categoryMap.get(e.subcategory_id);
    const parent = sub ? categoryMap.get(sub.parent_id || '') : null;
    return [
      e.id,
      `"${parent?.name || ''}"`,
      `"${sub?.name || ''}"`,
      `"${e.occurred_at}"`,
      `"${JSON.stringify(e.value || '')}"`,
      `"${(e.note_text || '').replace(/"/g, '""')}"`,
      `"${(e.transcript || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', encodeURI(csvContent));
  downloadAnchor.setAttribute('download', `notare_entries_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};
