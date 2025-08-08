import parser from 'cron-parser';
import { Job, Matrix } from '../types';

function createMatrix(): Matrix {
  return Array.from({ length: 24 }, () => Array(60).fill(0));
}

export default function buildMatrix(
  jobs: Job[],
  reflectDuration = false,
): Matrix {
  const matrix = createMatrix();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  const currentDate = new Date(start.getTime() - 60000);

  jobs.forEach((job) => {
    try {
      const iter = parser.parse(job.schedule, {
        currentDate,
        endDate: end,
      });
      while (iter.hasNext()) {
        const d = iter.next().toDate();
        const h = d.getHours();
        const m = d.getMinutes();
        const durationMinutes =
          reflectDuration && job.estimation
            ? Math.ceil(job.estimation / 60)
            : 1;
        for (let k = 0; k < durationMinutes; k += 1) {
          const idx = h * 60 + m + k;
          const hh = Math.floor(idx / 60);
          const mm = idx % 60;
          if (hh < 24) matrix[hh][mm] += 1;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `Skipping job "${job.name}" due to invalid cron expression "${job.schedule}": ${msg}`,
      );
    }
  });

  const max = Math.max(...matrix.flat());
  if (max > 0) {
    for (let h = 0; h < matrix.length; h += 1) {
      for (let m = 0; m < matrix[h].length; m += 1) {
        matrix[h][m] = Math.ceil((matrix[h][m] * 9) / max);
      }
    }
  }

  return matrix;
}
