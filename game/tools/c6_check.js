// Headless playthrough of the chapter 6 demo (index.html?vector&ch6): the title button, a lead pick, the cold open,
// Twinwater, every gate (walked into and through with the arrow keys), every minigame, all eight Lost Reflections, the
// three expeditions in the raid engine (every node clicked; with --win each fight is won through the test hook), the
// Clock Room and the confrontation, the choice and the end card. Fails on page or console errors, raster images, a
// gate or door you can't walk through, someone you can't walk up to, or a story flag never set.
// Run from game/:  NODE_PATH=$(npm root -g) node tools/c6_check.js [mira|kai|seoyeon|dutch] [--win]
//   SHOTS=dir saves screenshots; W and H set the viewport (default 390x844); CHOICE=vault|least|run (default least).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEAD = ['mira', 'kai', 'seoyeon', 'dutch'].find(l => process.argv.includes(l)) || 'mira';
const WIN = process.argv.includes('--win');
const SHOTS = process.env.SHOTS, CHOICE = process.env.CHOICE || 'least';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// Everyone and everything you can talk to must have a tile beside it you can walk to (with every gate open).
function reach() {
  const W = SD.c6world, D = W.debug, sc = D.scene();
  const m = D.BASE.map(r => r.split(''));
  Object.values(D.GATES).forEach(([x, y]) => { m[y][x] = ','; });
  const solid = 'TG#XwV', H = m.length, Wd = m[0].length, seen = new Set(), q = [[40, 36]];
  const ok = (x, y) => y >= 0 && y < H && x >= 0 && x < Wd && !solid.includes(m[y][x]);
  const tele = { '18,38': [15, 27], '16,27': [19, 38] };
  while (q.length) {
    const [x, y] = q.pop(), k = x + ',' + y; if (seen.has(k)) continue; seen.add(k);
    if (tele[k]) q.push(tele[k]);
    if (/[LM123]/.test(m[y][x])) continue;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (ok(x + dx, y + dy)) q.push([x + dx, y + dy]); });
  }
  const bad = [];
  Object.values(sc.actors).forEach(a => {
    if (a.id === 'ctl' || a.id === 'you' || SD.ch1story.order.includes(a.id)) return;
    if (/^page/.test(a.id)) { if (!seen.has(a.x + ',' + a.y)) bad.push(a.id); return; }
    if (![[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => seen.has((a.x + dx) + ',' + (a.y + dy)))) bad.push(a.id + '@' + a.x + ',' + a.y);
  });
  return bad;
}

// One step: answer whatever is open, else play the raid, else walk the world to the next thing.
function step([WIN, LEAD, CHOICE]) {
  const $ = s => document.querySelector(s), vis = el => el && !el.hidden && el.offsetParent !== null, click = el => { el.click(); return true; };
  const once = k => { window.__once = window.__once || {}; if (window.__once[k]) return false; return (window.__once[k] = 1); };
  const W = SD.c6world;
  // The visual-novel scenes.
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
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    let x;
    if ((x = p.querySelector(`[data-lead="${LEAD}"]`))) { if (once('lead')) return 'shot:lead-select'; return click(x) && 'lead'; }
    if (p.querySelector('#c6-end')) { if (once('end-shot')) return 'shot:c6-end-card'; return 'end'; }
    if ((x = b(`[data-ch="${CHOICE}"]`))) { if (once('choice')) return 'shot:c6-choice'; return click(x) && 'choice'; }
    if ((x = b('#c6-go'))) return click(x) && 'go-in';
    // This chapter's minigames, played right (the answers are the games' own data).
    const g = SD.c6games && SD.c6games.cur, gp = p.querySelector('.g6');
    if (gp) {
      const title = g ? g.o.title : 'done';
      if (once('mg-' + title)) return 'shot:mg-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      if ((x = b('#g6-cont'))) return click(x) && 'mg:continue';
      const pr = gp.querySelector('.g6-predict');
      if (g && pr && (x = [...pr.querySelectorAll('[data-p]')].find(el => !el.disabled && g.o.predict.opts[+el.dataset.p].ok))) return click(x) && 'mg:predict';
      if (g && pr && [...pr.querySelectorAll('[data-p]')].some(el => !el.disabled)) return 'mg-wait';
      if (g && g.kind === 'door') {
        if (!gp.querySelector('[data-f]')) return 'mg-wait';
        // The first try goes in with one chip wrong, to play the "why it fails" path too.
        const f0 = g.o.fields[1], wrongV = f0.opts.find(([v]) => v !== g.o.answer[f0.k])[0];
        if (once('door-wrong-' + title)) { const c = gp.querySelector(`[data-f="${f0.k}"][data-v="${wrongV}"]`); window.__doorWrong = 1; return click(c) && 'mg:chip-wrong'; }
        for (const f of g.o.fields) {
          if (window.__doorWrong && f === f0 && gp.querySelector('.g6-note.bad')) { window.__doorWrong = 0; }
          if (window.__doorWrong && f === f0) continue;
          const c = gp.querySelector(`[data-f="${f.k}"][data-v="${g.o.answer[f.k]}"]`); if (c && !c.classList.contains('on') && !c.disabled) return click(c) && 'mg:chip';
        }
        if ((x = b('#g6-try'))) return click(x) && 'mg:try';
      }
      if (g && g.kind === 'sort') {
        // The first check goes in with one row wrong, to play the "fix the red ones" path too.
        const rows = [...gp.querySelectorAll('.g6-row')].filter(r => !r.classList.contains('done'));
        for (const r of rows) {
          const i = +r.dataset.r, it = g.o.items[i];
          const wrong = once('wrong-' + title) ? (it.bin + 1) % g.o.bins.length : it.bin;
          if (!r.querySelector('button.on')) return click(r.querySelector(`[data-v="${wrong}"]`)) && 'mg:sort';
        }
        if ((x = b('#g6-go'))) return click(x) && 'mg:check';
      }
      if (g && g.kind === 'order') {
        // One step out of order first, then the right order.
        const left = [...gp.querySelectorAll('[data-s]')].map(el => +el.dataset.s);
        if (left.length > 1 && once('order-wrong-' + title)) return click(gp.querySelector(`[data-s="${Math.max(...left)}"]`)) && 'mg:step-wrong';
        if (left.length) return click(gp.querySelector(`[data-s="${Math.min(...left)}"]`)) && 'mg:step';
      }
      if (g && g.kind === 'pick') {
        // One line that should stay goes in on the first check, then only the ones that shouldn't be there.
        const st = window.__pk = window.__pk || {};
        const lines = [...gp.querySelectorAll('[data-l]')], isBad = el => !!g.o.lines[+el.dataset.l].bad;
        const marked = lines.filter(el => el.classList.contains('on') || el.classList.contains('gone')).length;
        if (marked < g.o.need) {
          const good = lines.find(el => !isBad(el) && !el.classList.contains('on'));
          if (!st[title] && good && !lines.some(el => el.classList.contains('on') && !isBad(el))) return click(good) && 'mg:pick-wrong';
          const bad = lines.find(el => isBad(el) && !el.classList.contains('on') && !el.classList.contains('gone'));
          if (bad) return click(bad) && 'mg:pick';
        }
        if ((x = b('#g6-go'))) { st[title] = 1; return click(x) && 'mg:check'; }
      }
      return 'mg-wait';
    }
    // Questions: the typed ones get the right number, or an answer that covers their points.
    if ((x = b('#q-said'))) return click(x) && 'said';
    if ((x = p.querySelector('#q-num')) && !x.value) {
      const t = p.textContent;
      x.value = /RPO this gives/.test(t) ? '190' : /RTO this gives/.test(t) ? '60' : /Replication Time Control/.test(t) ? '15' : /dollars a day/.test(t) ? '90' : /longest one KMS allows/.test(t) ? '30' : /in days/.test(t) ? '7' : '1';
      x.dispatchEvent(new Event('input', { bubbles: true })); return 'num';
    }
    if ((x = p.querySelector('#q-text')) && !x.value) {
      const t = p.textContent;
      x.value = /four prayers/.test(t) ? 'CloudTrail data events on Bru\'s prayer logs, the S3 object reads the Mailroom turned on, show the Champion\'s role, Kagemaru, read them an hour after Freya.'
        : 'The trust policy says who can assume the role, and the permissions policy says what it can do.';
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
    if ((x = rd.querySelector('#rd-back'))) { if (once('rdend-' + W.set + rd.textContent.slice(0, 30))) return 'shot:raid-end'; window.__paced = 0; return click(x) && 'raid:back'; }
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
  if (once('reach')) return 'reach';
  const go = (id, x, y) => { D.place(x, y); if (once('view-' + id)) return 'shot:view-' + id; sc.onTalk(id); return 'story:' + id; };
  // Walk into a gate or door, or through one, with the arrow keys: the page asks the test to hold a key.
  const push = (id, x, y, key, thru) => { D.place(x, y); return `key:${key}:${id}:${thru ? 1 : 0}:${x}:${y}`; };
  const page = i => { const [x, y] = D.PAGES[i]; D.place(x, y); return 'page:' + i; };
  const inCamp = P.x <= 16 && P.y >= 20 && P.y <= 36;
  const up = () => push('up', 15, 27, 'ArrowRight');
  const thru = window.__thru = window.__thru || {};
  if (!f.offer) { if (once('jetty')) return push('jetty', 40, 30, 'ArrowUp', 1); D.place(40, 26); return 'jetty-wait'; }
  if (!f.stall) return go('kage', 42, 16);
  if (!f.mio) return go('mio', 43, 18);
  if (!f.mirror1) return go('mirror', 38, 15);
  if (!pages.includes(2)) return page(2);
  if (!f.notice) return go('notice', 37, 34);
  if (!f.echo) return go('twin1', 26, 37);
  if (!pages.includes(0)) return page(0);
  if (!f.route) return push('groute', 54, 40, 'ArrowRight');
  if (!thru.groute) return push('groute', 54, 40, 'ArrowRight', 1);
  if (!pages.includes(1)) return page(1);
  if (!f.xp1) return push('xp1', 58, 39, 'ArrowUp');
  if (!f.camp) return inCamp ? 'camp-wait' : push('down', 19, 38, 'ArrowLeft');
  if (!pages.includes(3)) return page(3);
  if (!f.ship) return go('ship', 7, 24);
  if (!f.diary) return go('aigerim', 9, 25);
  if (!f.heartbeat) return go('mioC', 5, 34);
  if (!f.ashgrove) return go('ashgrove', 10, 31);
  if (!f.receipt) return inCamp ? up() : go('chad', 35, 38);
  if (!f.lake) return push('glake', 60, 30, 'ArrowUp');
  if (!thru.glake) return push('glake', 60, 30, 'ArrowUp', 1);
  if (!pages.includes(5)) return page(5);
  if (!pages.includes(7)) return page(7);
  if (!f.echofar && once('echofar')) return go('ftwin2', 47, 7);
  if (!f.xp2) return push('xp2', 55, 3, 'ArrowUp');
  if (!f.reveal) return go('bunker', 3, 23);
  if (!f.freya) return go('freya', 11, 32);
  if (!f.board) return go('dboard', 14, 25);
  if (!f.revbeats) return go('mioC', 5, 34);
  if (!f.lock) return push('glock', 34, 7, 'ArrowLeft');
  if (!thru.glock) return push('glock', 34, 7, 'ArrowLeft', 1);
  if (!pages.includes(4)) return page(4);
  if (!pages.includes(6)) return page(6);
  if (!f.xp3) return push('xp3', 23, 3, 'ArrowUp');
  if (!f.choice) return go('kageJ', 41, 19);
  return 'world-idle';
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch6`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 390), height: Number(process.env.H || 844) } });
  page.setDefaultTimeout(180000);
  const errors = [];
  page.on('pageerror', e => { errors.push('pageerror: ' + e.message); console.log('pageerror', e.stack); });
  page.on('request', r => { if (/\.(webp|png|jpe?g|gif)(\?|$)/i.test(r.url()) && !/\/assets\/img\/(opening|portraits|vn)\//.test(r.url())) errors.push('raster image requested: ' + r.url().replace(/^.*?\/assets\//, 'assets/')); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); if (m.type() === 'warning' && /qpick: no question/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  const btn = await page.textContent('#t-c6new');
  if (!/Play Chapter 6: The Mirror Floors/.test(btn)) errors.push('title button reads "' + btn + '"');
  const foot = await page.textContent('.t-foot');
  if (!/Chapter 6 demo: The Mirror Floors/.test(foot)) errors.push('title footer reads "' + foot + '"');
  await page.click('#t-c6new');
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const seen = new Set(), last = [];
  let steps = 0, ended = false;
  const T0 = Date.now();
  let same = 0, prev = '';
  for (; steps < 40000; steps++) {
    const what = await page.evaluate(step, [WIN, LEAD, CHOICE]);
    last.push(what); if (last.length > 20) last.shift();
    same = what === prev ? same + 1 : 0; prev = what;
    if (same >= 400) { errors.push('stuck on ' + what); break; }
    if (process.env.LOG && steps % 250 === 0) console.log(steps, Math.round((Date.now() - T0) / 1000) + 's', what);
    seen.add(what.replace(/:.*/, ''));
    if (/^(story|node|raid|mg|choice|end):/.test(what)) seen.add(what);
    if (what === 'reach') { const bad = await page.evaluate(reach); if (bad.length) errors.push('nobody can walk up to: ' + bad.join(', ')); await shot('area-near'); continue; }
    if (what.startsWith('shot:')) { if (SHOTS) { await page.waitForTimeout(900); await shot(what.slice(5)); } continue; }
    if (what.startsWith('key:')) {
      const [, key, id, thru, x, y] = what.split(':');
      const where = () => page.evaluate(() => { const s = SD.c6world.debug.scene(); return s ? [s.P.x, s.P.y] : null; });
      const past = P => P && ({ ArrowUp: P[1] < +y - 1, ArrowDown: P[1] > +y + 1, ArrowRight: P[0] > +x + 1, ArrowLeft: P[0] < +x - 1 })[key];
      // Hold the key (longer on a slow machine) until you're through, or a few seconds have gone by.
      await page.keyboard.down(key); await page.waitForTimeout(thru === '1' ? 700 : 350);
      for (let i = 0; thru === '1' && i < 16 && !past(await where()); i++) await page.waitForTimeout(250);
      await page.keyboard.up(key);
      await page.waitForTimeout(250);
      if (thru === '1') {
        const P = await where();
        const ok = past(P);
        if (!ok) { errors.push(`walking ${key} through ${id} from ${x},${y} didn't get you through it (at ${P})`); break; }
        await page.evaluate(id => { window.__thru[id] = 1; }, id);
        seen.add('thru:' + id);
        if (id === 'jetty') { await page.waitForTimeout(600); await shot('area-jetty'); }
        if (id === 'groute') { await page.waitForTimeout(600); await shot('area-signpost'); }
        if (id === 'glake') { await page.waitForTimeout(600); await shot('area-causeway'); }
        if (id === 'glock') { await page.waitForTimeout(600); await shot('area-lockroom'); }
      } else seen.add('door:' + id);
      if (id === 'down') { await page.waitForTimeout(600); await shot('area-camp'); }
      continue;
    }
    if (what === 'end') { ended = true; break; }
    await page.waitForTimeout(/^room-wait|^map-wait|^raid-wait/.test(what) ? 40 : /wait/.test(what) ? 120 : 25);
  }
  if (!ended) await page.screenshot({ path: path.join(SHOTS || '/tmp', 'c6-check-stuck.png') });
  const sv = await page.evaluate(() => ({ lead: SD.state.save.c1 && SD.state.save.c1.lead, level: SD.state.save.level, c6: SD.state.save.c6, next: !!(SD.chapterStart && SD.chapterStart[7]),
    start: typeof (SD.chapterStart || {})[6], card: (document.querySelector('#c6-end') || {}).textContent || '', cont: !!document.querySelector('#c6-next') }));
  await browser.close(); server.close();
  console.log('steps', steps, 'lead', sv.lead, 'level', sv.level, Math.round((Date.now() - T0) / 1000) + 's');
  console.log('c6', JSON.stringify(sv.c6 && { f: sv.c6.f, choice: sv.c6.choice, pages: sv.c6.w.pages, cards: sv.c6.w.cards, x: Object.keys(sv.c6.w.x).join(' ') }));
  console.log('saw', [...seen].sort().join(' '));
  if (!ended) errors.push('the chapter never reached its end card; last actions: ' + last.join(' '));
  const x = (sv.c6 && sv.c6.w.x) || {};
  const need = ['cold', 'arrive', 'offer', 'stall', 'mio', 'mirror1', 'notice', 'echo', 'route', 'xp1', 'camp', 'ship', 'diary', 'heartbeat', 'ashgrove', 'receipt', 'lake', 'far', 'keeper', 'xp2',
    'reveal', 'freya', 'board', 'revbeats', 'lock', 'clock', 'saved', 'confront', 'after', 'xp3', 'choice', 'freed'].filter(k => !x[k]);
  if (need.length) errors.push('flags never set: ' + need.join(', '));
  if (!sv.c6 || sv.c6.w.pages.length !== 8) errors.push('not every Lost Reflection was found: ' + JSON.stringify(sv.c6 && sv.c6.w.pages));
  if (!sv.c6 || !sv.c6.f.done) errors.push('chapter 6 never marked done');
  if (!sv.c6 || sv.c6.choice !== CHOICE) errors.push('the choice was not saved as ' + CHOICE);
  if (sv.start !== 'function') errors.push('SD.chapterStart[6] is not registered');
  if (!/To be continued: Chapter 7: Root/.test(sv.card)) errors.push('the end card does not say "To be continued: Chapter 7: Root"');
  if (sv.cont !== sv.next) errors.push('the end card\'s Continue to Chapter 7 button ' + (sv.cont ? 'shows without' : 'is missing with') + ' SD.chapterStart[7]');
  ['r6-markdown', 'r6-failover', 'r6-stackset', 'r6-comply', 'r6-diary', 'r6-calc', 'r6-heartbeat', 'r6-gwend', 'r6-receipt', 'r6-crr', 'r6-copy', 'r6-vaultlock', 'r6-stone']
    .forEach(id => { if (!sv.c6 || !sv.c6.w.cards.includes(id)) errors.push('card never earned: ' + id); });
  if (errors.length) { console.log('FAIL\n' + [...new Set(errors)].join('\n')); process.exit(1); }
  console.log('OK');
})();
