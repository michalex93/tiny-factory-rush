#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const raw = process.argv.slice(2).join('-').trim();
if (!raw) {
  console.error('Usage: npm run skill:new -- <skill-name>');
  process.exit(1);
}

const slug = raw
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

if (!slug) {
  console.error('Invalid skill name.');
  process.exit(1);
}

const root = process.cwd();
const dir = path.join(root, 'skills', slug);
const file = path.join(dir, 'SKILL.md');

if (fs.existsSync(dir)) {
  console.error(`Skill already exists: ${path.relative(root, dir)}`);
  process.exit(1);
}

fs.mkdirSync(dir, { recursive: true });

const title = slug
  .split('-')
  .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
  .join(' ');

const template = `# Skill: ${title}

## Use when
Describe the trigger conditions.

## Read first
- AGENTS.md
- relevant docs

## Objective
Define the outcome.

## Procedure
1. Step one.
2. Step two.
3. Step three.

## Required evidence
State what must be measured, run or captured.

## Acceptance criteria
- [ ] criterion

## Common failure modes
- failure mode

## Stop condition
Define when the agent must stop.
`;

fs.writeFileSync(file, template, 'utf8');
console.log(`Created ${path.relative(root, file)}`);
