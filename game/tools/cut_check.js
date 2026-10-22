// Checks that every pixel cutscene still (js/cut-ch*.js) gets shown: plays js/vn.js's cue matching over every visual-
// novel script in chapters 3 to 6 (with js/vn.js's ['cut', name] steps), once per lead, without drawing anything. Chapter 3's scripts are data (SD.c3story);
// chapters 4 to 6 write theirs inline as vn([...]) calls in js/c4-world.js, js/c5-world.js and js/c6-world.js, so those are read from
// the source as their string literals in order (a per-lead { lead: ..., other: ... } line counts every version). A
// cutscene starts on a line holding its first cue and lasts until the next 'bg'; a shot shows on a line holding its
// cue inside its cutscene. Fails on a cutscene that never starts, a shot that never shows, or a missing sheet.
// Run from game/:  NODE_PATH=$(npm root -g) node tools/cut_check.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// The string literals of each vn([...]) call in a chapter's source, in order: one list per call.
function vnCalls(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8'), calls = [];
  for (let at = src.indexOf('vn(['); at >= 0; at = src.indexOf('vn([', at + 1)) {
    const out = [];
    let depth = 0, i = at + 3;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (ch === "'" || ch === '"' || ch === '`') {
        let j = i + 1, str = '';
        while (src[j] !== ch) { if (src[j] === '\\') { str += src[j + 1]; j += 2; } else str += src[j++]; }
        out.push(str); i = j; continue;
      }
      if (ch === '[') depth++;
      else if (ch === ']' && --depth === 0) break;
    }
    calls.push(out);
  }
  return calls;
}

function check(inline) {
  // the cuts from js/cut-ch3.js to js/cut-ch5.js: their shot ids start cut-<cutscene>-
  const cuts = SD.vn.cuts.filter(c => !/^cut-reveal/.test(c[0][0]));
  const CMD = new Set(['bg', 'cg', 'show', 'hide', 'fx', 'wait', 'act', 'pray', 'glitch', 'gcut', 'flick', 'reveal', 'morph', 'tiles', 'sfx', 'music', 'warp', 'ring', 'cut']);
  const named = name => cuts.find(c => c[0][0] === 'cut-' + name + '-1');
  const LEADS = ['mira', 'kai', 'seoyeon', 'dutch'];
  const isSteps = a => Array.isArray(a) && a.length && a.every(s => Array.isArray(s) && typeof s[0] === 'string');
  const scripts = [], seen = new Set();
  (function walk(o, depth) {
    if (!o || typeof o !== 'object' || seen.has(o) || depth > 6) return;
    seen.add(o);
    if (isSteps(o)) return scripts.push(o);
    Object.values(o).forEach(v => walk(v, depth + 1));
  })([SD.c3story, SD.c4data, SD.c5data], 0);
  const match = (shots, text) => {
    let best = null, at = Infinity, len = 0;
    shots.forEach(([id, cue]) => [].concat(cue).forEach(c => {
      const i = text.indexOf(c);
      if (i >= 0 && (i < at || (i === at && c.length > len))) { best = id; at = i; len = c.length; }
    }));
    return best;
  };
  const shown = new Set();
  // an inline script's literals: 'bg' and the next literal (its id) end the cutscene; every other literal may be a line
  inline.forEach(lits => {
    let cut = null;
    for (let i = 0; i < lits.length; i++) {
      if (lits[i] === 'bg') { cut = null; i++; continue; }
      if (lits[i] === 'cut' && named(lits[i + 1])) { cut = named(lits[++i]); continue; }
      const open = cuts.find(c => match(c.slice(0, 1), lits[i]));
      if (open) cut = open;
      const id = cut && match(cut, lits[i]);
      if (id) shown.add(id);
    }
  });
  // a line's text for a lead: a string, or { <lead>: ..., other: ... }
  const pick = (t, lead) => (t && typeof t === 'object' ? (t[lead] || t.other) : t);
  scripts.forEach(steps => LEADS.forEach(lead => {
    let cut = null;
    steps.forEach(([k, t]) => {
      if (k === 'bg') { cut = null; return; }
      if (k === 'cut') { cut = named(t) || cut; return; }
      if (CMD.has(k)) return;
      const text = pick(t, lead);
      if (typeof text !== 'string') return;
      const open = cuts.find(c => match(c.slice(0, 1), text));
      if (open) cut = open;
      const id = cut && match(cut, text);
      if (id) shown.add(id);
    });
  }));
  const missing = cuts.flatMap(c => c.map(([id]) => id).filter(id => !shown.has(id)));
  const sheets = [...new Set(cuts.flatMap(c => c.map(([id]) => SD.vn.art.scenes[id] && SD.vn.art.scenes[id].sheet)))];
  return { cuts: cuts.length, shots: cuts.reduce((n, c) => n + c.length, 0), scripts: scripts.length + inline.length, missing, sheets };
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + 'index.html?vector', { waitUntil: 'load' });
  await page.waitForFunction(() => window.SD && SD.vn && SD.c3story && SD.c4data && SD.c5data);
  const r = await page.evaluate(check, ['js/c4-world.js', 'js/c5-world.js', 'js/c6-world.js'].flatMap(vnCalls));
  const noSheet = r.sheets.filter(s => !s || !fs.existsSync(path.join(ROOT, s)));
  await browser.close(); server.close();
  if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
  if (r.missing.length) console.log(`${r.missing.length} shots never shown:\n  ` + r.missing.join('\n  '));
  if (noSheet.length) console.log('missing sheets:\n  ' + noSheet.join('\n  '));
  if (errors.length || r.missing.length || noSheet.length) process.exit(1);
  console.log(`OK: all ${r.shots} shots in ${r.cuts} cutscenes show, matched over ${r.scripts} scripts.`);
})();
