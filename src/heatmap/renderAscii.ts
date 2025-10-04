import { Matrix } from '../types';

const chars = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '▉', '█'];

const colors = {
  green: (s: string) => `\u001b[32m${s}\u001b[0m`,
  yellow: (s: string) => `\u001b[33m${s}\u001b[0m`,
  red: (s: string) => `\u001b[31m${s}\u001b[0m`,
};

interface DensitySummary {
  maxValue?: number;
  minValue?: number;
}

function computeSummaryFromMatrix(matrix: Matrix): DensitySummary {
  let maxValue = 0;
  let minValue = Infinity;
  for (let h = 0; h < matrix.length; h += 1) {
    for (let m = 0; m < (matrix[h]?.length ?? 0); m += 1) {
      const value = matrix[h][m];
      if (value > maxValue) maxValue = value;
      if (value > 0 && value < minValue) minValue = value;
    }
  }
  return {
    maxValue,
    minValue: Number.isFinite(minValue) ? minValue : 0,
  };
}

function formatRuns(value: number | undefined): string {
  const safeValue =
    typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const label = safeValue === 1 ? 'run' : 'runs';
  if (safeValue === 0) {
    return '0 runs';
  }
  return `${safeValue} ${label}`;
}

export default function renderAscii(
  matrix: Matrix,
  useColor = false,
  summary?: DensitySummary,
): string {
  const cols = matrix[0]?.length ?? 0;
  const cellWidth = 2;
  const header =
    '    ' +
    Array.from({ length: cols }, (_, m) =>
      m % 5 === 0 ? String(m).padStart(2, '0') : ' '.repeat(cellWidth),
    ).join('') +
    '    ';

  const rows = matrix.map((row, h) => {
    const cells: string[] = [];
    for (let m = 0; m < cols; m += 1) {
      const count = row[m];
      const ch = chars[Math.min(count, chars.length - 1)].repeat(cellWidth);
      if (!useColor || count === 0) {
        cells.push(ch);
        continue;
      }
      let colorFn = colors.green;
      if (count > 3) colorFn = colors.red;
      else if (count > 1) colorFn = colors.yellow;
      cells.push(colorFn(ch));
    }
    return `${String(h).padStart(2, '0')} |${cells.join('')}| ${String(h).padStart(2, '0')}`;
  });

  const lines = [header, ...rows, header];

  const densitySummary = summary ?? computeSummaryFromMatrix(matrix);
  if (densitySummary) {
    lines.push('');
    lines.push(
      `Density summary: Highest density: ${formatRuns(
        densitySummary.maxValue,
      )}. Lowest density: ${formatRuns(densitySummary.minValue)}.`,
    );
  }

  return lines.join('\n');
}
