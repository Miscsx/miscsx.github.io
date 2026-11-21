import type { DistanceUnit } from '../types/runtrack';

const KM_TO_MI = 0.621371;

export function convertDistance(km: number, units: DistanceUnit): number {
  return units === 'imperial' ? Number((km * KM_TO_MI).toFixed(1)) : Number(km.toFixed(1));
}

export function unitLabel(units: DistanceUnit): string {
  return units === 'imperial' ? 'mi' : 'km';
}

export function paceUnitLabel(units: DistanceUnit): string {
  return units === 'imperial' ? '/mi' : '/km';
}

export function formatPaceRaw(secPerKm: number, units: DistanceUnit): string {
  const secPerUnit = units === 'imperial' ? secPerKm / KM_TO_MI : secPerKm;
  const rounded = Math.max(120, Math.round(secPerUnit));
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPace(secPerKm: number, units: DistanceUnit): string {
  return `${formatPaceRaw(secPerKm, units)} ${paceUnitLabel(units)}`;
}

export function formatClock(totalSec: number): string {
  const rounded = Math.max(0, Math.round(totalSec));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPaddedInputClock(totalSec: number): string {
  const rounded = Math.max(0, Math.round(totalSec));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatShortDate(ymd: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  const mIdx = Number.parseInt(parts[1], 10) - 1;
  const day = Number.parseInt(parts[2], 10);
  return `${months[mIdx] ?? parts[1]} ${String(day).padStart(2, '0')}`;
}

export function formatMinutesHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
