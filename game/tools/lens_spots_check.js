#!/usr/bin/env node
// Lens spots check: every chapter's Version Lens spots (js/lens.js L.world), in the real page. For each chapter it
// starts a new game, clicks through to the walkable map, and then for every spot checks that it stands on open
// floor with open floor beside it, that it's hidden with the lens off and shown with it on, and that talking to it
// asks first, shows the lens's view once you've answered, and marks it found. A spot that waits on the story is
// checked hidden first, then shown once its flags are set. Fails on page or console errors.
//   node tools/lens_spots_check.js [2b|3|...]     SHOTS=dir saves a screenshot of each spot's panel
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
// [chapter, url flag, the title's new-game button, the world's SD key]
const CHAPTERS = [['2b', 'ch2b', '#t-c2xnew', 'c2xworld'], ['3', 'ch3', '#t-c3new', 'c3world'], ['4', 'ch4', '#t-c4new', 'c4world'], ['5', 'ch5', '#t-c5new', 'c5world'], ['6', 'ch6', '#t-c6new', 'c6world'], ['7', 'ch7', '#t-c7new', 'c7world']];
const only = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const errors = [];
  let checked = 0;
  for (const [ch, q, btn, key] of CHAPTERS) {
    if (only.length && !only.includes(ch)) continue;
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(ch + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext|ERR_/.test(m.text())) errors.push(ch + ' console: ' + m.text()); });
    await page.addInitScript(() => { window.SD_TEST = 1; });
    await page.goto(`http://localhost:${server.address().port}/index.html?vector&${q}`);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    if (await page.$('#t-start')) await page.click('#t-start');
    if (!(await page.$(btn))) { errors.push(`${ch}: no ${btn} on the title`); await page.close(); continue; }
    await page.click(btn);
    // Click through whatever opens until the map is up and nothing is running.
    const settle = async () => {
      for (let i = 0; i < 600; i++) {
        const r = await page.evaluate(k => {
          const vis = el => el && !el.hidden && el.offsetParent !== null, $ = s => document.querySelector(s);
          const vn = $('#vn');
          if (vn && !vn.hidden) { const b = [...vn.querySelectorAll('.vn-act button, .vn-panel button')].find(x => !x.disabled && vis(x)); if (b) { b.click(); return 'vn'; } const box = vn.querySelector('.vn-box'); if (box && !box.hidden) box.click(); return 'vn'; }
          if (!$('#dialog').hidden) { $('#dialog').click(); return 'dialog'; }
          const p = $('#panel');
          if (!p.hidden) { const b = [...p.querySelectorAll('[data-lead], .opt, button.primary, button')].find(x => !x.disabled && vis(x)); if (b) { b.click(); return 'panel'; } return 'panel-wait'; }
          const W = SD[k];
          if (W && W.active && W.debug && !W.debug.busy()) return 'ready';
          return 'wait';
        }, key);
        if (r === 'ready') return true;
        await page.waitForTimeout(r === 'wait' || r === 'panel-wait' ? 120 : 30);
      }
      return false;
    };
    if (!(await settle())) { errors.push(`${ch}: the map never came up`); await page.close(); continue; }
    const spots = await page.evaluate(k => {
      const D = SD[k].debug, LW = D.LW, sc = D.scene();
      const ids = Object.keys(sc.actors).filter(id => /^lens-/.test(id));
      return { ids, solid: sc.def.solid || 'T#', spots: ids.map(id => { const a = sc.actors[id]; return { id, x: a.x, y: a.y, tile: sc.tile(a.x, a.y), near: [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => sc.tile(a.x + dx, a.y + dy)), hidden: a.hidden }; }), on: LW.on() };
    }, key);
    if (!spots.ids.length) errors.push(`${ch}: no lens spots`);
    for (const s of spots.spots) {
      const bad = c => !c || (spots.solid + 'TV#~').includes(c);
      if (bad(s.tile)) errors.push(`${ch} ${s.id}: stands on '${s.tile}' at ${s.x},${s.y}`);
      if (s.near.every(bad)) errors.push(`${ch} ${s.id}: nothing open beside it at ${s.x},${s.y}`);
      if (!spots.on && !s.hidden) errors.push(`${ch} ${s.id}: shown with the lens off`);
    }
    // Lens on (unlimited, so the check never waits on looks), then each spot in turn.
    await page.evaluate(k => { SD.state.save.lensFree = true; SD[k].debug.LW.toggle(); }, key);
    if (SHOTS && spots.spots[0]) {
      const s0 = spots.spots[0];
      await page.evaluate(([k, x, y]) => SD[k].debug.place(x, y), [key, s0.x, s0.y + 2]);
      await page.waitForTimeout(700);
      await settle();
      await page.screenshot({ path: path.join(SHOTS, `lens-${ch}-map.png`) });
    }
    for (const s of spots.spots) {
      const early = await page.evaluate(([k, id]) => {
        const D = SD[k].debug, a = D.scene().actors[id], need = D.LW.need(id.slice(5));
        if (!need.length || D.LW.ready(id.slice(5))) return 'ok';
        if (!a.hidden) return 'shown before the story reaches it';
        D.flags(Object.fromEntries(need.map(f => [f, true])));
        return 'ok';
      }, [key, s.id]);
      if (early !== 'ok') errors.push(`${ch} ${s.id}: ${early}`);
      await settle();
      const r = await page.evaluate(([k, id]) => {
        const D = SD[k].debug, a = D.scene().actors[id];
        if (a.hidden) return 'hidden with the lens on';
        if (!D.LW.talk(id)) return 'talk refused';
        return 'ok';
      }, [key, s.id]);
      if (r !== 'ok') { errors.push(`${ch} ${s.id}: ${r}`); continue; }
      await page.waitForSelector('#panel:not([hidden]) .lens-view', { state: 'attached', timeout: 4000 }).catch(() => errors.push(`${ch} ${s.id}: no panel`));
      const before = await page.evaluate(() => { const v = document.querySelector('#panel .lens-view'); return v ? v.hidden : null; });
      if (before !== true) errors.push(`${ch} ${s.id}: the lens view shows before you answer`);
      await page.click('#panel [data-p]');
      const after = await page.evaluate(() => { const v = document.querySelector('#panel .lens-view'); return v && !v.hidden && document.querySelector('#panel .g2-note').textContent.length > 20; });
      if (!after) errors.push(`${ch} ${s.id}: no lens view or explanation after answering`);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `lens-${ch}-${s.id.slice(5)}.png`) });
      await page.click('#panel button.primary');
      await settle();
      const done = await page.evaluate(([k, id]) => SD[k].debug.LW.done(id.slice(5)) && SD[k].debug.scene().actors[id].hidden, [key, s.id]);
      if (!done) errors.push(`${ch} ${s.id}: not marked found`);
      checked++;
    }
    await page.close();
  }
  await browser.close(); server.close();
  if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
  console.log(`OK: ${checked} lens spots, each hidden until the lens is on, asked before shown, and marked found.`);
})();
