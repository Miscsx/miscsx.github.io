import type {
  Activity,
  AthletePreferences,
  ComputedMetrics,
  DailyMileagePoint,
  ImbalanceItem,
  MonthlyMetricPoint,
  PersonalRecord,
  RaceGoals,
  RacePredictionItem,
  RecoveryLog,
  WeeklyLoadPoint,
} from '../src/types/runtrack.ts';

const REFERENCE_TODAY = '2026-11-21';

function parseDateUtc(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

function addDays(ymd: string, delta: number): string {
  const d = parseDateUtc(ymd);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  return Math.round((parseDateUtc(a).getTime() - parseDateUtc(b).getTime()) / 86400000);
}

function formatDurationClock(sec: number): string {
  const rounded = Math.max(0, Math.round(sec));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPaceClock(secPerKm: number): string {
  const rounded = Math.max(120, Math.round(secPerKm));
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

function calcRunTrimp(act: Activity, prefs: AthletePreferences): number {
  const minutes = act.durationSec / 60;
  const hrReserve = Math.max(20, prefs.maxHr - prefs.restingHr);
  const hrr = Math.min(1.05, Math.max(0.25, (act.avgHr - prefs.restingHr) / hrReserve));
  const intensityFactor = 0.64 * Math.exp(1.92 * hrr);
  return Math.round(minutes * hrr * intensityFactor * 1.15);
}

function estimateVo2FromRun(act: Activity, prefs: AthletePreferences): number | null {
  if (act.distanceKm < 3 || act.durationSec < 600) return null;
  const speedMetersPerMin = (act.distanceKm * 1000) / (act.durationSec / 60);
  const hrReserve = Math.max(20, prefs.maxHr - prefs.restingHr);
  const pctHrr = Math.min(0.98, Math.max(0.55, (act.avgHr - prefs.restingHr) / hrReserve));
  const pctVo2 = pctHrr * 0.98;
  // ACSM running VO2 formula
  const vo2AtPace = 0.2 * speedMetersPerMin + 3.5;
  const estMax = vo2AtPace / pctVo2;
  if (!Number.isFinite(estMax) || estMax < 30 || estMax > 85) return null;
  return estMax;
}

export function computeMetrics(
  activities: Activity[],
  recoveryLogs: RecoveryLog[],
  prefs: AthletePreferences,
  raceGoals: RaceGoals,
): ComputedMetrics {
  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date));

  // Anchor "today" to latest activity date if beyond reference today, otherwise reference today
  const latestActivityDate = sorted[0]?.date ?? REFERENCE_TODAY;
  const today = latestActivityDate > REFERENCE_TODAY ? latestActivityDate : REFERENCE_TODAY;

  // Current 7-day window (Mon Nov 15 .. Sun Nov 21 style 7-day window ending on `today`)
  const weekStart = addDays(today, -6);
  const prevWeekStart = addDays(today, -13);
  const prevWeekEnd = addDays(today, -7);

  const thisWeekRuns = sorted.filter((a) => a.date >= weekStart && a.date <= today);
  const prevWeekRuns = sorted.filter((a) => a.date >= prevWeekStart && a.date <= prevWeekEnd);
  const last14Runs = sorted.filter((a) => a.date >= addDays(today, -13) && a.date <= today);
  const prev14Runs = sorted.filter((a) => a.date >= addDays(today, -27) && a.date <= addDays(today, -14));
  const last28Runs = sorted.filter((a) => a.date >= addDays(today, -27) && a.date <= today);
  const last30Runs = sorted.filter((a) => a.date >= addDays(today, -29) && a.date <= today);
  const prior30Runs = sorted.filter((a) => a.date >= addDays(today, -59) && a.date <= addDays(today, -30));

  const weeklyDistanceKm = Number(thisWeekRuns.reduce((s, r) => s + r.distanceKm, 0).toFixed(1));
  const prevWeekDistKm = prevWeekRuns.reduce((s, r) => s + r.distanceKm, 0);
  const weeklyDistanceDeltaPct =
    prevWeekDistKm > 0 ? Number((((weeklyDistanceKm - prevWeekDistKm) / prevWeekDistKm) * 100).toFixed(1)) : 0;

  const totalWeekSec = thisWeekRuns.reduce((s, r) => s + r.durationSec, 0);
  const avgPaceSecPerKm = weeklyDistanceKm > 0 ? Math.round(totalWeekSec / weeklyDistanceKm) : 292;
  const prevWeekSec = prevWeekRuns.reduce((s, r) => s + r.durationSec, 0);
  const prevAvgPace = prevWeekDistKm > 0 ? Math.round(prevWeekSec / prevWeekDistKm) : avgPaceSecPerKm;
  const paceDeltaSec = prevAvgPace - avgPaceSecPerKm; // positive means faster

  const hrWeightedSum = last14Runs.reduce((s, r) => s + r.avgHr * r.durationSec, 0);
  const hrTotalDur = last14Runs.reduce((s, r) => s + r.durationSec, 0);
  const avgHr = hrTotalDur > 0 ? Math.round(hrWeightedSum / hrTotalDur) : 151;

  const prevHrWeighted = prev14Runs.reduce((s, r) => s + r.avgHr * r.durationSec, 0);
  const prevHrDur = prev14Runs.reduce((s, r) => s + r.durationSec, 0);
  const prevAvgHr = prevHrDur > 0 ? Math.round(prevHrWeighted / prevHrDur) : avgHr;
  const hrDelta14d = avgHr - prevAvgHr; // negative means lower HR

  const recentVo2Vals = last30Runs.map((r) => estimateVo2FromRun(r, prefs)).filter((v): v is number => v !== null);
  const priorVo2Vals = prior30Runs.map((r) => estimateVo2FromRun(r, prefs)).filter((v): v is number => v !== null);
  const vo2Max =
    recentVo2Vals.length > 0
      ? Number((recentVo2Vals.reduce((a, b) => a + b, 0) / recentVo2Vals.length).toFixed(1))
      : 54.2;
  const priorVo2 =
    priorVo2Vals.length > 0
      ? Number((priorVo2Vals.reduce((a, b) => a + b, 0) / priorVo2Vals.length).toFixed(1))
      : Number((vo2Max - 1.4).toFixed(1));
  const vo2Delta30d = Number((vo2Max - priorVo2).toFixed(1));

  // Weekly load & 28-day baseline
  const weeklyLoad = thisWeekRuns.reduce((s, r) => s + calcRunTrimp(r, prefs), 0);
  const load28 = last28Runs.reduce((s, r) => s + calcRunTrimp(r, prefs), 0);
  const baselineLoad = Math.max(1, Math.round(load28 / 4));
  const loadRatio = Number((weeklyLoad / baselineLoad).toFixed(2));

  let trainingStatus: ComputedMetrics['trainingStatus'] = 'Productive';
  if (loadRatio > 1.35) trainingStatus = 'Overreaching';
  else if (loadRatio >= 1.0 && loadRatio <= 1.35) trainingStatus = 'Productive';
  else if (loadRatio >= 0.85) trainingStatus = 'Maintaining';
  else if (loadRatio >= 0.65) trainingStatus = 'Recovery';
  else trainingStatus = 'Peaking';

  // Daily mileage for the 7-day window
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dailyMileage: DailyMileagePoint[] = [];
  for (let i = 0; i < 7; i++) {
    const dStr = addDays(weekStart, i);
    const dRuns = thisWeekRuns.filter((r) => r.date === dStr);
    const dt = parseDateUtc(dStr);
    const label = dayNames[dt.getUTCDay()];
    if (dRuns.length === 0) {
      dailyMileage.push({ day: label, date: dStr, distanceKm: 0, type: 'Rest' });
    } else {
      const totalKm = Number(dRuns.reduce((s, r) => s + r.distanceKm, 0).toFixed(1));
      const totalSec = dRuns.reduce((s, r) => s + r.durationSec, 0);
      const wHr = Math.round(dRuns.reduce((s, r) => s + r.avgHr * r.durationSec, 0) / Math.max(1, totalSec));
      const primaryRun = [...dRuns].sort((a, b) => b.distanceKm - a.distanceKm)[0];
      dailyMileage.push({
        day: label,
        date: dStr,
        distanceKm: totalKm,
        type: primaryRun.type,
        title: primaryRun.title,
        paceSecPerKm: Math.round(totalSec / Math.max(0.1, totalKm)),
        avgHr: wHr,
      });
    }
  }

  // 8-week history
  const weeklyHistory: WeeklyLoadPoint[] = [];
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let w = 7; w >= 0; w--) {
    const wEnd = addDays(today, -w * 7);
    const wStart = addDays(wEnd, -6);
    const runsInW = sorted.filter((r) => r.date >= wStart && r.date <= wEnd);
    const dist = Number(runsInW.reduce((s, r) => s + r.distanceKm, 0).toFixed(1));
    const load = runsInW.reduce((s, r) => s + calcRunTrimp(r, prefs), 0);

    // 4-week rolling baseline ending at wEnd
    const bStart = addDays(wEnd, -27);
    const bRuns = sorted.filter((r) => r.date >= bStart && r.date <= wEnd);
    const bLoad = Math.round(bRuns.reduce((s, r) => s + calcRunTrimp(r, prefs), 0) / 4);

    const sDate = parseDateUtc(wStart);
    const eDate = parseDateUtc(wEnd);
    const dateRange = `${monthNamesShort[sDate.getUTCMonth()]} ${String(sDate.getUTCDate()).padStart(2, '0')} – ${monthNamesShort[eDate.getUTCMonth()]} ${String(eDate.getUTCDate()).padStart(2, '0')}`;
    const wkNum = 47 - w;
    const latestRec = recoveryLogs[recoveryLogs.length - 1]?.readinessPct ?? 84;
    const readinessPct = w === 0 ? latestRec : Math.max(70, Math.min(92, Math.round(86 - Math.max(0, load - bLoad) / 14)));

    weeklyHistory.push({
      weekLabel: `Wk ${wkNum}`,
      dateRange,
      sessions: runsInW.length,
      distanceKm: dist,
      load,
      baselineLoad: bLoad,
      readinessPct,
    });
  }

  // 6-month trends (Jun..Nov 2026)
  const monthsMap = [
    { key: '2026-06', label: 'JUN' },
    { key: '2026-07', label: 'JUL' },
    { key: '2026-08', label: 'AUG' },
    { key: '2026-09', label: 'SEP' },
    { key: '2026-10', label: 'OCT' },
    { key: '2026-11', label: 'NOV' },
  ];
  const monthlyTrends: MonthlyMetricPoint[] = monthsMap.map((m, idx) => {
    const mRuns = sorted.filter((r) => r.date.startsWith(m.key));
    const dist = Number(mRuns.reduce((s, r) => s + r.distanceKm, 0).toFixed(1));
    const vo2Vals = mRuns.map((r) => estimateVo2FromRun(r, prefs)).filter((v): v is number => v !== null);
    const mVo2 =
      vo2Vals.length > 0
        ? Number((vo2Vals.reduce((a, b) => a + b, 0) / vo2Vals.length).toFixed(1))
        : Number((51.1 + idx * 0.6).toFixed(1));
    const easyRuns = mRuns.filter((r) => r.type === 'Easy' || r.type === 'Long Run');
    const hardRuns = mRuns.filter((r) => r.type === 'Tempo' || r.type === 'Interval' || r.type === 'Race');
    const easyDist = easyRuns.reduce((s, r) => s + r.distanceKm, 0);
    const easyDur = easyRuns.reduce((s, r) => s + r.durationSec, 0);
    const hardDist = hardRuns.reduce((s, r) => s + r.distanceKm, 0);
    const hardDur = hardRuns.reduce((s, r) => s + r.durationSec, 0);
    const easyPaceSec = easyDist > 0 ? Math.round(easyDur / easyDist) : 326 - idx * 4;
    const thresholdPaceSec = hardDist > 0 ? Math.round(hardDur / hardDist) : 276 - idx * 3;
    const hrAvg =
      mRuns.length > 0
        ? Math.round(mRuns.reduce((s, r) => s + r.avgHr * r.durationSec, 0) / Math.max(1, mRuns.reduce((s, r) => s + r.durationSec, 0)))
        : 158 - idx;

    return {
      month: m.label,
      vo2Max: mVo2,
      thresholdPaceSec,
      easyPaceSec,
      benchmarkHr: hrAvg,
      distanceKm: dist,
    };
  });

  // Intensity distribution (last 28 days) based on user's HR zones
  const z2Cap = Math.round(prefs.thresholdHr * 0.87); // ~149 bpm for 171 threshold
  const z4Cap = Math.round(prefs.thresholdHr * 0.97); // ~166 bpm for 171 threshold
  let easyMin = 0;
  let tempoMin = 0;
  let intervalMin = 0;
  for (const r of last28Runs) {
    const mins = r.durationSec / 60;
    if (r.type === 'Interval' || r.avgHr >= z4Cap) {
      intervalMin += mins;
    } else if (r.type === 'Tempo' || r.avgHr >= z2Cap) {
      tempoMin += mins;
    } else {
      easyMin += mins;
    }
  }
  const totalIntMin = Math.max(1, Math.round(easyMin + tempoMin + intervalMin));
  const easyPct = Math.round((easyMin / totalIntMin) * 100);
  const tempoPct = Math.round((tempoMin / totalIntMin) * 100);
  const intervalPct = Math.max(0, 100 - easyPct - tempoPct);

  // Imbalances check
  const highIntensityPct = tempoPct + intervalPct;
  const gcbRuns = last14Runs.filter((r) => typeof r.gcbLeftPct === 'number');
  const avgGcbLeft =
    gcbRuns.length > 0
      ? Number((gcbRuns.reduce((s, r) => s + (r.gcbLeftPct ?? 50), 0) / gcbRuns.length).toFixed(1))
      : 49.6;
  const avgGcbRight = Number((100 - avgGcbLeft).toFixed(1));
  const gcbVariance = Math.abs(avgGcbLeft - 50);

  const imbalances: ImbalanceItem[] = [];
  if (highIntensityPct > 22) {
    imbalances.push({
      id: 'intensity-ratio',
      severity: 'warning',
      title: `High-Intensity Share Slightly Elevated (${highIntensityPct}% vs. 20%)`,
      description: 'Threshold + interval minutes exceeded 20% of 28-day volume. Swap one mid-week tempo block for an easy Zone 2 run.',
    });
  } else {
    imbalances.push({
      id: 'intensity-ratio',
      severity: 'ok',
      title: `80/20 Intensity Balance Optimal (${easyPct}% Easy / ${highIntensityPct}% Quality)`,
      description: 'Aerobic base vs. threshold/VO2 work is well balanced to drive fitness without overtraining.',
    });
  }

  if (loadRatio > 1.3) {
    imbalances.push({
      id: 'load-spike',
      severity: 'warning',
      title: `Acute Training Load Spike (${loadRatio}x baseline)`,
      description: 'Recent 7-day load jumped more than 30% above your 28-day rolling baseline. Schedule an extra recovery day.',
    });
  }

  imbalances.push({
    id: 'gcb',
    severity: gcbVariance > 1.5 ? 'warning' : 'ok',
    title: `Left / Right Ground Contact Balance: ${avgGcbLeft}% / ${avgGcbRight}%`,
    description:
      gcbVariance > 1.5
        ? 'Asymmetry slightly elevated (>1.5% variance). Include single-leg stability drills.'
        : 'Within optimal symmetry threshold (<1.0% variance) across all paces.',
  });

  // Personal Records dynamically checking uploaded runs too
  const fastest1kPace = sorted.reduce((best, r) => {
    const pace = r.durationSec / Math.max(0.1, r.distanceKm);
    return r.distanceKm >= 1 && pace < best.pace ? { pace, date: r.date, title: r.title } : best;
  }, { pace: 214, date: '2026-10-12', title: 'Track' });

  const best5k = sorted
    .filter((r) => r.distanceKm >= 4.9 && r.distanceKm <= 6.0)
    .reduce(
      (best, r) => {
        const est5k = (r.durationSec / r.distanceKm) * 5;
        return est5k < best.sec ? { sec: Math.round(est5k), date: r.date } : best;
      },
      { sec: 1188, date: '2026-09-28' },
    );

  const best10k = sorted
    .filter((r) => r.distanceKm >= 9.8 && r.distanceKm <= 11.5)
    .reduce(
      (best, r) => {
        const est10k = (r.durationSec / r.distanceKm) * 10;
        return est10k < best.sec ? { sec: Math.round(est10k), date: r.date } : best;
      },
      { sec: 2472, date: '2026-10-19' },
    );

  const bestHm = sorted
    .filter((r) => r.distanceKm >= 20.8 && r.distanceKm <= 22.0)
    .reduce(
      (best, r) => {
        const estHm = (r.durationSec / r.distanceKm) * 21.0975;
        return estHm < best.sec ? { sec: Math.round(estHm), date: r.date } : best;
      },
      { sec: 5692, date: '2026-05-04' },
    );

  const longestRun = sorted.reduce(
    (best, r) => (r.distanceKm > best.distanceKm ? r : best),
    { distanceKm: 26.2, durationSec: 7965, date: '2026-11-03' } as Pick<Activity, 'distanceKm' | 'durationSec' | 'date'>,
  );

  const fmtPrDate = (ymd: string) => {
    const d = parseDateUtc(ymd);
    return `${monthNamesShort[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
  };

  const personalRecords: PersonalRecord[] = [
    {
      id: '1k',
      label: 'Fastest 1K',
      valueFormatted: formatDurationClock(fastest1kPace.pace),
      sublabel: `${fmtPrDate(fastest1kPace.date)} · ${fastest1kPace.pace <= 214 ? 'Track' : 'Road'}`,
      highlight: true,
    },
    {
      id: '5k',
      label: '5K Best',
      valueFormatted: formatDurationClock(best5k.sec),
      sublabel: `${fmtPrDate(best5k.date)} · ${formatPaceClock(best5k.sec / 5)}`,
    },
    {
      id: '10k',
      label: '10K Best',
      valueFormatted: formatDurationClock(best10k.sec),
      sublabel: `${fmtPrDate(best10k.date)} · ${formatPaceClock(best10k.sec / 10)}`,
    },
    {
      id: 'hm',
      label: 'Half Marathon',
      valueFormatted: formatDurationClock(bestHm.sec),
      sublabel: `${fmtPrDate(bestHm.date)} · ${formatPaceClock(bestHm.sec / 21.0975)}`,
    },
    {
      id: 'longest',
      label: 'Longest Run',
      valueFormatted: `${longestRun.distanceKm.toFixed(1)} km`,
      sublabel: `${fmtPrDate(longestRun.date)} · ${formatPaceClock(longestRun.durationSec / longestRun.distanceKm)}`,
    },
  ];

  // Race Predictions calibrated from VO2 max (at VO2 54.2 => 5K ~ 19:24, 10K ~ 40:32, HM ~ 1:34:18, FM ~ 3:21:10)
  const base5kSec = Math.round(1164 * Math.pow(54.2 / Math.max(35, vo2Max), 0.95));
  const predDefs: { key: RacePredictionItem['key']; label: string; distKm: number; riegelExp: number; spread: number }[] = [
    { key: '5k', label: '5K', distKm: 5, riegelExp: 1.0, spread: 15 },
    { key: '10k', label: '10K', distKm: 10, riegelExp: 1.062, spread: 28 },
    { key: 'hm', label: 'Half Marathon', distKm: 21.0975, riegelExp: 1.097, spread: 58 },
    { key: 'fm', label: 'Marathon', distKm: 42.195, riegelExp: 1.132, spread: 175 },
  ];

  const racePredictions: RacePredictionItem[] = predDefs.map((p) => {
    const predictedSec = Math.round(base5kSec * Math.pow(p.distKm / 5, p.riegelExp));
    const targetSec = raceGoals[p.key];
    return {
      key: p.key,
      label: p.label,
      distanceKm: p.distKm,
      predictedSec,
      rangeLowSec: predictedSec - p.spread,
      rangeHighSec: predictedSec + p.spread,
      targetSec,
      diffSec: targetSec - predictedSec, // positive => predicted is faster than target
    };
  });

  const latestRec = recoveryLogs[recoveryLogs.length - 1];
  const latestHrvMs = latestRec?.hrvMs ?? 64;
  const latestReadinessPct = latestRec?.readinessPct ?? 84;

  const hrZones = [
    { zone: 'Z1', label: 'Recovery', minHr: Math.round(prefs.maxHr * 0.55), maxHr: Math.round(prefs.maxHr * 0.68) },
    { zone: 'Z2', label: 'Aerobic Easy', minHr: Math.round(prefs.maxHr * 0.68) + 1, maxHr: Math.round(prefs.thresholdHr * 0.87) },
    { zone: 'Z3', label: 'Tempo', minHr: Math.round(prefs.thresholdHr * 0.87) + 1, maxHr: Math.round(prefs.thresholdHr * 0.94) },
    { zone: 'Z4', label: 'Threshold', minHr: Math.round(prefs.thresholdHr * 0.94) + 1, maxHr: prefs.thresholdHr + 3 },
    { zone: 'Z5', label: 'VO2 Max', minHr: prefs.thresholdHr + 4, maxHr: prefs.maxHr },
  ];

  // Keep days offset cleanly referenced to avoid unused helper warning
  void dayDiff;

  return {
    vo2Max,
    vo2Delta30d,
    weeklyDistanceKm,
    weeklyGoalKm: prefs.weeklyGoalKm,
    weeklyDistanceDeltaPct,
    avgPaceSecPerKm,
    paceDeltaSec,
    avgHr,
    hrDelta14d,
    loadRatio,
    trainingStatus,
    weeklyLoad,
    baselineLoad,
    dailyMileage,
    weeklyHistory,
    monthlyTrends,
    intensityDistribution: {
      totalMinutes: totalIntMin,
      easyPct,
      easyMinutes: Math.round(easyMin),
      tempoPct,
      tempoMinutes: Math.round(tempoMin),
      intervalPct,
      intervalMinutes: Math.round(intervalMin),
    },
    imbalances,
    personalRecords,
    racePredictions,
    latestHrvMs,
    latestReadinessPct,
    hrZones,
  };
}
