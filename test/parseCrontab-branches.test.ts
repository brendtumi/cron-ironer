import { describe, it, expect } from 'vitest';
import { parseCrontab } from '../src';

describe('parseCrontab branches', () => {
  it('extracts description when present', () => {
    const cron = `* * * * * echo # say hello\n# comment line ignored`;
    const res = parseCrontab(cron);
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('echo');
    expect(res[0].description).toBe('say hello');
  });

  it('assigns default job name when command is missing', () => {
    const cron = `* * * * *\n*/5 * * * * /usr/bin/run`;
    const res = parseCrontab(cron);
    // first line has only schedule -> default name job-0
    expect(res[0].name).toBe('job-0');
    expect(res[0].schedule).toBe('* * * * *');
    // second line normal command without description
    expect(res[1].name).toBe('/usr/bin/run');
    expect(res[1].description).toBeUndefined();
  });

  it('skips blank and comment-only lines and too-short entries', () => {
    const cron = `\n# full line comment\n* * * *\n0 0 * * * task`;
    const res = parseCrontab(cron);
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('task');
  });
});
