export type ValueSchemaType = 'duration' | 'count' | 'rating' | 'boolean' | 'decimal' | 'dual_number';

export interface ValueSchema {
  type: ValueSchemaType;
  label?: string;
  max?: number;
  unit?: string;
  dual_labels?: [string, string]; // e.g. ["Systolic", "Diastolic"]
}

export interface Category {
  id: string;
  parent_id: string | null; // null for top-level category, string for subcategory
  name: string;
  icon: string;
  value_schema?: ValueSchema | null;
  pinned?: boolean;
  sort_order: number;
  updated_at: string;
  deleted_at?: string | null;
  is_demo?: boolean;
}

export type DualNumberValue = {
  value_1: number;
  value_2: number;
};

export type EntryValue = number | boolean | DualNumberValue | null;

export type TranscriptStatus = 'none' | 'pending' | 'done' | 'failed';

export interface Entry {
  id: string;
  subcategory_id: string;
  occurred_at: string; // ISO string
  value?: EntryValue;
  note_text?: string;
  transcript?: string;
  transcript_status: TranscriptStatus;
  updated_at: string;
  deleted_at?: string | null;
  is_demo?: boolean;
}

export type GoalDirection = 'at_least' | 'at_most';
export type GoalTargetType = 'binary' | 'time' | 'count';
export type GoalFrequency = 'daily' | 'weekly' | 'monthly';

export interface Goal {
  id: string;
  subcategory_id: string;
  direction: GoalDirection;
  target_type: GoalTargetType;
  target_value: number;
  frequency: GoalFrequency;
  updated_at: string;
  is_demo?: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'auto';
export type FontScaleOption = 'auto' | 'normal' | 'large' | 'extra-large';

export interface MetaSettings {
  onboarding_completed: boolean;
  telemetry_opt_in: boolean;
  theme: ThemeMode;
  font_scale: FontScaleOption;
  high_a11y_profile: boolean;
  undo_duration_ms: number; // default 5000
  voice_language: string; // default "en-US"
  mic_help_dismissed_count: number;
  mic_help_do_not_show: boolean;
  ios_a2hs_dismissed: boolean;
  last_cloud_backup_at?: string;
  is_demo_mode?: boolean;
}

export interface UndoToastState {
  id: string;
  entry: Entry;
  categoryName: string;
  subcategoryName: string;
  timeoutId: ReturnType<typeof setTimeout> | null;
}
