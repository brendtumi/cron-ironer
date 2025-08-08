import { Job } from '../types';

export default function parseJson(content: string): Job[] {
  const data = JSON.parse(content);
  if (Array.isArray(data)) return data as Job[];
  if (Array.isArray(data?.jobs)) return data.jobs as Job[];
  throw new Error('Invalid JSON format');
}
