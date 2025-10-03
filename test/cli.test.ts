import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

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
});
