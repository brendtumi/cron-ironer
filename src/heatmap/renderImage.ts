import {
  Canvas as SkiaCanvas,
  SvgCanvas,
  SvgExportFlag,
  createCanvas,
} from '@napi-rs/canvas';
import { Matrix } from '../types';
import { getColor } from './palette';

export type ImageFormat = 'jpeg' | 'png' | 'svg';

export interface RenderImageOptions {
  minWidth?: number;
  minHeight?: number;
  format?: ImageFormat;
}

export default function renderImage(
  matrix: Matrix,
  minWidth?: number,
  minHeight?: number,
  format?: ImageFormat,
): Buffer;
export default function renderImage(
  matrix: Matrix,
  options: RenderImageOptions,
): Buffer;
export default function renderImage(
  matrix: Matrix,
  arg1?: number | RenderImageOptions,
  arg2?: number,
  arg3?: ImageFormat,
): Buffer {
  let minWidth = 1300;
  let minHeight = 550;
  let format: ImageFormat = 'jpeg';

  if (typeof arg1 === 'object' && arg1 !== null) {
    const opts = arg1 as RenderImageOptions;
    if (typeof opts.minWidth === 'number') minWidth = opts.minWidth;
    if (typeof opts.minHeight === 'number') minHeight = opts.minHeight;
    if (opts.format) format = opts.format;
  } else {
    if (typeof arg1 === 'number') minWidth = arg1;
    if (typeof arg2 === 'number') minHeight = arg2;
    if (arg3) format = arg3;
  }

  const cols = matrix[0]?.length || 0;
  const rows = matrix.length;
  const fontSize = 12;
  const labelGap = 4;
  const cellSize = 20;
  const gap = 1;
  const pitch = cellSize + gap;

  const measure = createCanvas(1, 1).getContext('2d');
  measure.font = `bold ${fontSize}px sans-serif`;
  const labelWidth = measure.measureText('00').width;
  const leftMargin = Math.floor(labelWidth + labelGap * 2);
  const rightMargin = leftMargin;
  const topMargin = Math.floor(fontSize + labelGap * 2);
  const bottomMargin = topMargin;

  const width = Math.max(
    minWidth,
    leftMargin + cols * pitch - gap + rightMargin,
  );
  const height = Math.max(
    minHeight,
    topMargin + rows * pitch - gap + bottomMargin,
  );

  const isSvg = format === 'svg';
  const canvas = isSvg
    ? createCanvas(width, height, SvgExportFlag.NoPrettyXML)
    : createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#eee';
  ctx.fillRect(0, 0, width, height);
  ctx.font = `bold ${fontSize}px sans-serif`;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const [r, g, b] = getColor(matrix[y][x]);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(
        leftMargin + x * pitch,
        topMargin + y * pitch,
        cellSize,
        cellSize,
      );
    }
  }

  ctx.fillStyle = '#000';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  for (let m = 0; m < cols; m += 5) {
    const label = String(m).padStart(2, '0');
    ctx.fillText(
      label,
      leftMargin + m * pitch + cellSize / 2,
      topMargin - labelGap,
    );
  }

  ctx.textBaseline = 'top';
  for (let m = 0; m < cols; m += 5) {
    const label = String(m).padStart(2, '0');
    ctx.fillText(
      label,
      leftMargin + m * pitch + cellSize / 2,
      topMargin + rows * pitch - gap + labelGap,
    );
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  for (let h = 0; h < rows; h += 1) {
    const label = String(h).padStart(2, '0');
    ctx.fillText(
      label,
      leftMargin - labelGap,
      topMargin + h * pitch + cellSize / 2,
    );
  }

  ctx.textAlign = 'left';
  for (let h = 0; h < rows; h += 1) {
    const label = String(h).padStart(2, '0');
    ctx.fillText(
      label,
      leftMargin + cols * pitch - gap + labelGap,
      topMargin + h * pitch + cellSize / 2,
    );
  }

  if (isSvg) {
    return (canvas as SvgCanvas).getContent();
  }

  const rasterCanvas = canvas as SkiaCanvas;
  if (format === 'png') {
    return rasterCanvas.encodeSync('png');
  }

  return rasterCanvas.encodeSync('jpeg', 90);
}
