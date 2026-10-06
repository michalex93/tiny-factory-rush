#!/usr/bin/env node
// Canonical skills live in skills/<name>/SKILL.md (readable by any agent; listed in AGENTS.md).
// Claude Code loads project skills from .claude/skills/<name>/SKILL.md, so we mirror them there.
//   node scripts/sync-skills.mjs          # write the mirror
//   node scripts/sync-skills.mjs --check  # fail if the mirror is stale (used by gates)
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './lib/git.mjs';

const root = repoRoot();
const src = path.join(root, 'skills');
const dst = path.join(root, '.claude', 'skills');
const check = process.argv.includes('--check');

const skills = fs.readdirSync(src, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(src, d.name, 'SKILL.md')))
  .map((d) => d.name);

const problems = [];
const expected = new Map();
for (const name of skills) {
  const text = fs.readFileSync(path.join(src, name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) { problems.push(`skills/${name}/SKILL.md has no frontmatter (name, description)`); continue; }
  if (!/^name:\s*\S/m.test(fm[1]) || !/^description:\s*\S/m.test(fm[1])) problems.push(`skills/${name}/SKILL.md frontmatter needs name and description`);
  const banner = `<!-- Generated from skills/${name}/SKILL.md by \`npm run skills:sync\`. Edit the source, not this copy. -->\n`;
  expected.set(name, text.replace(/^(---\n[\s\S]*?\n---\n)/, `$1${banner}`));
}

const existing = fs.existsSync(dst) ? fs.readdirSync(dst).filter((n) => fs.statSync(path.join(dst, n)).isDirectory()) : [];
if (check) {
  for (const [name, content] of expected) {
    const f = path.join(dst, name, 'SKILL.md');
    if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') !== content) problems.push(`.claude/skills/${name}/SKILL.md is stale — run npm run skills:sync`);
  }
  for (const name of existing) if (!expected.has(name)) problems.push(`.claude/skills/${name} has no source in skills/ — run npm run skills:sync`);
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`skills in sync (${expected.size})`);
} else {
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  for (const name of existing) if (!expected.has(name)) fs.rmSync(path.join(dst, name), { recursive: true, force: true });
  for (const [name, content] of expected) {
    fs.mkdirSync(path.join(dst, name), { recursive: true });
    fs.writeFileSync(path.join(dst, name, 'SKILL.md'), content);
  }
  console.log(`synced ${expected.size} skills to .claude/skills`);
}
