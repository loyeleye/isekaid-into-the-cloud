// Headless playthrough of the chapter 1 demo: title, choosing a lead, the prologue, every camp scene, Freya's
// briefing, the road, Kyu's bridge, Brookfall's fight, the temple gate, the dungeon, Uptima, Kyu and the ending.
// The story's steps are taken through the world's own talk and door handlers (SD.ch1.debug.scene()); everything
// else (dialogue, questions, cards, map nodes) is clicked as it appears. Fails on any page error or console error.
// Run from game/:  node tools/ch1_check.js [mira|kai|seoyeon|dutch] [--win]   (--win wins every fight outright
// except Kyu's, whose steps are always played). SHOTS=dir saves screenshots of the main moments.
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
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 420), height: Number(process.env.H || 860) } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  // The Borderlands engine's test hook (SD.test.raid, js/raid.js) for the Deny Mines.
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.click('#t-new');
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

  const seen = new Set(), last = [], shotsTaken = new Set();
  let steps = 0;
  for (; steps < 12000; steps++) {
    const what = await page.evaluate(([WIN, LEAD]) => {
      const vis = el => el && !el.hidden && el.offsetParent !== null;
      const $ = s => document.querySelector(s);
      const click = el => { el.click(); return true; };
      const sv = SD.state.save, c1 = sv.c1;
      if ($('#c1-again') && vis($('#c1-again'))) return 'done';
      // The visual-novel prologue (js/vn.js): play each moment as it appears, then read on.
      const vn = $('#vn');
      if (vn && !vn.hidden) {
        window.__vnShots = window.__vnShots || {};
        const btn = [...vn.querySelectorAll('.vn-act button')].find(x => !x.disabled);
        if (btn) { const k = 'act-' + vn.querySelector('.vn-panel').className.split(' ')[1]; if (!window.__vnShots[k]) { window.__vnShots[k] = 1; return 'scene:prologue-' + k; } return click(btn) && 'vn-act'; }
        const box = vn.querySelector('.vn-box');
        if (box.hidden || !vn.classList.contains('vn-ready')) return 'vn-wait';
        const k = (vn.classList.contains('vn-incg') ? 'cg-' : '') + box.dataset.who;
        if (!window.__vnShots[k]) { window.__vnShots[k] = 1; return 'scene:prologue-' + k; }
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
        if ((x = p.querySelector('#q-num')) && !x.value) { x.value = '10800'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'num'; }
        if ((x = p.querySelector('#q-text')) && !x.value) { x.value = 'The trust policy says who can assume the role, and the permissions say what it can do.'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'text'; }
        if ((x = b('#q-confirm, #q-next, #pm-ok'))) return click(x) && 'next';
        // The Deny Mines' Policy Sort: a guess, then each request sorted (all Allowed, so some are wrong).
        if ((x = b('.ps-n'))) return click(x) && 'sort-guess';
        if ((x = [...p.querySelectorAll('.ps-tg')].find(g => !g.querySelector('.on')))) return click(x.querySelector('button')) && 'sort-one';
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
      // The Deny Mines (js/ch1-mines.js on js/raid.js): a story dungeon with three bots.
      const rd = $('#run .rd');
      if (vis($('#run')) && rd) {
        const T = ((SD.debug || {}).raid) || ((SD.test || {}).raid);
        if (!T) return 'mines-wait';
        if (!window.__paced) { window.__paced = 1; T.pace(0.05); }
        let x;
        if ((x = rd.querySelector('#rd-back'))) return click(x) && 'mines:back';
        const G = T.G(), mine = G.players[T.me()], ph = rd.dataset.ph;
        if (ph === 'fight') {
          if (WIN) { T.win(); return 'mines:win'; }
          if (!mine || mine.ready) return 'mines-wait';
          if ((x = rd.querySelector('[data-mate]'))) return click(x) && 'mines:mate';
          const c = [...rd.querySelectorAll('.hand .card')].find(c => !c.classList.contains('dim'));
          if (c) return click(c) && 'mines:play:' + G.main;
          return click(rd.querySelector('#rd-ready')) && 'mines:ready';
        }
        if (ph === 'map') {
          if (G.votes[T.me()]) return 'mines-wait';
          const n = rd.querySelector('.node.can:not([disabled])');
          return n ? click(n) && 'mines:node:' + n.className.split(' ')[1] : 'mines-wait';
        }
        if ((x = rd.querySelector('#rd-ask'))) return click(x) && 'mines:ask';
        const send = [...rd.querySelectorAll('[data-send]')].filter(b => !b.disabled && b.offsetParent !== null);
        for (const k of ['take', 'evote', 'one', 'rest', 'up', 'rm', 'done', 'skip']) {
          const y = send.find(b => JSON.parse(b.dataset.send).k === k);
          if (y) return click(y) && 'mines:' + k;
        }
        return 'mines-wait';
      }
      if (vis($('#run'))) {
        const end = $('#end-turn');
        if (end) {
          const C = SD.run.api.combat();
          if (C.busy) return 'combat-wait';
          if (WIN && C && !C.over && C.eid !== 'kyu' && C.eid !== 'lockeddoor') { C.sev = 0; SD.run.api.win(); return 'win'; }
          const c = [...$('#run').querySelectorAll('.hand .card')].find(c => !c.classList.contains('dim'));
          if (c) return click(c) && 'play:' + C.eid;
          return click(end) && 'end-turn';
        }
        const n = $('#run').querySelector('.node.can');
        if (n) return click(n) && 'node:' + n.className.split(' ')[1];
        return 'run-wait';
      }
      // The climb up Mount Quota (js/ch1-mountain.js), each step through its own handlers.
      if (vis($('#screen-world')) && SD.ch1m && SD.ch1m.active()) {
        const f = c1.f, M = SD.ch1m.debug, sc = M.scene();
        if (M.busy() || !sc) return 'mountain-wait';
        if (!f.m_wake) return 'mountain-wait';
        const talk = id => { sc.onTalk(id); return 'climb:' + id; };
        const go = (x, y, k) => { M.place(x, y); return 'climb:' + k; };
        if (!f.cart) return talk('cart');
        if (!f.m_board) return talk('board');
        if (!f.m_map) return talk('trailmap');
        if (!f.m_go) return talk('freya');
        if (!f.m_locker) return talk('locker');
        if (!f.m_rest1) return go(4, 44, 'rest1');
        if (!f.m_toll) return talk('keeper');
        if (!f.m_rest2) return go(29, 39, 'rest2');
        if (!f.m_ledge) return talk('ledge');
        if (!f.m_rock) return go(16, 30, 'rockfall');
        if (!f.m_mines) { sc.onDoor('cave'); return 'climb:mines'; }
        if (!f.m_lift) return talk('lift');
        if (!f.m_op) return talk('motor');
        if (!f.m_log) return talk('logbook');
        if (!f.m_rest3) return go(18, 7, 'rest3');
        M.place(16, 2); sc.onDoor('summit'); return 'climb:summit';
      }
      if (vis($('#screen-world')) && SD.ch1 && !SD.ch1.debug.busy()) {
        const f = c1.f, D = SD.ch1.debug, sc = D.scene();
        if (!f.intro) return 'world-wait';
        if (!f.cart) { sc.onTalk('cart'); return 'story:cart'; }
        if (!f.brief) {
          const pend = ['mira', 'kai', 'seoyeon', 'dutch'].filter(i => i !== c1.lead).find(i => sc.actors[i].marker);
          if (pend) { sc.onTalk(pend); return 'story:talk-' + pend; }
          sc.onTalk('freya'); return 'story:freya';
        }
        if (!f.board) { sc.onTalk('board'); return 'story:board'; }
        if (!f.tavern) { sc.onDoor('tavern'); return 'story:tavern'; }
        if (!f.kyu) { D.place(29, 9); return 'story:kyu'; }
        if (!f.shrine) { D.place(36, 9); return 'story:wren'; }
        if (!f.gate) { sc.onTalk('gate'); return 'story:gate'; }
        if (!sv.run) { D.place(59, 7); sc.onDoor('temple'); return 'story:temple'; }
        return 'world-wait';
      }
      return 'wait';
    }, [WIN, LEAD]);
    last.push(what); if (last.length > 16) last.shift();
    if (process.env.TRACE && steps % 200 === 0) console.log(steps, last.slice(-6).join(' '));
    seen.add(what.replace(/^(node|dialog|play|scene|mines:play|mines:node):.*/, '$1'));
    if (/^story:|^node:|^play:|^mines:node:|^mines:play:/.test(what)) seen.add(what);
    // Screenshots of the main moments, once each.
    // (Typing runs on a timer, so each shot waits for the line to finish and the portraits to load.)
    const key = { 'lead-wait': 'lead-select', 'climb:cart': 'coldstart', 'climb:locker': 'locker', 'climb:ledge': 'ledge', 'climb:lift': 'lift', 'climb:summit': 'summit', 'story:cart': 'camp', 'story:kyu': 'road', 'story:wren': 'brookfall', 'story:gate': 'temple' }[what]
      || (/^scene:/.test(what) && what.replace(':', '-'));
    if (key && !shotsTaken.has(key)) { shotsTaken.add(key); await page.waitForTimeout(1500); await shot(key); }
    if (/^play:(lockeddoor|uptimaboss|kyu)$/.test(what) && !shotsTaken.has(what)) { shotsTaken.add(what); await page.waitForTimeout(600); await shot(what.replace(':', '-')); }
    if (what === 'done') { await page.waitForTimeout(600); await shot('end'); break; }
    await page.waitForTimeout(/wait$/.test(what) ? 120 : 30);
  }
  const sv = await page.evaluate(() => ({ lead: SD.state.save.c1 && SD.state.save.c1.lead, flags: SD.state.save.c1 && SD.state.save.c1.f, level: SD.state.save.level, deck: SD.state.save.c1 && SD.state.save.c1.deck.length }));
  await browser.close(); server.close();
  console.log('steps', steps, JSON.stringify(sv));
  console.log('saw', [...seen].sort().join(' '));
  if (steps >= 12000) errors.push('the demo never finished; last actions: ' + last.join(' '));
  const need = ['m_board', 'm_locker', 'm_toll', 'm_ledge', 'm_mines', 'm_lift', 'm_op', 'm_log', 'm_rest1', 'm_rest2', 'm_rest3', 'summit', 'intro', 'cart', 'brief', 'board', 'tavern', 'kyu', 'shrine', 'guilty', 'gate', 'done'];
  const missing = need.filter(k => !sv.flags || !sv.flags[k]);
  if (missing.length) errors.push('story flags never set: ' + missing.join(', '));
  const scenes = ['wrongchair', 'notshopping', 'stew', 'salt', 'getup', 'suspect'].filter(k => !sv.flags || !sv.flags['s_' + k]);
  if (scenes.length) errors.push('camp scenes never played: ' + scenes.join(', '));
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK: played the chapter 1 demo as ${LEAD} from the title to the end card, no errors.`);
})().catch(e => { console.error(e); process.exit(1); });
