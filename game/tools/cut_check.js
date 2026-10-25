// Checks that every pixel cutscene still (js/cut-ch*.js) gets shown: plays js/vn.js's cue matching over every visual-
// novel script in chapters 2 to 7 (with js/vn.js's ['cut', name] steps), once per lead, without drawing anything. Chapter 2's come from
// js/reel.js, built for each lead and version (chapter 7's too, see below); chapter 3's scripts are data (SD.c3story);
// chapters 4 to 7 write theirs inline as vn([...]) calls in js/c4-world.js, js/c5-world.js, js/c6-world.js and js/c7-world.js, so those are read from
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
    if (isSteps(o)) return scripts.push(Object.assign(o, { name: 'chapter 3-5 data' }));
    Object.values(o).forEach(v => walk(v, depth + 1));
  })([SD.c3story, SD.c4data, SD.c5data], 0);
  // chapter 2's scripts, as js/reel.js builds them for each lead and version
  const S = SD.state, snap = JSON.stringify(S.save), persist = S.persist;
  S.persist = () => {};
  SD.reel.list.filter(e => /^2/.test(e.ch) && !e.run).forEach(e => (e.alts || [[null, undefined]]).forEach(([, arg]) => LEADS.forEach(lead => {
    S.save = JSON.parse(snap);
    S.save.c1 = Object.assign({ f: {}, deck: [] }, S.save.c1 || {}, { lead });
    scripts.push(Object.assign(SD.reel.steps(e, arg), { name: e.key + (arg === undefined ? '' : ' (' + arg + ')') }));
  })));
  // chapter 7's too, the same way: its versions (the vault hatch, Kagemaru's three endings) branch inside one vn([...])
  // call, and the culprits' endings are built from the save, so build each version with every culprit reckoned with or
  // none (the inline pass below can only see a script's literals in order).
  const RECKONED = { c2x: { f: { grey: 1 } }, c3: { w: { x: { reckard: 1 } } }, c4: { w: { x: { reckon: 1 } } }, c5: { w: { x: { reckon: 1 } } } };
  SD.reel.list.filter(e => e.ch === '7' && !e.run).forEach(e => (e.alts || [[null, undefined]]).forEach(([, arg]) => [{}, RECKONED].forEach(r => LEADS.forEach(lead => {
    S.save = Object.assign(JSON.parse(snap), JSON.parse(JSON.stringify(r)));
    S.save.c1 = Object.assign({ f: {}, deck: [] }, S.save.c1 || {}, { lead });
    try { scripts.push(Object.assign(SD.reel.steps(e, arg), { name: e.key + (arg === undefined ? '' : ' (' + arg + ')') })); } catch (x) { /* a scene that needs a running world plays only in the story */ }
  }))));
  S.save = JSON.parse(snap); S.persist = persist;
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
  // A script opens on black (js/vn.js), and 'fx' 'black' goes back to it; a backdrop, a still or a line's shot lifts it.
  // A line spoken while it's still black has its text box under the black too: the player sees a black screen.
  const dark = new Set();
  scripts.forEach(steps => LEADS.forEach(lead => {
    let cut = null, black = true;
    steps.forEach(([k, t]) => {
      if (k === 'bg') { cut = null; black = false; return; }
      if (k === 'cg') { black = false; return; }
      if (k === 'fx') { if (t === 'black') black = true; else if (t === 'unblack') black = false; return; }
      if (k === 'cut') { cut = named(t) || cut; return; }
      if (CMD.has(k)) return;
      const text = pick(t, lead);
      if (typeof text !== 'string') return;
      const open = cuts.find(c => match(c.slice(0, 1), text));
      if (open) cut = open;
      const id = cut && match(cut, text);
      if (id) { shown.add(id); black = false; }
      else if (black) dark.add(steps.name + ': "' + text.slice(0, 60) + '"');
    });
  }));
  const missing = cuts.flatMap(c => c.map(([id]) => id).filter(id => !shown.has(id)));
  const sheets = [...new Set(cuts.flatMap(c => c.map(([id]) => SD.vn.art.scenes[id] && SD.vn.art.scenes[id].sheet)))];
  return { cuts: cuts.length, shots: cuts.reduce((n, c) => n + c.length, 0), scripts: scripts.length + inline.length, missing, sheets, dark: [...dark] };
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Chapter 2's scenes are the vector demo's (js/vec-ch2.js) in index.html?vector, and its pixel world's (js/c2-world.js)
  // with &ch2: check both.
  const rs = [];
  for (const q of ['vector', 'vector&ch2']) {
    await page.goto(base + 'index.html?' + q, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SD && SD.vn && SD.reel && SD.c3story && SD.c4data && SD.c5data);
    rs.push(await page.evaluate(check, ['js/c4-world.js', 'js/c5-world.js', 'js/c6-world.js', 'js/c7-world.js'].flatMap(vnCalls)));
  }
  const r = Object.assign({}, rs[0], { scripts: rs[0].scripts + rs[1].scripts, missing: rs[0].missing.filter(id => rs[1].missing.includes(id)),
    sheets: [...new Set(rs.flatMap(x => x.sheets))], dark: [...new Set(rs.flatMap(x => x.dark))] });
  const noSheet = r.sheets.filter(s => !s || !fs.existsSync(path.join(ROOT, s)));
  await browser.close(); server.close();
  if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
  if (r.missing.length) console.log(`${r.missing.length} shots never shown:\n  ` + r.missing.join('\n  '));
  if (noSheet.length) console.log('missing sheets:\n  ' + noSheet.join('\n  '));
  if (r.dark.length) console.log(`${r.dark.length} lines play on a black screen (no backdrop or still before them):\n  ` + r.dark.join('\n  '));
  if (errors.length || r.missing.length || noSheet.length || r.dark.length) process.exit(1);
  console.log(`OK: all ${r.shots} shots in ${r.cuts} cutscenes show, matched over ${r.scripts} scripts.`);
})();
