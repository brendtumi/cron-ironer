import parser from 'cron-parser';
import {
  ContributionMatrix,
  HeatmapContribution,
  HeatmapData,
  Job,
  Matrix,
} from '../types';

function createMatrix(): Matrix {
  return Array.from({ length: 24 }, () => Array(60).fill(0));
}

function createContributionMatrix(): ContributionMatrix {
  return Array.from({ length: 24 }, () =>
    Array.from({ length: 60 }, () => [] as HeatmapContribution[]),
  );
}

interface BuildOptions {
  reflectDuration: boolean;
  collectContributions: boolean;
}

interface BuildResult {
  raw: Matrix;
  contributions?: ContributionMatrix;
  maxValue: number;
}

function buildRawMatrix(jobs: Job[], options: BuildOptions): BuildResult {
  const matrix = createMatrix();
  const contributions = options.collectContributions
    ? createContributionMatrix()
    : undefined;
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
          options.reflectDuration && job.estimation
            ? Math.ceil(job.estimation / 60)
            : 1;
        for (let k = 0; k < durationMinutes; k += 1) {
          const idx = h * 60 + m + k;
          const hh = Math.floor(idx / 60);
          const mm = idx % 60;
          if (hh < 24) {
            matrix[hh][mm] += 1;
            if (contributions) {
              contributions[hh][mm].push({
                name: job.name,
                status: k === 0 ? 'starting' : 'continuing',
              });
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `Skipping job "${job.name}" due to invalid cron expression "${job.schedule}": ${msg}`,
      );
    }
  });

  let max = 0;
  for (let h = 0; h < matrix.length; h += 1) {
    for (let m = 0; m < matrix[h].length; m += 1) {
      if (matrix[h][m] > max) max = matrix[h][m];
    }
  }

  return { raw: matrix, contributions, maxValue: max };
}

function normalizeMatrix(raw: Matrix, maxValue: number): Matrix {
  const normalized = createMatrix();
  if (maxValue === 0) return normalized;
  for (let h = 0; h < raw.length; h += 1) {
    for (let m = 0; m < raw[h].length; m += 1) {
      normalized[h][m] = Math.ceil((raw[h][m] * 9) / maxValue);
    }
  }
  return normalized;
}

export function buildHeatmapData(
  jobs: Job[],
  reflectDuration = false,
): HeatmapData {
  const { raw, contributions, maxValue } = buildRawMatrix(jobs, {
    reflectDuration,
    collectContributions: true,
  });
  if (!contributions) {
    throw new Error('Contributions matrix missing from heatmap data build');
  }
  return {
    raw,
    contributions,
    maxValue,
    matrix: normalizeMatrix(raw, maxValue),
  };
}

export default function buildMatrix(
  jobs: Job[],
  reflectDuration = false,
): Matrix {
  const { raw, maxValue } = buildRawMatrix(jobs, {
    reflectDuration,
    collectContributions: false,
  });
  return normalizeMatrix(raw, maxValue);
}
