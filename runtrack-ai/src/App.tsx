import { useCallback, useEffect, useState } from 'react';
import type {
  Activity,
  AppState,
  AthletePreferences,
  PageKey,
  RaceDistanceKey,
  RunType,
} from './types/runtrack';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import { LogRunModal } from './components/LogRunModal';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { TrainingPage } from './pages/TrainingPage';
import { CoachPage } from './pages/CoachPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { SettingsPage } from './pages/SettingsPage';

const VALID_PAGES: Set<PageKey> = new Set([
  'dashboard',
  'analytics',
  'training',
  'coach',
  'predictions',
  'settings',
]);

function readInitialPage(): PageKey {
  const hash = window.location.hash.replace('#', '') as PageKey;
  return VALID_PAGES.has(hash) ? hash : 'dashboard';
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageKey>(readInitialPage);
  const [isSyncingGarmin, setIsSyncingGarmin] = useState(false);
  const [justSyncedGarmin, setJustSyncedGarmin] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [logRunOpen, setLogRunOpen] = useState(false);

  const loadState = useCallback(async () => {
    try {
      const data = await apiJson<AppState>('/api/state');
      setState(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load RunTrack AI telemetry.');
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(readInitialPage());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Sync theme & html lang attribute whenever preferences change
  useEffect(() => {
    if (!state) return;
    const { theme, language } = state.preferences;
    document.documentElement.lang = language;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('runtrack_theme', theme);
      localStorage.setItem('runtrack_lang', language);
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  const navigate = (page: PageKey) => {
    setCurrentPage(page);
    if (window.location.hash !== `#${page}`) {
      window.location.hash = page;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSyncGarmin = async () => {
    setIsSyncingGarmin(true);
    try {
      const updated = await apiJson<AppState>('/api/sync/garmin', { method: 'POST' });
      setState(updated);
      setJustSyncedGarmin(true);
      setTimeout(() => setJustSyncedGarmin(false), 2200);
    } finally {
      setIsSyncingGarmin(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      throw new Error('File exceeds 25 MB limit.');
    }
    const contentBase64 = await fileToBase64(file);
    const res = await apiJson<{ state: AppState; activity: Activity }>('/api/activities/upload', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentBase64 }),
    });
    setState(res.state);
  };

  const handleAddRun = async (payload: {
    date: string;
    title: string;
    type: RunType;
    distanceKm: number;
    durationSec: number;
    avgHr: number;
    elevationM?: number;
    notes?: string;
  }) => {
    const res = await apiJson<{ state: AppState; activity: Activity }>('/api/activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setState(res.state);
  };

  const handleDeleteActivity = async (id: string) => {
    const updated = await apiJson<AppState>(`/api/activities/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    setState(updated);
  };

  const handleLogRecovery = async (hrvMs: number, restingHr: number, sleepHours: number) => {
    const updated = await apiJson<AppState>('/api/recovery', {
      method: 'POST',
      body: JSON.stringify({ hrvMs, restingHr, sleepHours }),
    });
    setState(updated);
  };

  const handleUpdatePreferences = async (patch: Partial<AthletePreferences>) => {
    const updated = await apiJson<AppState>('/api/preferences', {
      method: 'POST',
      body: JSON.stringify(patch),
    });
    setState(updated);
  };

  const handleUpdateGoal = async (distanceKey: RaceDistanceKey, targetTime: string) => {
    const updated = await apiJson<AppState>('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ distanceKey, targetTime }),
    });
    setState(updated);
  };

  const handleSaveGarmin = async (clientId: string, apiSecret: string) => {
    const updated = await apiJson<AppState>('/api/integrations/garmin', {
      method: 'POST',
      body: JSON.stringify({ clientId, apiSecret }),
    });
    setState(updated);
  };

  const handleDisconnectGarmin = async () => {
    const updated = await apiJson<AppState>('/api/integrations/garmin', { method: 'DELETE' });
    setState(updated);
  };

  const handleSaveStrava = async (clientId: string, clientSecret: string, accessToken: string) => {
    const updated = await apiJson<AppState>('/api/integrations/strava', {
      method: 'POST',
      body: JSON.stringify({ clientId, clientSecret, accessToken }),
    });
    setState(updated);
  };

  const handleDisconnectStrava = async () => {
    const updated = await apiJson<AppState>('/api/integrations/strava', { method: 'DELETE' });
    setState(updated);
  };

  const handleSyncStrava = async () => {
    const updated = await apiJson<AppState>('/api/sync/strava', { method: 'POST' });
    setState(updated);
  };

  const handleCoachChat = async (message: string) => {
    const updated = await apiJson<AppState>('/api/coach/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    setState(updated);
  };

  const handleClearChat = async () => {
    const updated = await apiJson<AppState>('/api/coach/chat', { method: 'DELETE' });
    setState(updated);
  };

  const handleRefreshInsights = async () => {
    const updated = await apiJson<AppState>('/api/coach/insights', { method: 'POST' });
    setState(updated);
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-3">
          <h1 className="text-lg font-bold text-on-surface">Unable to load RunTrack AI</h1>
          <p className="text-sm text-on-surface-variant">{loadError}</p>
          <button
            type="button"
            onClick={loadState}
            className="self-start px-4 py-2 rounded-lg bg-primary-container text-on-primary-container text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex flex-col">
        <div className="h-16 border-b border-outline-variant bg-surface-dim" />
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
          <div className="h-8 w-56 rounded-lg bg-surface-container-low animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-surface-container-low border border-outline-variant animate-pulse" />
            ))}
          </div>
          <div className="h-72 rounded-xl bg-surface-container-low border border-outline-variant animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header
        currentPage={currentPage}
        onNavigate={navigate}
        language={state.preferences.language}
        integrations={state.integrations}
        isSyncing={isSyncingGarmin}
        justSynced={justSyncedGarmin}
        onSyncGarmin={handleSyncGarmin}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-5 sm:p-6 pb-24 md:pb-8 flex flex-col">
        {currentPage === 'dashboard' && (
          <DashboardPage
            state={state}
            onNavigate={navigate}
            onUploadFile={handleUploadFile}
            onSelectActivity={setSelectedActivity}
            onOpenLogRun={() => setLogRunOpen(true)}
          />
        )}
        {currentPage === 'analytics' && <AnalyticsPage state={state} />}
        {currentPage === 'training' && (
          <TrainingPage state={state} onLogRecovery={handleLogRecovery} />
        )}
        {currentPage === 'coach' && (
          <CoachPage
            state={state}
            onSendMessage={handleCoachChat}
            onClearChat={handleClearChat}
            onRefreshInsights={handleRefreshInsights}
          />
        )}
        {currentPage === 'predictions' && (
          <PredictionsPage state={state} onUpdateGoal={handleUpdateGoal} />
        )}
        {currentPage === 'settings' && (
          <SettingsPage
            state={state}
            onUpdatePreferences={handleUpdatePreferences}
            onSaveGarmin={handleSaveGarmin}
            onDisconnectGarmin={handleDisconnectGarmin}
            onSaveStrava={handleSaveStrava}
            onDisconnectStrava={handleDisconnectStrava}
            onSyncStrava={handleSyncStrava}
            onUploadFile={handleUploadFile}
          />
        )}
      </main>

      <MobileNav
        currentPage={currentPage}
        onNavigate={navigate}
        language={state.preferences.language}
      />

      <ActivityDetailModal
        activity={selectedActivity}
        units={state.preferences.units}
        onClose={() => setSelectedActivity(null)}
        onDelete={handleDeleteActivity}
      />

      <LogRunModal
        open={logRunOpen}
        units={state.preferences.units}
        onClose={() => setLogRunOpen(false)}
        onSubmit={handleAddRun}
      />
    </div>
  );
}
