#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INPUT_DIR = path.join(ROOT, 'test', 'resource');

function run(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...options });
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    process.exitCode = 1;
  }
}

function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Input directory not found: ${INPUT_DIR}`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((f) => /^test-.*\.json$/i.test(f))
    .map((f) => path.join('test', 'resource', f))
    .sort();

  if (files.length === 0) {
    console.warn('No input files matched test/resource/test-*.json');
    return;
  }

  for (const rel of files) {
    // 1) --image
    run(`npm run -s dev -- ${rel} --image`);
    // 2) --image --suggest
    run(`npm run -s dev -- ${rel} --image --suggest`);
    // 3) --image --reflect-duration
    run(`npm run -s dev -- ${rel} --image --reflect-duration`);
    // 4) --image --suggest --reflect-duration
    run(`npm run -s dev -- ${rel} --image --suggest --reflect-duration`);
  }
}

main();
