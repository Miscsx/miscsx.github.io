import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  CheckCircle2,
  Contrast,
  Eye,
  EyeOff,
  Globe,
  Link2Off,
  Moon,
  RefreshCw,
  Route,
  Sun,
  Upload,
  Watch,
} from 'lucide-react';
import type { AppState, AthletePreferences, DistanceUnit, LanguageCode, ThemeMode } from '../types/runtrack';
import { t } from '../i18n/translations';

interface SettingsPageProps {
  state: AppState;
  onUpdatePreferences: (patch: Partial<AthletePreferences>) => Promise<void>;
  onSaveGarmin: (clientId: string, apiSecret: string) => Promise<void>;
  onDisconnectGarmin: () => Promise<void>;
  onSaveStrava: (clientId: string, clientSecret: string, accessToken: string) => Promise<void>;
  onDisconnectStrava: () => Promise<void>;
  onSyncStrava: () => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
}

export function SettingsPage({
  state,
  onUpdatePreferences,
  onSaveGarmin,
  onDisconnectGarmin,
  onSaveStrava,
  onDisconnectStrava,
  onSyncStrava,
  onUploadFile,
}: SettingsPageProps) {
  const { preferences, integrations } = state;
  const { language, theme } = preferences;

  const [maxHr, setMaxHr] = useState(String(preferences.maxHr));
  const [thresholdHr, setThresholdHr] = useState(String(preferences.thresholdHr));
  const [restingHr, setRestingHr] = useState(String(preferences.restingHr));
  const [units, setUnits] = useState<DistanceUnit>(preferences.units);
  const [weeklyDigest, setWeeklyDigest] = useState(preferences.weeklyDigest);
  const [prefSavedMsg, setPrefSavedMsg] = useState<string | null>(null);

  // Garmin Credentials
  const [garminClientId, setGarminClientId] = useState('');
  const [garminSecret, setGarminSecret] = useState('');
  const [showGarminSecret, setShowGarminSecret] = useState(false);
  const [garminFeedback, setGarminFeedback] = useState<string | null>(null);
  const [garminError, setGarminError] = useState<string | null>(null);

  // Strava Credentials
  const [stravaClientId, setStravaClientId] = useState('');
  const [stravaSecret, setStravaSecret] = useState('');
  const [stravaToken, setStravaToken] = useState('');
  const [showStravaSecret, setShowStravaSecret] = useState(false);
  const [showStravaToken, setShowStravaToken] = useState(false);
  const [stravaFeedback, setStravaFeedback] = useState<string | null>(null);
  const [stravaError, setStravaError] = useState<string | null>(null);
  const [syncingStrava, setSyncingStrava] = useState(false);

  // Upload
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleLanguageChange = async (nextLang: LanguageCode) => {
    await onUpdatePreferences({ language: nextLang });
  };

  const handleThemeChange = async (nextTheme: ThemeMode) => {
    await onUpdatePreferences({ theme: nextTheme });
  };

  const handleSavePrefs = async (e: FormEvent) => {
    e.preventDefault();
    setPrefSavedMsg(null);
    await onUpdatePreferences({
      maxHr: Number.parseInt(maxHr, 10) || preferences.maxHr,
      thresholdHr: Number.parseInt(thresholdHr, 10) || preferences.thresholdHr,
      restingHr: Number.parseInt(restingHr, 10) || preferences.restingHr,
      units,
      weeklyDigest,
    });
    setPrefSavedMsg('Preferences saved & training zones updated.');
  };

  const handleSaveGarmin = async (e: FormEvent) => {
    e.preventDefault();
    setGarminError(null);
    setGarminFeedback(null);
    if (!garminClientId.trim()) {
      setGarminError('Enter your Garmin Consumer Key / Client ID.');
      return;
    }
    try {
      await onSaveGarmin(garminClientId.trim(), garminSecret.trim());
      setGarminFeedback('Garmin API credentials saved securely on server.');
      setGarminSecret('');
    } catch (err) {
      setGarminError(err instanceof Error ? err.message : 'Unable to save Garmin credentials.');
    }
  };

  const handleSaveStrava = async (e: FormEvent) => {
    e.preventDefault();
    setStravaError(null);
    setStravaFeedback(null);
    if (!stravaClientId.trim() && !stravaToken.trim()) {
      setStravaError('Enter a Strava Client ID or Access Token.');
      return;
    }
    try {
      await onSaveStrava(stravaClientId.trim(), stravaSecret.trim(), stravaToken.trim());
      setStravaFeedback('Strava API credentials saved securely on server.');
      setStravaSecret('');
      setStravaToken('');
    } catch (err) {
      setStravaError(err instanceof Error ? err.message : 'Unable to save Strava credentials.');
    }
  };

  const handleStravaSync = async () => {
    setStravaError(null);
    setStravaFeedback(null);
    setSyncingStrava(true);
    try {
      await onSyncStrava();
      setStravaFeedback('Strava runs synchronized successfully.');
    } catch (err) {
      setStravaError(err instanceof Error ? err.message : 'Unable to sync Strava.');
    } finally {
      setSyncingStrava(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus(null);
    setUploadError(null);
    try {
      await onUploadFile(file);
      setUploadStatus(`Imported activity from ${file.name}.`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse uploaded file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
        <h1 className="text-[26px] leading-8 font-bold tracking-tight text-on-surface">
          {t(language, 'settings_title')}
        </h1>
        <span className="text-[13px] text-on-surface-variant">{t(language, 'settings_subtitle')}</span>
      </div>

      {/* Section 1: Language & Appearance */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <article className="lg:col-span-6 bg-surface-container-low border border-outline-variant rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5">
          <header className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary shrink-0">
              <Globe className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'lang_heading')}</h2>
              <p className="text-[13px] text-on-surface-variant">{t(language, 'lang_desc')}</p>
            </div>
          </header>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">{t(language, 'lang_label')}</span>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface text-sm focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="en">English (Default)</option>
                <option value="fi">Finnish (Suomi)</option>
                <option value="de">German (Deutsch)</option>
                <option value="fr">French (Français)</option>
              </select>
            </label>
            <p className="text-xs font-medium text-primary">{t(language, 'lang_active')}</p>
          </div>
        </article>

        <article className="lg:col-span-6 bg-surface-container-low border border-outline-variant rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5">
          <header className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary shrink-0">
              <Contrast className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'appearance_heading')}</h2>
              <p className="text-[13px] text-on-surface-variant">{t(language, 'appearance_desc')}</p>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Theme selection">
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              onClick={() => handleThemeChange('dark')}
              className={`p-4 rounded-xl bg-surface-container text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                theme === 'dark' ? 'border-2 border-primary-container' : 'border border-outline-variant hover:border-outline'
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-primary' : 'text-on-surface-variant'}`} aria-hidden="true" />
                <div>
                  <span className="block text-[15px] font-semibold text-on-surface">{t(language, 'theme_dark')}</span>
                  <span className="block text-xs text-on-surface-variant">{t(language, 'theme_dark_sub')}</span>
                </div>
              </div>
              {theme === 'dark' && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />}
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              onClick={() => handleThemeChange('light')}
              className={`p-4 rounded-xl bg-surface-container text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                theme === 'light' ? 'border-2 border-primary-container' : 'border border-outline-variant hover:border-outline'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-primary' : 'text-on-surface-variant'}`} aria-hidden="true" />
                <div>
                  <span className="block text-[15px] font-semibold text-on-surface">{t(language, 'theme_light')}</span>
                  <span className="block text-xs text-on-surface-variant">{t(language, 'theme_light_sub')}</span>
                </div>
              </div>
              {theme === 'light' && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />}
            </button>
          </div>
        </article>
      </section>

      {/* Section 2: Heart Rate & Unit Preferences */}
      <section>
        <form
          onSubmit={handleSavePrefs}
          className="bg-surface-container-low border border-outline-variant rounded-xl p-5 sm:p-6 flex flex-col gap-5"
        >
          <header>
            <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'thresholds_heading')}</h2>
            <p className="text-[13px] text-on-surface-variant">{t(language, 'thresholds_desc')}</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">{t(language, 'max_hr')}</span>
              <input
                type="number"
                value={maxHr}
                onChange={(e) => setMaxHr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">{t(language, 'threshold_hr')}</span>
              <input
                type="number"
                value={thresholdHr}
                onChange={(e) => setThresholdHr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">{t(language, 'resting_hr')}</span>
              <input
                type="number"
                value={restingHr}
                onChange={(e) => setRestingHr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">{t(language, 'distance_units')}</span>
              <select
                value={units}
                onChange={(e) => setUnits(e.target.value as DistanceUnit)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface text-sm focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="metric">Metric (km, min/km)</option>
                <option value="imperial">Imperial (mi, min/mi)</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-outline-variant">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
                className="w-5 h-5 rounded border-outline accent-primary-container shrink-0"
              />
              <div>
                <span className="block text-[15px] font-semibold text-on-surface">{t(language, 'weekly_digest')}</span>
                <span className="block text-xs text-on-surface-variant">{t(language, 'weekly_digest_desc')}</span>
              </div>
            </label>
            <div className="flex items-center gap-3">
              {prefSavedMsg && <span className="text-xs font-medium text-primary">{prefSavedMsg}</span>}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-primary-container text-on-primary-container hover:opacity-90 text-sm font-semibold whitespace-nowrap shrink-0 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t(language, 'btn_save_prefs')}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Section 3: Connected Services */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'integrations_heading')}</h2>
          <p className="text-[13px] text-on-surface-variant">{t(language, 'integrations_desc')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Garmin Connect Card */}
          <article className="lg:col-span-6 bg-surface-container-low border border-outline-variant rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5">
            <div className="flex flex-col gap-5">
              <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-tertiary shrink-0">
                    <Watch className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[19px] font-bold text-on-surface truncate">Garmin Connect</h3>
                    <p className="text-xs text-on-surface-variant truncate">
                      {integrations.garmin.label} · API &amp; .FIT Sync
                    </p>
                  </div>
                </div>
                <span
                  role="status"
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase shrink-0 ${
                    integrations.garmin.connected ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {integrations.garmin.connected ? (
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Link2Off className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {integrations.garmin.connected
                      ? t(language, 'status_connected')
                      : t(language, 'status_not_connected')}
                  </span>
                </span>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg bg-surface-container border border-outline-variant">
                <div>
                  <span className="block text-xs font-semibold uppercase text-on-surface-variant">
                    {t(language, 'last_sync')}
                  </span>
                  <span className="font-mono text-sm text-on-surface tabular-nums">
                    {integrations.garmin.lastSync ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase text-on-surface-variant">
                    {t(language, 'activities_imported')}
                  </span>
                  <span className="font-mono text-sm text-primary tabular-nums">
                    {integrations.garmin.syncedCount} runs (.FIT)
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveGarmin} className="flex flex-col gap-3.5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">
                    Garmin Consumer Key / Client ID
                    {integrations.garmin.clientIdMasked ? ` (${integrations.garmin.clientIdMasked})` : ''}
                  </span>
                  <input
                    type="text"
                    value={garminClientId}
                    onChange={(e) => setGarminClientId(e.target.value)}
                    placeholder="Enter your Garmin Consumer Key"
                    autoComplete="off"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm placeholder:text-on-surface-variant focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">Garmin Consumer Secret / API Key</span>
                  <div className="relative flex items-center">
                    <input
                      type={showGarminSecret ? 'text' : 'password'}
                      value={garminSecret}
                      onChange={(e) => setGarminSecret(e.target.value)}
                      placeholder="Enter your Garmin API Secret"
                      autoComplete="off"
                      className="w-full pl-3.5 pr-11 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm placeholder:text-on-surface-variant focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGarminSecret((v) => !v)}
                      aria-label="Show or hide Garmin API secret"
                      className="absolute right-2 p-1.5 rounded text-on-surface-variant hover:text-on-surface"
                    >
                      {showGarminSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={!integrations.garmin.connected}
                    onClick={async () => {
                      await onDisconnectGarmin();
                      setGarminFeedback('Garmin Connect disconnected.');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-surface-container-high text-on-surface border border-outline hover:bg-surface-bright disabled:opacity-50 text-sm font-semibold whitespace-nowrap"
                  >
                    {t(language, 'btn_disconnect')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container hover:opacity-90 text-sm font-semibold whitespace-nowrap"
                  >
                    {t(language, 'btn_save_garmin')}
                  </button>
                </div>

                {garminFeedback && <p className="text-xs text-primary">{garminFeedback}</p>}
                {garminError && <p className="text-xs text-error">{garminError}</p>}
              </form>

              {/* Manual Activity Upload */}
              <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant">
                <span className="text-sm font-semibold text-on-surface">{t(language, 'manual_upload')}</span>
                <label className="p-4 rounded-lg border border-dashed border-outline bg-surface-container-lowest hover:border-primary-container transition-colors flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer focus-within:ring-2 focus-within:ring-primary">
                  <Upload className="w-5 h-5 text-primary" aria-hidden="true" />
                  <span className="text-sm font-semibold text-on-surface">{t(language, 'upload_label')}</span>
                  <span className="text-xs text-on-surface-variant">Max 25 MB per file · Parses distance, pace &amp; HR</span>
                  <input type="file" accept=".fit,.gpx,.tcx" onChange={handleFileUpload} className="sr-only" />
                </label>
                {uploadStatus && <span className="text-xs text-primary">{uploadStatus}</span>}
                {uploadError && <span className="text-xs text-error">{uploadError}</span>}
              </div>
            </div>
          </article>

          {/* Strava Card */}
          <article className="lg:col-span-6 bg-surface-container-low border border-outline-variant rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5">
            <div className="flex flex-col gap-5">
              <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-warning shrink-0">
                    <Route className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[19px] font-bold text-on-surface truncate">Strava</h3>
                    <p className="text-xs text-on-surface-variant truncate">{integrations.strava.label}</p>
                  </div>
                </div>
                <span
                  role="status"
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase shrink-0 ${
                    integrations.strava.connected ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {integrations.strava.connected ? (
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Link2Off className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {integrations.strava.connected
                      ? t(language, 'status_connected')
                      : t(language, 'status_not_connected')}
                  </span>
                </span>
              </header>

              <div className="p-3.5 rounded-lg bg-surface-container border border-outline-variant">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Connect your Strava API application credentials to automatically import runs, routes, and segment efforts via Strava API v3.
                </p>
              </div>

              <form onSubmit={handleSaveStrava} className="flex flex-col gap-3.5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">
                    Strava Client ID
                    {integrations.strava.clientIdMasked ? ` (${integrations.strava.clientIdMasked})` : ''}
                  </span>
                  <input
                    type="text"
                    value={stravaClientId}
                    onChange={(e) => setStravaClientId(e.target.value)}
                    placeholder="Enter your Strava Client ID"
                    autoComplete="off"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm placeholder:text-on-surface-variant focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">Strava Client Secret</span>
                  <div className="relative flex items-center">
                    <input
                      type={showStravaSecret ? 'text' : 'password'}
                      value={stravaSecret}
                      onChange={(e) => setStravaSecret(e.target.value)}
                      placeholder="Enter your Strava Client Secret"
                      autoComplete="off"
                      className="w-full pl-3.5 pr-11 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm placeholder:text-on-surface-variant focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStravaSecret((v) => !v)}
                      aria-label="Show or hide Strava Client Secret"
                      className="absolute right-2 p-1.5 rounded text-on-surface-variant hover:text-on-surface"
                    >
                      {showStravaSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">Strava API Access Token</span>
                  <div className="relative flex items-center">
                    <input
                      type={showStravaToken ? 'text' : 'password'}
                      value={stravaToken}
                      onChange={(e) => setStravaToken(e.target.value)}
                      placeholder="Enter your Strava Access Token"
                      autoComplete="off"
                      className="w-full pl-3.5 pr-11 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm placeholder:text-on-surface-variant focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStravaToken((v) => !v)}
                      aria-label="Show or hide Strava Access Token"
                      className="absolute right-2 p-1.5 rounded text-on-surface-variant hover:text-on-surface"
                    >
                      {showStravaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-outline-variant">
                  <button
                    type="button"
                    disabled={!integrations.strava.connected}
                    onClick={async () => {
                      await onDisconnectStrava();
                      setStravaFeedback('Strava disconnected.');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-surface-container-high text-on-surface border border-outline hover:bg-surface-bright disabled:opacity-50 text-sm font-semibold whitespace-nowrap"
                  >
                    {t(language, 'btn_disconnect')}
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    {integrations.strava.connected && (
                      <button
                        type="button"
                        onClick={handleStravaSync}
                        disabled={syncingStrava}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-high border border-outline text-on-surface hover:bg-surface-bright text-sm font-semibold whitespace-nowrap"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingStrava ? 'animate-spin' : ''}`} aria-hidden="true" />
                        <span>{t(language, 'sync_strava_now')}</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container hover:opacity-90 text-sm font-semibold whitespace-nowrap"
                    >
                      {t(language, 'btn_save_strava')}
                    </button>
                  </div>
                </div>

                {stravaFeedback && <p className="text-xs text-primary">{stravaFeedback}</p>}
                {stravaError && <p className="text-xs text-error">{stravaError}</p>}
              </form>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
