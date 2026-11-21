export type LanguageCode = 'en' | 'fi' | 'de' | 'fr';
export type ThemeMode = 'dark' | 'light';
export type DistanceUnit = 'metric' | 'imperial';
export type RunType = 'Long Run' | 'Easy' | 'Tempo' | 'Interval' | 'Race';
export type RaceDistanceKey = '5k' | '10k' | 'hm' | 'fm';
export type PageKey = 'dashboard' | 'analytics' | 'training' | 'coach' | 'predictions' | 'settings';

export interface Activity {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: RunType;
  distanceKm: number;
  durationSec: number;
  avgHr: number;
  maxHr?: number;
  elevationM?: number;
  cadenceSpm?: number;
  gcbLeftPct?: number;
  source: 'Garmin' | 'Strava' | 'Upload' | 'Manual';
  notes?: string;
}

export interface RecoveryLog {
  date: string; // YYYY-MM-DD
  dayLabel: string;
  hrvMs: number;
  restingHr: number;
  readinessPct: number;
  sleepHours: number;
}

export interface AthletePreferences {
  athleteName: string;
  maxHr: number;
  thresholdHr: number;
  restingHr: number;
  weeklyGoalKm: number;
  units: DistanceUnit;
  weeklyDigest: boolean;
  language: LanguageCode;
  theme: ThemeMode;
}

export interface IntegrationStatus {
  connected: boolean;
  label: string;
  lastSync: string | null;
  syncedCount: number;
  hasCredentials: boolean;
  clientIdMasked: string;
}

export interface IntegrationsState {
  garmin: IntegrationStatus;
  strava: IntegrationStatus;
}

export interface RaceGoals {
  '5k': number; // seconds
  '10k': number;
  hm: number;
  fm: number;
}

export interface CoachInsight {
  id: string;
  category: string;
  badgeType: 'success' | 'warning' | 'info';
  deltaLabel: string;
  title: string;
  body: string;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export interface DailyMileagePoint {
  day: string;
  date: string;
  distanceKm: number;
  type: RunType | 'Rest';
  title?: string;
  paceSecPerKm?: number;
  avgHr?: number;
}

export interface WeeklyLoadPoint {
  weekLabel: string;
  dateRange: string;
  sessions: number;
  distanceKm: number;
  load: number;
  baselineLoad: number;
  readinessPct: number;
}

export interface MonthlyMetricPoint {
  month: string;
  vo2Max: number;
  thresholdPaceSec: number;
  easyPaceSec: number;
  benchmarkHr: number;
  distanceKm: number;
}

export interface RacePredictionItem {
  key: RaceDistanceKey;
  label: string;
  distanceKm: number;
  predictedSec: number;
  rangeLowSec: number;
  rangeHighSec: number;
  targetSec: number;
  diffSec: number; // positive = ahead (faster than goal), negative = behind
}

export interface PersonalRecord {
  id: string;
  label: string;
  valueFormatted: string;
  sublabel: string;
  highlight?: boolean;
}

export interface ImbalanceItem {
  id: string;
  severity: 'warning' | 'ok';
  title: string;
  description: string;
}

export interface ComputedMetrics {
  vo2Max: number;
  vo2Delta30d: number;
  weeklyDistanceKm: number;
  weeklyGoalKm: number;
  weeklyDistanceDeltaPct: number;
  avgPaceSecPerKm: number;
  paceDeltaSec: number;
  avgHr: number;
  hrDelta14d: number;
  loadRatio: number;
  trainingStatus: 'Productive' | 'Peaking' | 'Overreaching' | 'Maintaining' | 'Recovery';
  weeklyLoad: number;
  baselineLoad: number;
  dailyMileage: DailyMileagePoint[];
  weeklyHistory: WeeklyLoadPoint[];
  monthlyTrends: MonthlyMetricPoint[];
  intensityDistribution: {
    totalMinutes: number;
    easyPct: number;
    easyMinutes: number;
    tempoPct: number;
    tempoMinutes: number;
    intervalPct: number;
    intervalMinutes: number;
  };
  imbalances: ImbalanceItem[];
  personalRecords: PersonalRecord[];
  racePredictions: RacePredictionItem[];
  latestHrvMs: number;
  latestReadinessPct: number;
  hrZones: {
    zone: string;
    label: string;
    minHr: number;
    maxHr: number;
  }[];
}

export interface AppState {
  preferences: AthletePreferences;
  integrations: IntegrationsState;
  activities: Activity[];
  recoveryLogs: RecoveryLog[];
  raceGoals: RaceGoals;
  insights: CoachInsight[];
  coachMessages: CoachMessage[];
  metrics: ComputedMetrics;
}
