// Headless playthrough of the chapter 3 demo (index.html?vector&ch3): pick a lead, play the cold open, walk the camp,
// Halcyon, the Cold Stores yard, the Old Archive and the bottom of the Abyss with every minigame and page of Hana's
// speech, go through every door with real key presses, clear the three expeditions (every dungeon node clicked,
// every fight won through the test hook, SD.test.raid.win), make the choice, reach the end card, then open the
// reckoning and clear it too. Fails on page or console errors, raster images, or a story flag never set.
// Run from game/:  node tools/c3_check.js [mira|kai|seoyeon|dutch] --win   SHOTS=dir saves screenshots; W and H set
// the viewport (default 390 x 844, a phone). The choice is "unmake" for Kai and Mira, "leave" for the others.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEAD = ['mira', 'kai', 'seoyeon', 'dutch'].find(l => process.argv.includes(l)) || 'kai';
const WIN = process.argv.includes('--win');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
// Where to stand, and which arrow key walks you onto each door.
const DOORS = { lift1: [20, 20, 'ArrowRight'], lift2: [29, 20, 'ArrowLeft'], kitchen: [45, 8, 'ArrowRight'], cathedral: [52, 11, 'ArrowUp'], grate: [53, 30, 'ArrowDown'],
  stair: [96, 10, 'ArrowRight'], rope: [96, 27, 'ArrowUp'], vault: [96, 4, 'ArrowUp'], archive: [33, 28, 'ArrowDown'], gate: [73, 12, 'ArrowRight'] };

(async () => {
  if (!WIN) console.log('(running with --win anyway: fights are won through the test hook)');
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch3`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 390), height: Number(process.env.H || 844) }, reducedMotion: 'reduce' });
  await page.addInitScript(() => { window.SD_TEST = 1; });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('request', r => { if (/\.(webp|png|jpe?g|gif)(\?|$)/i.test(r.url()) && !/\/assets\/img\/(opening|portraits|vn)\//.test(r.url())) errors.push('raster image requested: ' + r.url().replace(/^.*?\/assets\//, 'assets/')); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  const foot = await page.evaluate(() => (document.querySelector('.t-foot') || {}).textContent || '');
  if (!/Chapter 3 demo: The Granaries/.test(foot)) errors.push('title foot line not patched: ' + foot);
  if (await page.$('#t-start')) await page.click('#t-start');
  await page.click('#t-c3new');
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

  const seen = new Set(), last = [], shotsTaken = new Set(), small = [];
  let steps = 0;
  for (; steps < 9000; steps++) {
    const what = await page.evaluate(([LEAD, DOORS]) => {
      const vis = el => el && !el.hidden && el.offsetParent !== null;
      const $ = s => document.querySelector(s);
      const click = el => { el.click(); return true; };
      window.__k = window.__k || {};
      const once = k => !window.__k[k] && (window.__k[k] = 1);
      // Tap targets under 44px in what's on screen now (each kind of panel once).
      const tiny = root => [...root.querySelectorAll('button')].filter(b => vis(b) && !b.disabled).map(b => b.getBoundingClientRect()).filter(r => r.height < 43.5 || r.width < 43.5).length;
      const vn = $('#vn');
      if (vn && !vn.hidden) {
        const box = vn.querySelector('.vn-box');
        if (!box || box.hidden || !vn.classList.contains('vn-ready')) return 'vn-wait';
        const k = 'vn-' + vn.dataset.bg + '-' + box.dataset.who;
        if (once(k)) return 'scene:' + k;
        box.click(); return 'vn-line';
      }
      if (!$('#dialog').hidden) { $('#dialog').click(); return 'dialog:' + ($('#dialog').dataset.who || ''); }
      const p = $('#panel');
      if (!p.hidden) {
        const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
        let x;
        const title = (p.querySelector('.win-h span') || {}).textContent || '';
        if ((x = p.querySelector(`[data-lead="${LEAD}"]`))) { if (once('lead')) return 'scene:lead-select'; return click(x) && 'lead'; }
        if (p.querySelector('.g3, .quiz, .opts') && once('tiny' + title)) { const n = tiny(p); if (n) window.__tiny = (window.__tiny || []).concat(title + ': ' + n); }
        if ((x = b('#q-said'))) return click(x) && 'said';
        if ((x = b('#g3-solo'))) { if (once('xp' + title)) return 'scene:door-' + title.toLowerCase().replace(/\W+/g, '-'); return click(x) && 'expedition'; }
        if ((x = b('#g3-camp'))) { if (once('endcard')) return 'scene:end-card'; window.__ended = 1; return click(x) && 'end-card'; }
        if ((x = b('.opt[data-c]'))) { if (once('choice')) return 'scene:choice'; return click(p.querySelector(`.opt[data-c="${['kai', 'mira'].includes(LEAD) ? 'unmake' : 'leave'}"]`)) && 'choice'; }
        // Chapter 3's minigames: each gets a screenshot first, then is played (wrong picks included).
        const g = p.querySelector('.g3');
        if (g && once('mg' + title)) return 'scene:mg-' + title.toLowerCase().replace(/\W+/g, '-');
        if ((x = b('.g2-predict [data-p]'))) return click(x) && 'mg:predict';
        if ((x = b('[data-k]'))) return click(x) && 'mg:key';
        if (g) {
          const rows = [...g.querySelectorAll('.row3')].filter(r => !r.querySelector('.on'));
          if (rows.length) { const y = [...rows[0].querySelectorAll('button')].find(z => !z.disabled); if (y) return click(y) && 'mg:sort'; }
          const ord = [...g.querySelectorAll('.g3-ord [data-s]')].filter(z => !z.disabled);
          if (ord.length) return click(ord[Math.floor(Math.random() * ord.length)]) && 'mg:order';
          const opts = [...g.querySelectorAll('[data-o]')].filter(z => !z.disabled && !z.classList.contains('on'));
          if (opts.length && !g.querySelector('.primary')) return click(opts[0]) && 'mg:pick';
        }
        if ((x = p.querySelector('#q-num')) && !x.value) {
          const t = p.textContent;
          x.value = /Standard-IA|billed/.test(t) ? '30' : /Deep Archive/.test(t) ? '12' : /partition/.test(t) ? '1000' : /stream/.test(t) ? '24' : '1';
          x.dispatchEvent(new Event('input', { bubbles: true })); return 'num';
        }
        if ((x = p.querySelector('#q-text')) && !x.value) { x.value = 'Spread the key so no partition is hot, use a version condition on the write so it fails if changed, and match the class to how often it is read.'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'text'; }
        if ((x = b('#q-confirm, #q-next, #pm-ok'))) return click(x) && 'next';
        if ((x = p.querySelector('.compass [data-p]')) && !p.querySelector('.compass [data-p].on')) return click(x) && 'compass';
        const conf = b('.conf-b button');
        if (!conf && (x = b('.opts .opt:not(.on):not(.struck)'))) return click(x) && 'opt';
        if (conf) return click(conf) && 'conf';
        if ((x = b('.primary'))) return click(x) && 'primary';
        if ((x = b('.opts .opt'))) return click(x) && 'opt2';
        if ((x = b('#skip, .ghost, #panel-x'))) return click(x) && 'ghost';
        return 'panel-wait';
      }
      // A dungeon (js/raid.js, story mode, solo with bots).
      const run = $('#run');
      if (vis(run)) {
        const rd = run.querySelector('.rd'), T = (SD.test || {}).raid;
        if (!rd || !T) return 'run-wait';
        if (!window.__paced) { window.__paced = 1; T.pace(0.05); }
        if ((x = rd.querySelector('#rd-back'))) return click(x) && 'back';
        const G = T.G(), me = T.me(), ph = rd.dataset.ph;
        if (ph === 'fight') { const f = G.foes && G.foes[0]; if (f && once('foe' + f.id)) return 'scene:foe-' + f.id; if (T.hosting()) T.win(); return 'fight:' + (f && f.id); }
        if (ph === 'map') {
          if (G.votes[me]) return 'map-wait';
          const n = rd.querySelector('.node.can:not([disabled])');
          if (n && once('map' + G.fl + (SD.c3raid.active || ''))) return 'scene:map-' + SD.c3raid.active + '-' + G.fl;
          return n ? click(n) && 'node:' + n.className.split(' ')[1] : 'map-wait';
        }
        if ((x = rd.querySelector('#rd-ask'))) return click(x) && 'ask';
        const send = [...rd.querySelectorAll('[data-send]')].filter(z => !z.disabled && z.offsetParent !== null);
        for (const k of ['take', 'evote', 'wvote', 'one', 'rest', 'up', 'rm', 'done', 'skip']) {
          const y = send.find(z => JSON.parse(z.dataset.send).k === k);
          if (y) return click(y) && 'room:' + k;
        }
        if (send.length) return click(send[0]) && 'room:any';
        return 'room-wait:' + ph;
      }
      const W3 = SD.c3world;
      if (!vis($('#screen-world')) || !W3 || !W3.active || W3.debug.busy()) return 'wait';
      const D = W3.debug, sc = D.scene(), w = D.w(), f = w.x, X = sc.actors;
      const views = window.__views = window.__views || {};
      const go = (id, x, y) => { D.place(x, y); if (!views[id]) { views[id] = 1; return 'view:' + id; } sc.onTalk(id); return 'story:' + id; };
      const door = k => { const [x, y, key] = DOORS[k]; D.place(x, y); return 'walk:' + k + ':' + key; };
      const page = i => { const [x, y] = W3.map.PAGES[i]; D.place(x, y); return 'page:' + i; };
      const pg = i => !w.pages.includes(i) && !X['page' + i].hidden;
      if (!f.arrive) return door('lift1');
      if (!f.heart) return go('heart', 52, 22);
      if (!f.crown) return go('noor', 51, 12);
      if (!f.offer) return door('kitchen');
      if (!f.sure) { D.place(52, 23); return 'walk:square'; }
      if (pg(0)) return page(0);
      if (pg(1)) return page(1);
      if (!f.archive) return door('archive');
      if (pg(4)) return page(4);
      if (!views.lord) return go('lord', 62, 22);
      if (!f.gate1) return go('keeper', 71, 12);
      if (!views.yard) { views.yard = 1; return door('gate'); }
      if (sc.P.x < 78 && !f.x1) return 'gate-stuck';
      if (!f.thaw) return go('sack', 86, 12);
      if (!f.toll) return go('merchant', 89, 14);
      if (pg(2)) return page(2);
      if (!f.x1) return door('stair');
      if (!f.gary || !f.cache) return go('wen', 4, 27);
      if (!f.bread) return go('doug', 15, 15);
      if (!f.ship) return go('term', 17, 14);
      if (!f.kage) return go('kage', 9, 30);
      if (!views.lift2) { views.lift2 = 1; return door('lift1'); }
      if (!f.x2) return door('grate');
      if (!f.register) return go('saints', 82, 28);
      if (pg(3)) return page(3);
      if (!views.ash) return go('ash', 86, 33);
      if (!f.ropeup) return door('rope');
      if (!views.back) { views.back = 1; return door('lift2'); }
      if (!f.jar) { D.place(12, 21); return 'walk:camp'; }
      if (!f.echoes) return go('aurc', 12, 24);
      if (!f.board) return go('board', 17, 27);
      if (!views.up3) { views.up3 = 1; return door('lift1'); }
      if (!f.x3) return door('cathedral');
      if (!f.asknoor) return go('noor', 51, 12);
      if (!f.speech) return go('heart', 52, 22);
      if (window.__ended && !f.reckon) { W3.openReckoning(); return 'reckon-open'; }
      if (!f.x4 && !views.yard2) { views.yard2 = 1; D.place(96, 6); return 'view:yard-vault'; }
      if (!f.x4) return door('vault');
      return 'done';
    }, [LEAD, DOORS]);
    let m;
    if ((m = /^walk:(\w+):(\w+)$/.exec(what))) {
      await page.waitForTimeout(150);
      await page.keyboard.down(m[2]); await page.waitForTimeout(m[1] === 'gate' ? 1600 : 450); await page.keyboard.up(m[2]);
      seen.add('door:' + m[1]);
    }
    if (what === 'gate-stuck') { errors.push('walking east through the open granary gate didn\'t reach the Cold Stores'); break; }
    if (what === 'done') break;
    if (errors.some(e => /^pageerror|TypeError|ReferenceError/.test(e))) { console.error(errors.join('\n')); break; }
    if (process.env.TRACE && what !== last[last.length - 1]) console.log(steps, what);
    last.push(what); if (last.length > 16) last.shift();
    seen.add(what.replace(/^(node|dialog|scene|fight|page):.*/, '$1'));
    if (/^story:|^node:|^door:|^page:/.test(what)) seen.add(what);
    const key = /^(scene|view):/.test(what) && what.replace(':', '-');
    if (key && !shotsTaken.has(key)) { shotsTaken.add(key); await page.waitForTimeout(/scene:vn/.test(what) ? 1200 : 700); await shot(key); }
    await page.waitForTimeout(/wait/.test(what) ? 120 : 25);
  }
  const sv = await page.evaluate(() => ({ lead: SD.state.save.c3 && SD.state.save.c3.lead, level: SD.state.save.level, c3: SD.state.save.c3, tiny: window.__tiny || [], ch4: !!(SD.chapterStart && SD.chapterStart[4]) }));
  await browser.close(); server.close();
  console.log('steps', steps, 'lead', sv.lead, 'level', sv.level, 'choice', sv.c3 && sv.c3.choice, 'pages', sv.c3 && sv.c3.w.pages.length);
  console.log('dev', JSON.stringify(sv.c3 && sv.c3.dev));
  console.log('saw', [...seen].filter(s => /^(door|story|page):/.test(s)).sort().join(' '));
  if (sv.tiny.length) console.log('tap targets under 44px (count by panel):', sv.tiny.join('; '));
  if (steps >= 9000) errors.push('the demo never finished; last actions: ' + last.join(' '));
  const wx = (sv.c3 && sv.c3.w && sv.c3.w.x) || {};
  const need = ['cold', 'wake', 'arrive', 'heart', 'crown', 'offer', 'sure', 'archive', 'gate1', 'thaw', 'toll', 'x1', 'gary', 'cache', 'bread', 'ship', 'kage', 'x2', 'ash', 'register', 'ropeup', 'jar', 'aurelian', 'echoes', 'board', 'evidence', 'x3', 'tellher', 'asknoor', 'speech', 'choice', 'clean', 'freed', 'reckon', 'x4', 'reckard'].filter(k => !wx[k]);
  if (need.length) errors.push('story flags never set: ' + need.join(', '));
  const dv = ['sum', 'oven', 'dayayear', 'gauntlet'].filter(k => !(sv.c3 && sv.c3.dev && sv.c3.dev[k]));
  if (dv.length) errors.push('chapter upgrades never given: ' + dv.join(', '));
  if (!sv.c3 || sv.c3.w.pages.length !== 5) errors.push('not all five pages of Hana\'s speech were found');
  if (!sv.c3 || !sv.c3.f.done) errors.push('the chapter never reached its end card');
  const doors = Object.keys(DOORS).filter(k => !seen.has('door:' + k));
  if (doors.length) errors.push('doors never walked through: ' + doors.join(', '));
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK: played the chapter 3 demo as ${LEAD} from the title through Halcyon, all three expeditions, the choice (${sv.c3.choice}), the end card${sv.ch4 ? ' (with Continue to Chapter 4)' : ''} and the reckoning, no raster images, no errors.`);
})().catch(e => { console.error(e); process.exit(1); });
