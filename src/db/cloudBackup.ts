import { db } from './index';
import { Category, Entry, Goal, MetaSettings } from '../types';

export interface MigrationBackupData {
  version: string;
  exported_at: string;
  app_name: string;
  data: {
    categories: Category[];
    entries: Entry[];
    goals: Goal[];
    settings?: MetaSettings;
  };
}

// Generate a full backup object of all local device data
export const generateMigrationBackup = async (): Promise<MigrationBackupData> => {
  const categories = await db.categories.toArray();
  const entries = await db.entries.toArray();
  const goals = await db.goals.toArray();
  const settingsRecord = await db.meta.get('settings');

  return {
    version: '1.2.0',
    exported_at: new Date().toISOString(),
    app_name: 'Notare',
    data: {
      categories,
      entries,
      goals,
      settings: settingsRecord?.value,
    },
  };
};

// Download migration backup file to device (.json)
export const exportMigrationFile = async () => {
  const backup = await generateMigrationBackup();
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `notare_migration_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Update last backup timestamp in local meta
  const settingsRecord = await db.meta.get('settings');
  if (settingsRecord) {
    await db.meta.put({
      key: 'settings',
      value: {
        ...settingsRecord.value,
        last_cloud_backup_at: new Date().toISOString(),
      },
    });
  }
};

// Import and restore migration backup data into local Dexie IndexedDB
export const importMigrationBackup = async (jsonString: string): Promise<{ success: boolean; message: string; count: { entries: number; categories: number; goals: number } }> => {
  try {
    const backup: MigrationBackupData = JSON.parse(jsonString);

    if (!backup.data || !Array.isArray(backup.data.categories) || !Array.isArray(backup.data.entries)) {
      throw new Error('Invalid backup file format. Missing categories or entries data.');
    }

    // Clear existing stores and restore
    await db.categories.clear();
    await db.entries.clear();
    await db.goals.clear();

    if (backup.data.categories.length > 0) {
      await db.categories.bulkPut(backup.data.categories);
    }
    if (backup.data.entries.length > 0) {
      await db.entries.bulkPut(backup.data.entries);
    }
    if (backup.data.goals && backup.data.goals.length > 0) {
      await db.goals.bulkPut(backup.data.goals);
    }
    const mergedSettings = {
      ...(backup.data.settings || {}),
      onboarding_completed: true,
      is_demo_mode: false,
      last_cloud_backup_at: new Date().toISOString(),
    };
    await db.meta.put({
      key: 'settings',
      value: mergedSettings,
    });

    return {
      success: true,
      message: 'Successfully migrated device data!',
      count: {
        categories: backup.data.categories.length,
        entries: backup.data.entries.length,
        goals: backup.data.goals?.length || 0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to restore migration backup file.',
      count: { entries: 0, categories: 0, goals: 0 },
    };
  }
};
