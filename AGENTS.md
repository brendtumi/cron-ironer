# AGENTS.md

## Purpose & Scope

Cron‑Ironer, a cli tool, that helps developers spread and de‑conflict cron jobs across time, detect bursts, and generate visual heatmaps & plans.

### Key goals

- Make optimization reproducible: same inputs ⇒ same suggestions.
- Keep suggestions explainable with simple metrics (density, peaks, deltas).
- Output artifacts that are useful in CI: SVG/PNG heatmaps, HTML previews, JSON patches.

## Setup commands

- Install deps: `npm install`
- Execute example: `npm run dev -- test/resource/test-1.json --suggest --reflect-duration --image --optimizer greedy`

## Testing & Code Quality

- Run tests: `npm test`
- Run linter: `npm run lint`

### Testing Guidelines

- Always work from within the package directory when running tests
- Mock all external dependencies in unit tests

## Pull Requests

- Always run linter and tests before submitting a PR.
- Follow the checklist in the [PR template](.github/pull_request_template.md).

## Package Structure

- `src/optimizer` : Optimization algorithms.
- `src/heatmap` : Heatmap generation.
- `src/parsers` : Parser for input files.
- `test/resource` : Sample input/output files used on documentation and testing.
