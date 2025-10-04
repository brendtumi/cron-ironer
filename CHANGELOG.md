# Changelog

## Unreleased

### Added

- SVG and PNG export options for cron heatmaps via the `--image-format` flag.
- Interactive HTML heatmap generation with per-minute job contribution tooltips.

### Changed

- Improved the interactive HTML heatmap accessibility with focusable cells and ARIA descriptions.
- Interactive HTML heatmaps now break down starting versus continuing job runs and include a direct link to the npm package page.
- CLI runs print the absolute paths of every generated artifact (heatmaps, HTML, suggestions) for easier discovery in automation logs.

## [1.1.0] - 2025-10-03

### Added

- Greedy spread optimizer option for cron retiming

## [1.0.0] - 2025-08-08

### Initial release

cron-ironer is a developer-friendly cli tool for visualizing and optimizing your crontab schedules.
It helps you identify overlaps, gaps, and scheduling bottlenecks using intuitive heatmaps and
intelligent spread suggestions — with or without duration estimates.
