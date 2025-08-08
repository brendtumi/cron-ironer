# Cron Ironer

[![npm version](https://img.shields.io/npm/v/cron-ironer)](https://www.npmjs.com/package/cron-ironer)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/brendtumi/cron-ironer/ci.yml?branch=main)

Cron Ironer parses cron schedules, renders 24-hour heatmaps as ASCII or JPEG, and can suggest evenly distributed alternatives.

## Installation

Requires Node.js 18 or later.

```bash
npm install -g cron-ironer
```

## Usage

```bash
cron-ironer <file> [options]

Options:
  --format <yaml|json|text>  Infer from extension by default
  --image                    Write JPEG heatmap (min 1300x550) instead of ASCII
  --suggest                  Enable schedule optimization
  --reflect-duration         Use job estimation when drawing heatmap
  -o, --out-file <path>      Write heatmap to file
```

### Examples

Sample inputs and outputs live in `test/resource`.

#### Suggesting evenly spaced schedules

Using `test/resource/test-1.json`:

```bash
npx cron-ironer test/resource/test-1.json --suggest
```

Input snippet:

```json
[
  { "name": "job_9f9bc96b", "schedule": "*/5 * * * *", "estimation": 29 },
  { "name": "job_a476d562", "schedule": "*/5 * * * *", "estimation": 50 },
  { "name": "job_7f2aacea", "schedule": "0 1 * * *", "estimation": 6365 },
  ...
]
```

Running the command produces:

- `test/resource/test-1.suggested.json` with optimized schedules
- `test/resource/test-1.before.suggested.jpg` and `test/resource/test-1.after.suggested.jpg` heatmaps

Output snippet (`test/resource/test-1.suggested.json`):

```json
[
  { "name": "job_9f9bc96b", "schedule": "4/5 * * * *", "estimation": 29 },
  { "name": "job_a476d562", "schedule": "3/5 * * * *", "estimation": 50 },
  { "name": "job_7f2aacea", "schedule": "0 1 * * *", "estimation": 6365 },
  ...
]
```

Heatmaps:

Before optimization, jobs cluster in a few dark bands:

![Heatmap before optimization showing concentrated load](test/resource/test-1.before.suggested.jpg)

After optimization, the schedule spreads jobs evenly across the day:

![Heatmap after optimization showing even distribution](test/resource/test-1.after.suggested.jpg)

#### Reflecting job duration

The `--reflect-duration` flag weights each job by its `estimation` value when drawing the heatmap. Using `test/resource/test-2.json`:

```bash
npx cron-ironer test/resource/test-2.json --suggest --reflect-duration
```

Input snippet:

```json
[
  { "name": "job_bd7892a0", "schedule": "40 0 1 * *", "estimation": 8442 },
  { "name": "job_3c13a828", "schedule": "0 */2 * * *", "estimation": 304 },
  { "name": "job_d70d9e02", "schedule": "10,40 * * * *", "estimation": 1799 },
  ...
]
```

Running the command produces:

- `test/resource/test-4.suggested.json` with optimized schedules
- `test/resource/test-4.before.suggested.reflect.jpg` and `test/resource/test-4.after.suggested.reflect.jpg` weighted heatmaps

Weighted heatmaps:

Before optimization, long jobs create heavy bands:

![Heatmap before optimization weighted by job duration](test/resource/test-4.before.suggested.reflect.jpg)

After optimization, load spreads while respecting job length:

![Heatmap after optimization weighted by job duration](test/resource/test-4.after.suggested.reflect.jpg)

### Heatmap interpretation

- Image heatmaps start at 1300 x 550 pixels and expand as needed.
- The Y-axis shows hours (00-23); the X-axis lists minutes (00-59) in 5-minute increments.
- ASCII heatmaps dedicate two characters per minute and use shading characters (`█`, `▓`, `▒`, `░`) to indicate cron job density.

## License

MIT
