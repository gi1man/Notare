import { db } from './index';
import { Entry, Goal } from '../types';

export const generateDummyData = async () => {
  const now = new Date();

  // Clear existing demo entries to ensure fresh state
  await db.entries.clear();
  await db.goals.clear();

  // Seed default goals
  const defaultGoals: Goal[] = [
    {
      id: 'goal-walking-demo',
      subcategory_id: 'sub-walking',
      direction: 'at_least',
      target_type: 'time',
      target_value: 30,
      frequency: 'daily',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'goal-sleep-demo',
      subcategory_id: 'sub-sleep',
      direction: 'at_least',
      target_type: 'time',
      target_value: 7.5,
      frequency: 'daily',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'goal-reading-demo',
      subcategory_id: 'sub-reading',
      direction: 'at_least',
      target_type: 'time',
      target_value: 30,
      frequency: 'daily',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'goal-tv-demo',
      subcategory_id: 'sub-tv',
      direction: 'at_most',
      target_type: 'time',
      target_value: 60,
      frequency: 'daily',
      updated_at: new Date().toISOString(),
    },
  ];

  await db.goals.bulkPut(defaultGoals);

  const newEntries: Entry[] = [];

  // Generate 14 days of realistic entries (from 13 days ago up to today)
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    // Construct local date at 00:00:00
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);

    // Walking (Daily) — 35 mins
    const walkTime = new Date(d);
    walkTime.setHours(8, 30, 0, 0);
    newEntries.push({
      id: `demo-walk-${dayOffset}`,
      subcategory_id: 'sub-walking',
      occurred_at: walkTime.toISOString(),
      value: 35, // Exceeds 30m goal -> Completed!
      note_text: dayOffset % 2 === 0 ? 'Brisk morning walk around the neighborhood' : 'Park trail walk with friend',
      transcript_status: 'none',
      updated_at: walkTime.toISOString(),
    });

    // Sleep Time (Daily) — 8.0 hrs
    const sleepTime = new Date(d);
    sleepTime.setHours(7, 0, 0, 0);
    newEntries.push({
      id: `demo-sleep-${dayOffset}`,
      subcategory_id: 'sub-sleep',
      occurred_at: sleepTime.toISOString(),
      value: 8.0, // Exceeds 7.5h goal -> Completed!
      note_text: 'Restful 8 hours sleep',
      transcript_status: 'none',
      updated_at: sleepTime.toISOString(),
    });

    // Water Intake (Daily)
    const waterTime = new Date(d);
    waterTime.setHours(12, 0, 0, 0);
    newEntries.push({
      id: `demo-water-${dayOffset}`,
      subcategory_id: 'sub-water',
      occurred_at: waterTime.toISOString(),
      value: 8,
      transcript_status: 'none',
      updated_at: waterTime.toISOString(),
    });

    // Reading (Daily) — 40 mins
    const readingTime = new Date(d);
    readingTime.setHours(14, 0, 0, 0);
    newEntries.push({
      id: `demo-reading-${dayOffset}`,
      subcategory_id: 'sub-reading',
      occurred_at: readingTime.toISOString(),
      value: 40, // Exceeds 30m goal -> Completed!
      note_text: 'Finished chapter on Renaissance history',
      transcript: dayOffset % 3 === 0 ? 'Loved the details about Florence architecture.' : undefined,
      transcript_status: dayOffset % 3 === 0 ? 'done' : 'none',
      updated_at: readingTime.toISOString(),
    });

    // Watching TV (Daily) — 45 mins
    const tvTime = new Date(d);
    tvTime.setHours(16, 0, 0, 0);
    newEntries.push({
      id: `demo-tv-${dayOffset}`,
      subcategory_id: 'sub-tv',
      occurred_at: tvTime.toISOString(),
      value: 45, // Under 60m limit cap -> Completed!
      note_text: 'Nature documentary episode',
      transcript_status: 'none',
      updated_at: tvTime.toISOString(),
    });

    // Resistance Training (Mon, Wed, Fri)
    if (d.getDay() === 1 || d.getDay() === 3 || d.getDay() === 5) {
      const workoutTime = new Date(d);
      workoutTime.setHours(10, 30, 0, 0);
      newEntries.push({
        id: `demo-resistance-${dayOffset}`,
        subcategory_id: 'sub-resistance',
        occurred_at: workoutTime.toISOString(),
        value: 45,
        note_text: 'Upper body and core exercises',
        transcript_status: 'none',
        updated_at: workoutTime.toISOString(),
      });
    }

    // Gardening & Yard (Sat, Sun)
    if (d.getDay() === 6 || d.getDay() === 0) {
      const gardenTime = new Date(d);
      gardenTime.setHours(11, 0, 0, 0);
      newEntries.push({
        id: `demo-gardening-${dayOffset}`,
        subcategory_id: 'sub-gardening',
        occurred_at: gardenTime.toISOString(),
        value: 60,
        note_text: 'Pruned rose bushes and potted tomato plants',
        transcript_status: 'none',
        updated_at: gardenTime.toISOString(),
      });
    }
  }

  // Bulk add entries to Dexie
  await db.entries.bulkPut(newEntries);
};
