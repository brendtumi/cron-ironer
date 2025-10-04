import { describe, it, expect } from 'vitest';
import {
  mkdtempSync,
  existsSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import type { SuggestedJob } from '../src';

const cli = path.join(__dirname, '..', 'src', 'cli.ts');
describe('cli', () => {
  it('adds reflect suffix to image output', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ci-'));
    const base = path.join(dir, 'heat.jpg');
    const cronFile = path.join(dir, 'jobs.json');
    writeFileSync(
      cronFile,
      JSON.stringify(
        [
          {
            name: 'job',
            schedule: '*/5 * * * *',
          },
        ],
        null,
        2,
      ),
    );
    const result = spawnSync('node', [
      '-r',
      'ts-node/register',
      cli,
      cronFile,
      '--reflect-duration',
      '--image',
      '-o',
      base,
    ]);
    expect(result.status).toBe(0);
    const expected = path.join(dir, 'heat.reflect.offset.jpg');
    expect(existsSync(expected)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 20000);

  it('adds suggested suffix to before/after images', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ci-'));
    const base = path.join(dir, 'heat.jpg');
    const cronFile = path.join(dir, 'jobs.json');
    writeFileSync(
      cronFile,
      JSON.stringify(
        [
          {
            name: 'job',
            schedule: '*/5 * * * *',
          },
        ],
        null,
        2,
      ),
    );
    const result = spawnSync('node', [
      '-r',
      'ts-node/register',
      cli,
      cronFile,
      '--suggest',
      '--image',
      '-o',
      base,
    ]);
    expect(result.status).toBe(0);
    const expectedBefore = path.join(dir, 'heat.before.suggested.offset.jpg');
    const expectedAfter = path.join(dir, 'heat.after.suggested.offset.jpg');
    expect(existsSync(expectedBefore)).toBe(true);
    expect(existsSync(expectedAfter)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 20000);

  it('does not create images for suggestions without --image', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ci-'));
    const cronFile = path.join(dir, 'jobs.json');
    writeFileSync(
      cronFile,
      JSON.stringify(
        [
          {
            name: 'job',
            schedule: '*/5 * * * *',
          },
        ],
        null,
        2,
      ),
    );
    const result = spawnSync('node', [
      '-r',
      'ts-node/register',
      cli,
      cronFile,
      '--suggest',
    ]);
    expect(result.status).toBe(0);
    const before = path.join(dir, 'jobs.before.suggested.offset.jpg');
    const after = path.join(dir, 'jobs.after.suggested.offset.jpg');
    expect(existsSync(before)).toBe(false);
    expect(existsSync(after)).toBe(false);
    const suggestion = path.join(dir, 'jobs.suggested.json');
    expect(existsSync(suggestion)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 20000);

  it('orders suggested before reflect suffix', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ci-'));
    const base = path.join(dir, 'heat.jpg');
    const cronFile = path.join(dir, 'jobs.json');
    writeFileSync(
      cronFile,
      JSON.stringify(
        [
          {
            name: 'job',
            schedule: '*/5 * * * *',
          },
        ],
        null,
        2,
      ),
    );
    const result = spawnSync('node', [
      '-r',
      'ts-node/register',
      cli,
      cronFile,
      '--suggest',
      '--reflect-duration',
      '--image',
      '-o',
      base,
    ]);
    expect(result.status).toBe(0);
    const expectedBefore = path.join(
      dir,
      'heat.before.suggested.reflect.offset.jpg',
    );
    const expectedAfter = path.join(
      dir,
      'heat.after.suggested.reflect.offset.jpg',
    );
    expect(existsSync(expectedBefore)).toBe(true);
    expect(existsSync(expectedAfter)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 20000);

  it('omits estimation metadata and records old schedules in suggestions', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ci-'));
    const cronFile = path.join(dir, 'jobs.json');
    writeFileSync(
      cronFile,
      JSON.stringify(
        [
          {
            name: 'fixed-anchor',
            schedule: '0/10 * * * *',
            estimation: 120,
            keepTime: true,
          },
          {
            name: 'movable',
            schedule: '*/10 * * * *',
            estimation: 60,
          },
        ],
        null,
        2,
      ),
    );
    const result = spawnSync('node', [
      '-r',
      'ts-node/register',
      cli,
      cronFile,
      '--suggest',
      '--optimizer',
      'greedy',
    ]);
    expect(result.status).toBe(0);

    const suggestionPath = path.join(dir, 'jobs.suggested.json');
    const suggestionRaw = readFileSync(suggestionPath, 'utf8');
    const output = JSON.parse(suggestionRaw) as SuggestedJob[];
    expect(Array.isArray(output)).toBe(true);
    const anchor = output.find((job) => job.name === 'fixed-anchor');
    const movable = output.find((job) => job.name === 'movable');
    expect(anchor).toBeDefined();
    expect(movable).toBeDefined();
    const hasProp = (job: SuggestedJob | undefined, key: string) =>
      Boolean(job && Object.prototype.hasOwnProperty.call(job, key));
    expect(anchor?.oldSchedule).toBeUndefined();
    expect(hasProp(anchor, 'keepTime')).toBe(false);
    expect(hasProp(anchor, 'estimation')).toBe(false);
    expect(hasProp(movable, 'keepTime')).toBe(false);
    expect(hasProp(movable, 'estimation')).toBe(false);
    expect(movable?.oldSchedule).toBe('*/10 * * * *');
    expect(movable?.schedule).not.toBe(movable?.oldSchedule);

    rmSync(dir, { recursive: true, force: true });
  }, 20000);

  it('preserves invalid schedules without adding metadata in suggestions', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ci-'));
    const cronFile = path.join(dir, 'jobs.json');
    writeFileSync(
      cronFile,
      JSON.stringify(
        [
          {
            name: 'early-bird',
            schedule: '0 0 * * *',
          },
          {
            name: 'valid-job-a',
            schedule: '*/5 * * * *',
          },
          {
            name: 'broken-job',
            schedule: 'not-a-valid-cron',
            estimation: 45,
          },
          {
            name: 'valid-job-b',
            schedule: '15 * * * *',
          },
          {
            name: 'valid-job-c',
            schedule: '30 5 * * MON',
          },
        ],
        null,
        2,
      ),
    );

    const result = spawnSync('node', [
      '-r',
      'ts-node/register',
      cli,
      cronFile,
      '--suggest',
    ]);

    expect(result.status).toBe(0);

    const suggestionPath = path.join(dir, 'jobs.suggested.json');
    const suggestionRaw = readFileSync(suggestionPath, 'utf8');
    const output = JSON.parse(suggestionRaw) as SuggestedJob[];
    expect(output).toHaveLength(5);
    expect(output[2]?.name).toBe('broken-job');
    const broken = output[2];
    const hasProp = (job: SuggestedJob | undefined, key: string) =>
      Boolean(job && Object.prototype.hasOwnProperty.call(job, key));
    expect(broken?.schedule).toBe('not-a-valid-cron');
    expect(broken?.oldSchedule).toBeUndefined();
    expect(hasProp(broken, 'estimation')).toBe(false);
    expect(hasProp(broken, 'keepTime')).toBe(false);

    rmSync(dir, { recursive: true, force: true });
  }, 20000);
});
