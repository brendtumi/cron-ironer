export interface Job {
  name: string;
  schedule: string;
  description?: string;
  estimation?: number; // seconds
}

export type Matrix = number[][]; // 24 x 60
