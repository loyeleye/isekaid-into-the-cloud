// Headless playthrough of the chapter 2 demo (index.html?vector&ch2): pick a lead, explore the edge of the Cloud,
// the scrap field, the tower's foot and Thornwick with every minigame and lost letter, then climb into the vector
// slice's Expedition I and play to its "to be continued" card. Fails on page or console errors and on raster images.
// Run from game/:  node tools/c2_check.js [mira|kai|seoyeon|dutch] [--win]   SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEAD = ['mira', 'kai', 'seoyeon', 'dutch'].find(l => process.argv.includes(l)) || 'mira';
const WIN = process.argv.includes('--win');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch2`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 420), height: Number(process.env.H || 860) } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('request', r => { if (/\.(webp|png|jpe?g|gif)(\?|$)/i.test(r.url()) && !/\/assets\/img\/(opening|portraits|vn)\//.test(r.url())) errors.push('raster image requested: ' + r.url().replace(/^.*?\/assets\//, 'assets/')); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.click('#t-c2new');
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

  const seen = new Set(), last = [], shotsTaken = new Set();
  let steps = 0;
  for (; steps < 6000; steps++) {
    const what = await page.evaluate(([WIN, LEAD]) => {
      const vis = el => el && !el.hidden && el.offsetParent !== null;
      const $ = s => document.querySelector(s);
      const click = el => { el.click(); return true; };
      const sv = SD.state.save, c1 = sv.c1;
      if ($('#v2-end') && vis($('#v2-end'))) return 'end2';
            // The visual-novel prologue (js/vn.js): play each moment as it appears, then read on.
      const vn = $('#vn');
      if (vn && !vn.hidden) {
        window.__vnShots = window.__vnShots || {};
        const keep = vn.querySelector(`[data-keep="${LEAD}"]`);
        if (keep && vis(keep)) { if (!window.__vnShots.files) { window.__vnShots.files = 1; return 'scene:opening-files'; } return click(keep) && 'vn-keep'; }
        const file = vn.querySelector(`.vf-file[data-lead="${LEAD}"]`);
        if (file) return click(file) && 'vn-file';
        const card = vn.querySelector('.vc-card');
        if (card) { const k = 'card-' + card.querySelector('b').textContent.split(' ')[0].toLowerCase(); if (!window.__vnShots[k] && !card.querySelector('.vc-go').disabled) { window.__vnShots[k] = 1; return 'scene:opening-' + k; } }
        const btn = [...vn.querySelectorAll('.vn-act button')].find(x => !x.disabled);
        if (btn) { const k = 'act-' + vn.querySelector('.vn-panel').className.split(' ')[1]; if (!window.__vnShots[k]) { window.__vnShots[k] = 1; return 'scene:prologue-' + k; } return click(btn) && 'vn-act'; }
        const box = vn.querySelector('.vn-box');
        if (box.hidden || !vn.classList.contains('vn-ready')) return 'vn-wait';
        const k = (vn.classList.contains('vn-incg') ? vn.dataset.cg : vn.dataset.bg) + '-' + box.dataset.who;
        if (!window.__vnShots[k]) { window.__vnShots[k] = 1; return 'scene:vn-' + k; }
        box.click(); return 'vn-line';
      }
      if (!$('#dialog').hidden) {
        // The first line of each cutscene backdrop is left to finish typing for its screenshot.
        const st = $('#stage'), sc = !st.hidden && st.dataset.scene;
        window.__scenes = window.__scenes || {};
        if (sc && !window.__scenes[sc]) { window.__scenes[sc] = 1; return 'scene:' + sc; }
        const who = $('#dialog').dataset.who;
        if (sc && who !== 'narr' && !window.__scenes[sc + '-' + who]) { window.__scenes[sc + '-' + who] = 1; return 'scene:' + sc + '-' + who; }
        $('#dialog').click(); return 'dialog:' + ($('#dialog').dataset.who || '');
      }
      const p = $('#panel');
      if (!p.hidden) {
        const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
        let x;
        if ((x = p.querySelector(`[data-lead="${LEAD}"]`))) { if (!window.__leadSeen) { window.__leadSeen = 1; return 'lead-wait'; } return click(x) && 'lead'; }
        if ((x = b('#tm-y'))) return click(x) && 'enter-temple';
        if ((x = b('#q-said'))) return click(x) && 'said';
        window.__p2 = window.__p2 || {};
        const once = k => !window.__p2[k] && (window.__p2[k] = 1);
        // Chapter 2's minigames, played right.
        if ((x = p.querySelector('[data-k="ring"]')) && !p.querySelector('.hit')) { if (!window.__p2.notes) { window.__p2.notes = 1; return 'scene:c2w-notes'; } return click(x) && 'mg:notes'; }
        if (p.querySelector('#hx-go')) {
          const row = [...p.querySelectorAll('[data-r]')].find(r => !r.querySelector('.on'));
          if (row) { const cant = /compliance|tape/.test(row.textContent); return click(row.querySelector(`[data-v="${cant ? 0 : 1}"]`)) && 'mg:hatch'; }
          if (!window.__p2.hatch) { window.__p2.hatch = 1; return 'scene:c2w-hatch'; }
          return click(p.querySelector('#hx-go')) && 'mg:hatch-go';
        }
        if ((x = b('#pb-run'))) { click(p.querySelector('[data-vt="60"]')); click(p.querySelector('[data-del="1"]')); return click(x) && 'mg:postbox'; }
        if ((x = b('#br-go'))) {
          const want = ['LetterArrived', 'BeastSighted'];
          const on = [...p.querySelectorAll('[data-f="type"]')].find(c => want.includes(c.dataset.v) && !c.classList.contains('on'));
          if (on) return click(on) && 'mg:chip';
          if (!window.__p2.bells) { window.__p2.bells = 1; return 'scene:c2w-bells'; }
          return click(x) && 'mg:bells';
        }
        if (p.querySelector('.g2-run') && !b('.primary')) return 'mg-wait';
        const gh = p.querySelector('.g2-h');
        if (gh && p.querySelector('[data-o]') && !window.__p2['r' + gh.textContent]) { window.__p2['r' + gh.textContent] = 1; return 'scene:c2w-restore'; }
        if (gh && (x = b('[data-o]'))) return click(x) && 'mg:restore';
        if ((x = b('.g2-predict [data-p]'))) return click(x) && 'mg:predict';
        if (b('#sd-go') && once('sd')) return 'scene:c2-sorting-desk';
        if (b('#v2-ship, #v2-quest, #v2-up') && once('camp' + p.querySelectorAll('button[disabled]').length)) return 'scene:c2-camp-' + p.querySelectorAll('button[disabled]').length;
        if ((x = b('#sd-go'))) { p.querySelectorAll('[data-i="3"], [data-i="8"]').forEach(click); return click(x) && 'sorting-desk'; }
        if ((x = b('#v2-ship, #v2-quest, #v2-up'))) return click(x) && 'camp:' + x.id;
        if ((x = p.querySelector('#q-num')) && !x.value) { x.value = /function.s timeout/.test(p.textContent) ? '180' : '10800'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'num'; }
        if ((x = p.querySelector('#q-text')) && !x.value) { x.value = 'The trust policy says who can assume the role, and the permissions say what it can do.'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'text'; }
        if ((x = b('#q-confirm, #q-next, #pm-ok'))) return click(x) && 'next';
        if (p.querySelector('[data-p]') && !p.querySelector('[data-p].on')) return click(p.querySelector('[data-p]')) && 'compass';
        const conf = b('.conf-b button');
        if (!conf && (x = b('.opts .opt:not(.on):not(.struck)'))) return click(x) && 'opt';
        if (conf) return click(conf) && 'conf';
        if (p.querySelector('#skip') && (x = b('.card'))) return click(x) && 'card';
        if ((x = b('.primary'))) return click(x) && 'primary';
        if ((x = b('.opts .opt'))) return click(x) && 'opt2';
        if ((x = b('#skip, .ghost, #panel-x'))) return click(x) && 'ghost';
        return 'panel-wait';
      }
      // Between chapter 2's scenes there's no run: the last fight's screen is left behind and mustn't be played.
      if (!sv.run && !(SD.c2world && SD.c2world.active)) return 'c2-wait';
      if (vis($('#run'))) {
        const end = $('#end-turn');
        if (end) {
          const C = SD.run.api.combat();
          if (C.busy) return 'combat-wait';
          if (SD.enemies[C.eid].ch !== 2) return 'c2-wait';   // the last chapter 1 fight, still on screen under the gate
          // Chapter 2's bosses play one card first, for their screenshot.
          if (C.boss && !(window.__boss = window.__boss || {})[C.eid]) { window.__boss[C.eid] = 1; return 'boss:' + C.eid; }
          if (WIN && C && !C.over && C.eid !== 'kyu' && C.eid !== 'lockeddoor') { C.sev = 0; SD.run.api.win(); return 'win'; }
          const c = [...$('#run').querySelectorAll('.hand .card')].find(c => !c.classList.contains('dim'));
          if (c) return click(c) && 'play:' + C.eid;
          return click(end) && 'end-turn';
        }
        const n = $('#run').querySelector('.node.can');
        if (n) return click(n) && 'node:' + n.className.split(' ')[1];
        return 'run-wait';
      }
      if (vis($('#screen-world')) && SD.c2world && SD.c2world.active && !SD.c2world.debug.busy()) {
        const D = SD.c2world.debug, sc = D.scene(), w = D.w(), f = w.x, A2 = sc.actors;
        const go = (id, x, y) => { D.place(x, y); sc.onTalk(id); return 'story:' + id; };
        if (!f.notes) return go('basket', 10, 22);
        if (!f.tower) { D.place(19, 20); return 'walk:tower'; }
        if (!f.scrap) { D.place(36, 20); return 'walk:scrap'; }
        if (!f.notice) return go('notice', 30, 20);
        if (!f.sign) return go('sign', 32, 19);
        if (!w.lens) { document.querySelector('#w-lens').click(); return 'lens'; }
        if (!f.coo) return go('po', 41, 6);
        if (!f.bakery) return go('bakery', 44, 11);
        if (!f.band) return go('band', 54, 12);
        const L = [[44, 12], [60, 4], [57, 13], [57, 34], [74, 6]];
        const li = L.findIndex((p, i) => !w.letters.includes(i) && !A2['letter' + i].hidden);
        if (li >= 0) { D.place(L[li][0], L[li][1] + 1); sc.onTalk('letter' + li); return 'story:letter'; }
        if (!f.runbook) return go('runbook', 36, 36);
        if (!f.bridge) return go('bridge', 62, 20);
        if (!f.seymour) return go('bunker', 71, 11);
        if (!f.wren) return go('wren', 50, 32);
        if (!f.fire) return go('fire', 71, 25);
        if (w.letters.some(i => !w.given.includes(i))) return go('coo', A2.coo.x, A2.coo.y + 1);
        if (!f.town) { D.place(78, 20); sc.onDoor('gate'); return 'story:gate'; }
        if (!f.offer) return go('box', 87, 21);
        if (!f.bells) return go('marrow', 86, 11);
        if (!f.tilly) return go('tilly', A2.tilly.x, A2.tilly.y + 1);
        if (!f.poster) return go('poster1', 84, 18);
        if (!window.__vil) { window.__vil = 1; return go('v1', 86, 20); }
        if (!window.__shotTown) { window.__shotTown = 1; return 'scene:c2w-town'; }
        D.place(92, 20); sc.onDoor('stair'); return 'story:stair';
      }
      return 'wait';
    }, [WIN, LEAD]);
    last.push(what); if (last.length > 16) last.shift();
    seen.add(what.replace(/^(node|dialog|play|scene):.*/, '$1'));
    if (/^story:|^node:|^play:/.test(what)) seen.add(what);
    // Screenshots of the main moments, once each.
    // (Typing runs on a timer, so each shot waits for the line to finish and the portraits to load.)
    const key = { 'lead-wait': 'lead-select', 'boss:postmistress': 'c2-postmistress', 'boss:belfry': 'c2-belfry', 'story:cart': 'camp', 'story:kyu': 'road', 'story:wren': 'brookfall', 'story:gate': 'temple' }[what]
      || (/^scene:/.test(what) && what.replace(':', '-'));
    if (key && !shotsTaken.has(key)) { shotsTaken.add(key); await page.waitForTimeout(1500); await shot(key); }
    if (/^play:(lockeddoor|uptimaboss|kyu)$/.test(what) && !shotsTaken.has(what)) { shotsTaken.add(what); await page.waitForTimeout(600); await shot(what.replace(':', '-')); }
    if (what === 'end2') { await page.waitForTimeout(800); await shot('c2-to-be-continued'); break; }
    await page.waitForTimeout(/wait$/.test(what) ? 120 : 30);
  }
  const sv = await page.evaluate(() => ({ lead: SD.state.save.c1 && SD.state.save.c1.lead, flags: SD.state.save.c1 && SD.state.save.c1.f, level: SD.state.save.level, deck: SD.state.save.c1 && SD.state.save.c1.deck.length, c2: SD.state.save.c2 }));
  await browser.close(); server.close();
  console.log('steps', steps, JSON.stringify(sv));
  console.log('c2 world', JSON.stringify(sv.c2 && sv.c2.w));
  console.log('saw', [...seen].sort().join(' '));
  if (steps >= 6000) errors.push('the demo never finished; last actions: ' + last.join(' '));
  const wx = (sv.c2 && sv.c2.w && sv.c2.w.x) || {};
  const world = ['cold', 'notes', 'tower', 'scrap', 'notice', 'sign', 'coo', 'bakery', 'band', 'bridge', 'seymour', 'wren', 'fire', 'town', 'offer', 'bells', 'tilly', 'poster', 'runbook'].filter(k => !wx[k]);
  if (world.length) errors.push('world flags never set: ' + world.join(', '));
  if (!sv.c2 || !sv.c2.w || sv.c2.w.given.length !== 5) errors.push('not all five letters reached Coo: ' + JSON.stringify(sv.c2 && sv.c2.w && sv.c2.w.given));
  const c2 = ['act1', 'won', 'ship', 'quest', 'done'].filter(k => !sv.c2 || !sv.c2.f[k]);
  if (c2.length) errors.push('chapter 2 flags never set: ' + c2.join(', '));
  if (!sv.c2 || !sv.c2.dev.redrive) errors.push('Coo\'s Redrive Stamp was never given');
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK: played the chapter 2 demo as ${LEAD} from the title through the explorable world and Expedition I to "to be continued", no raster images, no errors.`);
})().catch(e => { console.error(e); process.exit(1); });
