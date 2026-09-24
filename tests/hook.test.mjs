// Runs the real pre-commit hook inside throwaway git repositories.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, symlinkSync, writeFileSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'hook-test-'));
  for (const path of ['index.html', 'package.json', 'src', '.githooks']) {
    cpSync(join(root, path), join(dir, path), { recursive: true });
  }
  mkdirSync(join(dir, 'css'));
  cpSync(join(root, 'css/tailwind.css'), join(dir, 'css/tailwind.css'));
  symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'));
  writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
  const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'hook-test@example.com');
  git('config', 'user.name', 'Hook Test');
  git('add', '-A');
  git('commit', '-q', '-m', 'initial');
  git('config', 'core.hooksPath', '.githooks');
  return { dir, git, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const addClassToIndex = (dir, cls) => {
  const file = join(dir, 'index.html');
  writeFileSync(file, readFileSync(file, 'utf8').replace('</footer>', `<p class="${cls}">x</p></footer>`));
};

test('rebuilds and stages css/tailwind.css when index.html is committed', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    addClassToIndex(dir, 'tracking-widest');
    git('add', 'index.html');
    const result = git('commit', '-m', 'use a new utility');
    assert.equal(result.status, 0, result.stderr);
    const committedCss = git('show', 'HEAD:css/tailwind.css').stdout;
    assert.ok(committedCss.includes('.tracking-widest'), 'new utility missing from committed CSS');
  } finally { cleanup(); }
});

test('blocks the commit when the build fails', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    writeFileSync(join(dir, 'src/tailwind.css'), '@import "no-such-package";\n');
    git('add', 'src/tailwind.css');
    const result = git('commit', '-m', 'broken source');
    assert.notEqual(result.status, 0, 'commit should have been blocked');
    assert.match(result.stderr, /commit blocked/);
  } finally { cleanup(); }
});

test('blocks the commit when dependencies are not installed', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    unlinkSync(join(dir, 'node_modules'));
    addClassToIndex(dir, 'tracking-wide');
    git('add', 'index.html');
    const result = git('commit', '-m', 'no deps');
    assert.notEqual(result.status, 0, 'commit should have been blocked');
    assert.match(result.stderr, /npm install/);
  } finally { cleanup(); }
});

test('skips the build when no watched file is staged', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    unlinkSync(join(dir, 'node_modules')); // a build attempt would now fail
    writeFileSync(join(dir, 'notes.txt'), 'unrelated\n');
    git('add', 'notes.txt');
    const result = git('commit', '-m', 'unrelated change');
    assert.equal(result.status, 0, result.stderr);
  } finally { cleanup(); }
});

test('builds from the staged index.html, ignoring unstaged edits', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    addClassToIndex(dir, 'tracking-widest');
    git('add', 'index.html');
    addClassToIndex(dir, 'tracking-tighter'); // unstaged
    const result = git('commit', '-m', 'partial stage');
    assert.equal(result.status, 0, result.stderr);
    const committedCss = git('show', 'HEAD:css/tailwind.css').stdout;
    assert.ok(committedCss.includes('.tracking-widest'), 'staged utility missing from committed CSS');
    assert.ok(!committedCss.includes('.tracking-tighter'), 'unstaged utility leaked into committed CSS');
  } finally { cleanup(); }
});

test('keeps CSS for a staged class that was later removed from the working tree', () => {
  const { dir, git, cleanup } = makeRepo();
  try {
    const original = readFileSync(join(dir, 'index.html'), 'utf8');
    addClassToIndex(dir, 'tracking-normal');
    git('add', 'index.html');
    writeFileSync(join(dir, 'index.html'), original); // unstaged removal
    const result = git('commit', '-m', 'stage then revert working copy');
    assert.equal(result.status, 0, result.stderr);
    assert.ok(git('show', 'HEAD:index.html').stdout.includes('tracking-normal'));
    assert.ok(git('show', 'HEAD:css/tailwind.css').stdout.includes('.tracking-normal'),
      'committed HTML uses .tracking-normal but committed CSS lacks it');
  } finally { cleanup(); }
});
