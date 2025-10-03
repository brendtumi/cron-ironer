import { describe, it, expect } from 'vitest';
import { suggestSpread, suggestAggressiveSpread, Job } from '../src';

describe('offset optimizer', () => {
  it('distributes jobs evenly for same period', () => {
    const jobs: Job[] = [
      { name: 'a', schedule: '*/5 * * * *' },
      { name: 'b', schedule: '*/5 * * * *' },
      { name: 'c', schedule: '*/5 * * * *' },
    ];
    const res = suggestSpread(jobs);
    const minutes = res.map((j) => j.schedule.split(' ')[0]);
    expect(minutes).toEqual(['0/5', '2/5', '4/5']);
  });

  it('considers existing load and estimation', () => {
    const jobs: Job[] = [
      { name: 'load', schedule: '0/5 * * * *', estimation: 120 },
      { name: 'a', schedule: '*/5 * * * *' },
      { name: 'b', schedule: '*/5 * * * *' },
    ];
    const res = suggestSpread(jobs);
    const suggestions = res
      .filter((j) => j.name !== 'load')
      .map((j) => j.schedule.split(' ')[0])
      .sort();
    expect(suggestions).toEqual(['2/5', '4/5']);
  });
});

describe('greedy optimizer', () => {
  it('respects keepTime markers and prioritises longer jobs', () => {
    const jobs: Job[] = [
      {
        name: 'anchor',
        schedule: '0/10 * * * *',
        estimation: 60,
        keepTime: true,
      },
      { name: 'long', schedule: '*/10 * * * *', estimation: 300 },
      { name: 'morning', schedule: '*/10 0-11 * * *', estimation: 300 },
      { name: 'short', schedule: '*/10 * * * *', estimation: 60 },
    ];
    const res = suggestAggressiveSpread(jobs);
    const byName = Object.fromEntries(res.map((j) => [j.name, j.schedule]));
    expect(byName.anchor).toBe('0/10 * * * *');
    expect(byName.morning).toBe('1/10 0-11 * * *');
    expect(byName.long).toBe('5/10 * * * *');
    expect(byName.short).toBe('2/10 * * * *');
  });

  it('accounts for work that spans midnight', () => {
    const jobs: Job[] = [
      {
        name: 'heavy',
        schedule: '5/10 * * * *',
        estimation: 1200,
        keepTime: true,
      },
      { name: 'candidate', schedule: '*/10 * * * *', estimation: 60 },
    ];
    const res = suggestAggressiveSpread(jobs);
    const candidate = res.find((j) => j.name === 'candidate');
    expect(candidate?.schedule).toBe('*/10 * * * *');
  });

  it(
    'shifts recurring hour-based jobs into less busy hours',
    { timeout: 10000 },
    () => {
      const jobs: Job[] = [
        {
          name: 'busy',
          schedule: '10 */2 * * *',
          estimation: 3600,
          keepTime: true,
        },
        {
          name: 'blocker',
          schedule: '0 */2 * * *',
          estimation: 3600,
          keepTime: true,
        },
        { name: 'candidate', schedule: '10 */2 * * *', estimation: 60 },
      ];
      const res = suggestAggressiveSpread(jobs);
      const candidate = res.find((j) => j.name === 'candidate');
      expect(candidate).toBeDefined();
      expect(candidate?.schedule.split(' ')[1]).toBe('1/2');
    },
  );

  it('understands range-based odd-hour schedules', { timeout: 10000 }, () => {
    const jobs: Job[] = [
      {
        name: 'anchor',
        schedule: '0 1-23/2 * * *',
        estimation: 7200,
        keepTime: true,
      },
      { name: 'candidate', schedule: '0 1-23/2 * * *', estimation: 60 },
    ];
    const res = suggestAggressiveSpread(jobs);
    const candidate = res.find((j) => j.name === 'candidate');
    expect(candidate).toBeDefined();
    expect(candidate?.schedule.split(' ')[1]).not.toBe('1-23/2');
    expect(candidate?.schedule.split(' ')[1]).toMatch(/\/(?:2|1)/);
  });

  it('can move single daily jobs to a new time', () => {
    const jobs: Job[] = [
      {
        name: 'evening-load',
        schedule: '0 18 * * *',
        estimation: 7200,
        keepTime: true,
      },
      { name: 'candidate', schedule: '0 18 * * *', estimation: 60 },
    ];
    const res = suggestAggressiveSpread(jobs);
    const candidate = res.find((j) => j.name === 'candidate');
    expect(candidate).toBeDefined();
    expect(candidate?.schedule.startsWith('0 18')).toBe(false);
  });
});
