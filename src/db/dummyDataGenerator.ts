import { db } from './index';
import { Entry, Goal } from '../types';
import { STARTER_CATEGORIES } from './starterData';

export const generateDummyData = async () => {
  const now = new Date();

  // Clear only existing DEMO entries & goals (preserve real user data)
  await db.entries.where('is_demo').equals(1).delete().catch(() =>
    db.entries.filter((e) => e.is_demo === true).delete()
  );
  await db.goals.filter((g) => g.is_demo === true).delete();

  // 1. Ensure starter categories are loaded, but preserve them as permanent (non-demo) data
  // Also only put if they don't exist, so we don't overwrite user edits to starter categories.
  for (const cat of STARTER_CATEGORIES) {
    const existing = await db.categories.get(cat.id);
    if (!existing) {
      await db.categories.put({
        ...cat,
        deleted_at: null,
      });
    }
  }

  // 2. Seed default goals across Daily, Weekly, and Monthly frequencies with is_demo: true
  const defaultGoals: Goal[] = [
    {
      id: 'goal-walking-demo',
      subcategory_id: 'sub-walking',
      direction: 'at_least',
      target_type: 'time',
      target_value: 30,
      frequency: 'daily',
      updated_at: new Date().toISOString(),
      is_demo: true,
    },
    {
      id: 'goal-water-demo',
      subcategory_id: 'sub-water',
      direction: 'at_least',
      target_type: 'count',
      target_value: 8,
      frequency: 'daily',
      updated_at: new Date().toISOString(),
      is_demo: true,
    },
    {
      id: 'goal-resistance-demo',
      subcategory_id: 'sub-resistance',
      direction: 'at_least',
      target_type: 'count',
      target_value: 3,
      frequency: 'weekly',
      updated_at: new Date().toISOString(),
      is_demo: true,
    },
    {
      id: 'goal-gardening-demo',
      subcategory_id: 'sub-gardening',
      direction: 'at_least',
      target_type: 'time',
      target_value: 120,
      frequency: 'weekly',
      updated_at: new Date().toISOString(),
      is_demo: true,
    },
    {
      id: 'goal-reading-demo',
      subcategory_id: 'sub-reading',
      direction: 'at_least',
      target_type: 'time',
      target_value: 300,
      frequency: 'monthly',
      updated_at: new Date().toISOString(),
      is_demo: true,
    },
    {
      id: 'goal-sailing-demo',
      subcategory_id: 'sub-sailing',
      direction: 'at_least',
      target_type: 'count',
      target_value: 3,
      frequency: 'monthly',
      updated_at: new Date().toISOString(),
      is_demo: true,
    },
  ];

  await db.goals.bulkPut(defaultGoals);

  // 3. Generate 14 days of entries with is_demo: true
  const newEntries: Entry[] = [];

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);

    // Walking (Daily Goal: 30m) — Logged 35m today -> Completed!
    const walkTime = new Date(d);
    walkTime.setHours(8, 30, 0, 0);
    newEntries.push({
      id: `demo-walk-${dayOffset}`,
      subcategory_id: 'sub-walking',
      occurred_at: walkTime.toISOString(),
      value: 35,
      note_text: dayOffset % 2 === 0 ? 'Brisk morning walk around the neighborhood' : 'Park trail walk with friend',
      transcript_status: 'none',
      updated_at: walkTime.toISOString(),
      is_demo: true,
    });

    // Water Intake (Daily Goal: 8 glasses)
    const waterTime = new Date(d);
    waterTime.setHours(12, 0, 0, 0);
    newEntries.push({
      id: `demo-water-${dayOffset}`,
      subcategory_id: 'sub-water',
      occurred_at: waterTime.toISOString(),
      value: dayOffset === 0 ? 4 : 8,
      transcript_status: 'none',
      updated_at: waterTime.toISOString(),
      is_demo: true,
    });

    // Book Reading (Monthly Goal: 300m)
    if (dayOffset % 2 === 0) {
      const readingTime = new Date(d);
      readingTime.setHours(14, 0, 0, 0);
      newEntries.push({
        id: `demo-reading-${dayOffset}`,
        subcategory_id: 'sub-reading',
        occurred_at: readingTime.toISOString(),
        value: 40,
        note_text: 'Reading history and literature',
        transcript_status: 'none',
        updated_at: readingTime.toISOString(),
        is_demo: true,
      });
    }

    // Resistance Training (Weekly Goal: 3 count)
    if (d.getDay() === 1 || d.getDay() === 3 || d.getDay() === 5) {
      const workoutTime = new Date(d);
      workoutTime.setHours(10, 30, 0, 0);
      newEntries.push({
        id: `demo-resistance-${dayOffset}`,
        subcategory_id: 'sub-resistance',
        occurred_at: workoutTime.toISOString(),
        value: 1,
        note_text: 'Upper body & core exercises',
        transcript_status: 'none',
        updated_at: workoutTime.toISOString(),
        is_demo: true,
      });
    }

    // Gardening & Yard (Weekly Goal: 120m)
    if (dayOffset === 2) {
      const gardenTime = new Date(d);
      gardenTime.setHours(11, 0, 0, 0);
      newEntries.push({
        id: `demo-gardening-${dayOffset}`,
        subcategory_id: 'sub-gardening',
        occurred_at: gardenTime.toISOString(),
        value: 60,
        note_text: 'Pruned rose bushes',
        transcript_status: 'none',
        updated_at: gardenTime.toISOString(),
        is_demo: true,
      });
    }

    // Sailing (Monthly Goal: 3 count)
    if (dayOffset === 8) {
      const sailTime = new Date(d);
      sailTime.setHours(15, 0, 0, 0);
      newEntries.push({
        id: `demo-sailing-${dayOffset}`,
        subcategory_id: 'sub-sailing',
        occurred_at: sailTime.toISOString(),
        value: 1,
        note_text: 'Afternoon coastal sailing trip',
        transcript_status: 'none',
        updated_at: sailTime.toISOString(),
        is_demo: true,
      });
    }
  }

  // Bulk add entries to Dexie
  await db.entries.bulkPut(newEntries);

  // Set is_demo_mode: true in settings
  const existingSettings = await db.meta.get('settings');
  if (existingSettings) {
    await db.meta.put({
      key: 'settings',
      value: { ...existingSettings.value, is_demo_mode: true },
    });
  }
};

/**
 * Helper to exit demo mode:
 * Clears demo entries and demo goals from IndexedDB while preserving user-created categories and user entries!
 */
export const clearDemoData = async () => {
  // Delete all demo entries
  const allEntries = await db.entries.toArray();
  const demoEntryIds = allEntries.filter((e) => e.is_demo).map((e) => e.id);
  if (demoEntryIds.length > 0) {
    await db.entries.bulkDelete(demoEntryIds);
  }

  // Delete all demo goals
  const allGoals = await db.goals.toArray();
  const demoGoalIds = allGoals.filter((g) => g.is_demo).map((g) => g.id);
  if (demoGoalIds.length > 0) {
    await db.goals.bulkDelete(demoGoalIds);
  }

  // Delete all demo categories
  const allCategories = await db.categories.toArray();
  const demoCatIds = allCategories.filter((c) => c.is_demo).map((c) => c.id);
  if (demoCatIds.length > 0) {
    await db.categories.bulkDelete(demoCatIds);
  }

  // Turn off is_demo_mode flag
  const existingSettings = await db.meta.get('settings');
  if (existingSettings) {
    await db.meta.put({
      key: 'settings',
      value: { ...existingSettings.value, is_demo_mode: false },
    });
  }
};
