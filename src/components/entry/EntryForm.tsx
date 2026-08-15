import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Entry, DualNumberValue } from '../../types';
import { db } from '../../db';
import { syncEntryToCloud } from '../../db/firestoreSync';
import { recordAnonymousCommunityMetric } from '../../db/communityTelemetry';
import { ChevronLeft, Mic } from 'lucide-react';

export const EntryForm: React.FC = () => {
  const {
    selectedCategory,
    selectedSubcategory,
    setEntryStep,
    resetToCategoryPicker,
    isDebounced,
    triggerDebounce,
    triggerUndoToast,
    settings,
  } = useApp();

  const [numValue, setNumValue] = useState<string>('30');
  const [boolValue, setBoolValue] = useState<boolean>(true);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [dualValue1, setDualValue1] = useState<string>('120');
  const [dualValue2, setDualValue2] = useState<string>('80');
  const [noteText, setNoteText] = useState<string>('');

  // Default to current local date and time YYYY-MM-DDTHH:mm
  const [occurredAtStr, setOccurredAtStr] = useState<string>(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  });

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState(30);
  const [transcriptText, setTranscriptText] = useState('');
  const [showMicHelp, setShowMicHelp] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Set default initial numValue to goal target if set
  useEffect(() => {
    if (!selectedSubcategory) return;
    const fetchGoalTarget = async () => {
      const existingGoal = await db.goals
        .where('subcategory_id')
        .equals(selectedSubcategory.id)
        .first();
      if (existingGoal && existingGoal.target_value) {
        setNumValue(String(existingGoal.target_value));
      }
    };
    fetchGoalTarget();
  }, [selectedSubcategory]);

  // Voice Recording Timer (30-second cutoff)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording && recordSecondsLeft > 0) {
      timer = setInterval(() => {
        setRecordSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRecording && recordSecondsLeft === 0) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    }
    return () => clearInterval(timer);
  }, [isRecording, recordSecondsLeft]);

  // Web Speech API Recording Trigger
  const handleToggleVoiceRecord = () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      if (!settings.mic_help_do_not_show) {
        setShowMicHelp(true);
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!isRecording) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = settings.voice_language || 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscriptText(currentTranscript);
        };

        recognition.onerror = () => {
          setIsRecording(false);
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubcategory) return;
    if (isDebounced) return;
    triggerDebounce(500);

    const occurredAt = occurredAtStr ? new Date(occurredAtStr) : new Date();

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

    try {
      await db.entries.add(newEntry);
    } catch (err) {
      console.warn('Local Dexie entry save warning:', err);
    }

    try {
      await syncEntryToCloud(newEntry);
    } catch (err) {
      console.warn('Cloud sync entry warning (saved locally):', err);
    }

    try {
      if (selectedCategory) {
        await recordAnonymousCommunityMetric(
          selectedCategory.name,
          selectedSubcategory.name,
          typeof parsedValue === 'number' ? parsedValue : 1,
          settings.telemetry_opt_in
        );
      }
    } catch (err) {
      console.warn('Anonymous telemetry metric warning:', err);
    }

    triggerUndoToast(
      newEntry,
      selectedCategory?.name || 'Category',
      selectedSubcategory.name
    );

    resetToCategoryPicker();
  };

  if (!selectedSubcategory || !selectedCategory) return null;
  const schema = selectedSubcategory.value_schema;
  const recordedSeconds = 30 - recordSecondsLeft;
  const formattedRecordTime = `0:${recordedSeconds < 10 ? '0' : ''}${recordedSeconds}`;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* ‹ Back Navigation */}
      <button
        onClick={() => setEntryStep('subcategory_picker')}
        className="inline-flex items-center gap-1 text-2xl font-bold font-serif-logo text-notare-ink dark:text-notare-parchment hover:opacity-80 transition-opacity tap-target"
      >
        <ChevronLeft className="w-7 h-7 text-notare-ink dark:text-notare-parchment stroke-[2.5]" />
        <span>{selectedCategory.name}</span>
      </button>

      {/* 📍 Breadcrumb & Date-Time Picker Header */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          {selectedCategory.name} • {selectedSubcategory.name}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Log Timestamp (Default: Now)
          </label>
          <input
            type="datetime-local"
            value={occurredAtStr}
            onChange={(e) => setOccurredAtStr(e.target.value)}
            className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-base text-[#0F4C45] dark:text-white focus:ring-2 focus:ring-[#0F4C45]"
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 pt-2">
        {/* 🎙️ Central Voice Microphone Recording Section */}
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          {/* Ink Green Circular Mic Button */}
          <button
            type="button"
            onClick={handleToggleVoiceRecord}
            className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-lg tap-target no-select ${
              isRecording
                ? 'bg-[#0F4C45] dark:bg-sky-500 text-white scale-105 animate-pulse'
                : 'bg-[#0F4C45] dark:bg-sky-600 text-white hover:bg-[#135c54] dark:hover:bg-sky-700'
            }`}
            title={isRecording ? 'Tap to stop recording' : 'Tap to record voice note'}
          >
            <Mic className="w-12 h-12 stroke-[2.2]" />
          </button>

          {/* Recording Timer & Audio Waveform Visualizer */}
          <div className="space-y-2">
            <div className="text-base font-bold text-[#0F4C45] dark:text-[#F5F1E8]">
              {isRecording ? `Recording • ${formattedRecordTime}` : 'Tap mic to record voice note'}
            </div>

            {/* Ink Green Audio Waveform Visualizer Lines */}
            {isRecording && (
              <div className="flex items-center justify-center gap-1 text-[#0F4C45] dark:text-[#8FA99B] text-lg font-bold tracking-widest animate-pulse">
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
              </div>
            )}
          </div>

          {/* Transcript Preview */}
          {transcriptText && (
            <div className="w-full p-3 rounded-2xl bg-notare-parchment-dark dark:bg-slate-800 text-xs text-notare-charcoal dark:text-slate-200 italic border border-slate-300 dark:border-slate-700">
              "{transcriptText}"
            </div>
          )}
        </div>

        {/* Optional Schema Value Input */}
        {schema && (
          <div className="p-4 rounded-2xl bg-notare-parchment-dark/50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Recorded {schema.type} {schema.unit ? `(${schema.unit})` : ''}
            </label>
            {(schema.type === 'duration' || schema.type === 'count' || schema.type === 'decimal') && (
              <input
                type="number"
                step={schema.type === 'decimal' ? '0.1' : '1'}
                value={numValue}
                onChange={(e) => setNumValue(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-lg text-notare-charcoal dark:text-white"
              />
            )}
            {schema.type === 'boolean' && (
              <button
                type="button"
                onClick={() => setBoolValue(!boolValue)}
                className={`w-full py-3 font-bold text-sm rounded-xl border transition-all ${
                  boolValue ? 'bg-notare-ink text-white' : 'bg-white text-slate-700'
                }`}
              >
                {boolValue ? 'Completed ✓' : 'Not Completed'}
              </button>
            )}
            {schema.type === 'rating' && (
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className={`flex-1 py-2 rounded-xl font-bold ${
                      ratingValue === star ? 'bg-notare-terracotta text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            )}
            {schema.type === 'dual_number' && (
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Systolic"
                  value={dualValue1}
                  onChange={(e) => setDualValue1(e.target.value)}
                  className="w-1/2 p-3 rounded-xl border font-bold"
                />
                <input
                  type="number"
                  placeholder="Diastolic"
                  value={dualValue2}
                  onChange={(e) => setDualValue2(e.target.value)}
                  className="w-1/2 p-3 rounded-xl border font-bold"
                />
              </div>
            )}
          </div>
        )}

        {/* Written Note */}
        <input
          type="text"
          placeholder="Add written note (optional)..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-notare-charcoal dark:text-white"
        />

        {/* 🔘 Main Save Entry Button */}
        <div className="space-y-2 text-center pt-2">
          <button
            type="submit"
            disabled={isDebounced}
            className="w-full py-4 px-6 bg-[#0F4C45] text-white hover:bg-[#135c54] dark:bg-sky-600 dark:text-white dark:hover:bg-sky-700 font-extrabold text-2xl rounded-3xl shadow-md active:scale-98 transition-all tap-target flex items-center justify-center gap-2"
          >
            Save entry
          </button>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Transcribes in background
          </div>
        </div>
      </form>

      {/* Mic Permission Help Sheet */}
      {showMicHelp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-notare-parchment dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-notare-parchment-dark dark:border-slate-700 space-y-4">
            <h3 className="text-xl font-bold font-serif-logo text-notare-ink dark:text-white">
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
              className="w-full py-3 bg-notare-ink text-notare-parchment font-bold rounded-xl"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
