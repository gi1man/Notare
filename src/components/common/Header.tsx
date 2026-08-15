import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { NotareLogo } from './NotareLogo';
import { Settings, PlusCircle, History, LayoutDashboard, Sparkles, Cloud } from 'lucide-react';
import { getSyncStatus, onSyncStatusChange } from '../../db/firestoreSync';

export const Header: React.FC = () => {
  const { activeTab, setActiveTab, resetToCategoryPicker } = useApp();
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());

  useEffect(() => {
    return onSyncStatusChange(setSyncStatus);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#F5F1E8] dark:bg-slate-900 border-b border-notare-parchment-dark dark:border-slate-800 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Official Brand Logo & Title */}
        <button
          onClick={() => {
            setActiveTab('entry');
            resetToCategoryPicker();
          }}
          className="flex items-center gap-2.5 text-left focus:outline-none focus:ring-2 focus:ring-notare-terracotta rounded-xl p-1"
        >
          <NotareLogo variant="ink" size="md" showText={true} />
        </button>

        {/* Right Actions: Minimalist Settings */}
        <div className="flex items-center gap-2">
          <span 
            className="flex items-center justify-center w-6 h-6"
            title={syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'offline' ? 'Offline' : 'Online'}
          >
            <Cloud className={`w-4 h-4 transition-colors ${
              syncStatus === 'syncing' ? 'text-sky-500 animate-pulse' :
              syncStatus === 'offline' ? 'text-slate-400' :
              'text-emerald-500'
            }`} />
          </span>

          {/* Settings Tab Button */}
          <button
            onClick={() => setActiveTab('settings')}
            aria-label="Settings"
            className={`tap-target p-2 rounded-full transition-colors flex items-center justify-center ${
              activeTab === 'settings'
                ? 'bg-[#0F4C45] text-[#F5F1E8] dark:bg-sky-900/50 dark:text-sky-300'
                : 'hover:bg-notare-parchment-dark text-slate-700 dark:hover:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <nav className="bg-notare-parchment-dark/60 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700/50">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
          <button
            onClick={() => {
              setActiveTab('entry');
              resetToCategoryPicker();
            }}
            className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 font-medium text-xs sm:text-sm border-b-2 transition-all tap-target ${
              activeTab === 'entry'
                ? 'border-notare-terracotta text-notare-terracotta dark:border-sky-400 dark:text-sky-400 font-bold bg-[#F5F1E8] dark:bg-slate-900'
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
                ? 'border-notare-terracotta text-notare-terracotta dark:border-sky-400 dark:text-sky-400 font-bold bg-[#F5F1E8] dark:bg-slate-900'
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
                ? 'border-notare-terracotta text-notare-terracotta dark:border-sky-400 dark:text-sky-400 font-bold bg-[#F5F1E8] dark:bg-slate-900'
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
                ? 'border-notare-terracotta text-notare-terracotta dark:border-sky-400 dark:text-sky-400 font-bold bg-[#F5F1E8] dark:bg-slate-900'
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
