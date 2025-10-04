import { HeatmapContribution, HeatmapData } from '../types';
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

function encodeContributions(entries: HeatmapContribution[]): string {
  return encodeURIComponent(JSON.stringify(entries));
}

function sanitizeNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : '0';
}

interface ContributionBucketEntry {
  name: string;
  count: number;
}

interface ContributionSummary {
  startingCount: number;
  continuingCount: number;
  starting: ContributionBucketEntry[];
  continuing: ContributionBucketEntry[];
}

function summarizeContributions(
  entries: HeatmapContribution[],
): ContributionSummary {
  const startingMap = new Map<string, number>();
  const continuingMap = new Map<string, number>();
  let startingCount = 0;
  let continuingCount = 0;

  entries.forEach((entry) => {
    if (!entry || typeof entry.name !== 'string') {
      return;
    }
    const key = entry.name;
    if (entry.status === 'continuing') {
      continuingCount += 1;
      continuingMap.set(key, (continuingMap.get(key) || 0) + 1);
    } else {
      startingCount += 1;
      startingMap.set(key, (startingMap.get(key) || 0) + 1);
    }
  });

  const sortBucket = (bucket: Map<string, number>): ContributionBucketEntry[] =>
    Array.from(bucket.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

  return {
    startingCount,
    continuingCount,
    starting: sortBucket(startingMap),
    continuing: sortBucket(continuingMap),
  };
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatBucketForAria(entries: ContributionBucketEntry[]): string {
  if (!entries.length) {
    return 'none';
  }
  return entries
    .map((entry) =>
      entry.count > 1 ? `${entry.name} (${entry.count})` : entry.name,
    )
    .join(', ');
}

function buildAriaLabel(
  hour: string,
  minute: string,
  count: number,
  summary: ContributionSummary,
): string {
  const runsLabel = count === 1 ? 'run' : 'runs';
  const parts = [`${hour}:${minute} has ${count} ${runsLabel}.`];
  if (summary.startingCount > 0) {
    const bucketLabel =
      summary.startingCount === 1 ? 'Starting run' : 'Starting runs';
    parts.push(`${bucketLabel}: ${formatBucketForAria(summary.starting)}.`);
  }
  if (summary.continuingCount > 0) {
    const bucketLabel =
      summary.continuingCount === 1 ? 'Continuing run' : 'Continuing runs';
    parts.push(`${bucketLabel}: ${formatBucketForAria(summary.continuing)}.`);
  }
  if (summary.startingCount === 0 && summary.continuingCount === 0) {
    parts.push('No jobs scheduled.');
  }
  return parts.join(' ');
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
      const entryList = contributions[h][m] || [];
      const summary = summarizeContributions(entryList);
      const encodedContributions = encodeContributions(entryList);
      const hourLabel = String(h).padStart(2, '0');
      const minuteLabel = String(m).padStart(2, '0');
      const x = leftMargin + m * pitch;
      const y = topMargin + h * pitch;
      const ariaLabel = escapeAttribute(
        buildAriaLabel(hourLabel, minuteLabel, rawValue, summary),
      );
      cells.push(
        `<rect class="cell" tabindex="0" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" data-hour="${hourLabel}" data-minute="${minuteLabel}" data-count="${sanitizeNumber(
          rawValue,
        )}" data-contributions="${escapeAttribute(
          encodedContributions,
        )}" data-starting="${sanitizeNumber(
          summary.startingCount,
        )}" data-continuing="${sanitizeNumber(
          summary.continuingCount,
        )}" aria-label="${ariaLabel}" />`,
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
        case "'":
          return '&#39;';
        default:
          return char;
      }
    });
  }

  function parseContributions(cell) {
    const raw = cell.getAttribute('data-contributions') || encodeURIComponent('[]');
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => ({
          name: typeof entry.name === 'string' ? entry.name : '',
          status: entry.status === 'continuing' ? 'continuing' : 'starting',
        }))
        .filter((entry) => entry.name);
    } catch (err) {
      return [];
    }
  }

  function bucketize(entries) {
    const starting = new Map();
    const continuing = new Map();
    entries.forEach((entry) => {
      const bucket = entry.status === 'continuing' ? continuing : starting;
      const current = bucket.get(entry.name) || 0;
      bucket.set(entry.name, current + 1);
    });
    return { starting, continuing };
  }

  function countBucket(bucket) {
    let total = 0;
    bucket.forEach((value) => {
      total += value;
    });
    return total;
  }

  function renderBucket(label, bucket) {
    const entries = Array.from(bucket.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    if (entries.length === 0) {
      return '';
    }
    const total = countBucket(bucket);
    return (
      '<div class="bucket">' +
      '<p><strong>' +
      escapeHtml(label) +
      ' (' +
      total +
      ')</strong></p>' +
      '<ul>' +
      entries
        .map(([name, count]) =>
          '<li>' +
          escapeHtml(name) +
          (count > 1
            ? ' <span class="count">×' + count + '</span>'
            : '') +
          '</li>',
        )
        .join('') +
      '</ul>' +
      '</div>'
    );
  }

  function renderContributionDetails(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return '<p>No jobs scheduled.</p>';
    }
    const buckets = bucketize(entries);
    const content =
      renderBucket('Starting', buckets.starting) +
      renderBucket('Continuing', buckets.continuing);
    if (content) {
      return '<div class="bucket-list">' + content + '</div>';
    }
    return '<p>No jobs scheduled.</p>';
  }

  function formatSummary(starting, continuing) {
    const parts = [];
    if (starting > 0) {
      parts.push('Starting: ' + starting);
    }
    if (continuing > 0) {
      parts.push('Continuing: ' + continuing);
    }
    return parts.join(' • ');
  }

  function showTooltip(cell, event) {
    const hour = cell.getAttribute('data-hour') || '00';
    const minute = cell.getAttribute('data-minute') || '00';
    const count = Number(cell.getAttribute('data-count') || '0');
    const starting = Number(cell.getAttribute('data-starting') || '0');
    const continuing = Number(cell.getAttribute('data-continuing') || '0');
    const contributions = parseContributions(cell);
    const runsLabel = count === 1 ? 'run' : 'runs';
    const summary = formatSummary(starting, continuing);
    tooltip.innerHTML =
      '<strong>' +
      escapeHtml(hour + ':' + minute) +
      '</strong><br />' +
      '<span>' +
      escapeHtml(count + ' ' + runsLabel) +
      '</span>' +
      (summary
        ? '<span class="summary">' + escapeHtml(summary) + '</span>'
        : '') +
      renderContributionDetails(contributions);
    tooltip.style.opacity = '1';
    if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      updatePosition(event);
    } else {
      const rect = cell.getBoundingClientRect();
      tooltip.style.left = String(rect.right + window.scrollX + OFFSET) + 'px';
      tooltip.style.top = String(rect.top + window.scrollY + OFFSET) + 'px';
    }
  }

  function hideTooltip() {
    tooltip.style.opacity = '0';
  }

  document.querySelectorAll('rect.cell').forEach((cell) => {
    cell.addEventListener('pointerenter', (event) => {
      showTooltip(cell, event);
    });

    cell.addEventListener('pointermove', updatePosition);

    cell.addEventListener('pointerleave', hideTooltip);

    cell.addEventListener('focus', () => {
      showTooltip(cell);
    });

    cell.addEventListener('blur', hideTooltip);
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
      rect.cell:hover,
      rect.cell:focus-visible {
        stroke: #111827;
        stroke-width: 0.75;
      }
      rect.cell:focus {
        outline: none;
      }
      p.meta {
        margin: 8px 0 0;
      }
      p.meta a {
        color: #175cd3;
        text-decoration: none;
      }
      p.meta a:hover,
      p.meta a:focus {
        text-decoration: underline;
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
      #tooltip .summary {
        display: block;
        margin-top: 4px;
        font-size: 0.75rem;
        color: #cbd2d9;
      }
      .bucket-list {
        margin-top: 12px;
      }
      .bucket {
        margin-top: 8px;
      }
      .bucket p {
        margin: 0;
      }
      .bucket ul {
        margin: 4px 0 0;
        padding-left: 20px;
      }
      .bucket .count {
        color: #cbd2d9;
        font-size: 0.75rem;
        margin-left: 4px;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>Cron Ironer Heatmap</h1>
      <p class="description">Hover over a minute to inspect starting and continuing job contributions. Highest density: ${maxValue} runs.</p>
      <p class="meta"><a href="https://www.npmjs.com/package/cron-ironer" target="_blank" rel="noreferrer noopener">View cron-ironer on npm</a></p>
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
