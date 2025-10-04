export interface Job {
  name: string;
  schedule: string;
  description?: string;
  estimation?: number; // seconds
  keepTime?: boolean;
}

export type Matrix = number[][]; // 24 x 60

export type ContributionMatrix = string[][][];

export interface HeatmapData {
  matrix: Matrix;
  raw: Matrix;
  contributions: ContributionMatrix;
  maxValue: number;
}
