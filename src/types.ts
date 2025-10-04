export interface Job {
  name: string;
  schedule: string;
  description?: string;
  estimation?: number; // seconds
  keepTime?: boolean;
}

export interface SuggestedJob {
  name: string;
  schedule: string;
  description?: string;
  oldSchedule?: string;
}

export type Matrix = number[][]; // 24 x 60

export interface HeatmapContribution {
  name: string;
  status: 'starting' | 'continuing';
}

export type ContributionMatrix = HeatmapContribution[][][];

export interface HeatmapData {
  matrix: Matrix;
  raw: Matrix;
  contributions: ContributionMatrix;
  maxValue: number;
  minValue: number;
}
