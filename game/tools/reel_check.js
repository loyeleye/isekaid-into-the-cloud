// Checks that every cutscene is in the cutscene viewer (js/reel.js, js/demo-select.js):
//  1. In the source, every SD.vn.play call is inside a scene's cut.def(...) (or js/reel.js itself), so a cutscene
//     can't be played without being named.
//  2. In the combined demo (index.html?vector&ch2&demo), every chapter in the Debug menu has cutscenes, every scene
//     builds for every lead and version without errors, its backgrounds and stills exist, and it names its speakers.
//     A story that played a scene some other way would log "[reel] a cutscene played outside SD.reel".
//  3. The viewer lists every scene under its chapter, searches, and plays one scene per chapter (skipped through)
//     and the opening and the reveal, coming back to the viewer each time with the save exactly as it was.
// Run from game/:  NODE_PATH=$(npm root -g) node tools/reel_check.js   SHOTS=dir saves screenshots. Phone viewport.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fail = [];

// ---------- 1. The source ----------
// The end of the bracket that opens at i, skipping strings and comments.
function close(src, i) {
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '/' && src[j + 1] === '/') { j = src.indexOf('\n', j); continue; }
    if (c === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') { let k = j + 1; while (src[k] !== c) k += src[k] === '\\' ? 2 : 1; j = k; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c) && --depth === 0) return j;
  }
  return src.length;
}
const JS = path.join(ROOT, 'js');
let calls = 0;
fs.readdirSync(JS).filter(f => f.endsWith('.js') && f !== 'reel.js' && f !== 'vn.js').forEach(f => {
  const src = fs.readFileSync(path.join(JS, f), 'utf8');
  const defs = [];
  for (const m of src.matchAll(/\.def\(/g)) defs.push([m.index, close(src, m.index + 4)]);
  for (const m of src.matchAll(/\bvn\.play\s*\(/g)) {
    calls++;
    if (!defs.some(([a, b]) => m.index > a && m.index < b)) {
      const line = src.slice(0, m.index).split('\n').length;
      fail.push(`js/${f}:${line} plays a cutscene with SD.vn.play outside a cut.def: name it (js/reel.js) so the viewer has it`);
    }
  }
});
console.log('source: ' + calls + ' SD.vn.play calls outside js/reel.js, all inside a scene');

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch2&demo`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.addInitScript(() => { window.SD_TEST = 1; });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(url);
  await page.waitForSelector('#t-start, #ds-new', { timeout: 30000 });
  if (await page.$('#t-start')) await page.click('#t-start');
  await page.waitForSelector('#ds-new', { timeout: 10000 });

  // ---------- 2. Every scene builds ----------
  const r = await page.evaluate(() => {
    const out = { bad: [], n: SD.reel.list.length, chapters: {}, runs: 0, steps: 0 };
    const S = SD.state, V = SD.vn, LEADS = ['mira', 'kai', 'seoyeon', 'dutch'];
    const CMD = new Set(['bg', 'cg', 'show', 'hide', 'fx', 'wait', 'act', 'pray', 'glitch', 'gcut', 'flick', 'reveal', 'morph', 'tiles', 'sfx', 'music', 'warp', 'ring', 'cut']);
    const keys = new Set();
    const snap = JSON.stringify(S.save), persist = S.persist;
    S.persist = () => {};
    SD.reel.list.forEach(e => {
      out.chapters[e.ch] = (out.chapters[e.ch] || 0) + 1;
      if (keys.has(e.key)) out.bad.push(e.key + ': named twice');
      keys.add(e.key);
      if (!e.title) out.bad.push(e.key + ': no title');
      if (e.run) { out.runs++; return; }
      (e.alts || [[null, undefined]]).forEach(([alt, arg]) => LEADS.forEach(lead => {
        const at = e.key + (alt ? ' (' + alt + ')' : '') + ' as ' + lead;
        S.save = JSON.parse(snap);
        S.save.c1 = Object.assign({ f: {}, deck: [] }, S.save.c1 || {}, { lead });
        let steps;
        try { steps = SD.reel.steps(e, arg); } catch (x) { return out.bad.push(at + ': ' + x.message); }
        if (!Array.isArray(steps) || !steps.length) return out.bad.push(at + ': no steps');
        out.steps += steps.length;
        steps.forEach((s, i) => {
          // A line with no speaker (null) is narration.
          if (!Array.isArray(s) || !(typeof s[0] === 'string' || s[0] === null)) return out.bad.push(at + ' step ' + i + ': not a step');
          const [k, a] = s;
          if ((k === 'bg' || k === 'cg' || k === 'gcut') && !V.art.scenes[a]) out.bad.push(at + ': no art for ' + k + ' ' + a);
          if (k === 'show' && !(SD.cast[a] || V.art.sprites[a])) out.bad.push(at + ': shows nobody called ' + a);
          if (!CMD.has(k) && k !== 'narr' && k !== null && !SD.cast[k]) out.bad.push(at + ': line for nobody called ' + k);
          if (!CMD.has(k) && typeof a !== 'string') out.bad.push(at + ' step ' + i + ': line with no text');
        });
      }));
    });
    S.save = JSON.parse(snap); S.persist = persist;
    out.loaded = SD.demo.chapters.filter(c => SD.chapterStart && SD.chapterStart[c.n]).map(c => c.n);
    return out;
  });
  console.log(`registry: ${r.n} cutscenes (${r.runs} with their own player), ${r.steps} steps built; by chapter: ${JSON.stringify(r.chapters)}`);
  r.bad.forEach(b => fail.push(b));
  r.loaded.forEach(n => { if (!r.chapters[n]) fail.push('chapter ' + n + ' has no cutscenes in the viewer'); });
  Object.keys(r.chapters).forEach(n => { if (!r.loaded.includes(n)) fail.push('cutscenes for chapter ' + n + ', which the Debug menu doesn\'t list'); });

  // ---------- 3. The viewer ----------
  await page.click('#ds-dbg');
  await page.click('#ds-reel');
  await page.waitForSelector('#rv-list');
  const listed = await page.evaluate(() => [...document.querySelectorAll('.rv-ch')].map(d => [d.dataset.ch, [...d.querySelectorAll('.rv-row')].map(r => r.dataset.key)]));
  const keys = await page.evaluate(() => SD.reel.list.map(e => [e.ch, e.key]));
  keys.forEach(([ch, key]) => { const g = listed.find(x => x[0] === ch); if (!g || !g[1].includes(key)) fail.push('viewer: ' + key + ' not listed under chapter ' + ch); });
  console.log('viewer: ' + listed.map(([ch, l]) => ch + ':' + l.length).join(' '));
  const small = await page.evaluate(() => [...document.querySelectorAll('#panel button, #panel summary, #rv-q')].filter(b => b.offsetParent && b.offsetHeight < 44).map(b => (b.textContent || b.id).trim().slice(0, 20) + ' ' + b.offsetHeight));
  if (small.length) fail.push('viewer: ' + small.length + ' controls under 44px tall: ' + small.slice(0, 5).join(', '));
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (wide > 0) fail.push('viewer: the page scrolls sideways by ' + wide + 'px');
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, 'reel-viewer.png'), fullPage: false }); }
  // Search: a title, then a line inside a scene.
  for (const [q, want] of [['Jin\'s Echo', '4/echo'], ['delete marker', '2/coo'], ['zzzz no such', null]]) {
    await page.fill('#rv-q', q);
    const hits = await page.evaluate(() => [...document.querySelectorAll('.rv-row')].filter(r => !r.hidden && !r.closest('details').hidden).map(r => r.dataset.key));
    if (want && !hits.includes(want)) fail.push(`search "${q}" doesn't find ${want} (${hits.join(', ')})`);
    if (!want && (hits.length || await page.evaluate(() => document.querySelector('#rv-none').hidden))) fail.push(`search "${q}" should say nothing matches`);
  }
  await page.fill('#rv-q', '');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'reel-search.png') });

  // Play: one scene per chapter (with versions, a per-lead one, and the two with their own players), skipping through.
  const picks = await page.evaluate(() => {
    const L = SD.reel.list, by = {};
    L.forEach(e => { if (!by[e.ch]) by[e.ch] = e.key; });
    return [...new Set([...Object.values(by), '1/opening', '1/reveal', '4/name', '2/pair-tof'])].filter(k => SD.reel.get(k));
  });
  const before = await page.evaluate(() => localStorage.getItem('sd-save') + '|' + JSON.stringify(SD.state.save));
  for (const key of picks) {
    const t0 = Date.now();
    await page.evaluate(k => { const e = SD.reel.get(k); const d = document.querySelector(`.rv-ch[data-ch="${e.ch}"]`); d.open = true; }, key);
    await page.click(`[data-play="${key}"]`);
    let done = false;
    for (let i = 0; i < 400 && !done; i++) {
      await page.waitForTimeout(100);
      done = await page.evaluate(() => !!document.querySelector('#rv-list') && !SD.vn.playing() && !SD.demo.watching);
      if (done) break;
      await page.evaluate(() => {
        const keep = document.querySelector('.vf-keep'); if (keep) return keep.click();
        const skip = document.querySelector('#vn .vn-skip'); if (skip && !skip.hidden) skip.click();
        const vn = document.querySelector('#vn'); if (vn && !vn.hidden) vn.click();
      });
    }
    if (!done) fail.push('play ' + key + ': never came back to the viewer');
    const marked = await page.evaluate(k => !!document.querySelector(`.rv-row.rv-last[data-key="${k}"]`), key);
    if (done && !marked) fail.push('play ' + key + ': the viewer doesn\'t mark it as just watched');
    console.log('played ' + key + ' in ' + (Date.now() - t0) + 'ms');
  }
  const after = await page.evaluate(() => localStorage.getItem('sd-save') + '|' + JSON.stringify(SD.state.save));
  if (before !== after) fail.push('watching cutscenes changed the save');
  // The lead picker sticks, and Back goes to the Debug menu.
  await page.click('#panel [data-lead="dutch"]');
  if (!(await page.evaluate(() => document.querySelector('#panel [data-lead="dutch"]').getAttribute('aria-pressed') === 'true'))) fail.push('lead picker: Dutch not picked');
  await page.click('#rv-back');
  if (!(await page.$('#ds-reel'))) fail.push('Back doesn\'t return to the Debug menu');

  errors.forEach(e => fail.push(e));
  await browser.close(); server.close();
  if (fail.length) { console.log('FAIL\n  ' + fail.join('\n  ')); process.exit(1); }
  console.log('reel_check ok');
})().catch(e => { console.error(e); process.exit(1); });
