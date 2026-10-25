#!/usr/bin/env node
// Ported from the first game, Isekai'd Into Prod (its cloudflare/anon-build.js), with what it rewrites set for this game.
// The anonymous build: a copy of game/ for a Cloudflare account that isn't tied to the author, with nothing in the
// served files that names them. It writes cloudflare/dist-anon/ (ignored by git); wrangler.anon.jsonc deploys it.
//   node anon-build.js && npx wrangler deploy -c wrangler.anon.jsonc
// What it changes, in every text file it copies (.js, .html, .md, .json, .txt, .css):
//   - the author's first name, in code comments and the credits files, becomes "the designer"
//   - links to the author's GitHub repositories keep their text and lose the link; bare repository names become
//     "the first game's repository" (the prequel) or "the game's repository"
//   - links to the author's claude.ai pages become this site's own page
// It then fails if any of those strings is left, so a new mention can't slip into a deploy unnoticed.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'game');
const OUT = path.join(__dirname, 'dist-anon');
// Never served (game/.assetsignore): build tools.
const SKIP = new Set(['tools', '__pycache__', '.assetsignore']);
const TEXT = /\.(js|html|md|json|txt|css)$/;
const NAME = [[/\bLadi's\b/g, "the designer's"], [/\bLadi\b/g, 'the designer']];
const REPOS = [
  [/\[([^\]]+)\]\(https:\/\/github\.com\/loyeleye\/[^)\s]*\)/g, '$1'],
  [/https:\/\/github\.com\/loyeleye\/system-design-study\S*/g, "the first game's repository"],
  [/https:\/\/github\.com\/loyeleye\/\S*/g, "the game's repository"],
  [/\bloyeleye\/system-design-study\b/g, "the first game's repository"],
  [/\bloyeleye\/[\w.-]+/g, "the game's repository"],
];
const LINKS = [[/https:\/\/claude\.ai\/artifact\/7iQ6fzRDp1iw1y6NJEg74p/g, '/']];
// What must not be left anywhere in the build.
const LEAKS = [/\bLadi\b/, /loyeleye/i, /oyeleye/i, /claude\.ai\/artifact\//];

fs.rmSync(OUT, { recursive: true, force: true });
let files = 0, changed = 0;
const leaks = [];
(function copy(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const from = path.join(dir, e.name), to = path.join(OUT, rel, e.name);
    if (e.isDirectory()) { copy(from, path.join(rel, e.name)); continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    files++;
    if (!TEXT.test(e.name)) { fs.copyFileSync(from, to); continue; }
    const before = fs.readFileSync(from, 'utf8');
    let s = before;
    for (const [re, to2] of NAME.concat(REPOS, LINKS)) s = s.replace(re, to2);
    if (s !== before) changed++;
    LEAKS.forEach(re => { if (re.test(s)) leaks.push(`${path.join(rel, e.name)}: ${re}`); });
    fs.writeFileSync(to, s);
  }
})(SRC, '');

console.log(`${OUT}: ${files} files, ${changed} rewritten`);
if (leaks.length) { console.error('Still names the author:\n  ' + leaks.join('\n  ')); process.exit(1); }
