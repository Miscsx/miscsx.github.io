import { Trash2, X } from 'lucide-react';
import type { Activity, DistanceUnit } from '../types/runtrack';
import { convertDistance, formatClock, formatPace, formatShortDate, unitLabel } from '../utils/format';

interface ActivityDetailModalProps {
  activity: Activity | null;
  units: DistanceUnit;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function ActivityDetailModal({ activity, units, onClose, onDelete }: ActivityDetailModalProps) {
  if (!activity) return null;

  const paceSec = activity.durationSec / Math.max(0.1, activity.distanceKm);
  const distDisplay = convertDistance(activity.distanceKm, units);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-surface-container-low border border-outline-variant p-5 sm:p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-on-surface-variant">
              {formatShortDate(activity.date)} · {activity.type} · {activity.source}
            </span>
            <h2 id="activity-modal-title" className="text-xl font-bold text-on-surface">
              {activity.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-surface-container border border-outline-variant">
            <span className="block text-xs text-on-surface-variant">Distance</span>
            <span className="font-mono text-lg font-semibold text-on-surface tabular-nums">
              {distDisplay} {unitLabel(units)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container border border-outline-variant">
            <span className="block text-xs text-on-surface-variant">Duration</span>
            <span className="font-mono text-lg font-semibold text-on-surface tabular-nums">
              {formatClock(activity.durationSec)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container border border-outline-variant">
            <span className="block text-xs text-on-surface-variant">Avg Pace</span>
            <span className="font-mono text-lg font-semibold text-primary tabular-nums">
              {formatPace(paceSec, units)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container border border-outline-variant">
            <span className="block text-xs text-on-surface-variant">Avg HR</span>
            <span className="font-mono text-lg font-semibold text-tertiary tabular-nums">
              {activity.avgHr} bpm
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline-variant">
            <span className="text-on-surface-variant">Max HR</span>
            <span className="font-mono text-on-surface tabular-nums">
              {activity.maxHr ? `${activity.maxHr} bpm` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline-variant">
            <span className="text-on-surface-variant">Elevation Gain</span>
            <span className="font-mono text-on-surface tabular-nums">
              {activity.elevationM !== undefined ? `${activity.elevationM} m` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline-variant">
            <span className="text-on-surface-variant">Cadence</span>
            <span className="font-mono text-on-surface tabular-nums">
              {activity.cadenceSpm ? `${activity.cadenceSpm} spm` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline-variant">
            <span className="text-on-surface-variant">L/R Balance</span>
            <span className="font-mono text-on-surface tabular-nums">
              {activity.gcbLeftPct
                ? `${activity.gcbLeftPct}% / ${(100 - activity.gcbLeftPct).toFixed(1)}%`
                : '—'}
            </span>
          </div>
        </div>

        {activity.notes && (
          <p className="text-sm text-on-surface-variant bg-surface-container border border-outline-variant rounded-lg p-3">
            {activity.notes}
          </p>
        )}

        <footer className="flex items-center justify-between gap-3 pt-2 border-t border-outline-variant">
          <button
            type="button"
            onClick={() => {
              onDelete(activity.id);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-error hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove Run</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold text-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
