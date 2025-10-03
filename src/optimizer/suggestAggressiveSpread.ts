import parser from 'cron-parser';
import { Job } from '../types';

const MINUTES_PER_DAY = 1440;
const STEP_REGEX = /^(\*|\d+)\/([1-9]\d*)$/;
const HOUR_RANGE_STEP_REGEX = /^(\d+)-(\d+)\/([1-9]\d*)$/;

type JobDescriptor =
  | { kind: 'fixed' }
  | { kind: 'minute-step'; step: number; rest: string }
  | {
      kind: 'hour-step';
      step: number;
      tail: string;
      hourField: string;
    }
  | { kind: 'daily'; tail: string };

function normalizeMinute(idx: number): number {
  let value = idx % MINUTES_PER_DAY;
  if (value < 0) value += MINUTES_PER_DAY;
  return value;
}

function parseStep(field: string, limit: number): { base: number; step: number } | null {
  const m = field.match(STEP_REGEX);
  if (!m) return null;
  const [, baseStr, stepStr] = m;
  const base = baseStr === '*' ? 0 : Number(baseStr);
  const step = Number(stepStr);
  if (Number.isNaN(base) || Number.isNaN(step) || step <= 0) return null;
  if (base < 0 || base > limit) return null;
  return { base, step };
}

function parseHourStep(field: string): { base: number; step: number } | null {
  const simple = parseStep(field, 23);
  if (simple) return simple;
  const match = field.match(HOUR_RANGE_STEP_REGEX);
  if (!match) return null;
  const [, startStr, endStr, stepStr] = match;
  const start = Number(startStr);
  const end = Number(endStr);
  const step = Number(stepStr);
  if ([start, end, step].some((value) => Number.isNaN(value))) return null;
  if (step <= 0 || start < 0 || end < 0 || start > 23 || end > 23 || start > end) {
    return null;
  }
  return { base: start % step, step };
}

function parseNumber(field: string, max: number): number | null {
  if (!/^\d+$/.test(field)) return null;
  const value = Number(field);
  if (value < 0 || value > max) return null;
  return value;
}

function describeJob(job: Job): JobDescriptor {
  const parts = job.schedule.trim().split(/\s+/);
  if (parts.length !== 5) return { kind: 'fixed' };
  const [minute, hour, ...tailParts] = parts;
  const tail = tailParts.join(' ');
  const minuteStep = parseStep(minute, 59);
  if (minuteStep) {
    return { kind: 'minute-step', step: minuteStep.step, rest: `${hour} ${tail}` };
  }

  const minuteValue = parseNumber(minute, 59);
  if (minuteValue === null) return { kind: 'fixed' };

  const hourStep = parseHourStep(hour);
  if (hourStep && hourStep.step <= 24 && hourStep.base < hourStep.step) {
    return { kind: 'hour-step', step: hourStep.step, tail, hourField: hour };
  }

  const hourValue = parseNumber(hour, 23);
  if (hourValue !== null) {
    return { kind: 'daily', tail };
  }

  return { kind: 'fixed' };
}

function getOffsetFromSchedule(schedule: string, step: number): number | null {
  const [minute] = schedule.split(' ');
  const m = minute.match(STEP_REGEX);
  if (!m) return null;
  const [, offStr, stepStr] = m;
  if (Number(stepStr) !== step) return null;
  return offStr && offStr !== '*' ? Number(offStr) : 0;
}

const SIMPLE_STEP_REGEX = /^\d+\/([1-9]\d*)$/;

function formatHourField(base: number, step: number, raw: string): string {
  if (base === 0) {
    if (step === 1 || raw === '*' || raw === '*/1' || raw === '0/1') return '*';
    if (/^\*\/[1-9]\d*$/.test(raw)) return `*/${step}`;
    if (SIMPLE_STEP_REGEX.test(raw) || raw === '0') return `0/${step}`;
    if (HOUR_RANGE_STEP_REGEX.test(raw)) return `0/${step}`;
    return `0/${step}`;
  }
  return `${base}/${step}`;
}

export default function suggestAggressiveSpread(jobs: Job[]): Job[] {
  const result = jobs.map((job) => ({ ...job }));

  const baseCache: Record<string, number[]> = {};
  const slotCache: Record<string, number[]> = {};
  const startCache: Record<string, number[]> = {};

  const getBaseSlots = (rest: string): number[] => {
    if (baseCache[rest]) return baseCache[rest];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const currentDate = new Date(start.getTime() - 60000);
    const slots: number[] = [];
    try {
      const iter = parser.parse(`0 ${rest}`, { currentDate, endDate: end });
      while (iter.hasNext()) {
        const d = iter.next().toDate();
        slots.push(d.getHours() * 60);
      }
    } catch {
      // ignore invalid schedules
    }
    baseCache[rest] = slots;
    return slots;
  };

  const getSlots = (schedule: string, estimation?: number): number[] => {
    const key = `${schedule}|${estimation ?? 0}`;
    if (slotCache[key]) return slotCache[key];
    const [minute, ...restArr] = schedule.split(' ');
    const rest = restArr.join(' ');
    const m = minute.match(STEP_REGEX);
    const duration = estimation ? Math.max(1, Math.ceil(estimation / 60)) : 1;
    const slots: number[] = [];
    const pushSlot = (idx: number) => {
      slots.push(normalizeMinute(idx));
    };
    if (m) {
      const [, offStr, stepStr] = m;
      const off = offStr && offStr !== '*' ? Number(offStr) : 0;
      const step = Number(stepStr);
      const bases = getBaseSlots(rest);
      const mins: number[] = [];
      for (let i = off; i < 60; i += step) mins.push(i);
      bases.forEach((base) => {
        mins.forEach((min) => {
          const startIdx = base + min;
          for (let k = 0; k < duration; k += 1) {
            pushSlot(startIdx + k);
          }
        });
      });
    } else {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const currentDate = new Date(start.getTime() - 60000);
      try {
        const iter = parser.parse(schedule, { currentDate, endDate: end });
        while (iter.hasNext()) {
          const d = iter.next().toDate();
          const base = d.getHours() * 60 + d.getMinutes();
          for (let k = 0; k < duration; k += 1) {
            pushSlot(base + k);
          }
        }
      } catch {
        // ignore invalid schedules
      }
    }
    slotCache[key] = slots;
    return slots;
  };

  const getStartSlots = (schedule: string): number[] => {
    if (startCache[schedule]) return startCache[schedule];
    const [minute, ...restArr] = schedule.split(' ');
    const rest = restArr.join(' ');
    const m = minute.match(STEP_REGEX);
    const starts: number[] = [];
    if (m) {
      const [, offStr, stepStr] = m;
      const off = offStr && offStr !== '*' ? Number(offStr) : 0;
      const step = Number(stepStr);
      const bases = getBaseSlots(rest);
      for (let i = off; i < 60; i += step) {
        bases.forEach((base) => {
          starts.push(normalizeMinute(base + i));
        });
      }
    } else {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const currentDate = new Date(start.getTime() - 60000);
      try {
        const iter = parser.parse(schedule, { currentDate, endDate: end });
        while (iter.hasNext()) {
          const d = iter.next().toDate();
          starts.push(normalizeMinute(d.getHours() * 60 + d.getMinutes()));
        }
      } catch {
        // ignore invalid schedules
      }
    }
    const ordered = Array.from(new Set(starts)).sort((a, b) => a - b);
    startCache[schedule] = ordered;
    return ordered;
  };

  const density = Array(MINUTES_PER_DAY).fill(0);
  const groupUsage: Record<string, Set<number>> = {};
  const coverageMap: Record<string, number[]> = {};
  const startTimesMap: Record<string, number[]> = {};
  const descriptorMap: Record<string, JobDescriptor> = {};

  const fixed: Job[] = [];
  const movable: Job[] = [];

  jobs.forEach((job) => {
    const descriptor = describeJob(job);
    descriptorMap[job.name] = descriptor;
    coverageMap[job.name] = getSlots(job.schedule, job.estimation);
    startTimesMap[job.name] = getStartSlots(job.schedule);
    if (job.keepTime || descriptor.kind === 'fixed' || startTimesMap[job.name].length === 0) {
      fixed.push(job);
    } else {
      movable.push(job);
    }
  });

  const getGroupId = (descriptor: JobDescriptor): string | null => {
    switch (descriptor.kind) {
      case 'minute-step':
        return `minute-step|${descriptor.step}|${descriptor.rest}`;
      case 'hour-step':
        return `hour-step|${descriptor.step}|${descriptor.tail}`;
      case 'daily':
        return `daily|${descriptor.tail}`;
      default:
        return null;
    }
  };

  const getHourStepPhase = (schedule: string, step: number): number | null => {
    const parts = schedule.trim().split(/\s+/);
    if (parts.length !== 5) return null;
    const [minuteField, hourField] = parts;
    const minuteValue = parseNumber(minuteField, 59);
    const hourInfo = parseHourStep(hourField);
    if (minuteValue === null || !hourInfo || hourInfo.step !== step) return null;
    return (hourInfo.base % step) * 60 + minuteValue;
  };

  const getDailyPhase = (schedule: string): number | null => {
    const parts = schedule.trim().split(/\s+/);
    if (parts.length !== 5) return null;
    const [minuteField, hourField] = parts;
    const minuteValue = parseNumber(minuteField, 59);
    const hourValue = parseNumber(hourField, 23);
    if (minuteValue === null || hourValue === null) return null;
    return hourValue * 60 + minuteValue;
  };

  const registerUsage = (job: Job) => {
    const descriptor = descriptorMap[job.name];
    if (!descriptor) return;
    const groupId = getGroupId(descriptor);
    if (!groupId) return;
    if (!groupUsage[groupId]) groupUsage[groupId] = new Set();
    let phase: number | null = null;
    if (descriptor.kind === 'minute-step') {
      phase = getOffsetFromSchedule(job.schedule, descriptor.step);
      if (phase !== null) phase %= descriptor.step;
    } else if (descriptor.kind === 'hour-step') {
      phase = getHourStepPhase(job.schedule, descriptor.step);
    } else if (descriptor.kind === 'daily') {
      phase = getDailyPhase(job.schedule);
    }
    if (phase !== null) groupUsage[groupId].add(phase);
  };

  fixed.forEach((job) => {
    coverageMap[job.name].forEach((idx) => {
      density[idx] += 1;
    });
    registerUsage(job);
  });

  const getDuration = (job: Job): number => {
    if (!job.estimation) return 1;
    return Math.max(1, Math.ceil(job.estimation / 60));
  };

  movable.sort((a, b) => {
    const durationA = getDuration(a);
    const durationB = getDuration(b);
    if (durationA !== durationB) return durationB - durationA;
    const intervalsA = startTimesMap[a.name].length;
    const intervalsB = startTimesMap[b.name].length;
    if (intervalsA !== intervalsB) return intervalsA - intervalsB;
    return a.name.localeCompare(b.name);
  });

  movable.forEach((job) => {
    const descriptor = descriptorMap[job.name];
    if (!descriptor || descriptor.kind === 'fixed') {
      coverageMap[job.name].forEach((idx) => {
        density[idx] += 1;
      });
      return;
    }

    const groupId = getGroupId(descriptor);
    const used = groupId ? groupUsage[groupId] ?? new Set<number>() : new Set<number>();
    if (groupId && !groupUsage[groupId]) groupUsage[groupId] = used;

    let bestSchedule = job.schedule;
    let bestSlots = coverageMap[job.name];
    let bestScore = Number.POSITIVE_INFINITY;
    let bestPenalty = Number.POSITIVE_INFINITY;
    let bestPhase: number | null = null;

    const considerCandidate = (schedule: string, phase: number) => {
      const slots = getSlots(schedule, job.estimation);
      if (slots.length === 0) return;
      const score = slots.reduce((acc, idx) => acc + density[idx], 0);
      const penalty = used.has(phase) ? 1 : 0;
      if (
        score < bestScore ||
        (score === bestScore &&
          (penalty < bestPenalty ||
            (penalty === bestPenalty &&
              (bestPhase === null || phase < bestPhase ||
                (phase === bestPhase && schedule < bestSchedule)))))
      ) {
        bestScore = score;
        bestPenalty = penalty;
        bestSchedule = schedule;
        bestSlots = slots;
        bestPhase = phase;
      }
    };

    if (descriptor.kind === 'minute-step') {
      const limit = Math.min(descriptor.step, 60);
      for (let offset = 0; offset < limit && offset < descriptor.step; offset += 1) {
        const schedule = `${offset}/${descriptor.step} ${descriptor.rest}`;
        considerCandidate(schedule, offset % descriptor.step);
        if (bestScore === 0 && bestPenalty === 0) break;
      }
    } else if (descriptor.kind === 'hour-step') {
      for (let base = 0; base < descriptor.step; base += 1) {
        const hourField = formatHourField(base, descriptor.step, descriptor.hourField);
        for (let minute = 0; minute < 60; minute += 1) {
          const schedule = `${minute} ${hourField} ${descriptor.tail}`;
          const phase = base * 60 + minute;
          considerCandidate(schedule, phase);
          if (bestScore === 0 && bestPenalty === 0) break;
        }
        if (bestScore === 0 && bestPenalty === 0) break;
      }
    } else if (descriptor.kind === 'daily') {
      for (let hour = 0; hour < 24; hour += 1) {
        for (let minute = 0; minute < 60; minute += 1) {
          const schedule = `${minute} ${hour} ${descriptor.tail}`;
          const phase = hour * 60 + minute;
          considerCandidate(schedule, phase);
          if (bestScore === 0 && bestPenalty === 0) break;
        }
        if (bestScore === 0 && bestPenalty === 0) break;
      }
    }

    const target = result.find((r) => r.name === job.name);
    if (!target || bestPhase === null) {
      coverageMap[job.name].forEach((idx) => {
        density[idx] += 1;
      });
      return;
    }

    target.schedule = bestSchedule;
    bestSlots.forEach((idx) => {
      density[idx] += 1;
    });
    coverageMap[job.name] = bestSlots;
    if (groupId) used.add(bestPhase);
  });

  return result;
}
