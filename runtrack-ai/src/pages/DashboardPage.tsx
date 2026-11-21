import { useMemo, useState, type ChangeEvent } from 'react';
import {
  Bot,
  CheckCircle2,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Upload,
  Watch,
} from 'lucide-react';
import type { Activity, AppState, PageKey, RunType } from '../types/runtrack';
import { t } from '../i18n/translations';
import {
  convertDistance,
  formatClock,
  formatPace,
  formatPaceRaw,
  formatShortDate,
  paceUnitLabel,
  unitLabel,
} from '../utils/format';
import { EightWeekMileageChart, MiniSparkline, WeeklyMileageBarChart } from '../components/Charts';

interface DashboardPageProps {
  state: AppState;
  onNavigate: (page: PageKey) => void;
  onUploadFile: (file: File) => Promise<void>;
  onSelectActivity: (act: Activity) => void;
  onOpenLogRun: () => void;
}

export function DashboardPage({
  state,
  onNavigate,
  onUploadFile,
  onSelectActivity,
  onOpenLogRun,
}: DashboardPageProps) {
  const { preferences, metrics, integrations, activities, insights } = state;
  const { language, units } = preferences;
  const [chartRange, setChartRange] = useState<'week' | '8w'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RunType | 'All'>('All');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const weeklyDistDisplay = convertDistance(metrics.weeklyDistanceKm, units);
  const weeklyGoalDisplay = convertDistance(metrics.weeklyGoalKm, units);
  const goalPct = Math.min(100, Math.round((metrics.weeklyDistanceKm / Math.max(1, metrics.weeklyGoalKm)) * 100));

  const vo2SparkValues = useMemo(
    () => metrics.monthlyTrends.map((m) => m.vo2Max),
    [metrics.monthlyTrends],
  );

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities
      .filter((a) => (typeFilter === 'All' ? true : a.type === typeFilter))
      .filter((a) =>
        q ? a.title.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.date.includes(q) : true,
      )
      .slice(0, 12);
  }, [activities, searchQuery, typeFilter]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      await onUploadFile(file);
      setUploadMsg(`Imported ${file.name}`);
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const leadInsight = insights[0];

  const getTypeColor = (type: RunType) => {
    if (type === 'Long Run') return 'text-primary';
    if (type === 'Interval' || type === 'Race') return 'text-warning';
    if (type === 'Tempo') return 'text-secondary';
    return 'text-tertiary';
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
          <h1 className="text-[26px] leading-8 font-bold tracking-tight text-on-surface">
            {t(language, 'dashboard_title')}
          </h1>
          <span className="text-[13px] text-on-surface-variant">
            {t(language, 'dashboard_subtitle')} · {preferences.athleteName}
          </span>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenLogRun}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant hover:border-outline text-on-surface text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t(language, 'log_run')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('coach')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-container-low border border-outline hover:border-primary-container text-primary text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Bot className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t(language, 'ask_ai_coach')}</span>
          </button>
        </div>
      </div>

      {/* Top 5 KPI Summary Row */}
      <section aria-label="Key Running Metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5 items-stretch">
        {/* VO2 Max */}
        <article className="h-full bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3">
          <header className="flex flex-col gap-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t(language, 'kpi_vo2')}
            </h2>
            <span className="inline-flex items-center gap-1 font-mono text-xs text-primary tabular-nums">
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {metrics.vo2Delta30d >= 0 ? '+' : ''}
                {metrics.vo2Delta30d} (30d)
              </span>
            </span>
          </header>
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[28px] leading-8 font-semibold text-on-surface tabular-nums">
                {metrics.vo2Max.toFixed(1)}
              </span>
              <span className="text-xs text-on-surface-variant">ml/kg</span>
            </div>
            <MiniSparkline values={vo2SparkValues} />
          </div>
        </article>

        {/* Weekly Distance */}
        <article className="h-full bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3">
          <header className="flex flex-col gap-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t(language, 'kpi_weekly_dist')}
            </h2>
            <span
              className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${
                metrics.weeklyDistanceDeltaPct >= 0 ? 'text-primary' : 'text-warning'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {metrics.weeklyDistanceDeltaPct >= 0 ? '+' : ''}
                {metrics.weeklyDistanceDeltaPct}% vs. last wk
              </span>
            </span>
          </header>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[28px] leading-8 font-semibold text-on-surface tabular-nums">
                {weeklyDistDisplay}
              </span>
              <span className="text-xs text-on-surface-variant">
                / {weeklyGoalDisplay} {unitLabel(units)}
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden"
              role="progressbar"
              aria-valuenow={goalPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${goalPct}% of weekly distance goal`}
            >
              <div className="h-full rounded-full bg-primary-container transition-all duration-200" style={{ width: `${goalPct}%` }} />
            </div>
          </div>
        </article>

        {/* Average Pace */}
        <article className="h-full bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3">
          <header className="flex flex-col gap-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t(language, 'kpi_avg_pace')}
            </h2>
            <span className="inline-flex items-center gap-1 font-mono text-xs text-primary tabular-nums">
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {Math.abs(metrics.paceDeltaSec)}s {paceUnitLabel(units)} {metrics.paceDeltaSec >= 0 ? 'faster' : 'slower'}
              </span>
            </span>
          </header>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[28px] leading-8 font-semibold text-on-surface tabular-nums">
              {formatPaceRaw(metrics.avgPaceSecPerKm, units)}
            </span>
            <span className="text-xs text-on-surface-variant">{paceUnitLabel(units)}</span>
          </div>
        </article>

        {/* Average Heart Rate */}
        <article className="h-full bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3">
          <header className="flex flex-col gap-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t(language, 'kpi_avg_hr')}
            </h2>
            <span className="inline-flex items-center gap-1 font-mono text-xs text-tertiary tabular-nums">
              <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {metrics.hrDelta14d <= 0 ? `${Math.abs(metrics.hrDelta14d)} bpm lower` : `+${metrics.hrDelta14d} bpm`} (14d)
              </span>
            </span>
          </header>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[28px] leading-8 font-semibold text-on-surface tabular-nums">
              {metrics.avgHr}
            </span>
            <span className="text-xs text-on-surface-variant">bpm</span>
          </div>
        </article>

        {/* Training Status */}
        <article className="col-span-2 sm:col-span-1 h-full bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3">
          <header className="flex flex-col gap-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t(language, 'kpi_training_status')}
            </h2>
            <span className="font-mono text-xs text-on-surface-variant tabular-nums">
              Load Ratio {metrics.loadRatio.toFixed(2)}
            </span>
          </header>
          <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{metrics.trainingStatus}</span>
            </span>
            <span className="text-xs text-on-surface-variant">Fitness &amp; load aligned</span>
          </div>
        </article>
      </section>

      {/* Middle Row: Weekly Mileage Chart (8 cols) + Garmin Connect & AI Insight (4 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <article className="lg:col-span-8 bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'weekly_mileage')}</h2>
              <p className="text-[13px] text-on-surface-variant">{t(language, 'weekly_mileage_sub')}</p>
            </div>
            <div
              className="inline-flex items-center rounded-lg bg-surface-container-lowest border border-outline-variant p-1 gap-1"
              role="tablist"
              aria-label="Chart range"
            >
              <button
                type="button"
                role="tab"
                aria-selected={chartRange === 'week'}
                onClick={() => setChartRange('week')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  chartRange === 'week'
                    ? 'bg-surface-container-high text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t(language, 'tab_this_week')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chartRange === '8w'}
                onClick={() => setChartRange('8w')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  chartRange === '8w'
                    ? 'bg-surface-container-high text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t(language, 'tab_8_weeks')}
              </button>
            </div>
          </header>

          {chartRange === 'week' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-primary-container" aria-hidden="true" />
                  Quality / Tempo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-secondary" aria-hidden="true" />
                  Easy Run
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-primary" aria-hidden="true" />
                  Long Run
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-surface-container-highest border border-outline" aria-hidden="true" />
                  Rest Day
                </span>
              </div>
              <WeeklyMileageBarChart data={metrics.dailyMileage} units={units} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded-full bg-primary" aria-hidden="true" />
                  Weekly Total Distance ({unitLabel(units)})
                </span>
              </div>
              <EightWeekMileageChart data={metrics.weeklyHistory} units={units} />
            </div>
          )}
        </article>

        {/* Right Column: Garmin Connect + AI Coach Highlight */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
          <article className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col justify-between gap-4">
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-tertiary shrink-0">
                  <Watch className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-on-surface truncate">{t(language, 'garmin_connect')}</h2>
                  <p className="text-xs text-on-surface-variant truncate">{integrations.garmin.label}</p>
                </div>
              </div>
              <span
                role="status"
                className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                  integrations.garmin.connected ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {integrations.garmin.connected
                    ? t(language, 'status_connected')
                    : t(language, 'status_not_connected')}
                </span>
              </span>
            </header>

            <div className="flex flex-col gap-1.5 text-xs text-on-surface-variant">
              <div className="flex items-center justify-between">
                <span>{t(language, 'last_sync')}</span>
                <span className="font-mono text-on-surface tabular-nums">
                  {integrations.garmin.lastSync ?? 'Not synced'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t(language, 'activities_imported')}</span>
                <span className="font-mono text-on-surface tabular-nums">
                  {integrations.garmin.syncedCount} runs
                </span>
              </div>
            </div>

            <footer className="flex flex-col gap-2 pt-3 border-t border-outline-variant">
              <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-container-high text-on-surface border border-outline hover:bg-surface-bright transition-colors cursor-pointer text-sm font-semibold focus-within:ring-2 focus-within:ring-primary">
                <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{uploading ? 'Parsing file...' : t(language, 'upload_fit_gpx')}</span>
                <input
                  type="file"
                  accept=".fit,.gpx,.tcx"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
              {uploadMsg && <span className="text-xs text-primary">{uploadMsg}</span>}
            </footer>
          </article>

          <article className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col justify-between gap-3">
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <h2 className="text-[15px] font-semibold text-on-surface">{t(language, 'ai_coach_insight')}</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('coach')}
                className="text-xs font-semibold text-primary hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t(language, 'open_chat')}
              </button>
            </header>
            <p className="text-sm text-on-surface leading-relaxed">
              {leadInsight
                ? leadInsight.body
                : 'Your aerobic efficiency improved over the last 14 days. Keep recovery runs strictly in Zone 2.'}
            </p>
          </article>
        </div>
      </section>

      {/* Recent Running Activities Table */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'recent_activities')}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter runs..."
                aria-label="Filter activities"
                className="pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant focus:border-primary-container focus:outline-none"
              />
            </div>
            <div className="inline-flex items-center rounded-lg bg-surface-container-low border border-outline-variant p-0.5 gap-0.5">
              {(['All', 'Easy', 'Tempo', 'Interval', 'Long Run'] as const).map((typeOpt) => (
                <button
                  key={typeOpt}
                  type="button"
                  onClick={() => setTypeFilter(typeOpt)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    typeFilter === typeOpt
                      ? 'bg-surface-container-high text-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {typeOpt}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('training')}
              className="text-sm font-semibold text-primary hover:underline px-1 whitespace-nowrap"
            >
              {t(language, 'view_history')}
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto bg-surface-container-low border border-outline-variant rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container">
                <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {t(language, 'col_date')}
                </th>
                <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {t(language, 'col_activity')}
                </th>
                <th scope="col" className="hidden sm:table-cell py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {t(language, 'col_type')}
                </th>
                <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {t(language, 'col_distance')}
                </th>
                <th scope="col" className="hidden md:table-cell py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {t(language, 'col_duration')}
                </th>
                <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {t(language, 'col_pace')}
                </th>
                <th scope="col" className="hidden sm:table-cell py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {t(language, 'col_hr')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-sm text-on-surface-variant">
                    No running activities match your filter.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => {
                  const paceSec = act.durationSec / Math.max(0.1, act.distanceKm);
                  return (
                    <tr
                      key={act.id}
                      onClick={() => onSelectActivity(act)}
                      className="hover:bg-surface-container transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-3 sm:px-4 font-mono text-xs text-on-surface-variant tabular-nums whitespace-nowrap">
                        {formatShortDate(act.date)}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-sm font-medium text-on-surface">
                        <div className="flex items-center gap-2">
                          <span>{act.title}</span>
                          {act.source !== 'Garmin' && (
                            <span className="text-[11px] text-on-surface-variant font-mono">· {act.source}</span>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell py-3.5 px-3 sm:px-4 text-xs font-semibold whitespace-nowrap">
                        <span className={getTypeColor(act.type)}>{act.type}</span>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 font-mono text-sm text-on-surface tabular-nums whitespace-nowrap">
                        {convertDistance(act.distanceKm, units)} {unitLabel(units)}
                      </td>
                      <td className="hidden md:table-cell py-3.5 px-3 sm:px-4 font-mono text-sm text-on-surface-variant tabular-nums whitespace-nowrap">
                        {formatClock(act.durationSec)}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 font-mono text-sm text-primary tabular-nums whitespace-nowrap">
                        {formatPace(paceSec, units)}
                      </td>
                      <td className="hidden sm:table-cell py-3.5 px-3 sm:px-4 font-mono text-sm text-on-surface-variant tabular-nums whitespace-nowrap">
                        {act.avgHr} bpm
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
