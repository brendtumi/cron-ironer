# Changelog

## Unreleased

### Changed

- The `--html` output now produces a single `.heatmap.html` file with before/after sections and a summary of the CLI options used.

### Security

- Replaced the HTML section ID sanitizer with a linear-time implementation to avoid potential performance issues from complex regular expressions.

## [1.2.1] - 2025-10-05

### Changed

- Sanitised suggestion outputs to omit estimation/keepTime fields and include `oldSchedule` metadata when cron timings shift.

## [1.2.0] - 2025-10-04

### Added

- SVG and PNG export options for cron heatmaps via the `--image-format` flag.
- Interactive HTML heatmap generation with per-minute job contribution tooltips.

### Changed

- CLI runs print the absolute paths of every generated artifact (heatmaps, HTML, suggestions) for easier discovery in automation logs.
- The interactive HTML and ASCII heatmaps now summarize both the highest and lowest cron densities, and the HTML footer links to the npm and GitHub project pages.

### Fixed

- Prevented the CLI from generating before/after heatmap images during suggestion runs unless `--image` is explicitly set.

## [1.1.0] - 2025-10-03

### Added

- Greedy spread optimizer option for cron retiming

## [1.0.0] - 2025-08-08

### Initial release

cron-ironer is a developer-friendly cli tool for visualizing and optimizing your crontab schedules.
It helps you identify overlaps, gaps, and scheduling bottlenecks using intuitive heatmaps and
intelligent spread suggestions — with or without duration estimates.
