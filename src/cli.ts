#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import yaml from 'yaml';
import {
  parseYaml,
  parseJson,
  parseCrontab,
  serializeCrontab,
  buildHeatmapData,
  renderAscii,
  renderImage,
  renderInteractiveHtml,
  RenderInteractiveHtmlSection,
  suggestSpread,
  suggestAggressiveSpread,
  Job,
  SuggestedJob,
  HeatmapData,
  ImageFormat,
} from './index';

function inferFormat(file: string): 'yaml' | 'json' | 'text' {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  if (ext === '.json') return 'json';
  return 'text';
}

function loadJobs(file: string, format: string): Job[] {
  const content = fs.readFileSync(file, 'utf8');
  if (format === 'yaml') return parseYaml(content);
  if (format === 'json') return parseJson(content);
  return parseCrontab(content);
}

function addSuffix(file: string, suffix: string): string {
  const dir = path.dirname(file);
  const ext = path.extname(file);
  const name = path.basename(file, ext);
  return path.join(dir, `${name}${suffix}${ext}`);
}

const program = new Command();
program
  .argument('<file>')
  .option('--format <yaml|json|text>', 'infer by extension')
  .option('--image', 'write heatmap image instead of ASCII')
  .option(
    '--image-format <jpeg|png|svg>',
    'image format when writing heatmaps',
    'jpeg',
  )
  .option('--suggest')
  .option(
    '--optimizer <offset|greedy>',
    'schedule optimizer algorithm',
    'offset',
  )
  .option(
    '--reflect-duration',
    'Use job estimation (in seconds) when drawing heatmap',
  )
  .option('--html', 'write interactive HTML heatmap')
  .option('-o, --out-file <path>')
  .parse(process.argv);

const {
  format: formatOpt,
  image: imageOpt,
  imageFormat: imageFormatOpt,
  reflectDuration,
  html: htmlOpt,
  outFile,
  suggest,
  optimizer: optimizerOpt,
} = program.opts();
const inputFile = program.args[0];
if (!inputFile) program.error('Input file required');
const format = formatOpt || inferFormat(inputFile);
const outputImage = Boolean(imageOpt);
const htmlOutput = Boolean(htmlOpt);
const reflect = Boolean(reflectDuration);
const optimizer = (optimizerOpt || 'offset') as string;
const imageFormat = (imageFormatOpt || 'jpeg') as ImageFormat;

if (!['jpeg', 'png', 'svg'].includes(imageFormat)) {
  program.error(`Unsupported image format: ${imageFormat}`);
}

const jobs = loadJobs(inputFile, format);

const generatedFiles: string[] = [];

function recordGenerated(file: string): void {
  generatedFiles.push(path.resolve(file));
}

function replaceExt(file: string, newExt: string): string {
  const dir = path.dirname(file);
  const name = path.basename(file, path.extname(file));
  return path.join(dir, `${name}${newExt}`);
}

function buildSuggestionOutput(
  original: Job[],
  suggestedJobs: Job[],
): SuggestedJob[] {
  return suggestedJobs.map((job, index) => {
    const originalJob = original[index];
    const suggestion: SuggestedJob = {
      name: job.name,
      schedule: job.schedule,
    };
    const description = job.description || originalJob?.description;
    if (description) suggestion.description = description;
    if (originalJob && originalJob.schedule !== job.schedule) {
      suggestion.oldSchedule = originalJob.schedule;
    }
    return suggestion;
  });
}

function writeAscii(heatmap: HeatmapData, suffix = '') {
  const content = `${renderAscii(heatmap.matrix, false, {
    maxValue: heatmap.maxValue,
    minValue: heatmap.minValue,
  })}\n`;
  let finalSuffix = suffix;
  if (suggest) finalSuffix = `${finalSuffix}.suggested`;
  if (reflect) finalSuffix = `${finalSuffix}.reflect`;
  if (outFile) {
    const target = addSuffix(outFile, finalSuffix);
    fs.writeFileSync(target, content);
    recordGenerated(target);
  } else {
    console.log(content);
  }
}

function writeImage(matrix: number[][], suffix = '') {
  const base = outFile || inputFile;
  let finalSuffix = suffix;
  if (suggest) finalSuffix = `${finalSuffix}.suggested`;
  if (reflect) finalSuffix = `${finalSuffix}.reflect`;
  if (optimizer) finalSuffix = `${finalSuffix}.${optimizer}`;
  const ext =
    imageFormat === 'png' ? '.png' : imageFormat === 'svg' ? '.svg' : '.jpg';
  const target = addSuffix(replaceExt(base, ext), finalSuffix);
  const buffer = renderImage(matrix, { format: imageFormat });
  fs.writeFileSync(target, buffer);
  recordGenerated(target);
}

function buildHtmlOptionsUsed(): string[] {
  const used: string[] = ['--html'];
  if (suggest) {
    used.push('--suggest');
    used.push(`--optimizer ${optimizer}`);
  }
  if (reflect) used.push('--reflect-duration');
  return used;
}

function writeHtml(sections: RenderInteractiveHtmlSection[]) {
  if (!sections.length) return;
  const base = outFile || inputFile;
  const target = addSuffix(replaceExt(base, '.html'), '.heatmap');
  const content = renderInteractiveHtml(sections[0].heatmap, {
    sections,
    optionsUsed: buildHtmlOptionsUsed(),
  });
  fs.writeFileSync(target, content, 'utf8');
  recordGenerated(target);
}

const heatmap = buildHeatmapData(jobs, reflect);
const matrix = heatmap.matrix;

if (suggest) {
  if (optimizer !== 'offset' && optimizer !== 'greedy') {
    program.error(`Unknown optimizer: ${optimizer}`);
  }
  const htmlSections: RenderInteractiveHtmlSection[] = htmlOutput
    ? [
        {
          id: 'before',
          title: 'Before suggestions',
          heatmap,
        },
      ]
    : [];
  if (!outputImage) writeAscii(heatmap, '.before');
  if (outputImage) writeImage(matrix, '.before');

  const suggested =
    optimizer === 'greedy'
      ? suggestAggressiveSpread(jobs)
      : suggestSpread(jobs);
  const suggestionOutput = buildSuggestionOutput(jobs, suggested);
  let suggestedContent = '';
  if (format === 'yaml') suggestedContent = yaml.stringify(suggestionOutput);
  else if (format === 'json')
    suggestedContent = `${JSON.stringify(suggestionOutput, null, 2)}\n`;
  else suggestedContent = `${serializeCrontab(suggestionOutput)}\n`;
  const suggestionPath = addSuffix(inputFile, '.suggested');
  fs.writeFileSync(suggestionPath, suggestedContent);
  recordGenerated(suggestionPath);

  const heatmapAfter = buildHeatmapData(suggested, reflect);
  const matrix2 = heatmapAfter.matrix;
  if (!outputImage) writeAscii(heatmapAfter, '.after');
  if (outputImage) writeImage(matrix2, '.after');
  if (htmlOutput) {
    htmlSections.push({
      id: 'after',
      title: 'After suggestions',
      heatmap: heatmapAfter,
    });
    writeHtml(htmlSections);
  }
} else {
  if (outputImage) writeImage(matrix);
  else writeAscii(heatmap);
  if (htmlOutput)
    writeHtml([
      {
        id: 'schedule',
        title: 'Schedule overview',
        heatmap,
      },
    ]);
}

if (generatedFiles.length > 0) {
  console.log('Generated files:');
  generatedFiles.forEach((file) => {
    console.log(` - ${file}`);
  });
}
