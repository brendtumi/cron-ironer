import { Job } from '../types';

export default function parseCrontab(content: string): Job[] {
  const jobs: Job[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) return;
    const schedule = parts.slice(0, 5).join(' ');
    const rest = parts.slice(5).join(' ');
    const name = rest.replace(/#.*/, '').trim() || `job-${idx}`;
    const descriptionMatch = rest.match(/#(.*)$/);
    const description = descriptionMatch
      ? descriptionMatch[1].trim()
      : undefined;
    jobs.push({ name, schedule, description });
  });
  return jobs;
}
