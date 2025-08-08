import yaml from 'yaml';
import { Job } from '../types';

export default function parseYaml(content: string): Job[] {
  const data = yaml.parse(content);
  if (Array.isArray(data)) return data as Job[];
  if (Array.isArray(data?.jobs)) return data.jobs as Job[];
  throw new Error('Invalid YAML format');
}
