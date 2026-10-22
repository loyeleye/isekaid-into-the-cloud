// Headless playthrough of chapter 2, part 2 (index.html?vector&ch2b): from the title button, pick a lead, walk
// floor 7, the camp, floor 13 and Thornwick with every minigame, dead letter and delivery, walk through the lift and
// the expedition doors with real key presses, play the three expeditions on the raid engine (every fight won through
// SD.test.raid.win, every node and room clicked), make the choice, and reach the end card. Fails on page or console
// errors, raster images (other than the cutscene stills), and any story flag never set.
// Run from game/:  NODE_PATH=$(npm root -g) node tools/c2x_check.js [mira|kai|seoyeon|dutch] --win
//   CHOICE=give|keep picks the last letter (default: give for Mira and Seo-yeon, keep otherwise). SHOTS=dir saves
//   screenshots of the main moments; W and H set the viewport (default 390 x 844).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEAD = ['mira', 'kai', 'seoyeon', 'dutch'].find(l => process.argv.includes(l)) || 'mira';
const WIN = process.argv.includes('--win');
const CHOICE = process.env.CHOICE || (LEAD === 'mira' || LEAD === 'seoyeon' ? 'give' : 'keep');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// One step in the page. Returns what it did; 'key:<dir>' asks the runner to hold an arrow key.
function step([WIN, LEAD, CHOICE]) {
  const vis = el => el && !el.hidden && el.offsetParent !== null;
  const $ = s => document.querySelector(s);
  const click = el => { el.click(); return true; };
  if (vis($('#c2x-end'))) return 'end';
  const vn = $('#vn');
  if (vn && !vn.hidden) {
    const btn = [...vn.querySelectorAll('.vn-act button')].find(x => !x.disabled);
    if (btn) return click(btn) && 'vn-act';
    const box = vn.querySelector('.vn-box');
    if (!box || box.hidden || !vn.classList.contains('vn-ready')) return 'vn-wait';
    window.__vnSeen = window.__vnSeen || {};
    const k = vn.dataset.bg;
    if (k && !window.__vnSeen[k]) { window.__vnSeen[k] = 1; return 'scene:vn-' + k; }
    box.click(); return 'vn-line';
  }
  if (!$('#dialog').hidden) { $('#dialog').click(); return 'dialog:' + ($('#dialog').dataset.who || ''); }
  const p = $('#panel');
  if (!p.hidden) {
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    const once = k => { window.__once = window.__once || {}; if (window.__once[k]) return false; window.__once[k] = 1; return true; };
    let x;
    if ((x = p.querySelector(`[data-lead="${LEAD}"]`))) { if (once('lead')) return 'lead-wait'; return click(x) && 'lead'; }
    // The minigames, played right.
    const pick = (k, v) => { const c = p.querySelector(`[data-k="${k}"][data-v="${v}"]`); if (c && !c.classList.contains('on')) { c.click(); return true; } return false; };
    if (b('#xb-run')) { if (pick('mem', '1769') || pick('to', '10')) return 'mg:bench-chip'; if (once('bench')) return 'scene:mg-bench'; return click(b('#xb-run')) && 'mg:bench'; }
    if (b('#xl-run')) { for (const k of ['f', 'w', 's', 'l']) if (pick(k, '0')) return 'mg:logs-chip'; if (once('logs')) return 'scene:mg-logs'; return click(b('#xl-run')) && 'mg:logs'; }
    if (b('#xd-go')) {
      const want = { topic: 1, qeach: 1, dlq: 1, alarm: 1, idem: 1, shared: 0, direct: 0 };
      const t = [...p.querySelectorAll('[data-d]')].find(el => !!want[el.dataset.d] !== el.classList.contains('on'));
      if (t) return click(t) && 'mg:design-toggle';
      if (once('design')) return 'scene:mg-design';
      return click(b('#xd-go')) && 'mg:design';
    }
    if (b('#xa-go')) { if (pick('from', '16') || pick('to', '23') || pick('rule', 'new')) return 'mg:archive-chip'; if (once('archive')) return 'scene:mg-archive'; return click(b('#xa-go')) && 'mg:archive'; }
    if (b('#xf-go')) {
      const seq = (p.querySelector('#xf-seq').textContent.match(/#\d+/g) || []).length, want = [1, 4, 3];
      if (seq < 3) return click(p.querySelector(`[data-l="${want[seq]}"]`)) && 'mg:ledger-pick';
      if (once('ledger')) return 'scene:mg-ledger';
      return click(b('#xf-go')) && 'mg:ledger';
    }
    if ((x = b('#xc-' + CHOICE))) { if (once('choice')) return 'scene:choice'; return click(x) && 'choice:' + CHOICE; }
    if ((x = b('#xe-solo'))) { if (once('xe' + p.textContent.length)) return 'scene:expedition'; return click(x) && 'expedition'; }
    if (b('#xl-stay')) {
      const want = SD.c2xworld.debug.want();
      if ((x = b('#xl-' + want))) return click(x) && 'lift:' + want;
      return 'lift-stuck:' + want;
    }
    if ((x = p.querySelector('#q-num')) && !x.value) { x.value = /minutes before the fight/.test(p.textContent) ? '20' : /visibility timeout/i.test(p.textContent) ? '180' : '3'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'num'; }
    if ((x = p.querySelector('#q-text')) && !x.value) { x.value = 'A dead-letter queue keeps what failed so someone can read it, fix the cause, and redrive it back to the source queue.'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'text'; }
    if ((x = b('#q-said'))) return click(x) && 'said';
    if ((x = b('#q-confirm, #q-next, #x2-ok'))) return click(x) && 'next';
    if ((x = b('.ps-n'))) return click(x) && 'sort-n';
    if ((x = [...p.querySelectorAll('.ps-tg')].find(g => !g.querySelector('.on')))) return click(x.querySelector('button')) && 'sort-tag';
    const conf = b('.conf-b button');
    if (!conf && (x = b('.opts .opt:not(.on):not(.struck)'))) return click(x) && 'opt';
    if (conf) return click(conf) && 'conf';
    if ((x = b('.primary'))) return click(x) && 'primary';
    if ((x = b('.opts .opt'))) return click(x) && 'opt2';
    if ((x = b('.ghost, #panel-x'))) return click(x) && 'ghost';
    return 'panel-wait';
  }
  // The raid (js/raid.js).
  const run = $('#run');
  if (vis(run) && !(SD.c2xworld && SD.c2xworld.active)) {
    const T = (SD.test || {}).raid, rd = run.querySelector('.rd');
    if (!rd || !T) return 'raid-wait';
    if (window.__pacedT !== T) { window.__pacedT = T; T.pace(0.05); }
    let x;
    if ((x = rd.querySelector('#rd-back'))) return click(x) && 'raid:back';
    const G = T.G(), me = T.me(), ph = rd.dataset.ph;
    if (ph === 'fight') {
      window.__boss = window.__boss || {};
      if (rd.querySelector('.combat.bossfight') && G && !window.__boss[G.fl + ':' + G.k]) { window.__boss[G.fl + ':' + G.k] = 1; return 'boss:floor' + (G.fl + 1); }
      if (WIN && T.hosting()) { T.win(); return 'raid:win'; }
      const c = [...rd.querySelectorAll('.hand .card')].find(c => !c.classList.contains('dim'));
      if (c) return click(c) && 'raid:card';
      if ((x = rd.querySelector('#end-turn, [data-send*="end"]'))) return click(x) && 'raid:end-turn';
      return 'fight-wait';
    }
    if (ph === 'map') {
      if (G.votes[me]) return 'map-wait';
      const n = rd.querySelector('.node.can:not([disabled])');
      return n ? click(n) && 'node:' + n.className.split(' ')[1] : 'map-wait';
    }
    if ((x = rd.querySelector('#rd-ask'))) return click(x) && 'raid:ask';
    const send = [...rd.querySelectorAll('[data-send]')].filter(b => !b.disabled && b.offsetParent !== null);
    for (const k of ['take', 'evote', 'wvote', 'one', 'rest', 'up', 'rm', 'done', 'skip']) {
      const y = send.find(b => JSON.parse(b.dataset.send).k === k);
      if (y) return click(y) && 'room:' + k;
    }
    return 'room-wait:' + ph + (window.__trace ? ' | ' + rd.textContent.replace(/\s+/g, ' ').slice(0, 240) : '');
  }
  // The world.
  const W = SD.c2xworld;
  if (!W || !W.active || !vis($('#screen-world'))) return 'wait';
  const D = W.debug;
  if (D.busy()) return 'world-busy';
  const sc = D.scene(), sv = D.sv(), here = D.room(), P = sc.P;
  if (P.moving || P.path.length) return 'walking';
  window.__views = window.__views || {};
  if (!window.__views[here]) { window.__views[here] = 1; return 'view:' + here; }
  // Dead letters on this floor first: step onto each.
  const li = D.LETTERS.findIndex(([x], i) => D.shown(i) && D.roomAt(x) === here);
  if (li >= 0) { const [x, y] = D.LETTERS[li]; D.place(x, y); return 'letter:' + li; }
  const [, tg, id] = D.step();
  if (!tg) return 'world-done';
  const lift = D.LIFT[here];
  // Doors and the lift: stand next to them and walk in with the arrow keys.
  if (tg[0] === lift[0] && tg[1] === lift[1]) { const a = D.ARRIVE[here]; D.place(a[0], a[1]); return 'key:ArrowUp:lift'; }
  if (!id && tg[0] === 57 && tg[1] === 14) { D.place(56, 14); return 'key:ArrowRight:office-door'; }
  if (!id && tg[0] === 89 && tg[1] === 13) { D.place(88, 13); return 'key:ArrowRight:stair-door'; }
  if (id) {
    const a = sc.actors[id];
    if (a && !a.thing) D.place(a.x, a.y + 1); else D.place(tg[0], tg[1]);
    sc.onTalk(id);
    return 'talk:' + id;
  }
  return 'stuck:' + JSON.stringify(D.step());
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch2b`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 390), height: Number(process.env.H || 844) } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('request', r => { if (/\.(webp|png|jpe?g|gif)(\?|$)/i.test(r.url()) && !/\/assets\/img\/(opening|portraits|vn|cut)\//.test(r.url())) errors.push('raster image requested: ' + r.url().replace(/^.*?\/assets\//, 'assets/')); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  if (process.env.TRACE) await page.evaluate(() => { window.__trace = 1; });
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  const label = await page.textContent('#t-c2xnew');
  if (!/Play Chapter 2, part 2: The Dead Letter Office/.test(label)) errors.push('the title button reads "' + label + '"');
  const foot = await page.textContent('.t-foot').catch(() => '');
  if (!/part 2/.test(foot || '')) errors.push('the title\'s footer line wasn\'t set: ' + foot);
  await page.click('#t-c2xnew');
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const seen = new Set(), last = [], shots = new Set();
  let steps = 0;
  const MAX = 9000;
  for (; steps < MAX; steps++) {
    const what = await page.evaluate(step, [WIN, LEAD, CHOICE]);
    last.push(what); if (last.length > 20) last.shift();
    if (process.env.TRACE && what !== last[last.length - 2]) console.log(steps, what);
    seen.add(what.replace(/^(dialog|scene|node|letter|raid|room|boss|mg|lift|talk|key|view):.*/, '$1'));
    if (/^(talk|lift|key|boss|choice|expedition|letter):/.test(what)) seen.add(what);
    if (what.startsWith('key:')) {
      const [, key] = what.split(':');
      await page.keyboard.down(key); await page.waitForTimeout(450); await page.keyboard.up(key);
      await page.waitForTimeout(250);
      continue;
    }
    if (/^(lift-stuck|stuck)/.test(what)) { errors.push('stuck: ' + what); break; }
    const k = /^(scene|view|boss):/.test(what) ? what.replace(/:/g, '-') : null;
    if (k && !shots.has(k)) { shots.add(k); await page.waitForTimeout(SHOTS ? 1400 : 60); await shot(k); }
    if (what === 'end') { await page.waitForTimeout(600); await shot('c2x-end-card'); break; }
    if (what === 'world-done') { errors.push('the world ran out of steps before the end card'); break; }
    await page.waitForTimeout(/wait|busy|walking/.test(what) ? 100 : 25);
  }
  const sv = await page.evaluate(() => ({ lead: SD.state.save.c1 && SD.state.save.c1.lead, level: SD.state.save.level, c2x: SD.state.save.c2x, deck: SD.state.save.c1 && SD.state.save.c1.deck.map(d => d.id) }));
  // Wider than the phone: the end card and the world must not scroll sideways.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (overflow) errors.push('the page scrolls sideways at this width');
  await browser.close(); server.close();
  console.log('steps', steps, 'lead', sv.lead, 'level', sv.level, 'choice', sv.c2x && sv.c2x.choice);
  console.log('saw', [...seen].sort().join(' '));
  if (steps >= MAX) errors.push('the chapter never finished; last actions: ' + last.join(' '));
  const f = (sv.c2x && sv.c2x.f) || {};
  const need = ['start', 'bench', 'f7', 'dlo', 'pip2', 'uptima', 'bru', 'tillyPair', 'design', 'f13', 'seen13', 'ev1', 'ev2', 'ev3', 'tower', 'felt', 'pip3', 'f1', 'choice', 'prayer', 'freed', 'reckon', 'grey', 'done'].filter(k => !f[k]);
  if (need.length) errors.push('flags never set: ' + need.join(', '));
  if (!sv.c2x || sv.c2x.letters.length !== 6) errors.push('not all six dead letters were found: ' + JSON.stringify(sv.c2x && sv.c2x.letters));
  if (!sv.c2x || (sv.c2x.given || []).length !== 5) errors.push('not all five letters were delivered: ' + JSON.stringify(sv.c2x && sv.c2x.given));
  if (!sv.c2x || !sv.c2x.compass) errors.push('Bru\'s Compass was never given');
  if (LEAD === 'mira' && !(sv.deck || []).includes('rts')) errors.push('Mira never got Return to Sender');
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK: played chapter 2, part 2 as ${LEAD} (${sv.c2x.choice}) from the title button to the end card: three expeditions, every minigame, no raster images, no errors.`);
})().catch(e => { console.error(e); process.exit(1); });
