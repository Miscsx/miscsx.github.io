import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import type { AppState } from '../types/runtrack';
import { t } from '../i18n/translations';
import { convertDistance, formatMinutesHours, unitLabel } from '../utils/format';
import { RecoveryHrvChart, WeeklyLoadChart } from '../components/Charts';

interface TrainingPageProps {
  state: AppState;
  onLogRecovery: (hrvMs: number, restingHr: number, sleepHours: number) => Promise<void>;
}

export function TrainingPage({ state, onLogRecovery }: TrainingPageProps) {
  const { preferences, metrics, recoveryLogs } = state;
  const { language, units } = preferences;
  const [showHrvForm, setShowHrvForm] = useState(false);
  const [hrvInput, setHrvInput] = useState(String(metrics.latestHrvMs));
  const [rhrInput, setRhrInput] = useState(String(preferences.restingHr));
  const [sleepInput, setSleepInput] = useState('7.8');
  const [savingHrv, setSavingHrv] = useState(false);

  const { intensityDistribution: dist, imbalances, weeklyHistory } = metrics;
  const watchCount = imbalances.filter((i) => i.severity === 'warning').length;

  const handleHrvSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const hrv = Number.parseFloat(hrvInput);
    const rhr = Number.parseFloat(rhrInput);
    const sleep = Number.parseFloat(sleepInput);
    if (!Number.isFinite(hrv) || !Number.isFinite(rhr)) return;
    setSavingHrv(true);
    try {
      await onLogRecovery(hrv, rhr, Number.isFinite(sleep) ? sleep : 7.5);
      setShowHrvForm(false);
    } finally {
      setSavingHrv(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
        <h1 className="text-[26px] leading-8 font-bold tracking-tight text-on-surface">
          {t(language, 'training_title')}
        </h1>
        <span className="text-[13px] text-on-surface-variant">{t(language, 'training_subtitle')}</span>
      </div>

      {/* Top Row: Weekly Training Load (7 cols) + Intensity Distribution (5 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <article className="lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'weekly_load')}</h2>
              <p className="text-[13px] text-on-surface-variant">7-day recent load vs. 28-day fitness baseline</p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-[28px] leading-8 font-semibold text-on-surface tabular-nums">
                {metrics.weeklyLoad}
              </span>
              <span className="inline-flex items-center justify-end gap-1 w-full font-mono text-xs text-primary tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{metrics.trainingStatus} (520–680)</span>
              </span>
            </div>
          </header>

          <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-primary" aria-hidden="true" />
              7-Day Load
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-tertiary" aria-hidden="true" />
              28-Day Baseline
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-secondary-container border border-outline" aria-hidden="true" />
              Optimal Target Zone
            </span>
          </div>

          <WeeklyLoadChart data={weeklyHistory} />
        </article>

        {/* Intensity Distribution */}
        <article className="lg:col-span-5 bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'intensity_dist')}</h2>
              <p className="text-[13px] text-on-surface-variant">Last 28 days · 80% Easy / 20% Hard target</p>
            </div>
            <span className="font-mono text-xs text-on-surface tabular-nums shrink-0">
              {formatMinutesHours(dist.totalMinutes)}
            </span>
          </header>

          <div
            className="w-full h-4 rounded-full bg-surface-container-highest overflow-hidden flex"
            role="img"
            aria-label={`${dist.easyPct}% Easy, ${dist.tempoPct}% Tempo, ${dist.intervalPct}% Interval`}
          >
            <div className="bg-tertiary h-full transition-all" style={{ width: `${dist.easyPct}%` }} />
            <div className="bg-primary-container h-full transition-all" style={{ width: `${dist.tempoPct}%` }} />
            <div className="bg-warning h-full transition-all" style={{ width: `${dist.intervalPct}%` }} />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-surface-container border border-outline-variant">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3 h-3 rounded-sm bg-tertiary shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-on-surface truncate">
                  Easy / Aerobic (Zone 1–2 · ≤{metrics.hrZones[1]?.maxHr ?? 149} bpm)
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-sm text-on-surface tabular-nums">{dist.easyPct}%</span>
                <span className="font-mono text-xs text-on-surface-variant ml-2 tabular-nums">
                  {formatMinutesHours(dist.easyMinutes)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-surface-container border border-outline-variant">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3 h-3 rounded-sm bg-primary-container shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-on-surface truncate">
                  Tempo / Threshold (Zone 3–4 · ≤{metrics.hrZones[3]?.maxHr ?? 174} bpm)
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-sm text-on-surface tabular-nums">{dist.tempoPct}%</span>
                <span className="font-mono text-xs text-on-surface-variant ml-2 tabular-nums">
                  {formatMinutesHours(dist.tempoMinutes)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-surface-container border border-outline-variant">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3 h-3 rounded-sm bg-warning shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-on-surface truncate">
                  Interval / VO2 Max (Zone 5 · ≥{metrics.hrZones[4]?.minHr ?? 175} bpm)
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-sm text-on-surface tabular-nums">{dist.intervalPct}%</span>
                <span className="font-mono text-xs text-on-surface-variant ml-2 tabular-nums">
                  {formatMinutesHours(dist.intervalMinutes)}
                </span>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* Middle Row: Recovery Trends + Potential Training Imbalances */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <article className="lg:col-span-6 bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'recovery_trends')}</h2>
              <p className="text-[13px] text-on-surface-variant">Overnight Heart Rate Variability (ms) &amp; Readiness</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 font-mono text-xs text-primary tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{metrics.latestHrvMs} ms · Ready</span>
              </span>
              <button
                type="button"
                onClick={() => setShowHrvForm((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant hover:border-outline text-xs font-semibold text-on-surface whitespace-nowrap"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>{t(language, 'log_hrv')}</span>
              </button>
            </div>
          </header>

          {showHrvForm && (
            <form onSubmit={handleHrvSubmit} className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-surface-container border border-outline-variant items-end">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-on-surface-variant">HRV (ms)</span>
                <input
                  type="number"
                  value={hrvInput}
                  onChange={(e) => setHrvInput(e.target.value)}
                  className="px-2 py-1.5 rounded bg-surface-container-lowest border border-outline font-mono text-xs text-on-surface"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-on-surface-variant">Resting HR</span>
                <input
                  type="number"
                  value={rhrInput}
                  onChange={(e) => setRhrInput(e.target.value)}
                  className="px-2 py-1.5 rounded bg-surface-container-lowest border border-outline font-mono text-xs text-on-surface"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-on-surface-variant">Sleep (h)</span>
                <input
                  type="number"
                  step="0.1"
                  value={sleepInput}
                  onChange={(e) => setSleepInput(e.target.value)}
                  className="px-2 py-1.5 rounded bg-surface-container-lowest border border-outline font-mono text-xs text-on-surface"
                />
              </label>
              <button
                type="submit"
                disabled={savingHrv}
                className="px-3 py-1.5 rounded bg-primary-container text-on-primary-container text-xs font-semibold"
              >
                {savingHrv ? '...' : 'Save'}
              </button>
            </form>
          )}

          <RecoveryHrvChart logs={recoveryLogs} />
        </article>

        <article className="lg:col-span-6 bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'imbalances_title')}</h2>
              <p className="text-[13px] text-on-surface-variant">Automated load &amp; running symmetry checks</p>
            </div>
            <span
              role="status"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase shrink-0 ${
                watchCount > 0 ? 'text-warning' : 'text-primary'
              }`}
            >
              {watchCount > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{watchCount > 0 ? `${watchCount} Watch Item` : 'Balanced'}</span>
            </span>
          </header>

          <div className="flex flex-col gap-3">
            {imbalances.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg bg-surface-container border border-outline-variant flex items-start gap-3"
              >
                {item.severity === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-semibold text-on-surface">{item.title}</span>
                  <p className="text-[13px] text-on-surface-variant">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Training History */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'training_history')}</h2>
        <div className="w-full overflow-x-auto bg-surface-container-low border border-outline-variant rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container">
                <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Week
                </th>
                <th scope="col" className="hidden sm:table-cell py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Sessions
                </th>
                <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Distance
                </th>
                <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Training Load
                </th>
                <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Recovery
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {[...weeklyHistory].reverse().map((wk, idx) => (
                <tr key={wk.weekLabel} className="hover:bg-surface-container transition-colors">
                  <td className="py-3.5 px-3 sm:px-4 text-sm text-on-surface">
                    {wk.dateRange} ({wk.weekLabel})
                  </td>
                  <td className="hidden sm:table-cell py-3.5 px-3 sm:px-4 font-mono text-sm text-on-surface-variant tabular-nums">
                    {wk.sessions} runs
                  </td>
                  <td
                    className={`py-3.5 px-3 sm:px-4 font-mono text-sm tabular-nums whitespace-nowrap ${
                      idx === 0 ? 'text-primary' : 'text-on-surface'
                    }`}
                  >
                    {convertDistance(wk.distanceKm, units)} {unitLabel(units)}
                  </td>
                  <td className="py-3.5 px-3 sm:px-4 font-mono text-sm text-on-surface tabular-nums">
                    {wk.load}
                  </td>
                  <td className="py-3.5 px-3 sm:px-4 font-mono text-sm text-on-surface-variant tabular-nums whitespace-nowrap">
                    {idx === 0 ? (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        {wk.readinessPct}% Ready
                      </span>
                    ) : (
                      <span>{wk.readinessPct}% Ready</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
