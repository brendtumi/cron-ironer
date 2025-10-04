import { SuggestedJob } from '../types';

export default function serializeCrontab(jobs: SuggestedJob[]): string {
  return jobs
    .map((job) => {
      const details: string[] = [];
      if (job.description) details.push(job.description);
      if (job.oldSchedule) details.push(`old schedule: ${job.oldSchedule}`);
      const comment = details.length > 0 ? ` # ${details.join(' | ')}` : '';
      return `${job.schedule} ${job.name}${comment}`;
    })
    .join('\n');
}
