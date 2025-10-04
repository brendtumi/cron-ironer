import { HeatmapData } from '../types';
import { colorToHex, getColor, palette } from './palette';

function buildLegend(): string {
  const steps = palette
    .map((color, idx) => {
      const label = idx === palette.length - 1 ? `${idx}+` : `${idx}`;
      return `<div class="legend-item"><span class="legend-step" style="background:${colorToHex(
        color,
      )}" aria-hidden="true"></span><span class="legend-label">${label}</span></div>`;
    })
    .join('');
  return `<div class="legend" aria-label="Heatmap intensity legend" role="group">${steps}</div>`;
}

function encodeJobs(jobs: string[]): string {
  return encodeURIComponent(JSON.stringify(jobs));
}

function sanitizeNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : '0';
}

export default function renderInteractiveHtml(data: HeatmapData): string {
  const { matrix, raw, contributions, maxValue } = data;
  const rows = matrix.length;
  const cols = matrix[0]?.length || 0;
  const fontSize = 12;
  const labelGap = 4;
  const cellSize = 20;
  const gap = 1;
  const pitch = cellSize + gap;

  const labelWidthMeasure = 18; // fallback width if measurement is unavailable
  const labelWidth = labelWidthMeasure;
  const leftMargin = Math.floor(labelWidth + labelGap * 2);
  const rightMargin = leftMargin;
  const topMargin = Math.floor(fontSize + labelGap * 2);
  const bottomMargin = topMargin;

  const width = Math.max(leftMargin + cols * pitch - gap + rightMargin, 1);
  const height = Math.max(topMargin + rows * pitch - gap + bottomMargin, 1);

  const cells: string[] = [];
  for (let h = 0; h < rows; h += 1) {
    for (let m = 0; m < cols; m += 1) {
      const value = matrix[h][m];
      const color = colorToHex(getColor(value));
      const rawValue = raw[h][m];
      const jobNames = Array.from(new Set(contributions[h][m] || [])).sort();
      const encodedJobs = encodeJobs(jobNames);
      const hourLabel = String(h).padStart(2, '0');
      const minuteLabel = String(m).padStart(2, '0');
      const x = leftMargin + m * pitch;
      const y = topMargin + h * pitch;
      cells.push(
        `<rect class="cell" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" data-hour="${hourLabel}" data-minute="${minuteLabel}" data-count="${sanitizeNumber(rawValue)}" data-jobs="${encodedJobs}" />`,
      );
    }
  }

  const labels: string[] = [];
  for (let m = 0; m < cols; m += 5) {
    const minute = String(m).padStart(2, '0');
    const x = leftMargin + m * pitch + cellSize / 2;
    labels.push(
      `<text x="${x}" y="${topMargin - labelGap}" text-anchor="middle" alignment-baseline="baseline">${minute}</text>`,
    );
    labels.push(
      `<text x="${x}" y="${topMargin + rows * pitch - gap + labelGap}" text-anchor="middle" alignment-baseline="hanging">${minute}</text>`,
    );
  }

  for (let h = 0; h < rows; h += 1) {
    const hour = String(h).padStart(2, '0');
    const y = topMargin + h * pitch + cellSize / 2;
    labels.push(
      `<text x="${leftMargin - labelGap}" y="${y}" text-anchor="end" alignment-baseline="middle">${hour}</text>`,
    );
    labels.push(
      `<text x="${leftMargin + cols * pitch - gap + labelGap}" y="${y}" text-anchor="start" alignment-baseline="middle">${hour}</text>`,
    );
  }

  const legend = buildLegend();

  const script = `(() => {
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) return;

  const OFFSET = 16;

  function updatePosition(event) {
    tooltip.style.left = String(event.clientX + OFFSET) + 'px';
    tooltip.style.top = String(event.clientY + OFFSET) + 'px';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case '\'':
          return '&#39;';
        default:
          return char;
      }
    });
  }

  function renderJobs(jobs) {
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return '<p>No jobs scheduled.</p>';
    }
    return (
      '<ul>' +
      jobs.map((job) => '<li>' + escapeHtml(job) + '</li>').join('') +
      '</ul>'
    );
  }

  document.querySelectorAll('rect.cell').forEach((cell) => {
    cell.addEventListener('pointerenter', (event) => {
      const hour = cell.getAttribute('data-hour') || '00';
      const minute = cell.getAttribute('data-minute') || '00';
      const count = Number(cell.getAttribute('data-count') || '0');
      const jobsAttr = cell.getAttribute('data-jobs') || encodeURIComponent('[]');
      let jobs = [];
      try {
        jobs = JSON.parse(decodeURIComponent(jobsAttr));
      } catch (err) {
        jobs = [];
      }
      const runsLabel = count === 1 ? 'run' : 'runs';
      tooltip.innerHTML =
        '<strong>' +
        escapeHtml(hour + ':' + minute) +
        '</strong><br />' +
        '<span>' +
        escapeHtml(count + ' ' + runsLabel) +
        '</span>' +
        renderJobs(jobs);
      tooltip.style.opacity = '1';
      updatePosition(event);
    });

    cell.addEventListener('pointermove', updatePosition);

    cell.addEventListener('pointerleave', () => {
      tooltip.style.opacity = '0';
    });
  });
})();`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Cron Ironer Heatmap</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #f5f7fa;
        color: #1f2933;
      }
      .page {
        max-width: 960px;
        margin: 0 auto;
        padding: 24px 16px 48px;
      }
      h1 {
        font-size: 1.5rem;
        margin-bottom: 0.25rem;
      }
      p.description {
        margin-top: 0;
        color: #52606d;
      }
      svg {
        width: 100%;
        height: auto;
        display: block;
        background: #eee;
        border-radius: 8px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
      }
      text {
        font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        font-size: 12px;
        fill: #1f2933;
      }
      rect.cell {
        cursor: pointer;
      }
      rect.cell:hover {
        stroke: #111827;
        stroke-width: 0.75;
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        margin-top: 16px;
        font-size: 0.75rem;
        color: #616e7c;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .legend-step {
        width: 36px;
        height: 10px;
        border-radius: 4px;
        border: 1px solid rgba(15, 23, 42, 0.08);
      }
      #tooltip {
        position: fixed;
        pointer-events: none;
        background: rgba(15, 23, 42, 0.94);
        color: #f9fafb;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.8rem;
        line-height: 1.4;
        box-shadow: 0 4px 20px rgba(15, 23, 42, 0.2);
        opacity: 0;
        transition: opacity 120ms ease;
        max-width: 280px;
        z-index: 10;
      }
      #tooltip ul {
        padding-left: 20px;
        margin: 8px 0 0;
      }
      #tooltip p {
        margin: 8px 0 0;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>Cron Ironer Heatmap</h1>
      <p class="description">Hover over a minute to inspect job contributions. Highest density: ${maxValue} runs.</p>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="heatmap-title heatmap-desc">
        <title id="heatmap-title">Cron activity heatmap</title>
        <desc id="heatmap-desc">Each cell shows the number of cron jobs scheduled for a given hour and minute.</desc>
        ${[...cells, ...labels].join('\n        ')}
      </svg>
      ${legend}
    </div>
    <div id="tooltip" role="status" aria-live="polite"></div>
    <script>${script}</script>
  </body>
</html>`;
}
