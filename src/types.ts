export interface Job {
  name: string;
  schedule: string;
  description?: string;
  estimation?: number; // seconds
  keepTime?: boolean;
}

export type Matrix = number[][]; // 24 x 60
