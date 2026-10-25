#!/usr/bin/env node
// Checks the emotes (js/emote.js) with two tabs in one party room (js/party.js on js/net.js's local transport, a
// BroadcastChannel): the Emote button opens the picker with the free six; picking one shows a bubble over your own seat
// and over your seat on the other tab, then it goes; one every 1.5 s; packs you haven't bought, made-up ids and junk
// from the room show nothing; a pack bought at the Raid shop (js/marks.js) joins the picker.
// Run from game/:  node tools/emote_check.js
// Needs Playwright (preinstalled in cloud sessions; PLAYWRIGHT_BROWSERS_PATH points at Chromium there).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
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
  let fail = 0;
  const check = (ok, msg) => { if (ok) console.log('ok   ' + msg); else { fail++; console.log('FAIL ' + msg); } };

  for (const vector of [false, true]) {
    const mode = vector ? 'vector' : 'pixel';
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
    const errors = [];
    const [a, b] = [await ctx.newPage(), await ctx.newPage()];
    for (const p of [a, b]) {
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(url + (vector ? '?vector' : ''));
      await p.waitForFunction(() => window.SD && SD.main && SD.emote && SD.party && SD.net);
    }
    // Both tabs join one room as a party and draw it, the way the raid does before it starts.
    const code = 'rem' + (vector ? 'v' : 'p');
    const join = p => p.evaluate(async code => {
      const hub = await SD.net.open(), room = await hub.join('raid-' + code);
      const root = document.createElement('div'); root.id = 'emo-test'; document.body.prepend(root);
      const party = SD.party.join(hub, room, 'raid', {});
      const draw = () => party.render(root, { mode: 'Expedition Raid', code, leader: window.__lead || hub.me.peer, max: 4, leave() {}, start() {} });
      room.presence(Object.assign({ kind: 'raid' }, party.fields()));
      room.onPeers(() => setTimeout(draw, 0));
      window.__t = { hub, room, party, draw };
      draw();
      return hub.me.peer;
    }, code);
    const pa = await join(a);
    await b.evaluate(p => { window.__lead = p; }, pa);
    const pb = await join(b);
    await a.waitForFunction(p => !!document.querySelector(`.pt-mem[data-peer="${p}"]`), pb, { timeout: 5000 }).catch(() => {});
    await b.waitForFunction(p => !!document.querySelector(`.pt-mem[data-peer="${p}"]`), pa, { timeout: 5000 }).catch(() => {});
    check(await b.evaluate(p => !!document.querySelector(`.pt-mem[data-peer="${p}"]`), pa), `${mode}: the other tab sees your seat`);

    const pick = await a.evaluate(() => {
      const btn = document.querySelector('#emo-test [data-emo-open]'); if (!btn) return null;
      btn.click();
      const box = document.querySelector('.emo-pick');
      return box && { n: box.querySelectorAll('[data-emo]').length, acts: box.querySelectorAll('.emo-grid')[1].querySelectorAll('[data-emo]').length, more: (box.querySelector('small') || {}).textContent || '', open: btn.getAttribute('aria-expanded'), focus: document.activeElement && document.activeElement.dataset.emo };
    });
    check(pick && pick.n === 9 && pick.acts === 3 && pick.open === 'true' && pick.focus === 'heart', `${mode}: the Emote button opens the free six and three free actions, focused (${JSON.stringify(pick)})`);
    check(pick && /6 more emote packs/.test(pick.more), `${mode}: the picker says where the rest are`);

    const sent = await a.evaluate(p => {
      document.querySelector('.emo-pick [data-emo="heart"]').click();
      const bub = document.querySelector(`.emo-bub[data-for="${p}"]`), seat = document.querySelector(`.pt-mem[data-peer="${p}"] .pt-stage`).getBoundingClientRect();
      const r = bub && bub.getBoundingClientRect();
      return { closed: !document.querySelector('.emo-pick'), emo: bub && bub.dataset.emo, over: !!r && Math.abs(r.left + r.width / 2 - (seat.left + seat.width / 2)) < 4 && r.bottom <= seat.top + 12,
        again: SD.emote.send('laugh'), locked: SD.emote.send('pumpkin'), junk: SD.emote.send('<img src=x>') };
    }, pa);
    check(sent.closed && sent.emo === 'heart' && sent.over, `${mode}: picking one closes the picker and puts the bubble over your seat`);
    check(sent.again === false, `${mode}: one emote every 1.5 seconds`);
    check(sent.locked === false && sent.junk === false, `${mode}: an unbought pack's emote or a made-up id can't be sent`);

    const seen = await b.waitForFunction(p => { const el = document.querySelector(`.emo-bub[data-for="${p}"]`); return el && el.dataset.emo; }, pa, { timeout: 3000 }).then(h => h.jsonValue()).catch(() => null);
    check(seen === 'heart', `${mode}: the other tab sees it over your seat (${seen})`);
    const placed = await b.evaluate(p => { const r = document.querySelector(`.emo-bub[data-for="${p}"]`).getBoundingClientRect(), s = document.querySelector(`.pt-mem[data-peer="${p}"] .pt-stage`).getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - (s.left + s.width / 2)) < 4; }, pa);
    check(placed, `${mode}: and in the right place, through the room's redraws`);

    // Junk from the room: an id that isn't an emote, HTML, and a second emote inside a second.
    await b.evaluate(() => { const r = window.__t.room; r.emit('emote', { e: '<b>hi</b>' }); r.emit('emote', { e: 'constructor' }); r.emit('emote', { e: 42 }); });
    await a.waitForTimeout(400);
    check(await a.evaluate(p => !document.querySelector(`.emo-bub[data-for="${p}"]`), pb), `${mode}: junk from the room shows nothing`);
    await b.evaluate(() => { const r = window.__t.room; r.emit('emote', { e: 'gg' }); r.emit('emote', { e: 'heart' }); });
    await a.waitForTimeout(400);
    check(await a.evaluate(p => (document.querySelector(`.emo-bub[data-for="${p}"]`) || {}).dataset.emo === 'gg' || null, pb), `${mode}: a second emote within a second is dropped`);

    await a.waitForTimeout(2600);
    check(await a.evaluate(() => !document.querySelector('.emo-bub')), `${mode}: bubbles go after a couple of seconds`);

    // In a raid fight the bubble goes over your fighter (js/raid.js's .rd-fighter), not the party seat behind it.
    const fight = await a.evaluate(p => {
      const f = document.createElement('div'); f.className = 'rd-fighter'; f.dataset.peer = p; f.style.cssText = 'position:fixed;left:600px;top:500px';
      f.innerHTML = '<div class="rd-spr" style="width:80px;height:100px"></div>'; document.body.appendChild(f);
      SD.emote.show(p, 'gg');
      const r = document.querySelector(`.emo-bub[data-for="${p}"]`).getBoundingClientRect(); f.remove();
      return Math.abs(r.left + r.width / 2 - 640) < 4 && r.bottom <= 512;
    }, pa);
    check(fight, `${mode}: in a fight the bubble is over your fighter`);
    // A lead's plain pixel body dances in PixelLab frames (tools/dance_art.py); in a look, or in the vector build, it
    // keeps the code moves.
    const frames = await a.evaluate(async () => {
      const seat = (peer, wear) => { const m = document.createElement('div'); m.className = 'pt-mem'; m.dataset.peer = peer; m.style.cssText = 'position:fixed;left:300px;top:300px';
        m.innerHTML = `<div class="pt-stage" data-spr="kai" data-wear="${wear}"><div class="champ-spr" style="width:63px;height:104px"></div></div>`; document.body.appendChild(m); return m; };
      const m1 = seat('fr-plain', ''), m2 = seat('fr-look', 'look-santa');
      SD.emote.show('fr-plain', 'dance'); SD.emote.show('fr-look', 'dance');
      await new Promise(r => setTimeout(r, 600));
      const pic = document.querySelector('.emo-dance[data-for="fr-plain"]'), spr = m1.querySelector('.champ-spr'), spr2 = m2.querySelector('.champ-spr');
      const out = { pic: !!pic && /dance-kai\.webp/.test(pic.style.backgroundImage), hidden: spr.style.visibility === 'hidden',
        look: !document.querySelector('.emo-dance[data-for="fr-look"]') && /translate/.test(spr2.style.transform) };
      await new Promise(r => setTimeout(r, 3800));
      out.gone = !document.querySelector('.emo-dance') && spr.style.visibility === '';
      m1.remove(); m2.remove();
      return out;
    });
    if (vector) check(!frames.pic && frames.look, `vector: dances stay code moves (${JSON.stringify(frames)})`);
    else check(frames.pic && frames.hidden && frames.look && frames.gone, `pixel: a lead's plain body dances in frames, a look keeps the code moves, then it settles (${JSON.stringify(frames)})`);
    await a.waitForTimeout(2600);

    // An action: the seat's picture moves on both tabs (dance flips and hops), then settles back.
    const danced = await a.evaluate(async p => {
      const sent = SD.emote.send('dance'), locked = SD.emote.send('groove');
      await new Promise(r => setTimeout(r, 700));
      const el = document.querySelector(`.pt-mem[data-peer="${p}"] .pt-stage > .champ-spr`);
      return { sent, locked, moving: !!el && (/translate/.test(el.style.transform) || !!document.querySelector(`.emo-dance[data-for="${p}"]`)), bub: !!document.querySelector(`.emo-bub[data-for="${p}"]`) };
    }, pa);
    check(danced.sent && danced.moving && !danced.bub, `${mode}: an action moves your seat's picture (code moves, or a lead's dance frames), no bubble (${JSON.stringify(danced)})`);
    check(danced.locked === false, `${mode}: an action from an unbought pack can't be sent`);
    const otherDance = await b.waitForFunction(p => { const el = document.querySelector(`.pt-mem[data-peer="${p}"] .pt-stage > .champ-spr`); return el && (/scale\(-1/.test(el.style.transform) || !!document.querySelector(`.emo-dance[data-for=\"${p}\"]`)); }, pa, { timeout: 3000 }).then(() => true).catch(() => false);
    check(otherDance, `${mode}: the other tab sees you dance`);
    await a.waitForTimeout(4200);
    check(await b.evaluate(p => { const el = document.querySelector(`.pt-mem[data-peer="${p}"] .pt-stage > .champ-spr`); return !!el && el.style.transform === '' && el.style.visibility === '' && !document.querySelector('.emo-dance'); }, pa), `${mode}: and the dance ends`);

    const shop = await a.evaluate(() => {
      SD.state.save.mp = SD.state.save.mp || {}; SD.state.save.mp.marks = { n: 500, owned: [] };
      const bought = SD.marks.buy('emo-season');
      SD.ui.closePanel && SD.ui.closePanel();
      window.__t.draw();
      document.querySelector('#emo-test [data-emo-open]').click();
      const box = document.querySelector('.emo-pick'), n = box.querySelectorAll('[data-emo]').length, pumpkin = !!box.querySelector('[data-emo="pumpkin"]');
      box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return { bought, n, pumpkin, closed: !document.querySelector('.emo-pick'), item: !!SD.marks.item('emo-cloud') && SD.marks.item('emo-cloud').slot };
    });
    check(shop.bought && shop.n === 13 && shop.pumpkin, `${mode}: a pack bought at the Raid shop joins the picker (${shop.n})`);
    check(shop.closed, `${mode}: Escape closes the picker`);
    check(shop.item === 'emote', `${mode}: the Raid shop sells the packs`);
    // On the story map, with no party: the bubble goes over your lead, drawn into the map.
    const onMap = await a.evaluate(async () => {
      window.__t.party.leave();
      const cv = document.createElement('canvas'); cv.width = 320; cv.height = 240; document.body.appendChild(cv);
      const sc = SD.scene.create(cv, { map: ['.....', '.....', '.....'], terrain: {}, solid: '', ground: false, clock: false });
      sc.player(2, 1, 'south'); sc.start();
      await new Promise(r => setTimeout(r, 1600));
      const sent = SD.emote.send('pumpkin'), picked = sc.P.emo;
      await new Promise(r => setTimeout(r, 1600));
      const lead = SD.wear.lead() || 'mira'; SD.state.save.c1 = Object.assign({}, SD.state.save.c1, { lead });
      const waved = SD.emote.send('wave'), acting = (SD.emote.acting(lead) || {}).id, bubble = sc.P.emo;
      sc.P.draw = (ctx, fx, fy, ts, t) => SD.c1art.person(ctx, lead, fx, fy, ts, t, sc.P.face, sc.P.moving, null);
      await new Promise(r => setTimeout(r, 300));
      SD.emote.stop();
      const btn = !!new DOMParser().parseFromString(SD.emote.mapButton(), 'text/html').querySelector('#w-emote[data-emo-open]');
      sc.stop();
      return { sent, picked, btn, cleared: !SD.scene.current, waved, acting, bubble };
    });
    check(onMap.waved && onMap.acting === 'wave' && !onMap.bubble, `${mode}: an action on the map is your lead posing, not a bubble`);
    check(onMap.sent && onMap.picked === 'pumpkin', `${mode}: on the story map your lead shows the emote (${JSON.stringify(onMap)})`);
    check(onMap.btn && onMap.cleared, `${mode}: the map has its Emote button, and leaving the map lets go of it`);
    check(!errors.length, `${mode}: no page errors` + (errors.length ? ': ' + errors.join(' | ') : ''));
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log(fail ? `${fail} failed` : 'all passed');
  process.exit(fail ? 1 : 0);
})();
