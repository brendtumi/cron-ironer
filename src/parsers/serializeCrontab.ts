import { Job } from '../types';

export default function serializeCrontab(jobs: Job[]): string {
  return jobs
    .map((job) => {
      const comment = job.description ? ` # ${job.description}` : '';
      return `${job.schedule} ${job.name}${comment}`;
    })
    .join('\n');
}
