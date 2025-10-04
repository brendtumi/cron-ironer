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

## Testing, Code Quality and Documentation

- Run tests: `npm test`
- Run linter: `npm run lint`
- Provide an example of using the new feature in the [README](./README.md) file.
- Update documentation if any cli options are added or changed.

### Testing Guidelines

- Always work from within the package directory when running tests
- Mock all external dependencies in unit tests

## Pull Requests

- Create an entry in the [CHANGELOG's Unreleased section](./CHANGELOG.md) for any changes you make with following types of changes
  - `Added` for new features.
  - `Changed` for changes in existing functionality.
  - `Deprecated` for soon-to-be removed features.
  - `Removed` for now removed features.
  - `Fixed` for any bug fixes.
  - `Security` in case of vulnerabilities.
- Always run linter and tests before submitting a PR.
- Follow the checklist in the [PR template](.github/pull_request_template.md).

## Package Structure

- `src/optimizer` : Optimization algorithms.
- `src/heatmap` : Heatmap generation.
- `src/parsers` : Parser for input files.
- `test/resource` : Sample input/output files used on documentation and testing.
