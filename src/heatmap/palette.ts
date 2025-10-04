export type RgbTuple = [number, number, number];

export const palette: readonly RgbTuple[] = [
  [247, 251, 255],
  [222, 235, 247],
  [198, 219, 239],
  [158, 202, 225],
  [107, 174, 214],
  [66, 146, 198],
  [33, 113, 181],
  [8, 81, 156],
  [8, 48, 107],
  [3, 19, 43],
] as const;

export function getColor(value: number): RgbTuple {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  const index = Math.min(safeValue, palette.length - 1);
  return palette[index] as RgbTuple;
}

export function colorToHex(color: RgbTuple): string {
  return `#${color
    .map((component) => component.toString(16).padStart(2, '0'))
    .join('')}`;
}
