import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { Category, Entry } from '../types';

describe('Notare IndexedDB Store', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.categories.clear();
    await db.goals.clear();
    await db.meta.clear();
    await db.initializeDefaults();
  });

  it('initializes clean with 0 categories by default', async () => {
    const categories = await db.categories.toArray();
    expect(categories.length).toBe(0);
  });

  it('adds and retrieves an entry cleanly', async () => {
    const newEntry: Entry = {
      id: 'test-entry-1',
      subcategory_id: 'sub-walking',
      occurred_at: new Date().toISOString(),
      value: 30, // 30 mins
      note_text: 'Morning brisk walk',
      transcript_status: 'none',
      updated_at: new Date().toISOString(),
    };

    await db.entries.add(newEntry);
    const retrieved = await db.entries.get('test-entry-1');

    expect(retrieved).toBeDefined();
    expect(retrieved?.value).toBe(30);
    expect(retrieved?.note_text).toBe('Morning brisk walk');
  });

  it('supports dual_number values for blood pressure', async () => {
    const bpEntry: Entry = {
      id: 'test-bp-1',
      subcategory_id: 'sub-bp',
      occurred_at: new Date().toISOString(),
      value: { value_1: 120, value_2: 80 },
      transcript_status: 'none',
      updated_at: new Date().toISOString(),
    };

    await db.entries.add(bpEntry);
    const retrieved = await db.entries.get('test-bp-1');

    expect(retrieved?.value).toEqual({ value_1: 120, value_2: 80 });
  });

  it('soft-deletes categories without losing past data', async () => {
    const testCat: Category = {
      id: 'sub-walking',
      parent_id: 'cat-fitness',
      name: 'Walking',
      icon: 'Footprints',
      sort_order: 1,
      updated_at: new Date().toISOString(),
    };
    await db.categories.put(testCat);

    const cat = await db.categories.get('sub-walking');
    expect(cat).toBeDefined();

    // Soft delete
    await db.categories.update('sub-walking', { deleted_at: new Date().toISOString() });
    const updatedCat = await db.categories.get('sub-walking');
    expect(updatedCat?.deleted_at).toBeDefined();
  });

  it('stores and retrieves encourage and limit goals', async () => {
    await db.goals.add({
      id: 'goal-walking-1',
      subcategory_id: 'sub-walking',
      direction: 'at_least',
      target_type: 'time',
      target_value: 30,
      frequency: 'daily',
      updated_at: new Date().toISOString(),
    });

    const goal = await db.goals.where('subcategory_id').equals('sub-walking').first();
    expect(goal).toBeDefined();
    expect(goal?.direction).toBe('at_least');
    expect(goal?.target_value).toBe(30);
  });

  it('updates an existing logged entry cleanly', async () => {
    const entry: Entry = {
      id: 'entry-update-test',
      subcategory_id: 'sub-walking',
      occurred_at: new Date().toISOString(),
      value: 15,
      note_text: 'Short walk',
      transcript_status: 'none',
      updated_at: new Date().toISOString(),
    };

    await db.entries.add(entry);

    // Edit entry
    const updated: Entry = {
      ...entry,
      value: 45,
      note_text: 'Extended brisk walk',
    };
    await db.entries.put(updated);

    const result = await db.entries.get('entry-update-test');
    expect(result?.value).toBe(45);
    expect(result?.note_text).toBe('Extended brisk walk');
  });

  it('moves a subcategory item to a different parent category', async () => {
    const testSub: Category = {
      id: 'sub-sailing',
      parent_id: 'cat-life',
      name: 'Sailing',
      icon: 'Anchor',
      sort_order: 1,
      updated_at: new Date().toISOString(),
    };
    await db.categories.put(testSub);

    const sub = await db.categories.get('sub-sailing');
    expect(sub?.parent_id).toBe('cat-life');

    // Move Sailing from Social & Life to Fitness
    await db.categories.update('sub-sailing', {
      parent_id: 'cat-fitness',
      updated_at: new Date().toISOString(),
    });

    const movedSub = await db.categories.get('sub-sailing');
    expect(movedSub?.parent_id).toBe('cat-fitness');
  });
});
