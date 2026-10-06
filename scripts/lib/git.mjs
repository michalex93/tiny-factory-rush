// Thin git helpers used by the loop, gates and hooks.
import { runSync } from './proc.mjs';

export function git(args, cwd = process.cwd()) {
  return runSync('git', args, { cwd });
}

function out(args, cwd) {
  const r = git(args, cwd);
  if (r.code !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr.trim()}`);
  return r.stdout.trim();
}

export const repoRoot = (cwd) => out(['rev-parse', '--show-toplevel'], cwd);
export const headSha = (cwd) => out(['rev-parse', 'HEAD'], cwd);
export const currentBranch = (cwd) => out(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
export const shortSha = (sha) => String(sha).slice(0, 10);

export function isClean(cwd) {
  return out(['status', '--porcelain'], cwd) === '';
}

export function shaExists(sha, cwd) {
  return git(['cat-file', '-e', `${sha}^{commit}`], cwd).code === 0;
}

/** Files changed between base and the working tree (committed + uncommitted + untracked). */
export function changedFilesSince(base, cwd) {
  const files = new Map();
  const diff = git(['diff', '--name-status', '-M', base], cwd);
  if (diff.code === 0) {
    for (const line of diff.stdout.split('\n').filter(Boolean)) {
      const parts = line.split('\t');
      const status = parts[0][0];
      if (status === 'R') {
        files.set(parts[1], 'D');
        files.set(parts[2], 'A');
      } else {
        files.set(parts[1], status);
      }
    }
  }
  const untracked = git(['ls-files', '--others', '--exclude-standard'], cwd);
  for (const f of untracked.stdout.split('\n').filter(Boolean)) files.set(f, 'A');
  return [...files.entries()].map(([file, status]) => ({ file, status }));
}

/** File content at a ref, or null if it does not exist there. */
export function showFileAt(ref, file, cwd) {
  const r = git(['show', `${ref}:${file}`], cwd);
  return r.code === 0 ? r.stdout : null;
}

export function listTrackedAndUntracked(cwd) {
  const tracked = git(['ls-files'], cwd).stdout.split('\n').filter(Boolean);
  const untracked = git(['ls-files', '--others', '--exclude-standard'], cwd).stdout.split('\n').filter(Boolean);
  return [...new Set([...tracked, ...untracked])];
}

export function commitAll(message, cwd) {
  git(['add', '-A'], cwd);
  const r = git(['commit', '-m', message, '--no-verify'], cwd);
  return r.code === 0;
}

export function checkout(ref, cwd) {
  return out(['checkout', ref], cwd);
}

export function createBranch(name, from, cwd) {
  return out(['checkout', '-b', name, from], cwd);
}

export function mergeNoFf(branch, message, cwd) {
  const r = git(['merge', '--no-ff', '-m', message, branch], cwd);
  if (r.code !== 0) {
    git(['merge', '--abort'], cwd);
    throw new Error(`merge of ${branch} failed: ${r.stderr.trim() || r.stdout.trim()}`);
  }
}

export function resetHard(sha, cwd) {
  out(['reset', '--hard', sha], cwd);
  git(['clean', '-fd'], cwd);
}

export function renameBranch(oldName, newName, cwd) {
  return git(['branch', '-m', oldName, newName], cwd).code === 0;
}

export function deleteBranch(name, cwd) {
  return git(['branch', '-D', name], cwd).code === 0;
}

export function logOneline(range, cwd) {
  const r = git(['log', '--oneline', '--no-decorate', range], cwd);
  return r.code === 0 ? r.stdout.trim() : '';
}

export function diffStat(range, cwd) {
  const r = git(['diff', '--stat', range], cwd);
  return r.code === 0 ? r.stdout.trim() : '';
}
