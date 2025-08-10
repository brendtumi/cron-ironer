import { describe, it, expect } from 'vitest';
import { serializeCrontab, Job } from '../src';

describe('serializeCrontab', () => {
  it('serializes jobs with and without descriptions correctly', () => {
    const jobs: Job[] = [
      { name: 'echo hello', schedule: '* * * * *' },
      { name: '/usr/bin/backup', schedule: '0 3 * * *', description: 'nightly backup' },
    ];
    const res = serializeCrontab(jobs);
    expect(res).toBe(`* * * * * echo hello\n0 3 * * * /usr/bin/backup # nightly backup`);
  });

  it('returns empty string for empty job list', () => {
    expect(serializeCrontab([])).toBe('');
  });
});
