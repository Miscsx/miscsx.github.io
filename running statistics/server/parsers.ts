import type { Activity, RunType } from '../src/types/runtrack.ts';

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function classifyRunType(distanceKm: number, paceSecPerKm: number, avgHr: number, thresholdHr: number): RunType {
  if (distanceKm >= 15) return 'Long Run';
  if (avgHr >= thresholdHr + 4 || paceSecPerKm <= 255) return 'Interval';
  if (avgHr >= thresholdHr - 10 || paceSecPerKm <= 280) return 'Tempo';
  return 'Easy';
}

function formatDateYmd(d: Date): string {
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export function parseGpxContent(xml: string, filename: string, thresholdHr: number): Omit<Activity, 'id'> {
  const nameMatch = xml.match(/<trk>[\s\S]*?<name>([^<]+)<\/name>/i) || xml.match(/<name>([^<]+)<\/name>/i);
  const title = nameMatch ? nameMatch[1].trim() : filename.replace(/\.(gpx|tcx|fit)$/i, '');

  const trkptRegex = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi;
  let match: RegExpExecArray | null;
  let prevLat: number | null = null;
  let prevLon: number | null = null;
  let prevEle: number | null = null;
  let firstTime: Date | null = null;
  let lastTime: Date | null = null;
  let totalDistKm = 0;
  let elevGain = 0;
  let hrSum = 0;
  let hrCount = 0;
  let maxHr = 0;
  let cadSum = 0;
  let cadCount = 0;

  while ((match = trkptRegex.exec(xml)) !== null) {
    const attrs = match[1];
    const body = match[2];
    const latM = attrs.match(/lat=["']([^"']+)["']/i);
    const lonM = attrs.match(/lon=["']([^"']+)["']/i);
    if (latM && lonM) {
      const lat = Number.parseFloat(latM[1]);
      const lon = Number.parseFloat(lonM[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        if (prevLat !== null && prevLon !== null) {
          const step = haversineKm(prevLat, prevLon, lat, lon);
          if (step < 0.5) totalDistKm += step;
        }
        prevLat = lat;
        prevLon = lon;
      }
    }

    const eleM = body.match(/<ele>([^<]+)<\/ele>/i);
    if (eleM) {
      const ele = Number.parseFloat(eleM[1]);
      if (Number.isFinite(ele)) {
        if (prevEle !== null && ele > prevEle && ele - prevEle < 30) {
          elevGain += ele - prevEle;
        }
        prevEle = ele;
      }
    }

    const timeM = body.match(/<time>([^<]+)<\/time>/i);
    if (timeM) {
      const dt = new Date(timeM[1].trim());
      if (!Number.isNaN(dt.getTime())) {
        if (!firstTime) firstTime = dt;
        lastTime = dt;
      }
    }

    const hrM = body.match(/<(?:gpxtpx:)?hr>([^<]+)<\/(?:gpxtpx:)?hr>/i);
    if (hrM) {
      const hr = Number.parseFloat(hrM[1]);
      if (Number.isFinite(hr) && hr > 40 && hr < 235) {
        hrSum += hr;
        hrCount += 1;
        if (hr > maxHr) maxHr = hr;
      }
    }

    const cadM = body.match(/<(?:gpxtpx:)?cad>([^<]+)<\/(?:gpxtpx:)?cad>/i);
    if (cadM) {
      const cad = Number.parseFloat(cadM[1]);
      if (Number.isFinite(cad) && cad > 40) {
        cadSum += cad < 120 ? cad * 2 : cad;
        cadCount += 1;
      }
    }
  }

  if (totalDistKm <= 0.05) {
    throw new Error('No valid GPS trackpoints found in GPX file.');
  }

  const durationSec =
    firstTime && lastTime && lastTime.getTime() > firstTime.getTime()
      ? Math.round((lastTime.getTime() - firstTime.getTime()) / 1000)
      : Math.round(totalDistKm * 305);

  const avgHr = hrCount > 0 ? Math.round(hrSum / hrCount) : 148;
  const paceSecPerKm = durationSec / Math.max(0.1, totalDistKm);

  return {
    date: formatDateYmd(firstTime ?? new Date()),
    title: title || 'Uploaded GPX Run',
    type: classifyRunType(totalDistKm, paceSecPerKm, avgHr, thresholdHr),
    distanceKm: Number(totalDistKm.toFixed(2)),
    durationSec,
    avgHr,
    maxHr: maxHr > 0 ? Math.round(maxHr) : undefined,
    elevationM: Math.round(elevGain),
    cadenceSpm: cadCount > 0 ? Math.round(cadSum / cadCount) : undefined,
    source: 'Upload',
  };
}

export function parseTcxContent(xml: string, filename: string, thresholdHr: number): Omit<Activity, 'id'> {
  const notesMatch = xml.match(/<Notes>([^<]+)<\/Notes>/i);
  const title = notesMatch ? notesMatch[1].trim() : filename.replace(/\.(gpx|tcx|fit)$/i, '');

  const distMatches = [...xml.matchAll(/<DistanceMeters>([^<]+)<\/DistanceMeters>/gi)];
  const timeMatches = [...xml.matchAll(/<TotalTimeSeconds>([^<]+)<\/TotalTimeSeconds>/gi)];
  const hrMatches = [...xml.matchAll(/<HeartRateBpm>\s*<Value>([^<]+)<\/Value>\s*<\/HeartRateBpm>/gi)];
  const tpTimeMatch = xml.match(/<Trackpoint>[\s\S]*?<Time>([^<]+)<\/Time>/i) || xml.match(/<Id>([^<]+)<\/Id>/i);

  let totalDistMeters = 0;
  if (distMatches.length > 0) {
    const lastVal = Number.parseFloat(distMatches[distMatches.length - 1][1]);
    if (Number.isFinite(lastVal)) totalDistMeters = lastVal;
  }

  let totalTimeSec = 0;
  for (const m of timeMatches) {
    const val = Number.parseFloat(m[1]);
    if (Number.isFinite(val)) totalTimeSec += val;
  }

  if (totalTimeSec <= 0) {
    const allTimes = [...xml.matchAll(/<Trackpoint>[\s\S]*?<Time>([^<]+)<\/Time>/gi)];
    if (allTimes.length >= 2) {
      const start = new Date(allTimes[0][1]).getTime();
      const end = new Date(allTimes[allTimes.length - 1][1]).getTime();
      if (end > start) totalTimeSec = Math.round((end - start) / 1000);
    }
  }

  if (totalDistMeters <= 50) {
    throw new Error('No valid distance data found in TCX file.');
  }

  let hrSum = 0;
  let hrCount = 0;
  let maxHr = 0;
  for (const m of hrMatches) {
    const hr = Number.parseFloat(m[1]);
    if (Number.isFinite(hr) && hr > 40 && hr < 235) {
      hrSum += hr;
      hrCount += 1;
      if (hr > maxHr) maxHr = hr;
    }
  }

  const distanceKm = Number((totalDistMeters / 1000).toFixed(2));
  const durationSec = totalTimeSec > 0 ? Math.round(totalTimeSec) : Math.round(distanceKm * 305);
  const avgHr = hrCount > 0 ? Math.round(hrSum / hrCount) : 150;
  const paceSecPerKm = durationSec / Math.max(0.1, distanceKm);
  const dateObj = tpTimeMatch ? new Date(tpTimeMatch[1].trim()) : new Date();

  return {
    date: formatDateYmd(dateObj),
    title: title || 'Uploaded TCX Run',
    type: classifyRunType(distanceKm, paceSecPerKm, avgHr, thresholdHr),
    distanceKm,
    durationSec,
    avgHr,
    maxHr: maxHr > 0 ? Math.round(maxHr) : undefined,
    source: 'Upload',
  };
}

// Binary Garmin .FIT file parser (supports session/record/lap messages)
export function parseFitBuffer(buf: Buffer, filename: string, thresholdHr: number): Omit<Activity, 'id'> {
  if (buf.length < 14 || buf.toString('ascii', 8, 12) !== '.FIT') {
    throw new Error('Invalid .FIT file header signature.');
  }

  const headerSize = buf.readUInt8(0);
  const dataSize = buf.readUInt32LE(4);
  const dataEnd = Math.min(buf.length, headerSize + dataSize);

  interface FieldDef {
    num: number;
    size: number;
    baseType: number;
  }
  interface MsgDef {
    globalMsgNum: number;
    isBigEndian: boolean;
    fields: FieldDef[];
    totalSize: number;
  }

  const localDefs = new Map<number, MsgDef>();
  let offset = headerSize;

  let sessionDistMeters = 0;
  let sessionTimerSec = 0;
  let sessionAvgHr = 0;
  let sessionMaxHr = 0;
  let sessionTimestamp: number | null = null;
  let sessionElevGain = 0;
  let sessionCadence = 0;

  let recordHrSum = 0;
  let recordHrCount = 0;
  let recordMaxHr = 0;
  let lastRecordDistMeters = 0;
  let firstRecordTs: number | null = null;
  let lastRecordTs: number | null = null;

  const FIT_EPOCH_MS = Date.UTC(1989, 11, 31, 0, 0, 0);

  function readVal(pos: number, size: number, baseType: number, bigEndian: boolean): number | null {
    if (pos + size > buf.length) return null;
    const typeNum = baseType & 0x1f;
    if (size === 1) {
      const v = buf.readUInt8(pos);
      return v === 0xff ? null : v;
    }
    if (size === 2) {
      const v = bigEndian ? buf.readUInt16BE(pos) : buf.readUInt16LE(pos);
      if (typeNum === 0x04 && v === 0xffff) return null;
      if (typeNum === 0x03 && v === 0x7fff) return null;
      return v;
    }
    if (size === 4) {
      const v = bigEndian ? buf.readUInt32BE(pos) : buf.readUInt32LE(pos);
      if (v === 0xffffffff) return null;
      return v;
    }
    return null;
  }

  while (offset < dataEnd) {
    const header = buf.readUInt8(offset);
    offset += 1;

    if ((header & 0x80) !== 0) {
      // Compressed timestamp header
      const localMsgType = (header >> 5) & 0x03;
      const def = localDefs.get(localMsgType);
      if (!def || offset + def.totalSize > dataEnd) break;
      offset += def.totalSize;
      continue;
    }

    const isDefinition = (header & 0x40) !== 0;
    const hasDevData = (header & 0x20) !== 0;
    const localMsgType = header & 0x0f;

    if (isDefinition) {
      if (offset + 5 > dataEnd) break;
      const arch = buf.readUInt8(offset + 1);
      const isBigEndian = arch === 1;
      const globalMsgNum = isBigEndian ? buf.readUInt16BE(offset + 2) : buf.readUInt16LE(offset + 2);
      const numFields = buf.readUInt8(offset + 4);
      offset += 5;

      const fields: FieldDef[] = [];
      let totalSize = 0;
      for (let i = 0; i < numFields && offset + 3 <= dataEnd; i++) {
        const num = buf.readUInt8(offset);
        const size = buf.readUInt8(offset + 1);
        const baseType = buf.readUInt8(offset + 2);
        offset += 3;
        fields.push({ num, size, baseType });
        totalSize += size;
      }

      if (hasDevData && offset < dataEnd) {
        const numDevFields = buf.readUInt8(offset);
        offset += 1 + numDevFields * 3;
      }

      localDefs.set(localMsgType, { globalMsgNum, isBigEndian, fields, totalSize });
    } else {
      const def = localDefs.get(localMsgType);
      if (!def || offset + def.totalSize > dataEnd) break;

      let fieldPos = offset;
      for (const f of def.fields) {
        const val = readVal(fieldPos, f.size, f.baseType, def.isBigEndian);
        if (val !== null) {
          if (def.globalMsgNum === 18) {
            // Session message
            if (f.num === 253 || f.num === 2) sessionTimestamp = val;
            if (f.num === 7) sessionTimerSec = val / 1000;
            if (f.num === 9) sessionDistMeters = val / 100;
            if (f.num === 16) sessionAvgHr = val;
            if (f.num === 17) sessionMaxHr = val;
            if (f.num === 18) sessionCadence = val * 2;
            if (f.num === 22) sessionElevGain = val;
          } else if (def.globalMsgNum === 20) {
            // Record message
            if (f.num === 253) {
              if (firstRecordTs === null) firstRecordTs = val;
              lastRecordTs = val;
            }
            if (f.num === 3 && val > 40 && val < 235) {
              recordHrSum += val;
              recordHrCount += 1;
              if (val > recordMaxHr) recordMaxHr = val;
            }
            if (f.num === 5) {
              lastRecordDistMeters = val / 100;
            }
          }
        }
        fieldPos += f.size;
      }

      offset += def.totalSize;
    }
  }

  const distMeters = sessionDistMeters > 50 ? sessionDistMeters : lastRecordDistMeters;
  if (distMeters <= 50) {
    throw new Error('Could not find running distance metrics inside .FIT file.');
  }

  const distanceKm = Number((distMeters / 1000).toFixed(2));
  const durationSec =
    sessionTimerSec > 10
      ? Math.round(sessionTimerSec)
      : firstRecordTs && lastRecordTs && lastRecordTs > firstRecordTs
        ? lastRecordTs - firstRecordTs
        : Math.round(distanceKm * 305);

  const avgHr =
    sessionAvgHr > 40
      ? Math.round(sessionAvgHr)
      : recordHrCount > 0
        ? Math.round(recordHrSum / recordHrCount)
        : 150;

  const tsSec = sessionTimestamp ?? firstRecordTs;
  const dateObj = tsSec ? new Date(FIT_EPOCH_MS + tsSec * 1000) : new Date();
  const paceSecPerKm = durationSec / Math.max(0.1, distanceKm);

  return {
    date: formatDateYmd(dateObj),
    title: filename.replace(/\.fit$/i, '').replace(/[_-]+/g, ' ') || 'Garmin .FIT Run',
    type: classifyRunType(distanceKm, paceSecPerKm, avgHr, thresholdHr),
    distanceKm,
    durationSec,
    avgHr,
    maxHr: sessionMaxHr > 40 ? sessionMaxHr : recordMaxHr > 40 ? recordMaxHr : undefined,
    elevationM: sessionElevGain > 0 ? Math.round(sessionElevGain) : undefined,
    cadenceSpm: sessionCadence > 100 ? Math.round(sessionCadence) : undefined,
    source: 'Upload',
  };
}

export function parseUploadedActivity(
  filename: string,
  base64Content: string,
  thresholdHr: number,
): Omit<Activity, 'id'> {
  const lower = filename.toLowerCase();
  const buffer = Buffer.from(base64Content, 'base64');
  if (lower.endsWith('.fit')) {
    return parseFitBuffer(buffer, filename, thresholdHr);
  }
  const text = buffer.toString('utf8');
  if (lower.endsWith('.gpx')) {
    return parseGpxContent(text, filename, thresholdHr);
  }
  if (lower.endsWith('.tcx')) {
    return parseTcxContent(text, filename, thresholdHr);
  }
  throw new Error('Unsupported file type. Please upload a .FIT, .GPX, or .TCX file.');
}
