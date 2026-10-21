// Headless playthrough of the chapter 4 demo (index.html?vector&ch4): the title button, a lead pick, the cold open,
// the town, every gate (walked into and through with the arrow keys), every minigame, all eight pages of Jin's forms,
// the three expeditions and the reckoning in the raid engine (every node clicked; with --win each fight is won through
// the test hook), the choice and the end card. Fails on page or console errors, raster images, a gate or door you
// can't walk through, or a story flag never set.
// Run from game/:  NODE_PATH=$(npm root -g) node tools/c4_check.js [mira|kai|seoyeon|dutch] [--win]
//   SHOTS=dir saves screenshots; W and H set the viewport (default 390x844); CHOICE=banner|bury|school (default school).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEAD = ['mira', 'kai', 'seoyeon', 'dutch'].find(l => process.argv.includes(l)) || 'seoyeon';
const WIN = process.argv.includes('--win');
const SHOTS = process.env.SHOTS, CHOICE = process.env.CHOICE || 'school';
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
  const W = SD.c4world;
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
    if (p.querySelector('#c4-end')) {
      if (once('end-shot')) return 'shot:c4-end-card';
      if ((x = b('#c4-letter'))) return click(x) && 'end:letter';
      return 'end';
    }
    if ((x = b(`[data-ch="${CHOICE}"]`))) { if (once('choice')) return 'shot:c4-choice'; return click(x) && 'choice'; }
    if ((x = b('#c4-go'))) return click(x) && 'go-in';
    // This chapter's minigames, played right (the answers are the games' own data).
    const g = SD.c4games && SD.c4games.cur, gp = p.querySelector('.g4');
    if (gp) {
      const title = (p.textContent.match(/^[^a-z]{6,60}/) || [''])[0];
      if (once('mg-' + (g ? g.o.title : title))) return 'shot:mg-' + (g ? g.o.title : 'done').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      if ((x = b('#g4-cont'))) return click(x) && 'mg:continue';
      const pr = gp.querySelector('.g4-predict');
      if (g && pr && (x = [...pr.querySelectorAll('[data-p]')].find(el => !el.disabled && g.o.predict.opts[+el.dataset.p].ok))) return click(x) && 'mg:predict';
      if (g && pr && [...pr.querySelectorAll('[data-p]')].some(el => !el.disabled)) return 'mg-wait';
      if (g && g.kind === 'door') {
        for (const f of g.o.fields) { const c = gp.querySelector(`[data-f="${f.k}"][data-v="${g.o.answer[f.k]}"]`); if (c && !c.classList.contains('on') && !c.disabled) return click(c) && 'mg:chip'; }
        if ((x = b('#g4-try'))) return click(x) && 'mg:try';
      }
      if (g && g.kind === 'sort') {
        // The first check goes in with one row wrong, to play the "fix the red ones" path too.
        const rows = [...gp.querySelectorAll('.g4-row')].filter(r => !r.classList.contains('done'));
        for (const r of rows) {
          const i = +r.dataset.r, it = g.o.items[i];
          const wrong = once('wrong-' + g.o.title) ? (it.bin + 1) % g.o.bins.length : it.bin;
          if (!r.querySelector('button.on')) return click(r.querySelector(`[data-v="${wrong}"]`)) && 'mg:sort';
        }
        if ((x = b('#g4-go'))) return click(x) && 'mg:check';
      }
      if (g && g.kind === 'order') {
        const left = [...gp.querySelectorAll('[data-s]')].map(el => +el.dataset.s);
        if (left.length) return click(gp.querySelector(`[data-s="${Math.min(...left)}"]`)) && 'mg:step';
      }
      return 'mg-wait';
    }
    // Questions: the typed ones get an answer that covers their points.
    if ((x = b('#q-said'))) return click(x) && 'said';
    if ((x = p.querySelector('#q-num')) && !x.value) {
      const t = p.textContent;
      x.value = /kilobytes/.test(t) ? '4' : /how many hours/.test(t) ? '1' : /in days/.test(t) ? '7' : '1';
      x.dispatchEvent(new Event('input', { bubbles: true })); return 'num';
    }
    if ((x = p.querySelector('#q-text')) && !x.value) {
      const t = p.textContent;
      x.value = /userIdentity/.test(t) ? 'The sessionIssuer in the session context names the assumed role, and the ARN ends with the role session name, which is Namgung.'
        : /birthday/.test(t) ? 'Yes, every Decrypt was recorded in CloudTrail, and nobody had to turn it on: KMS calls are management events logged by default.'
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
    if ((x = rd.querySelector('#rd-back'))) { if (once('rdend-' + W.set + rd.textContent.slice(0, 30))) return 'shot:raid-end'; return click(x) && 'raid:back'; }
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
      if (once('map-' + G.fl)) return 'shot:raid-map-' + G.fl;
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
  const inCamp = z(1, 19, 18, 34);
  const lift = inCamp ? () => push('up', 16, 27, 'ArrowRight') : () => push('down', 24, 27, 'ArrowLeft');
  const thru = window.__thru = window.__thru || {};
  if (!f.offer) return go('sealhouse', 27, 21);
  if (!f.notice) return go('notice', 29, 27);
  if (!f.master) return go('baek', 36, 25);
  if (!f.okmet) return go('ok', 42, 33);
  if (!f.ryu1) return go('hall', 40, 22);
  if (!pages.includes(3)) return page(3);
  if (!f.sg) return push('gsg', 33, 17, 'ArrowUp');
  if (!thru.gsg) return push('gsg', 33, 17, 'ArrowUp', 1);
  if (!f.nacl) return push('gnacl', 33, 10, 'ArrowUp');
  if (!thru.gnacl) return push('gnacl', 33, 10, 'ArrowUp', 1);
  if (!f.order100) return push('g100', 38, 12, 'ArrowRight');
  if (!pages.includes(0)) return page(0);
  if (!pages.includes(1)) return page(1);
  if (!f.xp1) return push('xp1', 33, 3, 'ArrowUp');
  if (!thru.rubble) return push('rubble', 47, 5, 'ArrowRight', 1);
  if (!pages.includes(2)) return page(2);
  if (!f.lexi) return go('vault', 59, 5);
  if (!f.camp) return inCamp ? 'camp-wait' : push('down', 24, 27, 'ArrowLeft');
  if (!pages.includes(4)) return page(4);
  if (!f.ship) return go('ship', 8, 23);
  if (!f.ryuseal) return go('library', 4, 23);
  if (!f.forms) return go('fire', 9, 29);
  if (!f.abacus) return inCamp ? lift() : go('ok', 42, 33);
  if (!f.gruins) return push('gruins', 47, 26, 'ArrowRight');
  if (!thru.gruins) return push('gruins', 47, 26, 'ArrowRight', 1);
  if (!f.policy) return push('gyard', 56, 26, 'ArrowRight');
  if (!thru.gyard) return push('gyard', 56, 26, 'ArrowRight', 1);
  if (!f.respol) return push('gside', 53, 29, 'ArrowDown');
  if (!pages.includes(5)) return page(5);
  if (!pages.includes(6)) return page(6);
  if (!f.xp2) return push('xp2', 66, 26, 'ArrowUp');
  if (!f.freya) return go('freya', 11, 30);
  if (!f.cards) return go('library', 4, 23);
  if (!f.index) return go('library', 4, 23);
  if (!f.board) return go('dboard', 15, 25);
  if (!f.letme) return inCamp ? lift() : push('ghouse', 33, 35, 'ArrowDown');
  if (!thru.ghouse) return push('ghouse', 33, 35, 'ArrowDown', 1);
  if (!f.keydoor) return push('gkey', 33, 43, 'ArrowDown');
  if (!thru.gkey) return push('gkey', 33, 43, 'ArrowDown', 1);
  if (!f.sse) return push('gsse', 30, 50, 'ArrowLeft');
  if (!pages.includes(7)) return page(7);
  if (!f.ledger && once('ledger')) return go('ledger', 24, 47);
  if (!f.study) return go('study', 40, 50);
  if (!f.xp3) return push('xp3', 33, 49, 'ArrowUp');
  if (!f.hand) return 'hand-wait';
  if (!f.choice) return inCamp ? lift() : go('banner', 35, 28);
  return 'world-idle';
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch4`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 390), height: Number(process.env.H || 844) } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('request', r => { if (/\.(webp|png|jpe?g|gif)(\?|$)/i.test(r.url()) && !/\/assets\/img\/(opening|portraits|vn)\//.test(r.url())) errors.push('raster image requested: ' + r.url().replace(/^.*?\/assets\//, 'assets/')); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); if (m.type() === 'warning' && /qpick: no question/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  const btn = await page.textContent('#t-c4new');
  if (!/Play Chapter 4: The Sealed Floors/.test(btn)) errors.push('title button reads "' + btn + '"');
  const foot = await page.textContent('.t-foot');
  if (!/Chapter 4 demo: The Sealed Floors/.test(foot)) errors.push('title footer reads "' + foot + '"');
  await page.click('#t-c4new');
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const seen = new Set(), last = [];
  let steps = 0, ended = false;
  const T0 = Date.now();
  for (; steps < 30000; steps++) {
    const what = await page.evaluate(step, [WIN, LEAD, CHOICE]);
    last.push(what); if (last.length > 20) last.shift();
    if (process.env.LOG && steps % 250 === 0) console.log(steps, Math.round((Date.now() - T0) / 1000) + 's', what);
    seen.add(what.replace(/:.*/, ''));
    if (/^(story|node|raid|mg|choice|end):/.test(what)) seen.add(what);
    if (what.startsWith('shot:')) { if (SHOTS) { await page.waitForTimeout(900); await shot(what.slice(5)); } continue; }
    if (what.startsWith('key:')) {
      const [, key, id, thru, x, y] = what.split(':');
      await page.keyboard.down(key); await page.waitForTimeout(thru === '1' ? 700 : 350); await page.keyboard.up(key);
      await page.waitForTimeout(250);
      if (thru === '1') {
        const P = await page.evaluate(() => { const s = SD.c4world.debug.scene(); return s ? [s.P.x, s.P.y] : null; });
        const ok = P && ({ ArrowUp: P[1] < +y - 1, ArrowDown: P[1] > +y + 1, ArrowRight: P[0] > +x + 1, ArrowLeft: P[0] < +x - 1 })[key];
        if (!ok) { errors.push(`walking ${key} through ${id} from ${x},${y} didn't get you through it (at ${P})`); break; }
        await page.evaluate(id => { window.__thru[id] = 1; }, id);
        seen.add('thru:' + id);
        if (id === 'gsg') { await page.waitForTimeout(600); await shot('area-pass'); }
        if (id === 'rubble') { await page.waitForTimeout(600); await shot('area-valley'); }
        if (id === 'gruins') { await page.waitForTimeout(600); await shot('area-ruins'); }
        if (id === 'ghouse') { await page.waitForTimeout(600); await shot('area-house'); }
      } else seen.add('door:' + id);
      if (id === 'down') { await page.waitForTimeout(600); await shot('area-camp'); }
      continue;
    }
    if (what === 'end' && (await page.evaluate(() => !!SD.c4world.debug.flag('reckon')))) { ended = true; break; }
    if (what === 'end') { errors.push('the end card offers no Last Letter, and it was never played'); break; }
    if (what === 'story:sealhouse' && !seen.has('town-shot')) { seen.add('town-shot'); }
    await page.waitForTimeout(/wait/.test(what) ? 120 : 25);
  }
  const sv = await page.evaluate(() => ({ lead: SD.state.save.c1 && SD.state.save.c1.lead, level: SD.state.save.level, c4: SD.state.save.c4, next: !!(SD.chapterStart && SD.chapterStart[5]), start: typeof (SD.chapterStart || {})[4] }));
  await browser.close(); server.close();
  console.log('steps', steps, 'lead', sv.lead, 'level', sv.level);
  console.log('c4', JSON.stringify(sv.c4 && { f: sv.c4.f, choice: sv.c4.choice, pages: sv.c4.w.pages, cards: sv.c4.w.cards, x: Object.keys(sv.c4.w.x).join(' ') }));
  console.log('saw', [...seen].sort().join(' '));
  if (!ended) errors.push('the chapter never reached its end card; last actions: ' + last.join(' '));
  const x = (sv.c4 && sv.c4.w.x) || {};
  const need = ['cold', 'arrive', 'offer', 'okmet', 'ryu1', 'sg', 'pass', 'nacl', 'order100', 'xp1', 'archive', 'lexi', 'camp', 'ship', 'ryuseal', 'forms', 'abacus', 'gruins', 'ruins', 'policy', 'respol', 'chain', 'gu', 'xp2', 'echo', 'freya', 'cards', 'index', 'board', 'ownkey',
    'letme', 'house', 'keydoor', 'sse', 'study', 'edge', 'confront', 'xp3', 'bow', 'hand', 'choice', 'freed', 'reckon'].filter(k => !x[k]);
  if (need.length) errors.push('flags never set: ' + need.join(', '));
  if (!sv.c4 || sv.c4.w.pages.length !== 8) errors.push('not every page of Jin\'s forms was found: ' + JSON.stringify(sv.c4 && sv.c4.w.pages));
  if (!sv.c4 || !sv.c4.f.done) errors.push('chapter 4 never marked done');
  if (sv.start !== 'function') errors.push('SD.chapterStart[4] is not registered');
  ['k4-ryuseal', 'k4-abacus', 'k4-index', 'k4-lastletter'].forEach(id => { if (!sv.c4 || !sv.c4.w.cards.includes(id)) errors.push('card never earned: ' + id); });
  if (errors.length) { console.log('FAIL\n' + [...new Set(errors)].join('\n')); process.exit(1); }
  console.log('OK');
})();
