import React from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { OnboardingWizard } from './components/entry/OnboardingWizard';
import { CategoryPicker } from './components/entry/CategoryPicker';
import { SubcategoryPicker } from './components/entry/SubcategoryPicker';
import { EntryForm } from './components/entry/EntryForm';
import { HistoryList } from './components/history/HistoryList';
import { DashboardView } from './components/dashboard/DashboardView';
import { InsightsView } from './components/insights/InsightsView';
import { SettingsModal } from './components/settings/SettingsModal';
import { UndoToast } from './components/entry/UndoToast';

import { DemoBanner } from './components/common/DemoBanner';
import { DemoTutorial } from './components/common/DemoTutorial';

const AppContent: React.FC = () => {
  const { settings, activeTab, entryStep } = useApp();

  // Day 1 Onboarding Wizard
  if (!settings.onboarding_completed) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <OnboardingWizard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20">
      <DemoBanner />
      <Header />

      <main className="transition-all">
        {activeTab === 'entry' && (
          <>
            {entryStep === 'category_picker' && <CategoryPicker />}
            {entryStep === 'subcategory_picker' && <SubcategoryPicker />}
            {entryStep === 'entry_form' && <EntryForm />}
          </>
        )}

        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'insights' && <InsightsView />}
        {activeTab === 'history' && <HistoryList />}
        {activeTab === 'settings' && <SettingsModal />}
      </main>

      {/* Demo Mode Guided Callout Tutorial */}
      <DemoTutorial />

      {/* Global Undo Toast */}
      <UndoToast />
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;
