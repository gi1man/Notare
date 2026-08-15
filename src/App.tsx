import React, { Suspense } from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { OnboardingWizard } from './components/entry/OnboardingWizard';
import { CategoryPicker } from './components/entry/CategoryPicker';
import { SubcategoryPicker } from './components/entry/SubcategoryPicker';
import { EntryForm } from './components/entry/EntryForm';
import { UndoToast } from './components/entry/UndoToast';

import { DemoBanner } from './components/common/DemoBanner';
import { DemoTutorial } from './components/common/DemoTutorial';

// Lazy-loaded tab views for code splitting
const HistoryList = React.lazy(() => import('./components/history/HistoryList').then(m => ({ default: m.HistoryList })));
const DashboardView = React.lazy(() => import('./components/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const InsightsView = React.lazy(() => import('./components/insights/InsightsView').then(m => ({ default: m.InsightsView })));
const SettingsModal = React.lazy(() => import('./components/settings/SettingsModal').then(m => ({ default: m.SettingsModal })));

const TabSuspense: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-slate-300 dark:border-slate-600 border-t-[#0F4C45] dark:border-t-sky-400 rounded-full animate-spin" />
    </div>
  }>
    {children}
  </Suspense>
);

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

        {activeTab === 'dashboard' && <TabSuspense><DashboardView /></TabSuspense>}
        {activeTab === 'insights' && <TabSuspense><InsightsView /></TabSuspense>}
        {activeTab === 'history' && <TabSuspense><HistoryList /></TabSuspense>}
        {activeTab === 'settings' && <TabSuspense><SettingsModal /></TabSuspense>}
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
