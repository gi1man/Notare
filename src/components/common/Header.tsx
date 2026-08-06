import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DeviceMigrationModal } from '../settings/DeviceMigrationModal';
import { Cloud, Settings, PlusCircle, History, LayoutDashboard, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const { activeTab, setActiveTab, resetToCategoryPicker } = useApp();
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* App Logo & Title */}
        <button
          onClick={() => {
            setActiveTab('entry');
            resetToCategoryPicker();
          }}
          className="flex items-center gap-2.5 text-left focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg p-1"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            N
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-900 dark:text-white leading-tight">
              Notare
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Privacy Focused Activity Tracker
            </p>
          </div>
        </button>

        {/* Right Actions: Minimalist Cloud Backup & Settings */}
        <div className="flex items-center gap-2">
          {/* Cloud Backup & Migration Button */}
          <button
            onClick={() => setShowMigrationModal(true)}
            aria-label="Cloud Backup & Migration"
            className="tap-target p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-600 dark:text-slate-300"
            title="Cloud Backup & Device Migration"
          >
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm gap-1">
              <Cloud className="w-6 h-6" />
              <span className="sr-only">Cloud Backup</span>
            </span>
          </button>

          {/* Settings Tab Button */}
          <button
            onClick={() => setActiveTab('settings')}
            aria-label="Settings"
            className={`tap-target p-2 rounded-full transition-colors flex items-center justify-center ${
              activeTab === 'settings'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
                : 'hover:bg-slate-100 text-slate-600 dark:hover:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Device Migration & Cloud Backup Modal */}
      {showMigrationModal && (
        <DeviceMigrationModal onClose={() => setShowMigrationModal(false)} />
      )}

      {/* Main Tab Navigation Bar */}
      <nav className="bg-slate-100 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700/50">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
          <button
            onClick={() => {
              setActiveTab('entry');
              resetToCategoryPicker();
            }}
            className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 font-medium text-xs sm:text-sm border-b-2 transition-all tap-target ${
              activeTab === 'entry'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400 font-bold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            Log Activity
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 font-medium text-xs sm:text-sm border-b-2 transition-all tap-target ${
              activeTab === 'dashboard'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400 font-bold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 font-medium text-xs sm:text-sm border-b-2 transition-all tap-target ${
              activeTab === 'insights'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400 font-bold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            Insights
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 font-medium text-xs sm:text-sm border-b-2 transition-all tap-target ${
              activeTab === 'history'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400 font-bold bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <History className="w-5 h-5" />
            History
          </button>
        </div>
      </nav>
    </header>
  );
};
