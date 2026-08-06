import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Category, Entry, MetaSettings, UndoToastState } from '../types';

export type ActiveTab = 'entry' | 'history' | 'dashboard' | 'insights' | 'settings';
export type EntryStep = 'category_picker' | 'subcategory_picker' | 'entry_form';

interface AppContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  entryStep: EntryStep;
  setEntryStep: (step: EntryStep) => void;
  selectedCategory: Category | null;
  setSelectedCategory: (cat: Category | null) => void;
  selectedSubcategory: Category | null;
  setSelectedSubcategory: (sub: Category | null) => void;
  undoToast: UndoToastState | null;
  triggerUndoToast: (entry: Entry, categoryName: string, subcategoryName: string) => void;
  executeUndo: () => Promise<void>;
  dismissUndoToast: () => void;
  settings: MetaSettings;
  updateSettings: (newSettings: Partial<MetaSettings>) => Promise<void>;
  resetToCategoryPicker: () => void;
  isDebounced: boolean;
  triggerDebounce: (durationMs?: number) => void;
}

const DEFAULT_SETTINGS: MetaSettings = {
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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('entry');
  const [entryStep, setEntryStep] = useState<EntryStep>('category_picker');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const [isDebounced, setIsDebounced] = useState<boolean>(false);

  // Live Query from Dexie for Meta Settings
  const metaItem = useLiveQuery(() => db.meta.get('settings'));
  const settings: MetaSettings = metaItem?.value || DEFAULT_SETTINGS;

  // Apply Theme & Font Scale HTML Body Classes
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Reset font classes
    root.classList.remove('font-scale-normal', 'font-scale-large', 'font-scale-extra-large');
    if (settings.font_scale !== 'auto') {
      root.classList.add(`font-scale-${settings.font_scale}`);
    }

    // High Accessibility Profile
    if (settings.high_a11y_profile) {
      body.classList.add('high-a11y');
    } else {
      body.classList.remove('high-a11y');
    }

    // Theme Mode
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.font_scale, settings.high_a11y_profile, settings.theme]);

  const updateSettings = async (newSettings: Partial<MetaSettings>) => {
    const updated = { ...settings, ...newSettings };
    await db.meta.put({ key: 'settings', value: updated });
  };

  const triggerDebounce = (durationMs = 1500) => {
    setIsDebounced(true);
    setTimeout(() => setIsDebounced(false), durationMs);
  };

  const triggerUndoToast = (entry: Entry, categoryName: string, subcategoryName: string) => {
    if (undoToast?.timeoutId) {
      clearTimeout(undoToast.timeoutId);
    }

    // Effective Undo Duration (10s if High A11y Profile enabled)
    const duration = settings.high_a11y_profile
      ? 10000
      : settings.undo_duration_ms || 5000;

    const timeoutId = setTimeout(() => {
      setUndoToast(null);
    }, duration);

    setUndoToast({
      id: entry.id,
      entry,
      categoryName,
      subcategoryName,
      timeoutId,
    });
  };

  const executeUndo = async () => {
    if (!undoToast) return;
    if (undoToast.timeoutId) clearTimeout(undoToast.timeoutId);

    // Delete entry from DB
    await db.entries.delete(undoToast.id);
    setUndoToast(null);
  };

  const dismissUndoToast = () => {
    if (undoToast?.timeoutId) clearTimeout(undoToast.timeoutId);
    setUndoToast(null);
  };

  const resetToCategoryPicker = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setEntryStep('category_picker');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        entryStep,
        setEntryStep,
        selectedCategory,
        setSelectedCategory,
        selectedSubcategory,
        setSelectedSubcategory,
        undoToast,
        triggerUndoToast,
        executeUndo,
        dismissUndoToast,
        settings,
        updateSettings,
        resetToCategoryPicker,
        isDebounced,
        triggerDebounce,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
