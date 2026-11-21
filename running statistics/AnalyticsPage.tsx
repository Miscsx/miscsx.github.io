import { TrendingDown, TrendingUp } from 'lucide-react';
import type { AppState } from '../types/runtrack';
import { t } from '../i18n/translations';
import { convertDistance, paceUnitLabel, unitLabel } from '../utils/format';
import {
  HeartRateTrendChart,
  MonthlyDistanceChart,
  PaceDevelopmentChart,
  Vo2Chart,
} from '../components/Charts';

export function AnalyticsPage({ state }: { state: AppState }) {
  const { preferences, metrics } = state;
  const { language, units } = preferences;
  const trends = metrics.monthlyTrends;
  const firstMonth = trends[0];
  const latestMonth = trends[trends.length - 1];
  const vo2Gain6m = (latestMonth.vo2Max - firstMonth.vo2Max).toFixed(1);
  const hrDrop6m = firstMonth.benchmarkHr - latestMonth.benchmarkHr;
  const latestMonthDist = Math.round(convertDistance(latestMonth.distanceKm, units));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
        <h1 className="text-[26px] leading-8 font-bold tracking-tight text-on-surface">
          {t(language, 'analytics_title')}
        </h1>
        <span className="text-[13px] text-on-surface-variant">{t(language, 'analytics_subtitle')}</span>
      </div>

      {/* Top Row: VO2 Max Development + Pace Development */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <article className="lg:col-span-6 bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'vo2_dev')}</h2>
              <p className="text-[13px] text-on-surface-variant">6-month aerobic capacity (ml/kg/min)</p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-[28px] leading-8 font-semibold text-on-surface tabular-nums">
                {metrics.vo2Max.toFixed(1)}
              </span>
              <span className="inline-flex items-center justify-end gap-1 w-full font-mono text-xs text-primary tabular-nums">
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {Number(vo2Gain6m) >= 0 ? '+' : ''}
                  {vo2Gain6m} since June
                </span>
              </span>
            </div>
          </header>
          <Vo2Chart data={trends} />
        </article>

        <article className="lg:col-span-6 bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'pace_dev')}</h2>
              <p className="text-[13px] text-on-surface-variant">
                Average easy pace vs. threshold pace (min{paceUnitLabel(units)})
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-on-surface">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full bg-primary" aria-hidden="true" />
                Threshold Pace
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full bg-tertiary" aria-hidden="true" />
                Easy Pace
              </span>
            </div>
          </header>
          <PaceDevelopmentChart data={trends} units={units} />
        </article>
      </section>

      {/* Middle Row: Heart Rate Trends + Monthly Running Distance */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <article className="lg:col-span-6 bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <header className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'hr_trends')}</h2>
              <p className="text-[13px] text-on-surface-variant">Average heart rate (bpm) across training months</p>
            </div>
            <span className="inline-flex items-center gap-1 font-mono text-xs text-tertiary tabular-nums shrink-0">
              <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {hrDrop6m >= 0 ? `${hrDrop6m} bpm lower` : `+${Math.abs(hrDrop6m)} bpm`} (6 mo)
              </span>
            </span>
          </header>
          <HeartRateTrendChart data={trends} />
        </article>

        <article className="lg:col-span-6 bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'monthly_dist')}</h2>
              <p className="text-[13px] text-on-surface-variant">
                Total monthly distance ({unitLabel(units)}) across 2026
              </p>
            </div>
            <span className="font-mono text-xs text-primary tabular-nums shrink-0">
              {latestMonthDist} {unitLabel(units)} (Nov)
            </span>
          </header>
          <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-surface-container-highest border border-outline" aria-hidden="true" />
              Base
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-secondary" aria-hidden="true" />
              Build
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-primary-container" aria-hidden="true" />
              Peak
            </span>
          </div>
          <MonthlyDistanceChart data={trends} units={units} />
        </article>
      </section>

      {/* Personal Records */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'personal_records')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5 items-stretch">
          {metrics.personalRecords.map((pr, idx) => (
            <article
              key={pr.id}
              className={`${
                idx === metrics.personalRecords.length - 1 ? 'col-span-2 sm:col-span-1' : ''
              } h-full bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col justify-between gap-2`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {pr.label}
              </span>
              <span
                className={`font-mono text-[28px] leading-8 font-semibold tabular-nums ${
                  pr.highlight ? 'text-primary' : 'text-on-surface'
                }`}
              >
                {pr.valueFormatted}
              </span>
              <span className="text-xs text-on-surface-variant">{pr.sublabel}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
