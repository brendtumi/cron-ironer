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
    const commentIndex = rest.indexOf('#');
    const commandPart = commentIndex >= 0 ? rest.slice(0, commentIndex) : rest;
    const name = commandPart.trim() || `job-${idx}`;
    let description: string | undefined;
    if (commentIndex >= 0) {
      const descriptionPart = rest.slice(commentIndex + 1).trim();
      if (descriptionPart) {
        description = descriptionPart;
      }
    }
    jobs.push({ name, schedule, description });
  });
  return jobs;
}
