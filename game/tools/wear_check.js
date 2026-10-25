#!/usr/bin/env node
// Checks the cosmetics (js/wear.js): every lead has its clothing masks; equipping keeps one item a slot and only what
// you own; an outfit repaints your lead's clothes (and nothing outside the mask) on the faceset, the full body and the
// vector figure, and nobody else's; effects and frames go on your bust, your fighter and your party seat; a party
// member's presence can't put junk on a seat; the Wardrobe puts on and takes off.
// Run from game/:  node tools/wear_check.js
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let fail = 0;
  const check = (ok, msg) => { if (ok) console.log('ok   ' + msg); else { fail++; console.log('FAIL ' + msg); } };

  ['kai', 'mira', 'seoyeon', 'dutch'].forEach(l => {
    const need = ['neutral', 'smile', 'sad', 'angry', 'surprised', 'tired', 'stand'].filter(f => !fs.existsSync(path.join(ROOT, 'assets/img/wear/mask', `${l}-${f}.webp`)));
    check(!need.length, `${l}: every clothing mask` + (need.length ? ' (missing ' + need.join(', ') + ')' : ''));
    const looks = fs.readFileSync(path.join(ROOT, 'js/wear.js'), 'utf8').match(/'look-[a-z]+'(?=: \{ slot: 'look')/g).map(x => x.slice(1, -1));
    const art = looks.filter(k => !fs.existsSync(path.join(ROOT, 'assets/img/wear/look', `${k}-${l}.webp`)));
    check(!art.length, `${l}: a full body for every look` + (art.length ? ' (missing ' + art.join(', ') + ')' : ''));
    // Dutch's knee-up stand-in for the cutscenes (js/vn.js LEAD_STAND).
    const stand = l === 'dutch' && looks.filter(k => !fs.existsSync(path.join(ROOT, 'assets/img/wear/look', `${k}-dutch-stand.webp`)));
    if (stand) check(!stand.length, 'dutch: a knee-up body for every look' + (stand.length ? ' (missing ' + stand.join(', ') + ')' : ''));
  });

  for (const vector of [false, true]) {
    const mode = vector ? 'vector' : 'pixel';
    await page.goto(url + (vector ? '?vector' : ''));
    await page.waitForFunction(() => window.SD && SD.main && SD.wear);
    const r = await page.evaluate(async () => {
      const W = SD.wear, out = {}, wait = ms => new Promise(res => setTimeout(res, ms));
      const pixels = async u => { const im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
      // The Raid shop (js/marks.js) decides what's owned; this check owns everything until it tests the shop's say.
      const shopOwns = W.owns;
      W.owns = id => !!W.ITEMS[id];
      out.count = Object.keys(W.ITEMS).length;
      out.slots = W.SLOTS.every(s => Object.values(W.ITEMS).some(it => it.slot === s));
      document.body.dataset.lead = 'kai';
      out.none = W.worn().length;
      out.junk = W.equip('mug') === false && W.equip('hat-beanie') === false && W.slot('mug') === null;
      W.equip('outfit-ember'); W.equip('fx-snow'); W.equip('frame-cafe'); W.equip('outfit-forest');
      out.worn = W.worn().join(',');
      out.saved = JSON.stringify(SD.state.save.fg.wear);
      // The faceset: wait for the recolour, then compare it with the original inside and outside the mask.
      const src = 'assets/img/portraits/kai-neutral.webp';
      const url = await new Promise(res => { const u = W.recolor(src, 'assets/img/wear/mask/kai-neutral.webp', 'outfit-forest', res); if (u) res(u); });
      const [a, b, m] = await Promise.all([pixels(src), pixels(url), pixels('assets/img/wear/mask/kai-neutral.webp')]);
      let inMask = 0, changed = 0, outside = 0, moved = 0;
      for (let y = 0; y < 396; y++) for (let x = 0; x < 342; x++) {
        const i = (y * 342 + x) * 4, k = (Math.floor(y / 3) * 114 + Math.floor(x / 3)) * 4;
        const diff = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        if (m[k] > 127 && a[i + 3] > 127) { inMask++; if (diff > 12) changed++; } else { outside++; if (diff > 0) moved++; }
      }
      out.recolor = inMask > 2000 && changed / inMask > 0.8 && moved === 0;
      const kai = SD.art.portrait('kai', 120, 'neutral');
      out.kai = /src="blob:/.test(kai) && /bust wf frame-cafe/.test(kai) && /wfx fx-snow/.test(kai);
      const mira = SD.art.portrait('mira', 120, 'neutral');
      out.mira = !/blob:|wfx|frame-/.test(mira);
      out.preview = /wfx fx-stardust/.test(W.dressBust('mira', 'neutral', mira, ['fx-stardust']));
      out.hero = /wfx fx-snow wfx-big/.test(W.heroFx());
      out.clean = W.clean(['fx-soot', 'fx-snow', '"><script>', 42, 'frame-temple', 'mug']).join(',');
      // A party seat: the outfit on the sprite, the frame and the effect on the stage.
      const stage = document.createElement('div'), el = document.createElement('div');
      stage.className = 'pt-stage';
      el.style.cssText = 'width:84px;height:138px;background-image:url(assets/img/lead/kai.webp)';
      stage.appendChild(el);
      W.dressSprite(el, 'kai', ['outfit-lunar', 'fx-firework', 'frame-starlit'], stage);
      for (let t = 0; t < 40 && !/blob:/.test(el.style.backgroundImage); t++) await wait(100);
      out.seat = /blob:/.test(el.style.backgroundImage) && stage.classList.contains('frame-starlit') && !!stage.querySelector('.wfx.fx-firework');
      if (SD.vec && SD.vec.fig) {
        const f = SD.vec.fig('kai', 'neutral', 'full'), none = SD.vec.fig('kai', 'neutral', 'full', null, []), other = SD.vec.fig('mira', 'neutral', 'full');
        out.vec = f !== none && decodeURIComponent(f).includes('#2f6b45') && !decodeURIComponent(none).includes('#2f6b45') && !decodeURIComponent(other).includes('#2f6b45');
        out.leadImg = /svg/.test(getComputedStyle(document.body).getPropertyValue('--lead-img'));
      }
      // A look: the full body changes, the portrait doesn't; Restored waits for Freya.
      W.equip('look-santa');
      const bust = SD.art.portrait('kai', 120, 'neutral'), lead = getComputedStyle(document.body).getPropertyValue('--lead-img');
      out.lookBust = !/look-santa/.test(bust);
      out.lookHero = document.body.dataset.lead !== 'kai' || (window.SD_VECTOR ? /svg/.test(lead) : /look-santa-kai\.webp/.test(lead));
      const seat2 = document.createElement('div'), el2 = document.createElement('div');
      el2.style.cssText = 'width:84px;height:138px;background-image:url(assets/img/lead/kai.webp)';
      W.dressSprite(el2, 'kai', ['look-zombie', 'outfit-ember'], seat2);
      out.lookSeat = /look-zombie-kai\.webp/.test(el2.style.backgroundImage);
      out.lookMap = (W.mapLook('kai') || {}).hat === 'santa' && W.mapLook('mira') === null;
      // A story cutscene (js/vn.js): your lead standing in a still, and as a dialogue stand-in; another lead as they are.
      const pixelSprites = { kai: SD.vn.art.sprites.kai, dutch: SD.vn.art.sprites.dutch };
      SD.vn.addScenes({ 'wear-test': { sheet: 'assets/img/vn/m1.webp', frames: 1, frame: 0 } });
      SD.vn.addSprites({ kai: { stand: 'assets/img/lead/kai.webp', pixel: true, faces: {} }, dutch: { stand: 'assets/img/lead/dutch.webp', pixel: true, faces: {} } });
      SD.vn.over['wear-test'] = [{ lead: 1, x: 30, y: 4, h: 90 }];
      const c1 = SD.state.save.c1; SD.state.save.c1 = Object.assign({}, c1, { lead: 'kai' });
      SD.vn.play([['cg', 'wear-test'], ['show', 'kai', 'neutral', 'left'], ['show', 'dutch', 'neutral', 'right'], ['wait', 5000]]);
      await wait(2200);
      const imgs = [...document.querySelectorAll('#vn img')].map(i => i.getAttribute('src'));
      out.lookCut = imgs.some(u => /look-santa-kai\.webp/.test(u)) && imgs.filter(u => /look-santa-kai/.test(u)).length === 2 && imgs.includes('assets/img/lead/dutch.webp') && !imgs.includes('assets/img/lead/kai.webp');
      out.lookCutImgs = imgs.filter(u => /lead|look/.test(u)).join(' ');
      document.querySelector('#vn .vn-skip').click(); await wait(300);
      SD.state.save.c1 = c1; SD.vn.addSprites(pixelSprites); delete SD.vn.over['wear-test'];
      if (SD.vec && SD.vec.fig) {
        const z = SD.vec.fig('kai', 'neutral', 'full', null, ['look-zombie']), plain = SD.vec.fig('kai', 'neutral', 'full', null, []);
        out.lookVec = z !== plain && SD.vec.fig('kai', 'neutral', 'bust', null, ['look-zombie']) === SD.vec.fig('kai', 'neutral', 'bust', null, []);
      }
      const c7 = SD.state.save.c7;
      W.owns = id => !!W.ITEMS[id] && !W.ITEMS[id].trophy;
      SD.state.save.c7 = null;
      out.trophyLocked = W.equip('look-restored') === false;
      SD.state.save.c7 = { f: { done: true } };
      out.trophyEarned = W.equip('look-restored') === true;
      SD.state.save.c7 = c7; W.owns = id => !!W.ITEMS[id];
      W.unequip('look');
      W.unequip('effect');
      out.after = W.worn().join(',');
      W.SLOTS.forEach(s => W.unequip(s));
      // Owning: with a shop loaded, only what's bought.
      const was = { owns: W.owns, price: W.price };
      W.owns = id => id === 'frame-pager'; W.price = () => '99 ✦';
      out.owned = W.equip('fx-soot') === false && W.equip('frame-pager') === true;
      W.open();
      out.locked = document.querySelectorAll('#panel [data-wear]:disabled').length;
      out.priced = (document.querySelector('#panel [data-wear]:disabled small') || {}).textContent;
      document.querySelector('#panel [data-off="frame"]').click();
      out.wardrobeOff = W.worn().length;
      document.querySelector('#panel [data-wear="frame-pager"]').click();
      out.wardrobeOn = W.worn().join(',');
      SD.ui.closePanel(); Object.assign(W, was); W.unequip('frame');
      W.owns = shopOwns;
      out.shop = !SD.marks || (W.owns('fx-soot') === false && W.equip('fx-soot') === false);
      return out;
    });
    check(r.count >= 15 && r.slots, `${mode}: ${r.count} items across outfits, effects and frames`);
    check(r.none === 0, `${mode}: nothing worn on a fresh save`);
    check(r.junk, `${mode}: a mug, an old hat or a made-up id can't be worn`);
    check(r.worn === 'outfit-forest,fx-snow,frame-cafe', `${mode}: one item a slot, the newer outfit replacing the old (${r.worn})`);
    check(r.saved === '{"outfit":"outfit-forest","effect":"fx-snow","frame":"frame-cafe","look":null}', `${mode}: kept in the save as S.save.fg.wear`);
    check(r.recolor, `${mode}: the outfit repaints the clothes and not a pixel outside the mask`);
    check(r.kai, `${mode}: your lead's faceset is recoloured, framed and has the effect`);
    check(r.mira, `${mode}: another lead's faceset has none of it`);
    check(r.preview, `${mode}: a preview list goes on any lead`);
    check(r.hero, `${mode}: your fighter in battle carries the effect`);
    check(r.clean === 'fx-soot,frame-temple', `${mode}: a party member's list keeps real items, one a slot (${r.clean})`);
    check(r.seat, `${mode}: a party seat gets the outfit, the frame and the effect`);
    if (vector) {
      check(r.vec, 'vector: your lead\'s figure wears the outfit\'s colours; [] and other leads don\'t');
      check(r.leadImg, 'vector: your fighter in battle is redrawn when you change');
    }
    check(r.lookBust && r.lookHero && r.lookSeat && r.lookMap, `${mode}: a look dresses your fighter, your party seat and your walker on the map, not your portrait`);
    check(r.lookCut, `${mode}: and your lead in the story's cutscenes, not anyone else (${r.lookCutImgs})`);
    if (vector) check(r.lookVec, 'vector: a look redraws the full figure and leaves the bust alone');
    check(r.trophyLocked && r.trophyEarned, `${mode}: Restored can't be worn until Freya is beaten, then can`);
    check(r.after === 'outfit-forest,frame-cafe', `${mode}: taking the effect off leaves the rest`);
    check(r.owned, `${mode}: with a shop loaded, only bought items can be worn`);
    check(r.locked === r.count - 1 && r.priced === '99 ✦', `${mode}: the Wardrobe shows the rest locked with the shop's price (${r.locked}, ${r.priced})`);
    check(r.wardrobeOff === 0 && r.wardrobeOn === 'frame-pager', `${mode}: the Wardrobe takes off and puts on`);
    check(r.shop, `${mode}: with the Raid shop loaded, nothing unbought can be worn`);
  }

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  server.close();
  console.log(fail ? `${fail} failed` : 'all passed');
  process.exit(fail ? 1 : 0);
})();
