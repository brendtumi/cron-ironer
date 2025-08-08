import { describe, it, expect } from 'vitest';
import { suggestSpread, Job } from '../src';

describe('optimizer', () => {
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
