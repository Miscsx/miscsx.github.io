import 'dotenv/config';
import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import type { Activity, AppState, CoachInsight, LanguageCode, RaceGoals, RunType } from './src/types/runtrack.ts';
import { parseUploadedActivity } from './server/parsers.ts';
import {
  addActivity,
  appendCoachMessages,
  clearCoachMessages,
  disconnectGarmin,
  disconnectStrava,
  getPublicAppState,
  getStravaAccessToken,
  logRecoveryCheckIn,
  mergeStravaActivities,
  removeActivity,
  saveGarminCredentials,
  saveStravaCredentials,
  syncGarminNow,
  updateCoachInsights,
  updatePreferences,
  updateRaceGoal,
} from './server/store.ts';

const PORT = 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please set it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildTelemetryContext(state: AppState): string {
  const { preferences, metrics, activities, recoveryLogs, raceGoals } = state;
  const recentRuns = activities.slice(0, 6).map((a) => {
    const paceMin = Math.floor(a.durationSec / a.distanceKm / 60);
    const paceSec = Math.round((a.durationSec / a.distanceKm) % 60);
    return `- ${a.date} | ${a.title} (${a.type}): ${a.distanceKm} km, ${Math.round(a.durationSec / 60)} min, ${paceMin}:${String(paceSec).padStart(2, '0')}/km, avgHR ${a.avgHr} bpm`;
  });

  const langNames: Record<LanguageCode, string> = {
    en: 'English',
    fi: 'Finnish',
    de: 'German',
    fr: 'French',
  };

  return [
    `Athlete: ${preferences.athleteName}`,
    `Preferred Response Language: ${langNames[preferences.language] ?? 'English'}`,
    `Preferred Units: ${preferences.units === 'imperial' ? 'Imperial (miles, min/mi)' : 'Metric (km, min/km)'}`,
    `HR Thresholds: Max HR ${preferences.maxHr} bpm, Lactate Threshold HR ${preferences.thresholdHr} bpm, Resting HR ${preferences.restingHr} bpm`,
    `Current Metrics: VO2 Max ${metrics.vo2Max} ml/kg/min (${metrics.vo2Delta30d >= 0 ? '+' : ''}${metrics.vo2Delta30d} 30d), Weekly Distance ${metrics.weeklyDistanceKm}/${metrics.weeklyGoalKm} km (${metrics.weeklyDistanceDeltaPct >= 0 ? '+' : ''}${metrics.weeklyDistanceDeltaPct}% vs last week), Avg Pace ${Math.floor(metrics.avgPaceSecPerKm / 60)}:${String(metrics.avgPaceSecPerKm % 60).padStart(2, '0')}/km, Avg HR ${metrics.avgHr} bpm`,
    `Training Load & Balance: 7-Day Load ${metrics.weeklyLoad}, 28-Day Baseline ${metrics.baselineLoad}, Load Ratio ${metrics.loadRatio} (${metrics.trainingStatus})`,
    `28-Day Intensity Split: ${metrics.intensityDistribution.easyPct}% Easy (Z1-2), ${metrics.intensityDistribution.tempoPct}% Tempo (Z3-4), ${metrics.intensityDistribution.intervalPct}% Interval (Z5)`,
    `Latest Recovery: Overnight HRV ${metrics.latestHrvMs} ms, Readiness ${metrics.latestReadinessPct}%`,
    `Recent HRV Trend: ${recoveryLogs.map((l) => `${l.dayLabel}:${l.hrvMs}ms`).join(', ')}`,
    `Race Goals (sec): 5K=${raceGoals['5k']}s, 10K=${raceGoals['10k']}s, HM=${raceGoals.hm}s, Marathon=${raceGoals.fm}s`,
    `Recent Runs:\n${recentRuns.join('\n')}`,
  ].join('\n');
}

function formatClockInputToSec(raw: string): number | null {
  const parts = raw.trim().split(':').map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '26mb' }));

  app.get('/api/state', (_req, res) => {
    res.json(getPublicAppState());
  });

  app.post('/api/preferences', (req, res) => {
    const body = req.body ?? {};
    const allowedLangs = new Set(['en', 'fi', 'de', 'fr']);
    const allowedThemes = new Set(['dark', 'light']);
    const allowedUnits = new Set(['metric', 'imperial']);

    const patch: Record<string, unknown> = {};
    if (typeof body.maxHr === 'number' && Number.isFinite(body.maxHr)) patch.maxHr = body.maxHr;
    if (typeof body.thresholdHr === 'number' && Number.isFinite(body.thresholdHr)) patch.thresholdHr = body.thresholdHr;
    if (typeof body.restingHr === 'number' && Number.isFinite(body.restingHr)) patch.restingHr = body.restingHr;
    if (typeof body.weeklyGoalKm === 'number' && Number.isFinite(body.weeklyGoalKm)) patch.weeklyGoalKm = body.weeklyGoalKm;
    if (typeof body.weeklyDigest === 'boolean') patch.weeklyDigest = body.weeklyDigest;
    if (typeof body.language === 'string' && allowedLangs.has(body.language)) patch.language = body.language;
    if (typeof body.theme === 'string' && allowedThemes.has(body.theme)) patch.theme = body.theme;
    if (typeof body.units === 'string' && allowedUnits.has(body.units)) patch.units = body.units;

    const updated = updatePreferences(patch);
    res.json(updated);
  });

  app.post('/api/goals', (req, res) => {
    const { distanceKey, targetTime } = req.body ?? {};
    const validKeys = new Set(['5k', '10k', 'hm', 'fm']);
    if (typeof distanceKey !== 'string' || !validKeys.has(distanceKey)) {
      res.status(400).json({ error: 'Invalid race distance key.' });
      return;
    }
    const sec = typeof targetTime === 'number' ? targetTime : formatClockInputToSec(String(targetTime ?? ''));
    if (!sec || sec < 300 || sec > 36000) {
      res.status(400).json({ error: 'Enter a valid time in HH:MM:SS or MM:SS format.' });
      return;
    }
    const updated = updateRaceGoal(distanceKey as keyof RaceGoals, sec);
    res.json(updated);
  });

  app.post('/api/activities', (req, res) => {
    const { date, title, type, distanceKm, durationSec, avgHr, elevationM, notes } = req.body ?? {};
    const validTypes = new Set<RunType>(['Long Run', 'Easy', 'Tempo', 'Interval', 'Race']);
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof distanceKm !== 'number' ||
      distanceKm <= 0 ||
      typeof durationSec !== 'number' ||
      durationSec <= 0
    ) {
      res.status(400).json({ error: 'Valid run title, distance, and duration are required.' });
      return;
    }

    const safeType: RunType = validTypes.has(type) ? type : 'Easy';
    const safeDate =
      typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : new Date().toISOString().slice(0, 10);
    const safeHr = typeof avgHr === 'number' && avgHr >= 70 && avgHr <= 220 ? Math.round(avgHr) : 148;

    const result = addActivity({
      date: safeDate,
      title: title.trim().slice(0, 80),
      type: safeType,
      distanceKm: Number(distanceKm.toFixed(2)),
      durationSec: Math.round(durationSec),
      avgHr: safeHr,
      elevationM: typeof elevationM === 'number' ? Math.round(elevationM) : undefined,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 300) : undefined,
      source: 'Manual',
    });

    res.json(result);
  });

  app.delete('/api/activities/:id', (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Activity ID required.' });
      return;
    }
    const updated = removeActivity(id);
    res.json(updated);
  });

  app.post('/api/activities/upload', (req, res) => {
    const { filename, contentBase64 } = req.body ?? {};
    if (typeof filename !== 'string' || typeof contentBase64 !== 'string' || !filename.trim() || !contentBase64.trim()) {
      res.status(400).json({ error: 'File name and base64 content are required.' });
      return;
    }

    try {
      const currentState = getPublicAppState();
      const parsed = parseUploadedActivity(filename.trim(), contentBase64, currentState.preferences.thresholdHr);
      const result = addActivity(parsed);
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to parse uploaded activity file.';
      res.status(400).json({ error: msg });
    }
  });

  app.post('/api/recovery', (req, res) => {
    const { hrvMs, restingHr, sleepHours } = req.body ?? {};
    if (
      typeof hrvMs !== 'number' ||
      hrvMs < 15 ||
      hrvMs > 180 ||
      typeof restingHr !== 'number' ||
      restingHr < 30 ||
      restingHr > 110
    ) {
      res.status(400).json({ error: 'Valid HRV (15–180 ms) and resting HR (30–110 bpm) are required.' });
      return;
    }
    const safeSleep = typeof sleepHours === 'number' && sleepHours >= 2 && sleepHours <= 14 ? sleepHours : 7.5;
    res.json(logRecoveryCheckIn(hrvMs, restingHr, safeSleep));
  });

  app.post('/api/integrations/garmin', (req, res) => {
    const { clientId, apiSecret } = req.body ?? {};
    if (typeof clientId !== 'string' || !clientId.trim()) {
      res.status(400).json({ error: 'Garmin Consumer Key / Client ID is required.' });
      return;
    }
    const updated = saveGarminCredentials(clientId, typeof apiSecret === 'string' ? apiSecret : '');
    res.json(updated);
  });

  app.delete('/api/integrations/garmin', (_req, res) => {
    res.json(disconnectGarmin());
  });

  app.post('/api/sync/garmin', (_req, res) => {
    res.json(syncGarminNow());
  });

  app.post('/api/integrations/strava', (req, res) => {
    const { clientId, clientSecret, accessToken } = req.body ?? {};
    if (
      (typeof clientId !== 'string' || !clientId.trim()) &&
      (typeof accessToken !== 'string' || !accessToken.trim())
    ) {
      res.status(400).json({ error: 'Provide either a Strava Client ID or Access Token.' });
      return;
    }
    const updated = saveStravaCredentials(
      typeof clientId === 'string' ? clientId : '',
      typeof clientSecret === 'string' ? clientSecret : '',
      typeof accessToken === 'string' ? accessToken : '',
    );
    res.json(updated);
  });

  app.delete('/api/integrations/strava', (_req, res) => {
    res.json(disconnectStrava());
  });

  app.post('/api/sync/strava', async (_req, res) => {
    const token = getStravaAccessToken();
    if (!token) {
      res.status(400).json({ error: 'Add a Strava API Access Token in Settings to fetch activities from Strava.' });
      return;
    }

    try {
      const stravaRes = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!stravaRes.ok) {
        const errText = await stravaRes.text();
        res.status(stravaRes.status).json({ error: `Strava API returned ${stravaRes.status}: ${errText.slice(0, 140)}` });
        return;
      }
      const rawList = (await stravaRes.json()) as Array<{
        type?: string;
        sport_type?: string;
        name?: string;
        start_date_local?: string;
        distance?: number;
        moving_time?: number;
        average_heartrate?: number;
        max_heartrate?: number;
        total_elevation_gain?: number;
        average_cadence?: number;
      }>;

      const runs: Omit<Activity, 'id'>[] = rawList
        .filter((a) => (a.sport_type ?? a.type ?? '').toLowerCase().includes('run') && (a.distance ?? 0) > 100)
        .map((a) => {
          const distKm = Number(((a.distance ?? 0) / 1000).toFixed(2));
          const durSec = Math.round(a.moving_time ?? distKm * 300);
          const avgHr = Math.round(a.average_heartrate ?? 150);
          const runType: RunType = distKm >= 15 ? 'Long Run' : avgHr >= 168 ? 'Interval' : avgHr >= 156 ? 'Tempo' : 'Easy';
          return {
            date: (a.start_date_local ?? new Date().toISOString()).slice(0, 10),
            title: (a.name ?? 'Strava Run').slice(0, 80),
            type: runType,
            distanceKm: distKm,
            durationSec: durSec,
            avgHr,
            maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : undefined,
            elevationM: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : undefined,
            cadenceSpm: a.average_cadence ? Math.round(a.average_cadence * 2) : undefined,
            source: 'Strava',
          };
        });

      const updated = mergeStravaActivities(runs);
      res.json(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to Strava API.';
      res.status(502).json({ error: msg });
    }
  });

  app.post('/api/coach/chat', async (req, res) => {
    const { message } = req.body ?? {};
    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'A coaching question is required.' });
      return;
    }

    const userText = message.trim().slice(0, 1000);
    const state = getPublicAppState();

    try {
      const ai = getGeminiClient();
      const telemetryContext = buildTelemetryContext(state);

      const historyText = state.coachMessages
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'Runner' : 'Coach'}: ${m.text}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Recent conversation:\n${historyText}\n\nRunner's new question: ${userText}`,
        config: {
          systemInstruction: `You are RunTrack Coach, an evidence-based endurance running coach analyzing real Garmin & Strava telemetry.
Be concise, encouraging, and grounded in running physiology (2-4 crisp sentences max unless a workout split breakdown is requested).
Respond in the athlete's preferred language (${state.preferences.language}) and preferred distance units (${state.preferences.units}).
Cite the athlete's actual numbers below accurately; never invent metrics.

ATHLETE TELEMETRY:
${telemetryContext}`,
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: 'The AI coach returned an empty response. Please try again.' });
        return;
      }

      const updated = appendCoachMessages(userText, reply);
      res.json(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach AI Running Coach.';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/coach/chat', (_req, res) => {
    res.json(clearCoachMessages());
  });

  app.post('/api/coach/insights', async (_req, res) => {
    const state = getPublicAppState();
    try {
      const ai = getGeminiClient();
      const telemetryContext = buildTelemetryContext(state);

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: 'Generate 3 high-signal running coaching insights based strictly on this athlete telemetry.',
        config: {
          systemInstruction: `You are RunTrack Coach. Produce 3 concise, quantitative coaching insights in ${state.preferences.language} using ${state.preferences.units} units based only on the telemetry below.\n\n${telemetryContext}`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: 'Short 1-2 word category like Heart Efficiency, Load Balance, Aerobic Capacity' },
                badgeType: { type: Type.STRING, description: 'One of: success, warning, info' },
                deltaLabel: { type: Type.STRING, description: 'Short numeric telemetry delta, e.g. +12.4% or 64 ms HRV' },
                title: { type: Type.STRING, description: 'Concise headline sentence' },
                body: { type: Type.STRING, description: '1-2 sentence physiological explanation and next workout cue' },
              },
              required: ['category', 'badgeType', 'deltaLabel', 'title', 'body'],
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '[]').trim()) as Array<{
        category: string;
        badgeType: string;
        deltaLabel: string;
        title: string;
        body: string;
      }>;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        res.status(502).json({ error: 'Failed to generate structured insights.' });
        return;
      }

      const normalized: CoachInsight[] = parsed.slice(0, 3).map((item, idx) => ({
        id: `ins-${Date.now()}-${idx}`,
        category: item.category,
        badgeType: item.badgeType === 'warning' || item.badgeType === 'info' ? item.badgeType : 'success',
        deltaLabel: item.deltaLabel,
        title: item.title,
        body: item.body,
      }));

      res.json(updateCoachInsights(normalized));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to refresh AI coaching insights.';
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RunTrack AI server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start RunTrack AI server:', err);
  process.exit(1);
});
