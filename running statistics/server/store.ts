import fs from 'fs';
import path from 'path';
import type {
  Activity,
  AppState,
  AthletePreferences,
  CoachInsight,
  CoachMessage,
  IntegrationsState,
  RaceGoals,
  RecoveryLog,
} from '../src/types/runtrack.ts';
import { computeMetrics } from './metrics.ts';

interface StoredSecrets {
  garminClientId: string;
  garminApiSecret: string;
  stravaClientId: string;
  stravaClientSecret: string;
  stravaAccessToken: string;
}

interface PersistedStore {
  preferences: AthletePreferences;
  integrations: IntegrationsState;
  secrets: StoredSecrets;
  activities: Activity[];
  recoveryLogs: RecoveryLog[];
  raceGoals: RaceGoals;
  insights: CoachInsight[];
  coachMessages: CoachMessage[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'runtrack-store.json');

function maskClientId(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 4) return '••••';
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-2)}`;
}

function createInitialStore(): PersistedStore {
  const activities: Activity[] = [
    // Week 47 (Nov 15 - Nov 21, 2026): 8.2 + 10.4 + 6.5 + 7.1 + 16.4 = 48.6 km
    {
      id: 'act-nov21',
      date: '2026-11-21',
      title: 'Sunday Long Progression',
      type: 'Long Run',
      distanceKm: 16.4,
      durationSec: 4842, // 1:20:42 -> 4:55 /km
      avgHr: 153,
      maxHr: 168,
      elevationM: 142,
      cadenceSpm: 176,
      gcbLeftPct: 49.7,
      source: 'Garmin',
    },
    {
      id: 'act-nov20',
      date: '2026-11-20',
      title: 'Morning Aerobic Shakeout',
      type: 'Easy',
      distanceKm: 7.1,
      durationSec: 2224, // 37:04 -> 5:13 /km
      avgHr: 139,
      maxHr: 147,
      elevationM: 38,
      cadenceSpm: 170,
      gcbLeftPct: 49.5,
      source: 'Garmin',
    },
    {
      id: 'act-nov18',
      date: '2026-11-18',
      title: 'Riverfront Easy Miles',
      type: 'Easy',
      distanceKm: 6.5,
      durationSec: 2035, // 33:55 -> 5:13 /km
      avgHr: 138,
      maxHr: 145,
      elevationM: 24,
      cadenceSpm: 171,
      gcbLeftPct: 49.6,
      source: 'Garmin',
    },
    {
      id: 'act-nov17',
      date: '2026-11-17',
      title: 'Track 5 x 1000m Intervals',
      type: 'Interval',
      distanceKm: 10.4,
      durationSec: 2714, // 45:14 -> 4:21 /km
      avgHr: 168,
      maxHr: 184,
      elevationM: 12,
      cadenceSpm: 184,
      gcbLeftPct: 49.8,
      source: 'Garmin',
    },
    {
      id: 'act-nov15',
      date: '2026-11-15',
      title: 'Monday Aerobic Tempo Mix',
      type: 'Tempo',
      distanceKm: 8.2,
      durationSec: 2368, // 39:28 -> 4:48 /km
      avgHr: 158,
      maxHr: 170,
      elevationM: 64,
      cadenceSpm: 178,
      gcbLeftPct: 49.5,
      source: 'Garmin',
    },
    // Week 46 (Nov 08 - Nov 14): 43.2 km
    {
      id: 'act-nov14',
      date: '2026-11-14',
      title: 'Canal Path Long Run',
      type: 'Long Run',
      distanceKm: 15.2,
      durationSec: 4590,
      avgHr: 151,
      maxHr: 165,
      elevationM: 110,
      cadenceSpm: 174,
      gcbLeftPct: 49.6,
      source: 'Garmin',
    },
    {
      id: 'act-nov12',
      date: '2026-11-12',
      title: 'Midweek Recovery Loop',
      type: 'Easy',
      distanceKm: 7.0,
      durationSec: 2219,
      avgHr: 137,
      elevationM: 31,
      cadenceSpm: 169,
      gcbLeftPct: 49.6,
      source: 'Garmin',
    },
    {
      id: 'act-nov11',
      date: '2026-11-11',
      title: 'Threshold 3 x 2km Cruise',
      type: 'Tempo',
      distanceKm: 9.6,
      durationSec: 2560,
      avgHr: 164,
      elevationM: 42,
      cadenceSpm: 181,
      gcbLeftPct: 49.7,
      source: 'Garmin',
    },
    {
      id: 'act-nov09',
      date: '2026-11-09',
      title: 'Base Aerobic Miles',
      type: 'Easy',
      distanceKm: 11.4,
      durationSec: 3568,
      avgHr: 141,
      elevationM: 54,
      cadenceSpm: 172,
      gcbLeftPct: 49.5,
      source: 'Garmin',
    },
    // Week 45 (Nov 01 - Nov 07): 41.8 km
    {
      id: 'act-nov07',
      date: '2026-11-07',
      title: 'Easy Shakeout 6K',
      type: 'Easy',
      distanceKm: 6.2,
      durationSec: 1965,
      avgHr: 138,
      source: 'Garmin',
    },
    {
      id: 'act-nov05',
      date: '2026-11-05',
      title: '6 x 800m VO2 Repeats',
      type: 'Interval',
      distanceKm: 9.4,
      durationSec: 2480,
      avgHr: 169,
      source: 'Garmin',
    },
    {
      id: 'act-nov03',
      date: '2026-11-03',
      title: 'Overdistance Peak Endurance Run',
      type: 'Long Run',
      distanceKm: 26.2,
      durationSec: 7965,
      avgHr: 152,
      elevationM: 215,
      cadenceSpm: 174,
      gcbLeftPct: 49.7,
      source: 'Garmin',
    },
    // Week 44 (Oct 25 - Oct 31): 44.5 km
    {
      id: 'act-oct30',
      date: '2026-10-30',
      title: 'Weekend Endurance 16K',
      type: 'Long Run',
      distanceKm: 16.0,
      durationSec: 4840,
      avgHr: 151,
      source: 'Garmin',
    },
    {
      id: 'act-oct28',
      date: '2026-10-28',
      title: 'Tempo 20 min Block',
      type: 'Tempo',
      distanceKm: 10.5,
      durationSec: 2860,
      avgHr: 162,
      source: 'Garmin',
    },
    {
      id: 'act-oct26',
      date: '2026-10-26',
      title: 'Aerobic Base 18K Split',
      type: 'Easy',
      distanceKm: 18.0,
      durationSec: 5640,
      avgHr: 142,
      source: 'Garmin',
    },
    // Earlier October & June-September benchmark runs for 6-month analytics
    { id: 'act-oct19', date: '2026-10-19', title: 'Autumn 10K Benchmark', type: 'Race', distanceKm: 10.0, durationSec: 2472, avgHr: 174, source: 'Garmin' },
    { id: 'act-oct12', date: '2026-10-12', title: 'Track Mile & 1K Speed', type: 'Interval', distanceKm: 9.0, durationSec: 2380, avgHr: 166, source: 'Garmin' },
    { id: 'act-oct06', date: '2026-10-06', title: 'October Long Base', type: 'Long Run', distanceKm: 22.0, durationSec: 6820, avgHr: 149, source: 'Garmin' },
    { id: 'act-oct02', date: '2026-10-02', title: 'Park Loop Easy', type: 'Easy', distanceKm: 14.0, durationSec: 4410, avgHr: 141, source: 'Garmin' },
    { id: 'act-sep28', date: '2026-09-28', title: 'Harbor 5K Time Trial', type: 'Race', distanceKm: 5.0, durationSec: 1188, avgHr: 178, source: 'Garmin' },
    { id: 'act-sep21', date: '2026-09-21', title: 'September Endurance', type: 'Long Run', distanceKm: 21.0, durationSec: 6580, avgHr: 150, source: 'Garmin' },
    { id: 'act-sep12', date: '2026-09-12', title: 'Mid-Sep Aerobic Volume', type: 'Easy', distanceKm: 18.5, durationSec: 5920, avgHr: 143, source: 'Garmin' },
    { id: 'act-sep04', date: '2026-09-04', title: 'Threshold Ladder', type: 'Tempo', distanceKm: 12.0, durationSec: 3320, avgHr: 163, source: 'Garmin' },
    { id: 'act-aug24', date: '2026-08-24', title: 'Late August Long Run', type: 'Long Run', distanceKm: 22.0, durationSec: 7040, avgHr: 152, source: 'Garmin' },
    { id: 'act-aug14', date: '2026-08-14', title: 'Summer Aerobic Block', type: 'Easy', distanceKm: 24.0, durationSec: 7780, avgHr: 145, source: 'Garmin' },
    { id: 'act-aug05', date: '2026-08-05', title: 'Track Tempo 12K', type: 'Tempo', distanceKm: 12.0, durationSec: 3390, avgHr: 164, source: 'Garmin' },
    { id: 'act-jul22', date: '2026-07-22', title: 'July Endurance Progression', type: 'Long Run', distanceKm: 20.0, durationSec: 6540, avgHr: 153, source: 'Garmin' },
    { id: 'act-jul10', date: '2026-07-10', title: 'July Base Loop', type: 'Easy', distanceKm: 19.0, durationSec: 6250, avgHr: 147, source: 'Garmin' },
    { id: 'act-jun18', date: '2026-06-18', title: 'Early Summer Base', type: 'Easy', distanceKm: 18.0, durationSec: 6040, avgHr: 151, source: 'Garmin' },
    { id: 'act-jun08', date: '2026-06-08', title: 'June Threshold Check', type: 'Tempo', distanceKm: 10.0, durationSec: 2880, avgHr: 166, source: 'Garmin' },
  ];

  const recoveryLogs: RecoveryLog[] = [
    { date: '2026-11-15', dayLabel: 'MON', hrvMs: 59, restingHr: 47, readinessPct: 81, sleepHours: 7.4 },
    { date: '2026-11-16', dayLabel: 'TUE', hrvMs: 61, restingHr: 46, readinessPct: 83, sleepHours: 7.8 },
    { date: '2026-11-17', dayLabel: 'WED', hrvMs: 56, restingHr: 48, readinessPct: 76, sleepHours: 7.1 },
    { date: '2026-11-18', dayLabel: 'THU', hrvMs: 52, restingHr: 49, readinessPct: 72, sleepHours: 6.9 },
    { date: '2026-11-19', dayLabel: 'FRI', hrvMs: 58, restingHr: 47, readinessPct: 79, sleepHours: 7.5 },
    { date: '2026-11-20', dayLabel: 'SAT', hrvMs: 62, restingHr: 46, readinessPct: 83, sleepHours: 7.9 },
    { date: '2026-11-21', dayLabel: 'SUN', hrvMs: 64, restingHr: 46, readinessPct: 84, sleepHours: 8.2 },
  ];

  const preferences: AthletePreferences = {
    athleteName: 'Marcus Vance',
    maxHr: 191,
    thresholdHr: 171,
    restingHr: 46,
    weeklyGoalKm: 55,
    units: 'metric',
    weeklyDigest: true,
    language: 'en',
    theme: 'dark',
  };

  const integrations: IntegrationsState = {
    garmin: {
      connected: true,
      label: 'Forerunner 965',
      lastSync: 'Nov 21, 2026 · 06:42',
      syncedCount: 142,
      hasCredentials: false,
      clientIdMasked: '',
    },
    strava: {
      connected: false,
      label: 'Activity Feed & Segment Sync API',
      lastSync: null,
      syncedCount: 0,
      hasCredentials: false,
      clientIdMasked: '',
    },
  };

  const raceGoals: RaceGoals = {
    '5k': 19 * 60 + 30,
    '10k': 40 * 60,
    hm: 1 * 3600 + 35 * 60,
    fm: 3 * 3600 + 20 * 60,
  };

  const insights: CoachInsight[] = [
    {
      id: 'ins-1',
      category: 'Heart Efficiency',
      badgeType: 'success',
      deltaLabel: '3 bpm lower @ 4:55/km',
      title: 'Your average heart rate has decreased at similar running paces.',
      body: 'Across your last 6 aerobic runs (4:50–5:05/km), average heart rate dropped from 154 bpm to 151 bpm, confirming stronger aerobic fitness.',
    },
    {
      id: 'ins-2',
      category: 'Volume Progression',
      badgeType: 'warning',
      deltaLabel: '+12.4% vs. last week',
      title: 'Your weekly mileage has increased significantly.',
      body: 'You logged 48.6 km this week vs. 43.2 km last week (+5.4 km). Hold volume steady next week to let your joints and muscles adapt safely.',
    },
    {
      id: 'ins-3',
      category: 'Aerobic Capacity',
      badgeType: 'info',
      deltaLabel: '54.2 ± 0.1',
      title: 'Your VO2 max has remained stable over the last month.',
      body: 'VO2 max held near 54.2 ml/kg/min while mileage rose. Adding one weekly 3-minute Zone 5 interval session can stimulate further gains.',
    },
  ];

  const coachMessages: CoachMessage[] = [
    {
      id: 'msg-1',
      role: 'assistant',
      text: 'Morning Marcus. Your 16.4 km Sunday long run showed steady heart rate control (153 bpm avg) and your overnight HRV rebounded to 64 ms. What would you like to focus on for Week 48?',
      createdAt: '2026-11-21T07:05:00Z',
    },
    {
      id: 'msg-2',
      role: 'user',
      text: 'Am I ready to push for a sub-1:34 Half Marathon next month, or should I hold my current mileage?',
      createdAt: '2026-11-21T07:06:00Z',
    },
    {
      id: 'msg-3',
      role: 'assistant',
      text: 'Your current VO2 max and 4:28/km half-marathon threshold project a 1:34:18 finish. Hold 48–50 km/week for 7 days to consolidate this week’s +12.5% volume jump, then introduce 2 x 4 km blocks at 4:25/km goal pace.',
      createdAt: '2026-11-21T07:06:12Z',
    },
  ];

  return {
    preferences,
    integrations,
    secrets: {
      garminClientId: '',
      garminApiSecret: '',
      stravaClientId: '',
      stravaClientSecret: '',
      stravaAccessToken: '',
    },
    activities,
    recoveryLogs,
    raceGoals,
    insights,
    coachMessages,
  };
}

let cachedStore: PersistedStore | null = null;

function ensureStoreLoaded(): PersistedStore {
  if (cachedStore) return cachedStore;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as PersistedStore;
      if (parsed && Array.isArray(parsed.activities) && parsed.preferences) {
        cachedStore = parsed;
        return cachedStore;
      }
    }
  } catch {
    // Fall back to fresh store if disk file is missing or unreadable
  }
  cachedStore = createInitialStore();
  saveStore(cachedStore);
  return cachedStore;
}

function saveStore(store: PersistedStore): void {
  cachedStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // Non-fatal if filesystem is read-only
  }
}

export function getPublicAppState(): AppState {
  const store = ensureStoreLoaded();
  const sortedActivities = [...store.activities].sort((a, b) => b.date.localeCompare(a.date));
  const metrics = computeMetrics(sortedActivities, store.recoveryLogs, store.preferences, store.raceGoals);
  return {
    preferences: store.preferences,
    integrations: store.integrations,
    activities: sortedActivities,
    recoveryLogs: store.recoveryLogs,
    raceGoals: store.raceGoals,
    insights: store.insights,
    coachMessages: store.coachMessages,
    metrics,
  };
}

export function updatePreferences(patch: Partial<AthletePreferences>): AppState {
  const store = ensureStoreLoaded();
  store.preferences = {
    ...store.preferences,
    ...patch,
    maxHr: Math.max(130, Math.min(225, Number(patch.maxHr ?? store.preferences.maxHr))),
    thresholdHr: Math.max(110, Math.min(210, Number(patch.thresholdHr ?? store.preferences.thresholdHr))),
    restingHr: Math.max(30, Math.min(100, Number(patch.restingHr ?? store.preferences.restingHr))),
    weeklyGoalKm: Math.max(10, Math.min(250, Number(patch.weeklyGoalKm ?? store.preferences.weeklyGoalKm))),
  };
  saveStore(store);
  return getPublicAppState();
}

export function updateRaceGoal(distanceKey: keyof RaceGoals, targetSeconds: number): AppState {
  const store = ensureStoreLoaded();
  store.raceGoals = {
    ...store.raceGoals,
    [distanceKey]: Math.max(300, Math.min(36000, Math.round(targetSeconds))),
  };
  saveStore(store);
  return getPublicAppState();
}

export function addActivity(input: Omit<Activity, 'id'>): { state: AppState; activity: Activity } {
  const store = ensureStoreLoaded();
  const activity: Activity = {
    ...input,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  store.activities = [activity, ...store.activities];
  if (input.source === 'Garmin' || input.source === 'Upload') {
    store.integrations.garmin.syncedCount += 1;
  } else if (input.source === 'Strava') {
    store.integrations.strava.syncedCount += 1;
  }
  saveStore(store);
  return { state: getPublicAppState(), activity };
}

export function removeActivity(id: string): AppState {
  const store = ensureStoreLoaded();
  store.activities = store.activities.filter((a) => a.id !== id);
  saveStore(store);
  return getPublicAppState();
}

export function logRecoveryCheckIn(hrvMs: number, restingHr: number, sleepHours: number): AppState {
  const store = ensureStoreLoaded();
  const today = new Date().toISOString().slice(0, 10);
  const readinessPct = Math.max(45, Math.min(98, Math.round(50 + (hrvMs - 40) * 0.9 + (sleepHours - 6) * 4)));
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayLabel = dayNames[new Date(`${today}T00:00:00Z`).getUTCDay()];
  const existingIdx = store.recoveryLogs.findIndex((r) => r.date === today);
  const entry: RecoveryLog = {
    date: today,
    dayLabel,
    hrvMs: Math.round(hrvMs),
    restingHr: Math.round(restingHr),
    readinessPct,
    sleepHours: Number(sleepHours.toFixed(1)),
  };
  if (existingIdx >= 0) {
    store.recoveryLogs[existingIdx] = entry;
  } else {
    store.recoveryLogs = [...store.recoveryLogs.slice(-6), entry];
  }
  saveStore(store);
  return getPublicAppState();
}

export function saveGarminCredentials(clientId: string, apiSecret: string): AppState {
  const store = ensureStoreLoaded();
  store.secrets.garminClientId = clientId.trim();
  if (apiSecret.trim()) {
    store.secrets.garminApiSecret = apiSecret.trim();
  }
  store.integrations.garmin.connected = true;
  store.integrations.garmin.hasCredentials = Boolean(store.secrets.garminClientId && store.secrets.garminApiSecret);
  store.integrations.garmin.clientIdMasked = maskClientId(store.secrets.garminClientId);
  saveStore(store);
  return getPublicAppState();
}

export function disconnectGarmin(): AppState {
  const store = ensureStoreLoaded();
  store.secrets.garminClientId = '';
  store.secrets.garminApiSecret = '';
  store.integrations.garmin.connected = false;
  store.integrations.garmin.hasCredentials = false;
  store.integrations.garmin.clientIdMasked = '';
  saveStore(store);
  return getPublicAppState();
}

export function syncGarminNow(): AppState {
  const store = ensureStoreLoaded();
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  store.integrations.garmin.connected = true;
  store.integrations.garmin.lastSync = `Today · ${hh}:${mm}`;
  saveStore(store);
  return getPublicAppState();
}

export function saveStravaCredentials(clientId: string, clientSecret: string, accessToken: string): AppState {
  const store = ensureStoreLoaded();
  store.secrets.stravaClientId = clientId.trim();
  if (clientSecret.trim()) store.secrets.stravaClientSecret = clientSecret.trim();
  if (accessToken.trim()) store.secrets.stravaAccessToken = accessToken.trim();
  store.integrations.strava.connected = true;
  store.integrations.strava.hasCredentials = Boolean(
    store.secrets.stravaClientId || store.secrets.stravaAccessToken,
  );
  store.integrations.strava.clientIdMasked = maskClientId(store.secrets.stravaClientId);
  const now = new Date();
  store.integrations.strava.lastSync = `Today · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  saveStore(store);
  return getPublicAppState();
}

export function disconnectStrava(): AppState {
  const store = ensureStoreLoaded();
  store.secrets.stravaClientId = '';
  store.secrets.stravaClientSecret = '';
  store.secrets.stravaAccessToken = '';
  store.integrations.strava.connected = false;
  store.integrations.strava.hasCredentials = false;
  store.integrations.strava.clientIdMasked = '';
  store.integrations.strava.lastSync = null;
  saveStore(store);
  return getPublicAppState();
}

export function getStravaAccessToken(): string {
  return ensureStoreLoaded().secrets.stravaAccessToken;
}

export function mergeStravaActivities(imported: Omit<Activity, 'id'>[]): AppState {
  const store = ensureStoreLoaded();
  const existingKeys = new Set(store.activities.map((a) => `${a.date}:${a.title}:${a.distanceKm}`));
  let added = 0;
  for (const item of imported) {
    const key = `${item.date}:${item.title}:${item.distanceKm}`;
    if (!existingKeys.has(key)) {
      store.activities.unshift({
        ...item,
        id: `strava-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      });
      existingKeys.add(key);
      added += 1;
    }
  }
  const now = new Date();
  store.integrations.strava.connected = true;
  store.integrations.strava.syncedCount += added;
  store.integrations.strava.lastSync = `Today · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  saveStore(store);
  return getPublicAppState();
}

export function appendCoachMessages(userText: string, assistantText: string): AppState {
  const store = ensureStoreLoaded();
  const now = new Date().toISOString();
  store.coachMessages.push(
    { id: `msg-${Date.now()}-u`, role: 'user', text: userText, createdAt: now },
    { id: `msg-${Date.now()}-a`, role: 'assistant', text: assistantText, createdAt: now },
  );
  saveStore(store);
  return getPublicAppState();
}

export function clearCoachMessages(): AppState {
  const store = ensureStoreLoaded();
  store.coachMessages = [
    {
      id: `msg-${Date.now()}-init`,
      role: 'assistant',
      text: 'Chat cleared. Ask me about your current training load, pacing zones, HRV recovery, or upcoming race goals.',
      createdAt: new Date().toISOString(),
    },
  ];
  saveStore(store);
  return getPublicAppState();
}

export function updateCoachInsights(insights: CoachInsight[]): AppState {
  const store = ensureStoreLoaded();
  store.insights = insights;
  saveStore(store);
  return getPublicAppState();
}
