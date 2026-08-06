import React from 'react';
import { useApp } from '../../context/AppContext';
import { RotateCcw, CheckCircle2, X } from 'lucide-react';

export const UndoToast: React.FC = () => {
  const { undoToast, executeUndo, dismissUndoToast } = useApp();

  if (!undoToast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-bounce-short">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">
              {undoToast.subcategoryName} Logged ✓
            </div>
            <div className="text-xs text-slate-400 truncate">
              {undoToast.categoryName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={executeUndo}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm rounded-xl transition-all tap-target flex items-center gap-1.5 shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            Undo
          </button>

          <button
            onClick={dismissUndoToast}
            aria-label="Dismiss toast"
            className="p-2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
