// Headless playthrough of the chapter 2 demo (index.html?vector&ch2): pick a lead, then walk the act 1 world the way
// a player does (arrow keys step by step, and taps for some of the people), through every story beat, minigame,
// lost letter and pair scene, through the tower's gate and up Thornwick's stair; then Expedition I on the raid engine
// (the Sorting Floors, solo with three bots, every room voted for and every fight won through the test hook, each
// boss first brought to half Severity for its Exam Twist), then camp (Pip's question, Ship It, Coo's quest) and the
// lift to floor 7. Fails on page or console errors, raster images, a flag never set, a walker that can't get where
// it's going (a door that bounces you, a path that doesn't go through, a person you can't reach), or a wait of more
// than 12 seconds with nothing to press.
// Run from game/:  node tools/c2_check.js [mira|kai|seoyeon|dutch] [--win]
//   SHOTS=dir   saves screenshots of every area, minigame, panel and room type (at 390 x 844 unless W and H say)
//   --raid      only Expedition I, from a save at the top of the stair
//   --party     only Expedition I, as a party of two tabs (one forms it, the other joins from the stair's list) and
//               two bots
// The fights are always won through the test hook (SD.test.raid.win); --win is accepted for the other checks' sake.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEAD = ['mira', 'kai', 'seoyeon', 'dutch'].find(l => process.argv.includes(l)) || 'mira';
const RAID = process.argv.includes('--raid'), PARTY = process.argv.includes('--party');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// One step on a page: answer what's open, else walk, else act in the raid. Runs in the page. Returns what it did;
// 'key:<Key>' and 'tap:<x>,<y>' are for the caller to do with the real keyboard and pointer.
function step([LEAD, MODE]) {
  const vis = el => el && !el.hidden && el.offsetParent !== null;
  const $ = s => document.querySelector(s);
  const click = el => { el.click(); return true; };
  const sv = SD.state.save;
  window.__p2 = window.__p2 || {};
  const once = k => !window.__p2[k] && (window.__p2[k] = 1);
  if (window.__done) return 'done';
  if (($('#v2-end') && vis($('#v2-end'))) || (SD.c2xworld && SD.c2xworld.active)) return 'end2';   // or part 2 (js/c2x-world.js) took over at the lift
  // The visual novel (js/vn.js): play each moment as it appears, then read on.
  const vn = $('#vn');
  if (vn && !vn.hidden) {
    const btn = [...vn.querySelectorAll('.vn-act button, .vn-panel button')].find(x => !x.disabled && vis(x));
    if (btn) { const k = 'act-' + (vn.querySelector('.vn-panel') || { className: 'x y' }).className.split(' ')[1]; if (once(k)) return 'scene:vn-' + k; return click(btn) && 'vn-act'; }
    const box = vn.querySelector('.vn-box');
    if (!box || box.hidden) return 'vn-wait';
    // Still typing: a tap shows the whole line, as a player would.
    if (!vn.classList.contains('vn-ready')) { box.click(); return 'vn-type'; }
    const k = 'vn-' + (vn.classList.contains('vn-incg') ? vn.dataset.cg : vn.dataset.bg) + '-' + box.dataset.who;
    if (once(k)) return 'scene:' + k;
    box.click(); return 'vn-line';
  }
  if (!$('#dialog').hidden) {
    const st = $('#stage'), sc = !st.hidden && st.dataset.scene, who = $('#dialog').dataset.who;
    if (sc && once('dlg-' + sc)) return 'scene:' + sc;
    $('#dialog').click(); return 'dialog:' + (who || '');
  }
  const p = $('#panel');
  if (!p.hidden) {
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    let x;
    const title = ((p.querySelector('.panel-title, .p-title, h2') || {}).textContent || '').trim().slice(0, 40).replace(/[^A-Za-z0-9]+/g, '-');
    if ((x = p.querySelector(`[data-lead="${LEAD}"]`))) { if (once('lead')) return 'scene:lead-select'; return click(x) && 'lead'; }
    if ((x = b('#q-said'))) return click(x) && 'said';
    // Chapter 2's minigames, played right.
    if ((x = p.querySelector('[data-k="ring"]')) && !p.querySelector('.hit')) { if (once('notes')) return 'scene:mg-notes'; return click(x) && 'mg:notes'; }
    if (p.querySelector('#hx-go')) {
      const row = [...p.querySelectorAll('[data-r]')].find(r => !r.querySelector('.on'));
      if (row) { const cant = /compliance|tape/.test(row.textContent); return click(row.querySelector(`[data-v="${cant ? 0 : 1}"]`)) && 'mg:hatch'; }
      if (once('hatch')) return 'scene:mg-hatch';
      return click(p.querySelector('#hx-go')) && 'mg:hatch-go';
    }
    if ((x = b('#pb-run'))) { if (once('postbox')) return 'scene:mg-postbox'; click(p.querySelector('[data-vt="60"]')); click(p.querySelector('[data-del="1"]')); return click(x) && 'mg:postbox'; }
    if ((x = b('#br-go'))) {
      const want = ['LetterArrived', 'BeastSighted'];
      const on = [...p.querySelectorAll('[data-f="type"]')].find(c => want.includes(c.dataset.v) && !c.classList.contains('on'));
      if (on) return click(on) && 'mg:chip';
      if (once('bells')) return 'scene:mg-bells';
      return click(x) && 'mg:bells';
    }
    const gh = p.querySelector('.g2-h');
    if (gh && p.querySelector('[data-o]') && once('r' + gh.textContent)) return 'scene:mg-restore-' + gh.textContent.slice(0, 20).replace(/\W+/g, '-');
    if (gh && (x = b('[data-o]'))) return click(x) && 'mg:restore';
    if ((x = b('.g2-predict [data-p]'))) return click(x) && 'mg:predict';
    if ((x = b('.g2-ff'))) { if (once('ff')) return 'mg-run'; return click(x) && 'mg:skip-run'; }
    if (p.querySelector('.g2-run') && !b('.primary')) return 'mg-wait';
    // The stair: in the world, say "Not yet" once (it must step you back off the stair), then climb.
    if (b('#sf-solo') && once('climb-shot')) return 'scene:climb';
    if ((x = b('#sf-not')) && once('notyet')) return click(x) && 'stair:not-yet';
    if ((x = b(MODE === 'party' ? '#sf-party' : MODE === 'join' ? '#sf-join' : '#sf-solo'))) return click(x) && 'stair:' + x.id;
    if (b('#sd-go') && once('sd')) return 'scene:sorting-desk';
    if (b('#v2-ship, #v2-quest, #v2-up') && once('camp' + p.querySelectorAll('button[disabled]').length)) return 'scene:camp-' + p.querySelectorAll('button[disabled]').length;
    if ((x = b('#sd-go'))) { p.querySelectorAll('[data-i="3"], [data-i="8"]').forEach(click); return click(x) && 'sorting-desk'; }
    if ((x = b('#v2-ship, #v2-quest, #v2-up'))) return click(x) && 'camp:' + x.id;
    // The raid's own pages: a Sorting Table, and a question.
    if ((x = b('.ps-n'))) { if (once('ps-' + title)) return 'scene:sorting-table'; return click(x) && 'sort-guess'; }
    if ((x = [...p.querySelectorAll('.ps-tg')].find(g => !g.querySelector('.on')))) return click(x.querySelector('button')) && 'sort-one';
    if ((x = p.querySelector('#q-num')) && !x.value) { x.value = /function.s timeout/.test(p.textContent) ? '180' : '10800'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'num'; }
    if ((x = p.querySelector('#q-text')) && !x.value) { x.value = 'The queue keeps the letter hidden while one consumer works on it, and moves it to the dead-letter queue after too many failed receives.'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'text'; }
    if (p.querySelector('.q-q, .q-ev') && once('q-' + title + (p.querySelector('.q-ctx') || { textContent: '' }).textContent.slice(0, 30))) return 'scene:question';
    if ((x = b('#q-confirm, #q-next, #pm-ok'))) return click(x) && 'next';
    if (p.querySelector('[data-p]') && !p.querySelector('[data-p].on')) return click(p.querySelector('[data-p]')) && 'compass';
    const conf = b('.conf-b button');
    if (!conf && (x = b('.opts .opt:not(.on):not(.struck)'))) return click(x) && 'opt';
    if (conf) return click(conf) && 'conf';
    if (once('panel-' + title)) return 'scene:panel-' + title;
    if ((x = b('.primary'))) return click(x) && 'primary';
    if ((x = b('.opts .opt'))) return click(x) && 'opt2';
    if ((x = b('#skip, .ghost, #panel-x'))) return click(x) && 'ghost';
    return 'panel-wait';
  }
  // ---- Expedition I, on the raid engine ----
  const run = $('#run'), T = (SD.test || {}).raid, rd = run && vis(run) && run.querySelector('.rd, .mi-card');
  if (rd) {
    let x;
    if ((x = run.querySelector('[data-code]'))) return click(x) && 'join';
    if ((x = run.querySelector('#pt-ready:not([disabled])')) && x.getAttribute('aria-pressed') !== 'true') return click(x) && 'ready';
    const st = run.querySelector('#pt-start');
    if (st) {
      if (once('lobby')) return 'scene:party-room';
      const mem = run.querySelectorAll('.pt-mem[data-peer]').length;
      if (mem < 2) return 'lobby-wait';
      if (mem < 4 && (x = run.querySelector('#pt-bot:not([disabled])'))) return click(x) && 'bot';
      if (!st.disabled) return click(st) && 'start';
      return 'lobby-wait';
    }
    const r2 = run.querySelector('.rd');
    if (!r2 || !T) return 'raid-wait';
    if (!window.__paced) { window.__paced = 1; T.pace(0.05); }
    if ((x = r2.querySelector('#rd-back'))) { if (once('raid-end')) return 'scene:raid-end'; return click(x) && 'raid:back'; }
    const G = T.G(), me = T.me(), ph = r2.dataset.ph;
    if (ph === 'fight') {
      const tier = G.tier, k = 'fight-' + tier + '-' + G.fl;
      if (once(k)) return 'scene:raid-' + k;
      // A guest ends each turn as a player would (Ready), so the leader's turns move on.
      if (!T.hosting()) { const rb = r2.querySelector('#rd-ready:not([disabled])'), mine = G.players[me]; if (rb && mine && !mine.ready && once('rdy' + G.k + ':' + (G.turn | 0))) return click(rb) && 'fight-ready'; return 'fight-wait'; }
      // A boss goes to half Severity first, so its Exam Twist is asked.
      if (tier === 'boss' && once('half' + G.fl)) { const f = G.foes[0]; f.sev = Math.floor(f.max / 2); T.act(me, { k: 'ready' }); T.act(me, { k: 'ready' }); window.__twist = (window.__twist || 0); return 'boss-half'; }
      // ...and waits for the twist (it's asked at the end of the turn), up to a few seconds, before winning.
      if (tier === 'boss' && !G.tw && (window.__bw = (window.__bw || 0) + 1) % 400) { if (window.__bw % 25 === 0) { const f = G.foes[0]; if (f.sev > f.max / 2) f.sev = Math.floor(f.max / 2); T.act(me, { k: 'ready' }); } return 'boss-turn'; }
      if (tier === 'boss' && G.tw && once('tw' + G.fl)) window.__twist = (window.__twist || 0) + 1;
      if (G.qs.length) { window.__twist = (window.__twist || 0) + (G.qs.some(q => q.q && /^tw:/.test(q.q)) ? 1 : 0); return 'fight-q'; }
      T.win(); return 'raid:win-' + tier;
    }
    if (ph === 'map') {
      if (once('map' + G.fl)) return 'scene:raid-map-' + G.fl;
      if (G.votes[me]) return 'map-wait';
      const n = r2.querySelector('.node.can:not([disabled])');
      return n ? click(n) && 'node:' + n.className.split(' ')[1] : 'map-wait';
    }
    if (once('room-' + ph + G.fl)) return 'scene:raid-room-' + ph;
    if ((x = r2.querySelector('#rd-ask'))) return click(x) && 'raid:ask';
    const send = [...r2.querySelectorAll('[data-send]')].filter(b => !b.disabled && b.offsetParent !== null);
    for (const kk of ['take', 'evote', 'wvote', 'one', 'rest', 'up', 'rm', 'done', 'skip']) {
      const y = send.find(b => JSON.parse(b.dataset.send).k === kk);
      if (y) return click(y) && 'room:' + kk;
    }
    return 'room-wait:' + ph;
  }
  if (MODE !== 'world') return 'raid-wait';
  // ---- The act 1 world, walked ----
  const W2 = SD.c2world;
  if (!vis($('#screen-world')) || !W2 || !W2.active) return 'c2-wait';
  const D = W2.debug;
  if (D.busy()) return 'world-busy';
  const w = D.w(), f = w.x, A2 = D.scene().actors, pos = D.pos();
  if (pos[2]) return 'walking';
  // The next place to go, in story order: [id, x, y, how]. An id names a person or thing to walk up to and bump.
  const L = [[44, 12], [60, 4], [57, 13], [57, 34], [74, 6]];
  const li = L.findIndex((q, i) => !w.letters.includes(i) && A2['letter' + i] && !A2['letter' + i].hidden);
  const owed = w.letters.some(i => !w.given.includes(i));
  const pair = id => !!(sv.c2 && sv.c2.f['pair-' + id]);
  const next = !f.notes ? ['basket'] : !f.tower ? [null, 19, 20] : !f.scrap ? [null, 36, 20] : !f.notice ? ['notice'] : !f.sign ? ['sign']
    : !w.lens ? ['#w-lens'] : !f.coo ? ['po'] : !f.bakery ? ['bakery'] : !f.band ? ['band'] : li >= 0 ? ['letter' + li] : !f.runbook ? ['runbook']
    : !f.bridge ? ['bridge'] : !f.seymour ? ['bunker'] : !f.wren ? ['wren', 0, 0, 'tap'] : !f.fire ? ['fire'] : owed ? ['coo', 0, 0, 'tap']
    : !f.town ? [null, 82, 20] : !f.offer ? ['box'] : !f.bells ? ['marrow', 0, 0, 'tap'] : !f.tilly ? ['tilly'] : !f.poster ? ['poster1']
    : !window.__p2.v1 ? ['v1'] : !pair('sunlight') ? [null, 86, 33] : [null, 92, 20, 'tap'];
  const [id, x0, y0, how] = next, tag = id || (x0 + ',' + y0);
  // Each place gets a screenshot first, once, as you arrive near it.
  if (id === '#w-lens') { if (once('lens-shot')) return 'scene:world-lens-off'; return click($('#w-lens')) && 'lens'; }
  if (id === 'v1' && !window.__p2.v1) { /* marked once talked */ }
  if (how === 'tap') {
    const a = id && A2[id], tx = a ? Math.round(a.x) : x0, ty = a ? Math.round(a.y) : y0, at = D.tapAt(tx, ty);
    const dist = Math.abs(pos[0] - tx) + Math.abs(pos[1] - ty);
    if (at && dist <= 6 && window.__tapped !== tag + pos.join()) { window.__tapped = tag + pos.join(); if (once('view-' + tag)) return 'scene:world-' + tag; return 'tap:' + at.join(',') + ':' + tag; }
  }
  const k = D.nextKey(x0, y0, id);
  if (k.none) return 'stuck:no way to ' + tag + ' from ' + pos.slice(0, 2).join(',');
  if (k.here) return 'stuck:at ' + tag + ' and nothing happened';
  if (k.bump && once('view-' + tag)) return 'scene:world-' + tag;
  if (k.bump && id === 'v1') window.__p2.v1 = 1;
  return 'key:' + k.key + ':' + tag;
}

// One browser context for every tab, so a party's tabs find each other (js/net.js talks across tabs locally).
let CTX = null;
async function openPage(browser, name, errors) {
  CTX = CTX || await browser.newContext({ viewport: { width: Number(process.env.W || 390), height: Number(process.env.H || 844) } });
  const page = await CTX.newPage();
  page.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
  page.on('request', r => { if (/\.(webp|png|jpe?g|gif)(\?|$)/i.test(r.url()) && !/\/assets\/img\/(opening|portraits|vn)\//.test(r.url())) errors.push(name + ' raster image requested: ' + r.url().replace(/^.*?\/assets\//, 'assets/')); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push(name + ' console: ' + m.text()); });
  await page.addInitScript(() => { window.SD_TEST = 1; });
  return page;
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch2`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const errors = [], warnings = [];
  const tabs = [];
  const start = async (name, mode, lead) => {
    const page = await openPage(browser, name, errors);
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    if (mode === 'world') { await page.click('#t-start'); await page.click('#t-c2new'); }
    else {
      await page.waitForFunction(() => window.SD && SD.vec && SD.vec.ch2 && SD.vec.ch2.sorting);
      // A save at the top of Thornwick's stair, the world done; then the climb.
      await page.evaluate(([lead, mode]) => {
        const S = SD.state;
        S.save.c1 = { lead, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(x => ({ id: x, up: false })), pos: null };
        S.save.flags.prologue = true; S.save.flags.ch1 = true;
        S.save.c2 = { f: { act1: true, cold: true }, dev: {}, bonus: { vistimeout: true, pattern: true, idem: true }, w: { x: {}, pos: [92, 21], letters: [], given: [], lens: true } };
        S.persist();
        SD.vec.ch2.sorting(mode === 'join' ? 'join' : mode === 'party' ? 'party' : 'solo').then(won => { window.__done = won ? 'won' : 'lost'; });
      }, [lead, mode]);
    }
    tabs.push({ page, name, mode, last: [], done: false, waitSince: Date.now(), waitWhat: '' });
  };
  if (PARTY) { await start('host', 'party', LEAD); await tabs[0].page.waitForTimeout(800); await start('guest', 'join', LEAD === 'dutch' ? 'kai' : 'dutch'); }
  else await start('main', RAID ? 'solo' : 'world', LEAD);
  const shotsTaken = new Set();
  const seen = new Set();
  let steps = 0;
  for (; steps < 12000 && !tabs.every(t => t.done); steps++) {
    for (const t of tabs) {
      if (t.done) continue;
      const page = t.page;
      const what = await page.evaluate(step, [LEAD, t.mode]);
      if (process.env.V && what !== t.last[t.last.length - 1]) console.log(t.name, steps, what);
      t.last.push(what); if (t.last.length > 16) t.last.shift();
      seen.add(what.replace(/^(node|dialog|scene|key|tap|room|camp|mg|raid|stair):.*/, '$1'));
      if (/^(story|node|camp|stair|raid:win)/.test(what)) seen.add(what);
      if (/^stuck:/.test(what)) { errors.push(`${t.name}: the walker got stuck: ${what.slice(6)}`); t.done = true; continue; }
      if (what === 'done' || what === 'end2') { if (what === 'end2' && SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: path.join(SHOTS, t.name + '-end.png') }); } t.done = true; continue; }
      // A wait with nothing to press, for too long, is a forced wait (or a soft lock).
      const waiting = /wait|busy|walking/.test(what);
      if (!waiting) { t.waitSince = Date.now(); t.waitWhat = ''; }
      else if (!t.waitWhat) { t.waitWhat = what; t.waitSince = Date.now(); }
      else if (Date.now() - t.waitSince > 12000) { errors.push(`${t.name}: stuck waiting for 12 s (${what}); last: ${t.last.join(' ')}`); t.done = true; continue; }
      else if (Date.now() - t.waitSince > 5000 && !t.warned) { t.warned = 1; warnings.push(`${t.name}: a ${Math.round((Date.now() - t.waitSince) / 1000)} s wait at ${what}`); }
      if (!waiting) t.warned = 0;
      const sc = /^scene:(.*)/.exec(what);
      // At every new screen: no sideways scroll at phone width, and every button at least 44px to tap.
      if (sc) {
        const au = await page.evaluate(() => {
          const out = [], vw = innerWidth;
          if (document.documentElement.scrollWidth > vw + 1) out.push('E:the page scrolls sideways (' + document.documentElement.scrollWidth + 'px wide)');
          document.querySelectorAll('#panel button, #vn button, #w-hud button, #run button, #dialog button').forEach(el => {
            const r = el.getBoundingClientRect(); if (!r.width || el.disabled || getComputedStyle(el).visibility === 'hidden') return;
            if (r.height < 40 || r.width < 40) out.push('small button (' + Math.round(r.width) + 'x' + Math.round(r.height) + '): ' + (el.id ? '#' + el.id : el.className.split(' ')[0] || 'button') + ' "' + el.textContent.trim().slice(0, 24) + '"');
          });
          return out;
        });
        au.forEach(x => { const k = x.replace(/\(\d+x\d+\)/, '').replace(/"[^"]*"$/, ''); if (seen.has('au:' + k)) return; seen.add('au:' + k); if (x.startsWith('E:')) errors.push(t.name + ' at ' + sc[1] + ': ' + x.slice(2)); else warnings.push(t.name + ' at ' + sc[1] + ': ' + x); });
      }
      if (sc && SHOTS && !shotsTaken.has(t.name + sc[1])) { shotsTaken.add(t.name + sc[1]); await page.waitForTimeout(sc[1].startsWith('vn-') ? 1400 : 700); await page.screenshot({ path: path.join(SHOTS, `${t.name}-${String(shotsTaken.size).padStart(3, '0')}-${sc[1].replace(/[^\w-]+/g, '_').slice(0, 60)}.png`) }); }
      // Real input: a key held until you've stepped (or something opened), a tap where a finger would go.
      const key = /^key:(\w+):(.*)$/.exec(what);
      if (key) {
        const before = await page.evaluate(() => SD.c2world.debug.pos().slice(0, 2).join());
        await page.keyboard.down(key[1]);
        let moved = false;
        for (let i = 0; i < 25 && !moved; i++) {
          await page.waitForTimeout(25);
          moved = await page.evaluate(b => { const p = SD.c2world.debug.pos(); return p.slice(0, 2).join() !== b || !document.getElementById('dialog').hidden || !document.getElementById('panel').hidden || !document.getElementById('vn').hidden || SD.c2world.debug.busy() || !SD.c2world.active; }, before);
        }
        await page.keyboard.up(key[1]);
        t.stuck = moved ? 0 : (t.stuck || 0) + 1;
        if (t.stuck >= 4) { errors.push(`${t.name}: pressing ${key[1]} toward ${key[2]} at ${before} does nothing`); t.done = true; }
        continue;
      }
      const tap = /^tap:(\d+),(\d+):(.*)$/.exec(what);
      if (tap) { await page.mouse.click(+tap[1], +tap[2]); await page.waitForTimeout(250); continue; }
      await page.waitForTimeout(/wait$|busy$|walking$/.test(what) ? 100 : 20);
    }
  }
  const res = await Promise.all(tabs.map(t => t.page.evaluate(() => ({ lead: SD.state.save.c1 && SD.state.save.c1.lead, level: SD.state.save.level, c2: SD.state.save.c2, done: window.__done || null, twist: window.__twist || 0 }))));
  await browser.close(); server.close();
  const sv = res[0];
  console.log('steps', steps, 'saw', [...seen].filter(x => !x.startsWith('au:')).sort().join(' '));
  tabs.forEach(t => { if (!t.done) errors.push(`${t.name} never finished; last: ${t.last.join(' ')}`); });
  if (!RAID && !PARTY) {
    const wx = (sv.c2 && sv.c2.w && sv.c2.w.x) || {};
    const world = ['cold', 'notes', 'tower', 'scrap', 'notice', 'sign', 'coo', 'bakery', 'band', 'bridge', 'seymour', 'wren', 'fire', 'town', 'offer', 'bells', 'tilly', 'poster', 'runbook'].filter(k => !wx[k]);
    if (world.length) errors.push('world flags never set: ' + world.join(', '));
    if (!sv.c2 || !sv.c2.w || sv.c2.w.given.length !== 5) errors.push('not all five letters reached Coo: ' + JSON.stringify(sv.c2 && sv.c2.w && sv.c2.w.given));
    const c2 = ['act1', 'won', 'ship', 'quest', 'done', 'pair-tof', 'pair-unmake', 'pair-sunlight'].filter(k => !sv.c2 || !sv.c2.f[k]);
    if (c2.length) errors.push('chapter 2 flags never set: ' + c2.join(', '));
    if (!sv.c2 || !sv.c2.dev.redrive) errors.push('Coo\'s Redrive Stamp was never given');
    if (!seen.has('stair:not-yet')) errors.push('never said "Not yet" at the stair');
  } else {
    res.forEach((r, i) => { if (r.done !== 'won') errors.push(`${tabs[i].name}: the Sorting Floors weren't cleared (${r.done})`); });
  }
  if (!res.some(r => r.twist)) errors.push('no boss asked an Exam Twist');
  warnings.forEach(w => console.log('warning: ' + w));
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK: ${PARTY ? 'a party of two tabs and two bots cleared the Sorting Floors' : RAID ? 'cleared the Sorting Floors solo' : `walked the chapter 2 demo as ${LEAD} from the title through the act 1 world, Expedition I and camp to the lift`}, no raster images, no errors.`);
})().catch(e => { console.error(e); process.exit(1); });
