import { useState } from 'react';
import type {
  DailyMileagePoint,
  DistanceUnit,
  MonthlyMetricPoint,
  RecoveryLog,
  WeeklyLoadPoint,
} from '../types/runtrack';
import { convertDistance, formatPace, unitLabel } from '../utils/format';

export function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.5, max - min);
  const pts = values
    .map((v, idx) => {
      const x = 2 + (idx / (values.length - 1)) * 60;
      const y = 20 - ((v - min) / span) * 16;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 64 24" className="w-12 sm:w-16 h-6 text-primary shrink-0" aria-hidden="true">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

export function WeeklyMileageBarChart({
  data,
  units,
}: {
  data: DailyMileagePoint[];
  units: DistanceUnit;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const converted = data.map((d) => ({
    ...d,
    displayDist: convertDistance(d.distanceKm, units),
  }));
  const maxVal = Math.max(units === 'imperial' ? 12 : 18, ...converted.map((d) => d.displayDist));
  const chartMax = Math.ceil(maxVal / 6) * 6 || 18;
  const uLabel = unitLabel(units);

  const getBarColorClass = (d: DailyMileagePoint) => {
    if (d.type === 'Rest' || d.distanceKm <= 0) return 'fill-surface-container-highest';
    if (d.type === 'Long Run') return 'fill-primary';
    if (d.type === 'Tempo' || d.type === 'Interval' || d.type === 'Race') return 'fill-primary-container';
    return 'fill-secondary';
  };

  const hovered = hoveredIdx !== null ? converted[hoveredIdx] : null;

  return (
    <div className="relative w-full">
      {hovered && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-on-surface">
            {hovered.day} ({hovered.date}) {hovered.title ? `· ${hovered.title}` : ''}
          </span>
          <span className="font-mono text-primary tabular-nums">
            {hovered.distanceKm > 0
              ? `${hovered.displayDist} ${uLabel} · ${hovered.paceSecPerKm ? formatPace(hovered.paceSecPerKm, units) : ''} · ${hovered.avgHr ?? '--'} bpm`
              : 'Rest Day'}
          </span>
        </div>
      )}
      <svg
        viewBox="0 0 680 220"
        className="w-full h-auto"
        role="img"
        aria-label="Weekly mileage bar chart"
      >
        <g className="text-outline-variant" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3">
          <line x1="48" y1="20" x2="660" y2="20" />
          <line x1="48" y1="76" x2="660" y2="76" />
          <line x1="48" y1="133" x2="660" y2="133" />
        </g>
        <line x1="48" y1="190" x2="660" y2="190" className="text-outline" stroke="currentColor" strokeWidth="1" />
        <g className="fill-on-surface-variant font-mono" style={{ fontSize: 12 }}>
          <text x="4" y="24">
            {chartMax} {uLabel}
          </text>
          <text x="4" y="80">
            {Math.round((chartMax * 2) / 3)} {uLabel}
          </text>
          <text x="10" y="137">
            {Math.round(chartMax / 3)} {uLabel}
          </text>
          <text x="20" y="194">0</text>
        </g>

        {converted.map((d, idx) => {
          const xCenter = 96 + idx * 88;
          const barW = 44;
          const barH = d.displayDist > 0 ? Math.max(8, (d.displayDist / chartMax) * 164) : 4;
          const y = 190 - barH;
          return (
            <g
              key={d.date}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={xCenter - barW / 2 - 8}
                y={16}
                width={barW + 16}
                height={180}
                fill="transparent"
              />
              <rect
                x={xCenter - barW / 2}
                y={y}
                width={barW}
                height={barH}
                rx={d.displayDist > 0 ? 4 : 2}
                className={`${getBarColorClass(d)} transition-opacity ${
                  hoveredIdx !== null && hoveredIdx !== idx ? 'opacity-65' : 'opacity-100'
                }`}
              />
              <text
                x={xCenter}
                y={y - 8}
                textAnchor="middle"
                className={`font-mono ${d.type === 'Long Run' ? 'fill-primary' : d.displayDist > 0 ? 'fill-on-surface' : 'fill-on-surface-variant'}`}
                style={{ fontSize: 12 }}
              >
                {d.displayDist > 0 ? d.displayDist.toFixed(1) : 'Rest'}
              </text>
              <text
                x={xCenter}
                y="210"
                textAnchor="middle"
                className="fill-on-surface-variant font-sans font-semibold"
                style={{ fontSize: 12 }}
              >
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function EightWeekMileageChart({
  data,
  units,
}: {
  data: WeeklyLoadPoint[];
  units: DistanceUnit;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const converted = data.map((w) => ({
    ...w,
    displayDist: convertDistance(w.distanceKm, units),
  }));
  const maxVal = Math.max(units === 'imperial' ? 40 : 60, ...converted.map((w) => w.displayDist));
  const chartMax = Math.ceil(maxVal / 20) * 20 || 60;
  const uLabel = unitLabel(units);

  const pts = converted.map((w, idx) => {
    const x = 82 + idx * 78;
    const y = 190 - (w.displayDist / chartMax) * 165;
    return { x, y, ...w };
  });

  const polylinePts = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const hovered = hoveredIdx !== null ? pts[hoveredIdx] : null;

  return (
    <div className="relative w-full">
      {hovered && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-on-surface">
            {hovered.weekLabel} ({hovered.dateRange})
          </span>
          <span className="font-mono text-primary tabular-nums">
            {hovered.displayDist} {uLabel} · {hovered.sessions} runs · Load {hovered.load}
          </span>
        </div>
      )}
      <svg viewBox="0 0 680 220" className="w-full h-auto" role="img" aria-label="8-week mileage trend">
        <g className="text-outline-variant" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3">
          <line x1="48" y1="20" x2="660" y2="20" />
          <line x1="48" y1="75" x2="660" y2="75" />
          <line x1="48" y1="130" x2="660" y2="130" />
        </g>
        <line x1="48" y1="190" x2="660" y2="190" className="text-outline" stroke="currentColor" strokeWidth="1" />
        <g className="fill-on-surface-variant font-mono" style={{ fontSize: 12 }}>
          <text x="4" y="24">
            {chartMax} {uLabel}
          </text>
          <text x="4" y="79">
            {Math.round((chartMax * 2) / 3)} {uLabel}
          </text>
          <text x="4" y="134">
            {Math.round(chartMax / 3)} {uLabel}
          </text>
          <text x="20" y="194">0</text>
        </g>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
          points={polylinePts}
        />
        {pts.map((p, idx) => (
          <g
            key={p.weekLabel}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="cursor-pointer"
          >
            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={idx === pts.length - 1 || hoveredIdx === idx ? 5.5 : 4}
              className="fill-primary"
            />
            <text
              x={p.x}
              y="210"
              textAnchor="middle"
              className="fill-on-surface-variant font-sans font-semibold"
              style={{ fontSize: 12 }}
            >
              {p.weekLabel}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function Vo2Chart({ data }: { data: MonthlyMetricPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const vals = data.map((d) => d.vo2Max);
  const minY = Math.floor(Math.min(...vals, 50) - 1);
  const maxY = Math.ceil(Math.max(...vals, 56));
  const span = Math.max(4, maxY - minY);

  const pts = data.map((d, i) => ({
    ...d,
    x: 56 + i * 84,
    y: 150 - ((d.vo2Max - minY) / span) * 125,
  }));

  return (
    <div>
      <svg viewBox="0 0 520 190" className="w-full h-auto" role="img" aria-label="VO2 Max 6-month trend">
        <g className="text-outline-variant" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3">
          <line x1="36" y1="25" x2="500" y2="25" />
          <line x1="36" y1="68" x2="500" y2="68" />
          <line x1="36" y1="112" x2="500" y2="112" />
        </g>
        <line x1="36" y1="155" x2="500" y2="155" className="text-outline" stroke="currentColor" strokeWidth="1" />
        <g className="fill-on-surface-variant font-mono" style={{ fontSize: 12 }}>
          <text x="4" y="29">{maxY}</text>
          <text x="4" y="72">{(minY + (span * 2) / 3).toFixed(0)}</text>
          <text x="4" y="116">{(minY + span / 3).toFixed(0)}</text>
          <text x="4" y="159">{minY}</text>
        </g>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
          points={pts.map((p) => `${p.x},${p.y.toFixed(1)}`).join(' ')}
        />
        {pts.map((p, i) => (
          <g
            key={p.month}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          >
            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
            <circle cx={p.x} cy={p.y} r={i === pts.length - 1 || hovered === i ? 5.5 : 4} className="fill-primary" />
            {hovered === i && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-primary font-mono" style={{ fontSize: 12 }}>
                {p.vo2Max.toFixed(1)}
              </text>
            )}
            <text x={p.x} y="178" textAnchor="middle" className="fill-on-surface-variant font-sans font-semibold" style={{ fontSize: 12 }}>
              {p.month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function PaceDevelopmentChart({
  data,
  units,
}: {
  data: MonthlyMetricPoint[];
  units: DistanceUnit;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const factor = units === 'imperial' ? 1 / 0.621371 : 1;
  const allPaces = data.flatMap((d) => [d.thresholdPaceSec * factor, d.easyPaceSec * factor]);
  const minSec = Math.floor((Math.min(...allPaces) - 10) / 15) * 15;
  const maxSec = Math.ceil((Math.max(...allPaces) + 10) / 15) * 15;
  const span = Math.max(45, maxSec - minSec);

  const fmtTick = (sec: number) => {
    const r = Math.round(sec);
    return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
  };

  // Faster pace (lower seconds) sits higher on chart
  const yFor = (sec: number) => 24 + ((sec - minSec) / span) * 130;

  const threshPts = data.map((d, i) => ({
    x: 66 + i * 80,
    y: yFor(d.thresholdPaceSec * factor),
    val: fmtTick(d.thresholdPaceSec * factor),
    month: d.month,
  }));
  const easyPts = data.map((d, i) => ({
    x: 66 + i * 80,
    y: yFor(d.easyPaceSec * factor),
    val: fmtTick(d.easyPaceSec * factor),
  }));

  return (
    <svg viewBox="0 0 520 190" className="w-full h-auto" role="img" aria-label="Threshold and Easy pace trend">
      <g className="text-outline-variant" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3">
        <line x1="46" y1="24" x2="500" y2="24" />
        <line x1="46" y1="68" x2="500" y2="68" />
        <line x1="46" y1="112" x2="500" y2="112" />
      </g>
      <line x1="46" y1="155" x2="500" y2="155" className="text-outline" stroke="currentColor" strokeWidth="1" />
      <g className="fill-on-surface-variant font-mono" style={{ fontSize: 12 }}>
        <text x="4" y="28">{fmtTick(minSec)}</text>
        <text x="4" y="72">{fmtTick(minSec + span / 3)}</text>
        <text x="4" y="116">{fmtTick(minSec + (span * 2) / 3)}</text>
        <text x="4" y="159">{fmtTick(maxSec)}</text>
      </g>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-tertiary"
        points={easyPts.map((p) => `${p.x},${p.y.toFixed(1)}`).join(' ')}
      />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
        points={threshPts.map((p) => `${p.x},${p.y.toFixed(1)}`).join(' ')}
      />
      {threshPts.map((p, i) => (
        <g
          key={p.month}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          className="cursor-pointer"
        >
          <circle cx={p.x} cy={p.y} r="4" className="fill-primary" />
          <circle cx={easyPts[i].x} cy={easyPts[i].y} r="4" className="fill-tertiary" />
          {hovered === i && (
            <text x={p.x} y={Math.max(14, p.y - 8)} textAnchor="middle" className="fill-primary font-mono" style={{ fontSize: 11 }}>
              {p.val} / {easyPts[i].val}
            </text>
          )}
          <text x={p.x} y="178" textAnchor="middle" className="fill-on-surface-variant font-sans font-semibold" style={{ fontSize: 12 }}>
            {p.month}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function HeartRateTrendChart({ data }: { data: MonthlyMetricPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const hrs = data.map((d) => d.benchmarkHr);
  const minHr = Math.min(135, Math.floor((Math.min(...hrs) - 5) / 5) * 5);
  const maxHr = Math.max(165, Math.ceil((Math.max(...hrs) + 5) / 5) * 5);
  const span = Math.max(20, maxHr - minHr);

  const pts = data.map((d, i) => ({
    ...d,
    x: 66 + i * 80,
    y: 155 - ((d.benchmarkHr - minHr) / span) * 130,
  }));

  return (
    <svg viewBox="0 0 520 190" className="w-full h-auto" role="img" aria-label="Average heart rate trend">
      <g className="text-outline-variant" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3">
        <line x1="46" y1="25" x2="500" y2="25" />
        <line x1="46" y1="68" x2="500" y2="68" />
        <line x1="46" y1="112" x2="500" y2="112" />
      </g>
      <line x1="46" y1="155" x2="500" y2="155" className="text-outline" stroke="currentColor" strokeWidth="1" />
      <g className="fill-on-surface-variant font-mono" style={{ fontSize: 12 }}>
        <text x="4" y="29">{maxHr}</text>
        <text x="4" y="72">{Math.round(minHr + (span * 2) / 3)}</text>
        <text x="4" y="116">{Math.round(minHr + span / 3)}</text>
        <text x="4" y="159">{minHr}</text>
      </g>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-tertiary"
        points={pts.map((p) => `${p.x},${p.y.toFixed(1)}`).join(' ')}
      />
      {pts.map((p, i) => (
        <g
          key={p.month}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          className="cursor-pointer"
        >
          <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
          <circle cx={p.x} cy={p.y} r={i === pts.length - 1 || hovered === i ? 5 : 4} className="fill-tertiary" />
          {hovered === i && (
            <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-tertiary font-mono" style={{ fontSize: 12 }}>
              {p.benchmarkHr} bpm
            </text>
          )}
          <text x={p.x} y="178" textAnchor="middle" className="fill-on-surface-variant font-sans font-semibold" style={{ fontSize: 12 }}>
            {p.month}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function MonthlyDistanceChart({
  data,
  units,
}: {
  data: MonthlyMetricPoint[];
  units: DistanceUnit;
}) {
  const converted = data.map((d) => ({
    ...d,
    dist: Math.round(convertDistance(d.distanceKm, units)),
  }));
  const maxD = Math.max(units === 'imperial' ? 150 : 240, ...converted.map((d) => d.dist));
  const chartMax = Math.ceil(maxD / 40) * 40;
  const peakCutoff = units === 'imperial' ? 115 : 185;
  const buildCutoff = units === 'imperial' ? 95 : 160;

  return (
    <svg viewBox="0 0 520 190" className="w-full h-auto" role="img" aria-label="Monthly running distance bar chart">
      <g className="text-outline-variant" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3">
        <line x1="46" y1="20" x2="500" y2="20" />
        <line x1="46" y1="65" x2="500" y2="65" />
        <line x1="46" y1="110" x2="500" y2="110" />
      </g>
      <line x1="46" y1="155" x2="500" y2="155" className="text-outline" stroke="currentColor" strokeWidth="1" />
      <g className="fill-on-surface-variant font-mono" style={{ fontSize: 12 }}>
        <text x="4" y="24">{chartMax}</text>
        <text x="4" y="69">{Math.round((chartMax * 2) / 3)}</text>
        <text x="12" y="114">{Math.round(chartMax / 3)}</text>
        <text x="20" y="159">0</text>
      </g>
      {converted.map((d, i) => {
        const x = 56 + i * 76;
        const h = Math.max(6, (d.dist / chartMax) * 130);
        const y = 155 - h;
        const fillClass =
          d.dist >= peakCutoff
            ? i === converted.length - 1
              ? 'fill-primary'
              : 'fill-primary-container'
            : d.dist >= buildCutoff
              ? 'fill-secondary'
              : 'fill-surface-container-highest';

        return (
          <g key={d.month}>
            <rect x={x} y={y} width="38" height={h} rx="4" className={fillClass} />
            <text x={x + 19} y={y - 7} textAnchor="middle" className="fill-on-surface font-mono" style={{ fontSize: 12 }}>
              {d.dist}
            </text>
            <text x={x + 19} y="178" textAnchor="middle" className="fill-on-surface-variant font-sans font-semibold" style={{ fontSize: 12 }}>
              {d.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function WeeklyLoadChart({ data }: { data: WeeklyLoadPoint[] }) {
  const maxLoad = Math.max(800, ...data.flatMap((d) => [d.load, d.baselineLoad]));
  const chartMax = Math.ceil(maxLoad / 200) * 200;
  const yFor = (val: number) => 158 - (val / chartMax) * 138;

  const optTop = yFor(680);
  const optBot = yFor(520);

  const loadPts = data.map((d, i) => `${76 + i * 67},${yFor(d.load).toFixed(1)}`).join(' ');
  const basePts = data.map((d, i) => `${76 + i * 67},${yFor(d.baselineLoad).toFixed(1)}`).join(' ');

  return (
    <svg viewBox="0 0 580 190" className="w-full h-auto" role="img" aria-label="Weekly training load progression">
      <rect
        x="46"
        y={optTop}
        width="516"
        height={Math.max(12, optBot - optTop)}
        rx="4"
        className="fill-secondary-container opacity-65"
      />
      <g className="text-outline-variant" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3">
        <line x1="46" y1="20" x2="562" y2="20" />
        <line x1="46" y1="70" x2="562" y2="70" />
        <line x1="46" y1="120" x2="562" y2="120" />
      </g>
      <line x1="46" y1="158" x2="562" y2="158" className="text-outline" stroke="currentColor" strokeWidth="1" />
      <g className="fill-on-surface-variant font-mono" style={{ fontSize: 12 }}>
        <text x="4" y="24">{chartMax}</text>
        <text x="4" y="74">{Math.round(chartMax * 0.75)}</text>
        <text x="4" y="124">{Math.round(chartMax * 0.5)}</text>
        <text x="20" y="162">0</text>
      </g>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-tertiary" points={basePts} />
      <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" points={loadPts} />
      {data.map((d, i) => (
        <text
          key={d.weekLabel}
          x={76 + i * 67}
          y="180"
          textAnchor="middle"
          className="fill-on-surface-variant font-sans font-semibold"
          style={{ fontSize: 12 }}
        >
          {d.weekLabel}
        </text>
      ))}
    </svg>
  );
}

export function RecoveryHrvChart({ logs }: { logs: RecoveryLog[] }) {
  const vals = logs.map((l) => l.hrvMs);
  const minV = Math.min(40, Math.floor((Math.min(...vals) - 5) / 10) * 10);
  const maxV = Math.max(80, Math.ceil((Math.max(...vals) + 5) / 10) * 10);
  const span = Math.max(20, maxV - minV);

  const pts = logs.map((l, i) => ({
    ...l,
    x: 60 + (logs.length > 1 ? (i / (logs.length - 1)) * 428 : 0),
    y: 120 - ((l.hrvMs - minV) / span) * 100,
  }));

  return (
    <svg viewBox="0 0 520 150" className="w-full h-auto" role="img" aria-label="7-day HRV recovery trend">
      <g className="text-outline-variant" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3">
        <line x1="40" y1="20" x2="500" y2="20" />
        <line x1="40" y1="70" x2="500" y2="70" />
      </g>
      <line x1="40" y1="120" x2="500" y2="120" className="text-outline" stroke="currentColor" strokeWidth="1" />
      <g className="fill-on-surface-variant font-mono" style={{ fontSize: 12 }}>
        <text x="4" y="24">{maxV}</text>
        <text x="4" y="74">{Math.round((maxV + minV) / 2)}</text>
        <text x="4" y="124">{minV}</text>
      </g>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
        points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
      />
      {pts.map((p, i) => (
        <g key={`${p.date}-${i}`}>
          <circle cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4.5 : 3.5} className="fill-primary" />
          <text x={p.x} y="142" textAnchor="middle" className="fill-on-surface-variant font-sans font-semibold" style={{ fontSize: 12 }}>
            {p.dayLabel}
          </text>
        </g>
      ))}
    </svg>
  );
}
