import parser from 'cron-parser';
import { Job } from '../types';

interface GroupKey {
  step: number;
  rest: string;
}

function getGroupKey(job: Job): GroupKey | null {
  const [minute, ...rest] = job.schedule.split(' ');
  const m = minute.match(/^\*\/(\d+)$/);
  if (!m) return null;
  return { step: Number(m[1]), rest: rest.join(' ') };
}

export default function suggestSpread(jobs: Job[]): Job[] {
  const groups: Record<string, Job[]> = {};
  jobs.forEach((job) => {
    const key = getGroupKey(job);
    if (!key) return;
    const k = `${key.step}|${key.rest}`;
    if (!groups[k]) groups[k] = [];
    groups[k].push(job);
  });

  const result = jobs.map((j) => ({ ...j }));
  const slotCache: Record<string, number[]> = {};
  const baseCache: Record<string, number[]> = {};

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
    const m = minute.match(/^(\d+)?\/(\d+)$/);
    const duration = estimation ? Math.ceil(estimation / 60) : 1;
    let slots: number[] = [];
    if (m) {
      const off = m[1] ? Number(m[1]) : 0;
      const step = Number(m[2]);
      const bases = getBaseSlots(rest);
      const mins: number[] = [];
      for (let i = off; i < 60; i += step) mins.push(i);
      bases.forEach((base) => {
        mins.forEach((min) => {
          const startIdx = base + min;
          for (let k = 0; k < duration; k += 1) {
            const idx = startIdx + k;
            if (idx < 1440) slots.push(idx);
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
          const h = d.getHours();
          const mm = d.getMinutes();
          for (let k = 0; k < duration; k += 1) {
            const idx = h * 60 + mm + k;
            if (idx < 1440) slots.push(idx);
          }
        }
      } catch {
        // ignore invalid schedules
      }
    }
    slotCache[key] = slots;
    return slots;
  };

  const slotsMap: Record<string, number[]> = {};
  jobs.forEach((j) => {
    slotsMap[j.name] = getSlots(j.schedule, j.estimation);
  });

  const density = Array(1440).fill(0);
  Object.values(slotsMap).forEach((slots) => {
    slots.forEach((idx) => {
      density[idx] += 1;
    });
  });

  Object.entries(groups).forEach(([k, group]) => {
    const [stepStr, rest] = k.split('|');
    const step = Number(stepStr);

    group.forEach((job) => {
      slotsMap[job.name].forEach((idx) => {
        density[idx] -= 1;
      });
    });

    const used = new Set<number>();
    group.forEach((job, idx) => {
      const base =
        group.length === 1
          ? 0
          : Math.floor((idx * (step - 1)) / (group.length - 1));
      let bestOffset = 0;
      let bestScore = Infinity;
      let bestSlots: number[] = [];
      for (
        let delta = 0;
        delta < step && delta < 60 && bestScore > 0;
        delta += 1
      ) {
        const candidates = [base + delta];
        if (delta > 0) candidates.push(base - delta);
        for (const off of candidates) {
          if (off < 0 || off >= step || off >= 60 || used.has(off)) continue;
          const sched = `${off}/${step} ${rest}`;
          const slots = getSlots(sched, job.estimation);
          const score = slots.reduce((s, idx2) => s + density[idx2], 0);
          if (score < bestScore || (score === bestScore && off < bestOffset)) {
            bestScore = score;
            bestOffset = off;
            bestSlots = slots;
            if (bestScore === 0) break;
          }
        }
      }
      const newSchedule = `${bestOffset}/${step} ${rest}`;
      const target = result.find((r) => r.name === job.name);
      if (target) target.schedule = newSchedule;
      bestSlots.forEach((i) => {
        density[i] += 1;
      });
      slotsMap[job.name] = bestSlots;
      used.add(bestOffset);
    });
  });

  return result;
}
