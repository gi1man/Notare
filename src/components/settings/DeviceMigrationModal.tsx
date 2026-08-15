import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { exportMigrationFile, importMigrationBackup } from '../../db/cloudBackup';
import { useApp } from '../../context/AppContext';
import { Cloud, Download, Upload, Smartphone, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';

interface DeviceMigrationModalProps {
  onClose: () => void;
}

export const DeviceMigrationModal: React.FC<DeviceMigrationModalProps> = ({ onClose }) => {
  const { updateSettings } = useApp();
  const categoryCount = useLiveQuery(() => db.categories.count()) || 0;
  const entryCount = useLiveQuery(() => db.entries.count()) || 0;
  const goalCount = useLiveQuery(() => db.goals.count()) || 0;
  const settingsRecord = useLiveQuery(() => db.meta.get('settings'));

  const lastBackupAt = settingsRecord?.value?.last_cloud_backup_at;

  const [restoreStatus, setRestoreStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Handle Export Migration File
  const handleExport = async () => {
    await exportMigrationFile();
  };

  // Handle Import / Restore File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const jsonString = event.target?.result as string;
      if (!jsonString) return;

      if (confirm('Restoring a migration backup will replace local data with your backup file. Continue?')) {
        const result = await importMigrationBackup(jsonString);
        if (result.success) {
          await updateSettings({ onboarding_completed: true, is_demo_mode: false });
          setRestoreStatus({
            type: 'success',
            message: `Restored ${result.count.entries} entries, ${result.count.categories} categories, and ${result.count.goals} goals!`,
          });
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setRestoreStatus({
            type: 'error',
            message: result.message,
          });
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud className="w-6 h-6 text-sky-600 dark:text-sky-400" />
              Cloud Backup & Device Migration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Single-device mobile app backup and new phone transfer
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Device Data Status Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-sky-600" /> Current Mobile Device Data
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Ready for Backup
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-lg font-black text-slate-900 dark:text-white">{entryCount}</div>
              <div className="text-[10px] font-bold text-slate-500">Entries</div>
            </div>
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-lg font-black text-slate-900 dark:text-white">{categoryCount}</div>
              <div className="text-[10px] font-bold text-slate-500">Categories</div>
            </div>
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-lg font-black text-slate-900 dark:text-white">{goalCount}</div>
              <div className="text-[10px] font-bold text-slate-500">Active Goals</div>
            </div>
          </div>

          {lastBackupAt && (
            <div className="text-[11px] font-semibold text-slate-400 text-center">
              Last Backup: {new Date(lastBackupAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Restore Notification Message */}
        {restoreStatus.type && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold ${
              restoreStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
            }`}
          >
            {restoreStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            {restoreStatus.message}
          </div>
        )}

        {/* Step 1: Export Backup */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
          <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-sky-600" />
            1. Save Cloud / Local Backup
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export a full encrypted JSON migration backup file to store in Cloud Storage or your device files.
          </p>
          <button
            onClick={handleExport}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 tap-target"
          >
            <Download className="w-4 h-4" /> Export Migration Backup File
          </button>
        </div>

        {/* Step 2: Migrate / Restore on New Device */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
          <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            2. Migrate to New Mobile Device
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Moving to a new phone or tablet? Select your `.json` migration backup file to restore all your habits and activity logs onto your new device.
          </p>

          <label className="w-full py-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer tap-target">
            <Upload className="w-4 h-4" /> Select Backup File to Restore
            <input
              type="file"
              accept=".json,application/json,text/plain,*/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
};
