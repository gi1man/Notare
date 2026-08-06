import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../db';
import { Entry, DualNumberValue } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { ArrowLeft, Mic, MicOff, Check, Star, Save, Calendar } from 'lucide-react';

export const EntryForm: React.FC = () => {
  const {
    selectedCategory,
    selectedSubcategory,
    setEntryStep,
    triggerUndoToast,
    resetToCategoryPicker,
    isDebounced,
    triggerDebounce,
    settings,
  } = useApp();

  const datetimeRef = useRef<HTMLInputElement>(null);

  // Helper to format local Date into YYYY-MM-DDTHH:mm for datetime-local input
  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Pre-filled with current datetime by default
  const [customDatetime, setCustomDatetime] = useState<string>(toLocalISOString(new Date()));

  // Input states depending on schema
  const [numValue, setNumValue] = useState<string>('');
  const [boolValue, setBoolValue] = useState<boolean>(true);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [dualValue1, setDualValue1] = useState<string>('');
  const [dualValue2, setDualValue2] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');

  // Voice note state (30-second limit)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState<number>(30);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [showMicHelp, setShowMicHelp] = useState<boolean>(false);

  // Set default initial value based on schema type
  useEffect(() => {
    if (!selectedSubcategory?.value_schema) return;
    const type = selectedSubcategory.value_schema.type;
    if (type === 'duration') setNumValue('30');
    if (type === 'count') setNumValue('1');
    if (type === 'decimal') setNumValue('150.0');
    if (type === 'dual_number') {
      setDualValue1('120');
      setDualValue2('80');
    }
  }, [selectedSubcategory]);

  // Voice Recording 30-Second Countdown Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isRecording && recordSecondsLeft > 0) {
      timer = setInterval(() => {
        setRecordSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRecording && recordSecondsLeft === 0) {
      // 30-Second Limit reached! Automatically stop recording
      setIsRecording(false);
      setTranscriptText((prev) => prev + (prev ? ' ' : '') + '[Voice note recorded]');
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording, recordSecondsLeft]);

  // Web Speech API Voice Dictation Simulation / Trigger
  const handleToggleRecord = () => {
    if (!isRecording) {
      // Feature detect Web Speech API
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        if (!settings.mic_help_do_not_show) {
          setShowMicHelp(true);
        }
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = settings.voice_language || 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscriptText(currentTranscript);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          if (!settings.mic_help_do_not_show) {
            setShowMicHelp(true);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        setIsRecording(true);
        setRecordSecondsLeft(30);
      } catch {
        setIsRecording(false);
        if (!settings.mic_help_do_not_show) {
          setShowMicHelp(true);
        }
      }
    } else {
      setIsRecording(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubcategory || isDebounced) return;
    triggerDebounce(1500);

    // Calculate occurred_at date
    const occurredAt = customDatetime ? new Date(customDatetime) : new Date();

    // Determine value payload
    let parsedValue: any = null;
    const schema = selectedSubcategory.value_schema;
    if (schema) {
      if (schema.type === 'duration' || schema.type === 'count' || schema.type === 'decimal') {
        parsedValue = parseFloat(numValue) || 0;
      } else if (schema.type === 'boolean') {
        parsedValue = boolValue;
      } else if (schema.type === 'rating') {
        parsedValue = ratingValue;
      } else if (schema.type === 'dual_number') {
        const dual: DualNumberValue = {
          value_1: parseFloat(dualValue1) || 0,
          value_2: parseFloat(dualValue2) || 0,
        };
        parsedValue = dual;
      }
    }

    const newEntry: Entry = {
      id: `entry-${Date.now()}`,
      subcategory_id: selectedSubcategory.id,
      occurred_at: occurredAt.toISOString(),
      value: parsedValue,
      note_text: noteText.trim() || undefined,
      transcript: transcriptText.trim() || undefined,
      transcript_status: transcriptText.trim() ? 'done' : 'none',
      updated_at: new Date().toISOString(),
    };

    // Save to IndexedDB
    await db.entries.add(newEntry);

    // Trigger Undo Toast
    triggerUndoToast(
      newEntry,
      selectedCategory?.name || 'Activity',
      selectedSubcategory.name
    );

    // Reset flow back to Category Picker
    resetToCategoryPicker();
  };

  if (!selectedSubcategory || !selectedCategory) return null;
  const schema = selectedSubcategory.value_schema;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header & Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setEntryStep('subcategory_picker')}
          className="inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-base hover:underline tap-target"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to {selectedCategory.name}
        </button>
      </div>

      {/* Item Name & Timestamp Tile Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Category Breadcrumb & Item Name */}
        <div className="space-y-1">
          <div className="text-xs font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase flex items-center gap-1.5">
            <IconRenderer name={selectedCategory.icon} className="w-4 h-4" />
            {selectedCategory.name}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <IconRenderer name={selectedSubcategory.icon || selectedCategory.icon} className="w-8 h-8 text-sky-600 dark:text-sky-400" />
            {selectedSubcategory.name}
          </h2>
        </div>

        {/* Right Side: Timestamp Label & Datetime Text Box */}
        <div className="flex flex-col sm:items-end">
          <label htmlFor="entry-timestamp" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Timestamp
          </label>
          <div className="relative flex items-center w-full sm:w-auto">
            <input
              ref={datetimeRef}
              id="entry-timestamp"
              type="datetime-local"
              value={customDatetime}
              onChange={(e) => setCustomDatetime(e.target.value)}
              className="w-full sm:w-auto py-2 pl-3 pr-9 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold shadow-sm focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={() => datetimeRef.current?.showPicker?.() || datetimeRef.current?.focus()}
              className="absolute right-2 text-sky-600 dark:text-sky-400 hover:text-sky-700 p-1"
              title="Open Date & Time Picker"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        
        {/* Dynamic Value Input */}
        {schema && (
          <div className="space-y-3">
            <label className="block text-base font-bold text-slate-800 dark:text-slate-200">
              Recorded Value {schema.unit ? `(${schema.unit})` : ''}
            </label>

            {/* DURATION / COUNT / DECIMAL */}
            {(schema.type === 'duration' || schema.type === 'count' || schema.type === 'decimal') && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step={schema.type === 'decimal' ? '0.1' : '1'}
                  required
                  value={numValue}
                  onChange={(e) => setNumValue(e.target.value)}
                  className="w-full text-2xl font-bold p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                />
                {schema.unit && (
                  <span className="text-lg font-bold text-slate-600 dark:text-slate-400 shrink-0">
                    {schema.unit}
                  </span>
                )}
              </div>
            )}

            {/* BOOLEAN */}
            {schema.type === 'boolean' && (
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setBoolValue(true)}
                  className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg border-2 transition-all tap-target flex items-center justify-center gap-2 ${
                    boolValue
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <Check className="w-6 h-6" /> Yes / Completed
                </button>
                <button
                  type="button"
                  onClick={() => setBoolValue(false)}
                  className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg border-2 transition-all tap-target ${
                    !boolValue
                      ? 'border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  No / Skipped
                </button>
              </div>
            )}

            {/* RATING */}
            {schema.type === 'rating' && (
              <div className="flex justify-between gap-2 pt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg flex items-center justify-center gap-1 transition-all tap-target ${
                      ratingValue >= star
                        ? 'border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-400'
                    }`}
                  >
                    <Star className={`w-6 h-6 ${ratingValue >= star ? 'fill-amber-500' : ''}`} />
                    {star}
                  </button>
                ))}
              </div>
            )}

            {/* DUAL NUMBER (Blood Pressure 120/80) */}
            {schema.type === 'dual_number' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {schema.dual_labels?.[0] || 'Systolic'}
                  </label>
                  <input
                    type="number"
                    required
                    value={dualValue1}
                    onChange={(e) => setDualValue1(e.target.value)}
                    className="w-full text-2xl font-bold p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {schema.dual_labels?.[1] || 'Diastolic'}
                  </label>
                  <input
                    type="number"
                    required
                    value={dualValue2}
                    onChange={(e) => setDualValue2(e.target.value)}
                    className="w-full text-2xl font-bold p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optional Voice Note Button with 30s Countdown Ring */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-base font-bold text-slate-800 dark:text-slate-200">
              Voice Note (Max 30s)
            </label>

            {isRecording && (
              <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 animate-pulse">
                Recording: {recordSecondsLeft}s left
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleRecord}
            className={`w-full p-4 rounded-xl font-bold text-base border-2 flex items-center justify-center gap-3 transition-all tap-target ${
              isRecording
                ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-sky-500'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-6 h-6 text-rose-600" /> Stop Recording ({recordSecondsLeft}s)
              </>
            ) : (
              <>
                <Mic className="w-6 h-6 text-sky-600 dark:text-sky-400" /> Tap to Dictate Voice Note
              </>
            )}
          </button>

          {/* Transcript Preview */}
          {(transcriptText || isRecording) && (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 space-y-1">
              <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase">
                Transcript Preview:
              </div>
              <p className="italic">
                {transcriptText || 'Listening... speak clearly into your microphone.'}
              </p>
            </div>
          )}
        </div>

        {/* Optional Note Text */}
        <div className="space-y-2 pt-2">
          <label className="block text-base font-bold text-slate-800 dark:text-slate-200">
            Written Note (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Add details, how you felt, or notes..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-medium"
          />
        </div>

        {/* Submit Save Button */}
        <button
          type="submit"
          disabled={isDebounced}
          className="w-full py-4 px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xl rounded-xl shadow-lg hover:shadow-xl transition-all tap-target flex items-center justify-center gap-2"
        >
          <Save className="w-6 h-6" />
          Save Entry ✓
        </button>
      </form>

      {/* Mic Permission Help Sheet */}
      {showMicHelp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Microphone Permission
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Microphone access is turned off. To dictate voice notes:
              <br />
              1. Tap the Lock or AA icon in your browser address bar.
              <br />
              2. Tap Website Settings → Allow Microphone.
              <br />
              3. Or use your phone keyboard's native dictation key.
            </p>

            <button
              type="button"
              onClick={() => setShowMicHelp(false)}
              className="w-full py-3 bg-sky-600 text-white font-bold rounded-xl"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
