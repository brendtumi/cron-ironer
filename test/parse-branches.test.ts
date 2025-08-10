import { describe, it, expect } from 'vitest';
import { parseJson, parseYaml } from '../src';

const sampleJobs = [
  { name: 'x', schedule: '0 0 * * *' },
  { name: 'y', schedule: '*/10 * * * *', description: 'every 10 min' },
];

describe('parseJson additional branches', () => {
  it('parses when JSON contains jobs property', () => {
    const jsonStr = JSON.stringify({ jobs: sampleJobs });
    const res = parseJson(jsonStr);
    expect(res).toHaveLength(2);
    expect(res[1].description).toBe('every 10 min');
  });

  it('throws an Error for invalid JSON shape', () => {
    const jsonStr = JSON.stringify({ notJobs: [] });
    expect(() => parseJson(jsonStr)).toThrowError('Invalid JSON format');
  });
});

describe('parseYaml additional branches', () => {
  it('parses when YAML contains jobs property', () => {
    const yamlStr = `jobs:\n  - name: x\n    schedule: 0 0 * * *\n  - name: y\n    schedule: '*/10 * * * *'\n    description: every 10 min\n`;
    const res = parseYaml(yamlStr);
    expect(res).toHaveLength(2);
    expect(res[0].name).toBe('x');
    expect(res[1].description).toBe('every 10 min');
  });

  it('throws an Error for invalid YAML shape', () => {
    const yamlStr = `notJobs: []`;
    expect(() => parseYaml(yamlStr)).toThrowError('Invalid YAML format');
  });
});
