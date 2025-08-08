import { Matrix } from '../types';

const chars = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '▉', '█'];

const colors = {
  green: (s: string) => `\u001b[32m${s}\u001b[0m`,
  yellow: (s: string) => `\u001b[33m${s}\u001b[0m`,
  red: (s: string) => `\u001b[31m${s}\u001b[0m`,
};

export default function renderAscii(matrix: Matrix, useColor = false): string {
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

  return [header, ...rows, header].join('\n');
}
