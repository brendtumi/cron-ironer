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
  buildMatrix,
  renderAscii,
  renderImage,
  suggestSpread,
  Job,
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
  .option('--image', 'write JPEG heatmap instead of ASCII')
  .option('--suggest')
  .option('--reflect-duration')
  .option('-o, --out-file <path>')
  .parse(process.argv);

const {
  format: formatOpt,
  image: imageOpt,
  reflectDuration,
  outFile,
  suggest,
} = program.opts();
const inputFile = program.args[0];
if (!inputFile) program.error('Input file required');
const format = formatOpt || inferFormat(inputFile);
const outputImage = Boolean(imageOpt);
const reflect = Boolean(reflectDuration);

const jobs = loadJobs(inputFile, format);

function replaceExt(file: string, newExt: string): string {
  const dir = path.dirname(file);
  const name = path.basename(file, path.extname(file));
  return path.join(dir, `${name}${newExt}`);
}

function writeAscii(matrix: number[][], suffix = '') {
  const content = `${renderAscii(matrix)}\n`;
  let finalSuffix = suffix;
  if (suggest) finalSuffix = `${finalSuffix}.suggested`;
  if (reflect) finalSuffix = `${finalSuffix}.reflect`;
  if (outFile) {
    fs.writeFileSync(addSuffix(outFile, finalSuffix), content);
  } else {
    console.log(content);
  }
}

function writeImage(matrix: number[][], suffix = '') {
  const base = outFile || inputFile;
  let finalSuffix = suffix;
  if (suggest) finalSuffix = `${finalSuffix}.suggested`;
  if (reflect) finalSuffix = `${finalSuffix}.reflect`;
  const target = addSuffix(replaceExt(base, '.jpg'), finalSuffix);
  const buffer = renderImage(matrix);
  fs.writeFileSync(target, buffer);
}

const matrix = buildMatrix(jobs, reflect);

if (suggest) {
  if (!outputImage) writeAscii(matrix, '.before');
  writeImage(matrix, '.before');

  const suggested = suggestSpread(jobs);
  let suggestedContent = '';
  if (format === 'yaml') suggestedContent = yaml.stringify(suggested);
  else if (format === 'json')
    suggestedContent = `${JSON.stringify(suggested, null, 2)}\n`;
  else suggestedContent = `${serializeCrontab(suggested)}\n`;
  fs.writeFileSync(addSuffix(inputFile, '.suggested'), suggestedContent);

  const matrix2 = buildMatrix(suggested, reflect);
  if (!outputImage) writeAscii(matrix2, '.after');
  writeImage(matrix2, '.after');
} else {
  if (outputImage) writeImage(matrix);
  else writeAscii(matrix);
}
