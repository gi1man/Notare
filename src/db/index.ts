import Dexie, { Table } from 'dexie';
import { Category, Entry, Goal } from '../types';

export class NotareDB extends Dexie {
  categories!: Table<Category, string>;
  entries!: Table<Entry, string>;
  goals!: Table<Goal, string>;
  meta!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('NotareDB');

    this.version(1).stores({
      categories: 'id, parent_id, name, pinned, sort_order, updated_at, deleted_at',
      entries: 'id, subcategory_id, occurred_at, transcript_status, updated_at, deleted_at',
      goals: 'id, subcategory_id, direction, target_type, frequency, updated_at',
      meta: 'key',
    });
  }

  async initializeDefaults() {
    const settings = await this.meta.get('settings');
    if (!settings) {
      await this.meta.put({
        key: 'settings',
        value: {
          onboarding_completed: false,
          telemetry_opt_in: false,
          theme: 'light',
          font_scale: 'normal',
          high_a11y_profile: false,
          undo_duration_ms: 5000,
          voice_language: 'en-US',
          mic_help_dismissed_count: 0,
          mic_help_do_not_show: false,
          ios_a2hs_dismissed: false,
        },
      });
    }
  }
}

export const db = new NotareDB();

export const requestPersistentStorage = async (): Promise<boolean> => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      const granted = await navigator.storage.persist();
      return granted;
    }
    return true;
  }
  return false;
};

// Auto-initialize default categories and meta on first load, and request persistent storage
db.on('ready', async () => {
  await db.initializeDefaults();
  await requestPersistentStorage();
});
