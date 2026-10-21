// Headless playthrough of the chapter 5 demo (index.html?vector&ch5): the title button, a lead pick, the cold open,
// Seymour's tapes, the city, every gate (walked into and through with the arrow keys), every minigame (the cipher typed
// in), all eight pages of Lina's diary, the three expeditions in the raid engine (every node clicked; with --win each
// fight is won through the test hook), the cues inside them (the ledgers, the confrontation, the traffic bar), the rail
// and the end card. Fails on page or console errors, raster images, a gate or door you can't walk through, or a story
// flag never set.
// Run from game/:  NODE_PATH=$(npm root -g) node tools/c5_check.js [mira|kai|seoyeon|dutch] [--win]
//   SHOTS=dir saves screenshots; W and H set the viewport (default 390x844); CHOICE=hold|let (default hold).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEAD = ['mira', 'kai', 'seoyeon', 'dutch'].find(l => process.argv.includes(l)) || 'dutch';
const WIN = process.argv.includes('--win');
const SHOTS = process.env.SHOTS, CHOICE = process.env.CHOICE || 'hold';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// One step: answer whatever is open, else play the raid, else walk the world to the next thing.
function step([WIN, LEAD, CHOICE]) {
  const $ = s => document.querySelector(s), vis = el => el && !el.hidden && el.offsetParent !== null, click = el => { el.click(); return true; };
  const once = k => { window.__once = window.__once || {}; if (window.__once[k]) return false; return (window.__once[k] = 1); };
  const W = SD.c5world;
  const vn = $('#vn');
  if (vn && !vn.hidden) {
    const btn = [...vn.querySelectorAll('.vn-act button')].find(x => !x.disabled);
    if (btn) return click(btn) && 'vn-act';
    const box = vn.querySelector('.vn-box');
    if (!box || box.hidden || !vn.classList.contains('vn-ready')) return 'vn-wait';
    const k = (vn.classList.contains('vn-incg') ? vn.dataset.cg : vn.dataset.bg);
    if (once('vn-' + k)) return 'shot:vn-' + k;
    box.click(); return 'vn-line';
  }
  if (!$('#dialog').hidden) { $('#dialog').click(); return 'dialog:' + ($('#dialog').dataset.who || ''); }
  const p = $('#panel');
  if (!p.hidden) {
    if (/📼 2 → 1/.test(p.textContent)) window.__tapes = 1;
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    let x;
    if ((x = p.querySelector(`[data-lead="${LEAD}"]`))) { if (once('lead')) return 'shot:lead-select'; return click(x) && 'lead'; }
    if (p.querySelector('#c5-end')) { if (once('end-shot')) return 'shot:c5-end-card'; return 'end'; }
    if ((x = b(`[data-ch="${CHOICE}"]`))) { if (once('choice')) return 'shot:c5-rail'; return click(x) && 'choice:' + CHOICE; }
    if ((x = b('#c5-solo'))) { if (once('lobby')) return 'shot:c5-lobby'; return click(x) && 'lobby:solo'; }
    // This chapter's minigames, played right (the answers are the games' own data).
    const g = SD.c5games && SD.c5games.cur, gp = p.querySelector('.g5');
    if (gp) {
      const name = g ? g.o.title : 'done';
      if (once('mg-' + name)) return 'shot:mg-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      if ((x = b('#g5-cont'))) return click(x) && 'mg:continue';
      const pr = gp.querySelector('.g5-predict');
      if (g && pr && (x = [...pr.querySelectorAll('[data-p]')].find(el => !el.disabled && g.o.predict.opts[+el.dataset.p].ok))) return click(x) && 'mg:predict';
      if (g && pr && [...pr.querySelectorAll('[data-p]')].some(el => !el.disabled)) return 'mg-wait';
      if (g && g.kind === 'door') {
        for (const f of g.o.fields) { const c = gp.querySelector(`[data-f="${f.k}"][data-v="${g.o.answer[f.k]}"]`); if (c && !c.classList.contains('on') && !c.disabled) return click(c) && 'mg:chip'; }
        if ((x = b('#g5-try'))) return click(x) && 'mg:try';
      }
      if (g && g.kind === 'sort') {
        // The first check goes in with one row wrong, to play the "fix the red ones" path too.
        const rows = [...gp.querySelectorAll('.g5-row')].filter(r => !r.classList.contains('done'));
        for (const r of rows) {
          const i = +r.dataset.r, it = g.o.items[i];
          const wrong = once('wrong-' + g.o.title) ? (it.bin + 1) % g.o.bins.length : it.bin;
          if (!r.querySelector('button.on')) return click(r.querySelector(`[data-v="${wrong}"]`)) && 'mg:sort';
        }
        if ((x = b('#g5-go'))) return click(x) && 'mg:check';
      }
      if (g && g.kind === 'order') {
        const left = [...gp.querySelectorAll('[data-s]')].map(el => +el.dataset.s);
        if (left.length) return click(gp.querySelector(`[data-s="${Math.min(...left)}"]`)) && 'mg:step';
      }
      if (g && g.kind === 'cipher') {
        const inp = gp.querySelector('#g5-key');
        // One wrong key first, to see the hint, then Lina's.
        if (inp && !inp.disabled && !inp.value) { inp.value = once('cipher-wrong') ? 'LINA' : g.o.key.toLowerCase(); return 'mg:key'; }
        if ((x = b('#g5-try'))) { click(x); if (inp) setTimeout(() => { if (!inp.disabled) inp.value = ''; }, 50); return 'mg:try-key'; }
      }
      if (g && g.kind === 'shift' && g.q) {
        // One wrong answer first, to see the alarm roll the bar back.
        const k = once('shift-wrong') ? (g.q.a + 1) % g.q.opts.length : g.q.a;
        if ((x = b(`#g5-q [data-k="${k}"]`))) return click(x) && 'mg:shift';
      }
      return 'mg-wait';
    }
    // Questions: the typed ones get an answer that covers their points.
    if ((x = b('#q-said'))) return click(x) && 'said';
    if ((x = p.querySelector('#q-num')) && !x.value) {
      const t = p.textContent;
      x.value = /how many days of management events/.test(t) ? '90' : /minutes/.test(t) ? '2' : '1';
      x.dispatchEvent(new Event('input', { bubbles: true })); return 'num';
    }
    if ((x = p.querySelector('#q-text')) && !x.value) {
      x.value = 'Read the record first: the trail, the metric with its alarm, and the trace show what happened and where.';
      x.dispatchEvent(new Event('input', { bubbles: true })); return 'text';
    }
    if ((x = b('#q-confirm, #q-next, #pm-ok'))) return click(x) && 'next';
    if ((x = b('.ps-n'))) return click(x) && 'sort-guess';
    if ((x = [...p.querySelectorAll('.ps-tg')].find(g2 => !g2.querySelector('.on')))) return click(x.querySelector('button')) && 'sort-one';
    const conf = b('.conf-b button');
    if (!conf && (x = b('.opts .opt:not(.on):not(.struck)'))) return click(x) && 'opt';
    if (conf) return click(conf) && 'conf';
    if ((x = b('.primary'))) return click(x) && 'primary';
    if ((x = b('#skip, .ghost, #panel-x'))) return click(x) && 'ghost';
    return 'panel-wait';
  }
  // The raid engine.
  const root = $('#run');
  if (vis(root)) {
    const rd = root.querySelector('.rd'), T = (SD.test || {}).raid;
    if (!rd || !T) return 'raid-wait';
    if (!window.__paced) { window.__paced = 1; T.pace(0.05); }
    let x;
    if ((x = rd.querySelector('#rd-back'))) { if (once('rdend-' + W.set + rd.textContent.slice(0, 30))) return 'shot:raid-end-' + W.set; window.__paced = 0; return click(x) && 'raid:back'; }
    const G = T.G(), me = T.me(), ph = rd.dataset.ph;
    if (ph === 'fight') {
      const boss = rd.querySelector('.bossfight');
      if (boss && once('boss-' + G.boss)) return 'shot:boss-' + G.boss;
      if (!boss && once('fight-' + (G.foes && G.foes[0] && G.foes[0].boss))) return 'shot:foe-' + (G.foes && G.foes[0] && G.foes[0].boss);
      if (WIN) { if (T.hosting()) T.win(); return 'fight'; }
      const c = [...rd.querySelectorAll('.hand .card')].find(c => !c.classList.contains('dim'));
      if (c) return click(c) && 'play';
      if ((x = rd.querySelector('#rd-ready, [data-send*="ready"]'))) return click(x) && 'ready';
      return 'fight-wait';
    }
    if (ph === 'map') {
      if (once('map-' + W.set + G.fl)) return 'shot:raid-map-' + W.set + '-' + G.fl;
      if (G.votes[me]) return 'map-wait';
      const n = rd.querySelector('.node.can:not([disabled])');
      return n ? click(n) && 'node:' + n.className.split(' ')[1] : 'map-wait';
    }
    if ((x = rd.querySelector('#rd-ask'))) return click(x) && 'ask';
    const send = [...rd.querySelectorAll('[data-send]')].filter(b => !b.disabled && b.offsetParent !== null);
    for (const k of ['take', 'evote', 'wvote', 'one', 'rest', 'up', 'rm', 'done', 'skip']) {
      const y = send.find(b => JSON.parse(b.dataset.send).k === k);
      if (y) return click(y) && 'room:' + k;
    }
    return 'room-wait:' + ph;
  }
  // The world.
  if (!W || !W.active || !vis($('#screen-world')) || W.debug.busy()) return 'wait';
  const D = W.debug, sc = D.scene(), f = D.w().x, P = sc.P, pages = D.w().pages;
  const go = (id, x, y) => { D.place(x, y); if (once('view-' + id)) return 'shot:view-' + id; sc.onTalk(id); return 'story:' + id; };
  // Walk into a gate or door, or through one, with the arrow keys: the page asks the test to hold a key.
  const push = (id, x, y, key, thru) => { D.place(x, y); return `key:${key}:${id}:${thru ? 1 : 0}:${x}:${y}`; };
  const page = i => { const [x, y] = D.PAGES[i]; D.place(x, y); return 'page:' + i; };
  const z = (x0, y0, x1, y1) => P.x >= x0 && P.x <= x1 && P.y >= y0 && P.y <= y1;
  const inCamp = z(1, 4, 14, 20);
  const toCity = () => (inCamp ? push('down', 13, 12, 'ArrowRight') : null);
  const toCamp = () => (inCamp ? null : push('up', 19, 12, 'ArrowUp'));
  const thru = window.__thru = window.__thru || {};
  if (!f.up) return push('down', 13, 12, 'ArrowRight');
  if (!f.arrive) return 'arrive-wait';
  if (!f.ashgrove) return go('ashgrove', 29, 12);
  if (!f.iris) return go('iris', 26, 8);
  if (!pages.includes(7)) return page(7);
  if (!pages.includes(2)) return page(2);
  if (!f.offer) return go('station', 22, 18);
  if (!f.voice) return go('stepsT', 22, 19);
  if (!f.trail) return push('gcloset', 31, 25, 'ArrowDown');
  if (!thru.gcloset) return push('gcloset', 31, 25, 'ArrowDown', 1);
  if (!f.chain) { if (once('to-under')) { D.place(31, 30); return 'under'; } return 'chain-wait'; }
  if (!pages.includes(5)) return page(5);
  if (!pages.includes(6)) return page(6);
  if (!f.buy) return push('gwork', 47, 12, 'ArrowRight');
  if (!thru.gwork) return push('gwork', 47, 12, 'ArrowRight', 1);
  if (!pages.includes(1)) return page(1);
  if (!f.metric) return push('gforge', 56, 9, 'ArrowUp');
  if (!thru.gforge) return push('gforge', 56, 9, 'ArrowUp', 1);
  if (!pages.includes(3)) return page(3);
  if (!pages.includes(4)) return page(4);
  if (!f.xp1) return push('xp1', 59, 4, 'ArrowUp');
  if (!f.rescued) return inCamp ? 'rescued-wait' : toCamp();
  if (!pages.includes(0)) return page(0);
  if (!f.ship) return go('ship', 5, 10);
  if (!f.blueprint) return go('ayo', 4, 13);
  if (!f.helm) return go('kaito', 9, 16);
  if (!f.cut) return toCity() || go('ayoU', 37, 36);
  if (!f.button) return go('stepsT', 22, 19);
  if (!f.xp2) return push('xp2', 36, 37, 'ArrowDown');
  if (!f.cron) return inCamp ? 'cron-wait' : toCamp();
  if (!f.deal) return go('freya', 12, 12);
  if (!f.watch) return go('cron', 11, 18);
  if (!f.ledger) return go('pella', 6, 17);
  if (!f.board) return go('dboard', 11, 10);
  if (!f.turned) return go('fire', 7, 13);
  if (!f.xp3) return toCity() || push('xp3', 40, 7, 'ArrowUp');
  if (!f.rail) return go('ashT', 41, 8);
  return 'world-idle';
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch5`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 390), height: Number(process.env.H || 844) } });
  const errors = [];
  page.on('pageerror', e => { errors.push('pageerror: ' + e.message); console.log('pageerror', e.stack); });
  page.on('request', r => { if (/\.(webp|png|jpe?g|gif)(\?|$)/i.test(r.url()) && !/\/assets\/img\/(opening|portraits|vn)\//.test(r.url())) errors.push('raster image requested: ' + r.url().replace(/^.*?\/assets\//, 'assets/')); });
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text());
    if (m.type() === 'warning' && /qpick: no question|Machine Floors:/.test(m.text())) errors.push('console: ' + m.text());
  });
  // A shared machine can be slow: give the title's clicks two minutes, not thirty seconds.
  page.setDefaultTimeout(120000);
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  const btn = await page.textContent('#t-c5new');
  if (!/Play Chapter 5: The Machine Floors/.test(btn)) errors.push('title button reads "' + btn + '"');
  const foot = await page.textContent('.t-foot');
  if (!/Chapter 5 demo: The Machine Floors · Built on the AWS documentation · Saves automatically/.test(foot)) errors.push('title footer reads "' + foot + '"');
  await page.click('#t-c5new');
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const seen = new Set(), last = [];
  let steps = 0, ended = false, wide = 0;
  const T0 = Date.now();
  let same = 0, prev = '';
  for (; steps < 40000; steps++) {
    const what = await page.evaluate(step, [WIN, LEAD, CHOICE]);
    last.push(what); if (last.length > 20) last.shift();
    same = what === prev ? same + 1 : 0; prev = what;
    if (same >= 400) { errors.push('stuck on ' + what); break; }
    if (process.env.LOG && steps % 250 === 0) console.log(steps, Math.round((Date.now() - T0) / 1000) + 's', what);
    seen.add(what.replace(/:.*/, ''));
    if (/^(story|node|raid|mg|choice|lobby|page|end):/.test(what)) seen.add(what);
    if (steps % 50 === 0) {
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (sw > 1) wide = Math.max(wide, sw);
    }
    if (what.startsWith('shot:')) { if (SHOTS) { await page.waitForTimeout(900); await shot(what.slice(5)); } continue; }
    if (what.startsWith('key:')) {
      const [, key, id, thru, x, y] = what.split(':');
      // Through a gate: hold the key until you're two tiles past where you started (up to 3 s, for a slow machine).
      const where = () => page.evaluate(() => { const s = SD.c5world.debug.scene(); return s ? [s.P.x, s.P.y] : null; });
      const past = P => P && ({ ArrowUp: P[1] < +y - 1, ArrowDown: P[1] > +y + 1, ArrowRight: P[0] > +x + 1, ArrowLeft: P[0] < +x - 1 })[key];
      await page.keyboard.down(key);
      if (thru === '1') { for (let t = 0; t < 30 && !past(await where()); t++) await page.waitForTimeout(100); } else await page.waitForTimeout(350);
      await page.keyboard.up(key);
      await page.waitForTimeout(250);
      if (thru === '1') {
        const P = await where();
        const ok = past(P);
        if (!ok) { errors.push(`walking ${key} through ${id} from ${x},${y} didn't get you through it (at ${P})`); break; }
        await page.evaluate(id => { window.__thru[id] = 1; }, id);
        seen.add('thru:' + id);
        if (id === 'gwork') { await page.waitForTimeout(600); await shot('area-workshops'); }
        if (id === 'gcloset') { await page.waitForTimeout(600); await shot('area-undercroft'); }
      } else seen.add('door:' + id);
      if (id === 'down') { await page.waitForTimeout(600); await shot('area-city'); }
      if (id === 'up') { await page.waitForTimeout(600); await shot('area-camp'); }
      continue;
    }
    if (what === 'end') { ended = true; break; }
    await page.waitForTimeout(/^room-wait|^map-wait|^raid-wait/.test(what) ? 40 : /wait/.test(what) ? 120 : 25);
  }
  if (!ended) await page.screenshot({ path: path.join(SHOTS || '/tmp', 'c5-check-stuck.png') });
  const sv = await page.evaluate(() => ({ tapes: !!window.__tapes, lead: SD.state.save.c1 && SD.state.save.c1.lead, level: SD.state.save.level, c5: SD.state.save.c5, start: typeof (SD.chapterStart || {})[5], next: !!(SD.chapterStart && SD.chapterStart[6]), nextBtn: !!document.querySelector('#c5-next') }));
  await browser.close(); server.close();
  console.log('steps', steps, 'lead', sv.lead, 'level', sv.level, Math.round((Date.now() - T0) / 1000) + 's');
  console.log('c5', JSON.stringify(sv.c5 && { f: sv.c5.f, choice: sv.c5.choice, pages: sv.c5.w.pages, cards: sv.c5.w.cards, x: Object.keys(sv.c5.w.x).join(' ') }));
  console.log('saw', [...seen].sort().join(' '));
  if (!ended) errors.push('the chapter never reached its end card; last actions: ' + last.join(' '));
  if (!sv.tapes) errors.push('the first night never showed the tapes going from 2 to 1');
  if (wide) errors.push('the page scrolls sideways by ' + wide + 'px');
  if (sv.next !== sv.nextBtn) errors.push('the end card ' + (sv.next ? 'has no' : 'has a') + ' Continue to Chapter 6 button, but SD.chapterStart[6] is ' + (sv.next ? '' : 'not ') + 'registered');
  const x = (sv.c5 && sv.c5.w.x) || {};
  const need = ['cold', 'tapes', 'up', 'arrive', 'ashgrove', 'iris', 'offer', 'voice', 'trail', 'chain', 'buy', 'metric', 'xp1', 'rescued', 'ship', 'blueprint', 'helm', 'cut', 'button',
    'ledgers', 'chart', 'xp2', 'cron', 'deal', 'watch', 'ledger', 'board', 'turned', 'backoff', 'theo', 'confront', 'shift', 'xp3', 'rail', 'freed'].filter(k => !x[k]);
  if (need.length) errors.push('flags never set: ' + need.join(', '));
  if (!sv.c5 || sv.c5.w.pages.length !== 8) errors.push('not every page of Lina\'s diary was found: ' + JSON.stringify(sv.c5 && sv.c5.w.pages));
  if (!sv.c5 || !sv.c5.f.done) errors.push('chapter 5 never marked done');
  if (!sv.c5 || sv.c5.choice !== CHOICE) errors.push('the rail choice was not saved');
  if (sv.start !== 'function') errors.push('SD.chapterStart[5] is not registered');
  ['x5-blueprint', 'x5-helm', 'x5-watch', 'x5-ledger', 'x5-savings', 'x5-pipeline', 'x5-canary'].forEach(id => { if (!sv.c5 || !sv.c5.w.cards.includes(id)) errors.push('card never earned: ' + id); });
  if (errors.length) { console.log('FAIL\n' + [...new Set(errors)].join('\n')); process.exit(1); }
  console.log('OK');
})();
