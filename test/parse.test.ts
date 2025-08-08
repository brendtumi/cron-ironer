import { describe, it, expect } from 'vitest';
import yaml from 'yaml';
import { parseJson, parseYaml, parseCrontab } from '../src';

const sample = [
  { name: 'a', schedule: '* * * * *' },
  { name: 'b', schedule: '*/5 * * * *', estimation: 120 },
];

const yamlStr = yaml.stringify(sample);
const jsonStr = JSON.stringify(sample);
const cronStr = '* * * * * echo\n*/5 * * * * /path\n';

describe('parsers', () => {
  it('parses yaml', () => {
    const res = parseYaml(yamlStr);
    expect(res[0].name).toBe('a');
  });
  it('parses json', () => {
    const res = parseJson(jsonStr);
    expect(res[1].estimation).toBe(120);
  });
  it('parses crontab', () => {
    const res = parseCrontab(cronStr);
    expect(res.length).toBe(2);
    expect(res[0].name).toBe('echo');
  });
});
