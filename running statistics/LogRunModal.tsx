import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { DistanceUnit, RunType } from '../types/runtrack';
import { unitLabel } from '../utils/format';

interface LogRunModalProps {
  open: boolean;
  units: DistanceUnit;
  onClose: () => void;
  onSubmit: (payload: {
    date: string;
    title: string;
    type: RunType;
    distanceKm: number;
    durationSec: number;
    avgHr: number;
    elevationM?: number;
    notes?: string;
  }) => Promise<void>;
}

export function LogRunModal({ open, units, onClose, onSubmit }: LogRunModalProps) {
  const [date, setDate] = useState('2026-11-21');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<RunType>('Easy');
  const [distanceInput, setDistanceInput] = useState('8.0');
  const [durationInput, setDurationInput] = useState('40:00');
  const [avgHr, setAvgHr] = useState('148');
  const [elevationM, setElevationM] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const parseDuration = (raw: string): number | null => {
    const parts = raw.trim().split(':').map((n) => Number.parseInt(n, 10));
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const distVal = Number.parseFloat(distanceInput);
    const durSec = parseDuration(durationInput);
    const hrVal = Number.parseInt(avgHr, 10);
    if (!title.trim()) {
      setError('Enter an activity title.');
      return;
    }
    if (!Number.isFinite(distVal) || distVal <= 0) {
      setError('Enter a valid positive distance.');
      return;
    }
    if (!durSec || durSec <= 0) {
      setError('Enter duration as MM:SS or HH:MM:SS.');
      return;
    }
    if (!Number.isFinite(hrVal) || hrVal < 70 || hrVal > 220) {
      setError('Enter an average heart rate between 70 and 220 bpm.');
      return;
    }

    const distanceKm = units === 'imperial' ? distVal / 0.621371 : distVal;
    setSaving(true);
    try {
      await onSubmit({
        date,
        title: title.trim(),
        type,
        distanceKm,
        durationSec: durSec,
        avgHr: hrVal,
        elevationM: elevationM.trim() ? Number.parseInt(elevationM, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      setTitle('');
      setNotes('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save run.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-run-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-surface-container-low border border-outline-variant p-5 sm:p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2">
          <h2 id="log-run-title" className="text-lg font-bold text-on-surface">
            Log Running Activity
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-on-surface">Activity Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Morning Tempo 10K"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline text-on-surface text-sm focus:border-primary-container focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm focus:border-primary-container focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Workout Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RunType)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline text-on-surface text-sm focus:border-primary-container focus:outline-none"
              >
                <option value="Easy">Easy</option>
                <option value="Long Run">Long Run</option>
                <option value="Tempo">Tempo</option>
                <option value="Interval">Interval</option>
                <option value="Race">Race</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Distance ({unitLabel(units)})</span>
              <input
                type="number"
                step="0.1"
                value={distanceInput}
                onChange={(e) => setDistanceInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm focus:border-primary-container focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Duration</span>
              <input
                type="text"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                placeholder="40:00"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm focus:border-primary-container focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Avg HR</span>
              <input
                type="number"
                value={avgHr}
                onChange={(e) => setAvgHr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm focus:border-primary-container focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Elevation (m, optional)</span>
              <input
                type="number"
                value={elevationM}
                onChange={(e) => setElevationM(e.target.value)}
                placeholder="85"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline text-on-surface font-mono text-sm focus:border-primary-container focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Notes (optional)</span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Felt smooth"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline text-on-surface text-sm focus:border-primary-container focus:outline-none"
              />
            </label>
          </div>

          {error && <p className="text-xs font-medium text-error">{error}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface border border-outline text-sm font-semibold hover:bg-surface-bright"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
