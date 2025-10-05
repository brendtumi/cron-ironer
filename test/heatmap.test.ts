import { describe, it, expect } from 'vitest';
import {
  buildMatrix,
  buildHeatmapData,
  renderAscii,
  renderImage,
  renderInteractiveHtml,
  Job,
} from '../src';
import { decode } from 'jpeg-js';
import { createCanvas } from '@napi-rs/canvas';

describe('heatmap', () => {
  it('builds matrix considering duration', () => {
    const jobs: Job[] = [
      { name: 'a', schedule: '0 0 * * *' },
      { name: 'b', schedule: '0 * * * *', estimation: 120 },
    ];
    const matrix = buildMatrix(jobs, true);
    expect(matrix[0][0]).toBe(9);
    expect(matrix[0][1]).toBe(5);
  });
  it('collects contributions for html rendering', () => {
    const jobs: Job[] = [
      { name: 'a', schedule: '0 0 * * *' },
      { name: 'b', schedule: '0 0 * * *' },
    ];
    const heatmap = buildHeatmapData(jobs);
    expect(heatmap.raw[0][0]).toBe(2);
    expect(heatmap.maxValue).toBe(2);
    expect(heatmap.minValue).toBe(2);
    expect(heatmap.contributions[0][0]).toEqual([
      { name: 'a', status: 'starting' },
      { name: 'b', status: 'starting' },
    ]);
  });

  it('marks continuing contributions for long-running jobs', () => {
    const jobs: Job[] = [
      { name: 'long', schedule: '0 0 * * *', estimation: 180 },
    ];
    const heatmap = buildHeatmapData(jobs, true);
    expect(heatmap.contributions[0][0]).toEqual([
      { name: 'long', status: 'starting' },
    ]);
    expect(heatmap.contributions[0][1]).toEqual([
      { name: 'long', status: 'continuing' },
    ]);
  });
  it('renders ascii with axis labels', () => {
    const ascii = renderAscii([Array(60).fill(0)]);
    const lines = ascii.split('\n');
    expect(lines).toHaveLength(5);
    const expectedHeader =
      '    ' +
      Array.from({ length: 60 }, (_, m) =>
        m % 5 === 0 ? String(m).padStart(2, '0') : '  ',
      ).join('') +
      '    ';
    expect(lines[0]).toBe(expectedHeader);
    expect(lines[2]).toBe(expectedHeader);
    expect(lines[1].startsWith('00 |')).toBe(true);
    expect(lines[1].endsWith('| 00')).toBe(true);
    expect(lines[3]).toBe('');
    expect(lines[4]).toBe(
      'Density summary: Highest density: 0 runs. Lowest density: 0 runs.',
    );
  });
  it('supports colors', () => {
    const row = Array(20).fill(0);
    row[5] = 1;
    row[10] = 2;
    row[15] = 4;
    const colored = renderAscii([row], true);
    expect(colored).toContain('\u001b[');
  });
  it('renders ascii table with minute spacing', () => {
    const ascii = renderAscii([Array(60).fill(0)]);
    const lines = ascii.split('\n');
    expect(lines[1].length).toBe(4 + 60 * 2 + 4);
    expect(lines[1].slice(4, -4)).toBe(' '.repeat(60 * 2));
  });

  it('renders ascii density summary from provided stats', () => {
    const ascii = renderAscii([Array(60).fill(0)], false, {
      maxValue: 12,
      minValue: 3,
    });
    expect(ascii).toContain(
      'Density summary: Highest density: 12 runs. Lowest density: 3 runs.',
    );
  });
  it('renders jpeg image', () => {
    const matrix = [
      [0, 1],
      [2, 4],
    ];
    const buf = renderImage(matrix, 0, 0);
    expect(buf.subarray(0, 2).toString('hex')).toBe('ffd8');
    const { width, height } = decode(buf);
    const fontSize = 12;
    const labelGap = 4;
    const measure = createCanvas(1, 1).getContext('2d');
    measure.font = `bold ${fontSize}px sans-serif`;
    const labelWidth = measure.measureText('00').width;
    const leftMargin = Math.floor(labelWidth + labelGap * 2);
    const rightMargin = leftMargin;
    const topMargin = Math.floor(fontSize + labelGap * 2);
    const bottomMargin = topMargin;
    const cellSize = 20;
    const gap = 1;
    const pitch = cellSize + gap;
    const expectedWidth =
      leftMargin + matrix[0].length * pitch - gap + rightMargin;
    const expectedHeight =
      topMargin + matrix.length * pitch - gap + bottomMargin;
    expect(width).toBe(expectedWidth);
    expect(height).toBe(expectedHeight);
  });

  it('renders image cells with gaps', () => {
    const buf = renderImage([[4, 4]], 0, 0);
    const { data, width } = decode(buf);
    const fontSize = 12;
    const labelGap = 4;
    const measure = createCanvas(1, 1).getContext('2d');
    measure.font = `bold ${fontSize}px sans-serif`;
    const labelWidth = measure.measureText('00').width;
    const leftMargin = Math.floor(labelWidth + labelGap * 2);
    const topMargin = Math.floor(fontSize + labelGap * 2);
    const cellSize = 20;
    const y = Math.floor(topMargin + cellSize / 2);
    const boundaryX = leftMargin + cellSize;
    const pos = (y * width + boundaryX) * 4;
    expect(data[pos]).toBeGreaterThan(200);
    expect(data[pos + 1]).toBeGreaterThan(200);
    expect(data[pos + 2]).toBeGreaterThan(200);
  });

  it('labels minutes every five', () => {
    const matrix = Array.from({ length: 24 }, () => Array(60).fill(0));
    const buf = renderImage(matrix, 0, 0);
    const { data, width, height: imgHeight } = decode(buf);
    const imgWidth = width;
    const fontSize = 12;
    const labelGap = 4;
    const canvas = createCanvas(imgWidth, imgHeight);
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${fontSize}px sans-serif`;
    const labelWidth = ctx.measureText('00').width;
    const digitWidth = ctx.measureText('0').width;
    const leftMargin = Math.floor(labelWidth + labelGap * 2);
    const topMargin = Math.floor(fontSize + labelGap * 2);
    const rows = matrix.length;
    const cellSize = 20;
    const gap = 1;
    const pitch = cellSize + gap;
    const yTop = topMargin - labelGap - fontSize / 2;

    const center5 = leftMargin + 5 * pitch + cellSize / 2;
    let min5 = 255;
    for (
      let dx = -Math.floor(digitWidth / 2);
      dx <= Math.floor(digitWidth / 2);
      dx += 1
    ) {
      const pos = (Math.floor(yTop) * width + Math.floor(center5 + dx)) * 4;
      if (data[pos] < min5) min5 = data[pos];
    }
    expect(min5).toBeLessThan(200);

    const yBottom = topMargin + rows * pitch - gap + labelGap + fontSize / 2;
    let minBottom5 = 255;
    for (
      let dx = -Math.floor(digitWidth / 2);
      dx <= Math.floor(digitWidth / 2);
      dx += 1
    ) {
      const pos = (Math.floor(yBottom) * width + Math.floor(center5 + dx)) * 4;
      if (data[pos] < minBottom5) minBottom5 = data[pos];
    }
    expect(minBottom5).toBeLessThan(200);
  });

  it('mirrors hour labels on the right', () => {
    const matrix = Array.from({ length: 24 }, () => [0]);
    const buf = renderImage(matrix, 0, 0);
    const { data, width, height: imgHeight } = decode(buf);
    const imgWidth = width;
    const fontSize = 12;
    const labelGap = 4;
    const canvas = createCanvas(imgWidth, imgHeight);
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${fontSize}px sans-serif`;
    const labelWidth = ctx.measureText('00').width;
    const leftMargin = Math.floor(labelWidth + labelGap * 2);
    const topMargin = Math.floor(fontSize + labelGap * 2);
    const cellSize = 20;
    const gap = 1;
    const pitch = cellSize + gap;
    const centerY = Math.floor(topMargin + cellSize / 2);
    const digitWidth = ctx.measureText('0').width;
    const leftEdge = leftMargin - labelGap;
    const rightEdge = leftMargin + pitch - gap + labelGap;
    let minLeft = 255;
    for (let dx = 0; dx <= Math.floor(digitWidth); dx += 1) {
      const pos = (centerY * width + Math.floor(leftEdge - dx)) * 4;
      if (data[pos] < minLeft) minLeft = data[pos];
    }
    let minRight = 255;
    for (let dx = 0; dx <= Math.floor(digitWidth); dx += 1) {
      const pos = (centerY * width + Math.floor(rightEdge + dx)) * 4;
      if (data[pos] < minRight) minRight = data[pos];
    }
    expect(minLeft).toBeLessThan(200);
    expect(minRight).toBeLessThan(200);
  });

  it('skips jobs with invalid cron expressions', () => {
    const matrix = buildMatrix([
      { name: 'bad', schedule: '0 0 31 2 *' },
      { name: 'good', schedule: '0 0 * * *' },
    ]);
    expect(matrix[0][0]).toBe(9);
  });

  it('uses minimum image size by default', () => {
    const buf = renderImage([[0]]);
    const { width, height } = decode(buf);
    expect(width).toBeGreaterThanOrEqual(1300);
    expect(height).toBeGreaterThanOrEqual(550);
  });

  it('renders interactive html with npm link and contribution metadata', () => {
    const jobs: Job[] = [
      { name: 'long', schedule: '0 0 * * *', estimation: 120 },
      { name: 'short', schedule: '0 0 * * *' },
    ];
    const heatmap = buildHeatmapData(jobs, true);
    const html = renderInteractiveHtml(heatmap);
    expect(html).toContain('https://www.npmjs.com/package/cron-ironer');
    expect(html).toContain('https://github.com/brendtumi/cron-ironer');
    expect(html).toContain('data-starting="2"');
    expect(html).toContain('data-continuing="1"');
    const contributionMatches = [
      ...html.matchAll(/data-contributions="([^"]+)"/g),
    ];
    const continuingEntry = contributionMatches
      .map((match) => JSON.parse(decodeURIComponent(match[1])))
      .find(
        (entries) =>
          Array.isArray(entries) &&
          entries.some((entry) => entry && entry.status === 'continuing'),
      );
    expect(continuingEntry).toBeDefined();
    expect(continuingEntry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'long', status: 'continuing' }),
      ]),
    );
    expect(html).toContain(
      'Hover over a minute to inspect starting and continuing job contributions. Highest density: 2 runs. Lowest density: 1 run.',
    );
    expect(html).toContain(
      '<h2 id="heatmap-heading-schedule-overview">Schedule overview</h2>',
    );
    expect(html).toContain(
      'View cron-ironer on <a class="meta-link" href="https://www.npmjs.com/package/cron-ironer"',
    );
    expect(html).toContain(
      '>Npm</a> or <a class="meta-link" href="https://github.com/brendtumi/cron-ironer"',
    );
  });

  it('renders png images', () => {
    const matrix = [
      [0, 1],
      [2, 4],
    ];
    const buf = renderImage(matrix, {
      minWidth: 0,
      minHeight: 0,
      format: 'png',
    });
    expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });

  it('renders svg images', () => {
    const matrix = [
      [0, 1],
      [2, 4],
    ];
    const buf = renderImage(matrix, {
      minWidth: 0,
      minHeight: 0,
      format: 'svg',
    });
    const svg = buf.toString('utf8');
    expect(svg.includes('<svg')).toBe(true);
    expect(svg).toContain('rect');
  });

  it('renders interactive html', () => {
    const jobs: Job[] = [
      { name: 'jobA', schedule: '0 0 * * *' },
      { name: 'jobB', schedule: '15 3 * * *' },
    ];
    const heatmap = buildHeatmapData(jobs);
    const html = renderInteractiveHtml(heatmap);
    expect(html).toContain('Cron Ironer Heatmap');
    expect(html).toContain(
      '<h2 id="heatmap-heading-schedule-overview">Schedule overview</h2>',
    );
    expect(html).toContain('data-hour="00"');
    expect(html).toContain('Hover over a minute');
    expect(html).toContain('data-contributions=');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('data-starting="1"');
    expect(html).toContain('aria-label="00:00 has 1 run. Starting run: jobA."');
  });

  it('renders multiple html sections with options list', () => {
    const jobs: Job[] = [
      { name: 'jobA', schedule: '0 0 * * *' },
      { name: 'jobB', schedule: '15 3 * * *' },
    ];
    const baseHeatmap = buildHeatmapData(jobs);
    const html = renderInteractiveHtml(baseHeatmap, {
      sections: [
        { id: 'before', title: 'Before', heatmap: baseHeatmap },
        { id: 'after', title: 'After', heatmap: baseHeatmap },
      ],
      optionsUsed: ['--suggest', '--reflect-duration', '--html'],
    });
    expect(html).toContain('<h2 id="heatmap-heading-before">Before</h2>');
    expect(html).toContain('<h2 id="heatmap-heading-after">After</h2>');
    expect(html).toContain('Options used:');
    expect(html).toContain('<code>--suggest</code>');
    expect(html).toContain('<code>--reflect-duration</code>');
    expect(html).toContain('<code>--html</code>');
    expect(html).toContain(
      'aria-labelledby="heatmap-title-before heatmap-desc-before"',
    );
    expect(html).toContain(
      'aria-labelledby="heatmap-title-after heatmap-desc-after"',
    );
  });
});
