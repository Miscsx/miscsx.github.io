import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import type { AppState, RaceDistanceKey } from '../types/runtrack';
import { t } from '../i18n/translations';
import { formatClock, formatPace, formatPaddedInputClock } from '../utils/format';

interface PredictionsPageProps {
  state: AppState;
  onUpdateGoal: (distanceKey: RaceDistanceKey, targetTime: string) => Promise<void>;
}

export function PredictionsPage({ state, onUpdateGoal }: PredictionsPageProps) {
  const { preferences, metrics, raceGoals } = state;
  const { language, units } = preferences;
  const [selectedDist, setSelectedDist] = useState<RaceDistanceKey>('hm');
  const [goalInput, setGoalInput] = useState(formatPaddedInputClock(raceGoals.hm));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGoalInput(formatPaddedInputClock(raceGoals[selectedDist]));
  }, [selectedDist, raceGoals]);

  const selectedPred = metrics.racePredictions.find((p) => p.key === selectedDist);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSaving(true);
    try {
      await onUpdateGoal(selectedDist, goalInput);
      setFeedback(`Target saved: ${goalInput}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid time format. Use HH:MM:SS.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
        <h1 className="text-[26px] leading-8 font-bold tracking-tight text-on-surface">
          {t(language, 'predictions_title')}
        </h1>
        <span className="text-[13px] text-on-surface-variant">
          {t(language, 'predictions_subtitle')} (VO2 max {metrics.vo2Max.toFixed(1)})
        </span>
      </div>

      {/* 4 Predicted Finish Time Cards */}
      <section aria-label="Estimated Finishing Times" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {metrics.racePredictions.map((item) => {
          const isAhead = item.diffSec >= 0;
          const isSelected = item.key === selectedDist;
          const pacePerKm = item.predictedSec / item.distanceKm;

          return (
            <article
              key={item.key}
              onClick={() => setSelectedDist(item.key)}
              className={`h-full bg-surface-container-low rounded-xl p-5 flex flex-col justify-between gap-4 cursor-pointer transition-colors ${
                isSelected ? 'border-2 border-primary-container' : 'border border-outline-variant hover:border-outline'
              }`}
            >
              <header className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wide ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {item.label}
                </span>
                <span className="font-mono text-xs text-primary tabular-nums">{formatPace(pacePerKm, units)}</span>
              </header>
              <div className="flex flex-col gap-1">
                <span className={`font-mono text-[32px] leading-9 font-bold tabular-nums ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                  {formatClock(item.predictedSec)}
                </span>
                <span className="text-xs text-on-surface-variant tabular-nums">
                  Range: {formatClock(item.rangeLowSec)} – {formatClock(item.rangeHighSec)}
                </span>
              </div>
              <div className="pt-3 border-t border-outline-variant flex items-center justify-between gap-2">
                <span className="text-xs text-on-surface-variant">
                  Goal: <span className="font-mono text-on-surface">{formatClock(item.targetSec)}</span>
                </span>
                <span className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${isAhead ? 'text-primary' : 'text-warning'}`}>
                  {isAhead ? (
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {formatClock(Math.abs(item.diffSec))} {isAhead ? 'ahead' : 'behind'}
                  </span>
                </span>
              </div>
            </article>
          );
        })}
      </section>

      {/* Bottom Split: Goal Comparison Editor (5 cols) + Predicted vs Target Table (7 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <article className="lg:col-span-5 bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col justify-between gap-4">
          <header>
            <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'set_goals')}</h2>
            <p className="text-[13px] text-on-surface-variant">{t(language, 'set_goals_sub')}</p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">{t(language, 'race_distance')}</span>
              <select
                value={selectedDist}
                onChange={(e) => setSelectedDist(e.target.value as RaceDistanceKey)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface text-sm focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {metrics.racePredictions.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label} (Predicted: {formatClock(p.predictedSec)})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">{t(language, 'target_time')}</span>
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="01:35:00"
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </label>

            {error && <p className="text-xs text-error">{error}</p>}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {feedback
                    ? feedback
                    : selectedPred
                      ? selectedPred.diffSec >= 0
                        ? `${formatClock(selectedPred.diffSec)} faster than target`
                        : `${formatClock(Math.abs(selectedPred.diffSec))} behind target`
                      : ''}
                </span>
              </span>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-primary-container text-on-primary-container hover:opacity-90 disabled:opacity-60 text-sm font-semibold whitespace-nowrap transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {saving ? 'Saving...' : t(language, 'update_goal')}
              </button>
            </div>
          </form>
        </article>

        <article className="lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col gap-4">
          <header>
            <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'breakdown_title')}</h2>
            <p className="text-[13px] text-on-surface-variant">{t(language, 'breakdown_sub')}</p>
          </header>

          <div className="w-full overflow-x-auto bg-surface-container border border-outline-variant rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-high">
                  <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Distance
                  </th>
                  <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Predicted
                  </th>
                  <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Target
                  </th>
                  <th scope="col" className="hidden sm:table-cell py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Goal Pace
                  </th>
                  <th scope="col" className="py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {metrics.racePredictions.map((row) => {
                  const isAhead = row.diffSec >= 0;
                  const isRowSelected = row.key === selectedDist;
                  const goalPacePerKm = row.targetSec / row.distanceKm;
                  return (
                    <tr
                      key={row.key}
                      onClick={() => setSelectedDist(row.key)}
                      className={`cursor-pointer transition-colors ${
                        isRowSelected ? 'bg-surface-container-high' : 'hover:bg-surface-container-lowest/40'
                      }`}
                    >
                      <td className={`py-3.5 px-3 sm:px-4 text-sm ${isRowSelected ? 'font-semibold text-primary' : 'text-on-surface'}`}>
                        {row.label}
                      </td>
                      <td className={`py-3.5 px-3 sm:px-4 font-mono text-sm tabular-nums whitespace-nowrap ${isRowSelected ? 'text-primary' : 'text-on-surface'}`}>
                        {formatClock(row.predictedSec)}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 font-mono text-sm text-on-surface-variant tabular-nums whitespace-nowrap">
                        {formatClock(row.targetSec)}
                      </td>
                      <td className="hidden sm:table-cell py-3.5 px-3 sm:px-4 font-mono text-sm text-on-surface-variant tabular-nums whitespace-nowrap">
                        {formatPace(goalPacePerKm, units)}
                      </td>
                      <td className={`py-3.5 px-3 sm:px-4 font-mono text-sm tabular-nums whitespace-nowrap ${isAhead ? 'text-primary' : 'text-warning'}`}>
                        {formatClock(Math.abs(row.diffSec))} {isAhead ? 'ahead' : 'behind'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
