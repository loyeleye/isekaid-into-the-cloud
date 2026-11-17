// The Renovation's living street (Architect's Draft, Beanstalk Row): Ladi's Sogni art in one true perspective.
// Design: project files game-modes/architects-draft/living-world/ (sketch-1-sogni.png, storyboard-1-v2.png), approved
// by Ladi on Nov 16 ("I like this", "All sounds good").
//   - One world in the street painting's own pixels (1920 x 1072, tiled mirrored to the right when a plan needs room).
//     Sizes follow the painting's perspective, measured from the arched door at the far wall: an adult whose feet are at
//     y stands SLOPE * (y - HZ) tall. The houses stand back by the wall at the painted buildings' scale; a cottage is
//     about 4.8 adults tall. Seymour is 6 ft with normal proportions, 1.30 x an adult with his plume; the residents are
//     small folk. Kai stands in front of all of it, life-size, so nothing in the street can match his size.
//   - A camera frames the world: the wide shot while planning, a push-in on whatever is changing during a run, and a
//     close-up of Kai and Seymour for the verdict and the permit. Cuts, not zooms.
//   - Kai breathes, blinks, talks and reacts (five faces). Residents walk with a two-frame cycle.
// Pure DOM, no canvas: houses are buttons while planning, so a tap wraps scaffolding (the batch size).
(function () {
  const IMG = n => `assets/img/reno/street/${n}.webp`;
  const W = 1920, H = 1072, HZ = 662, SLOPE = 1.87;
  const ph = feet => SLOPE * (feet - HZ);
  const FEET = 702, ADULT = ph(FEET), HOUSE = ADULT / 0.21;
  const GATE_X = 330, X0 = 640, STEP = 245, SLOT_W = 236;
  const RES_FEET = FEET + 14, SEY_FEET = FEET + 12;
  const SEY_H = ph(SEY_FEET) * 1.30;                       // Seymour with his plume, from seymour-proud (1000px tall)
  const SEY_SRC = { proud: 1000, inspect: 980, approve: 1004, disapprove: 989, stamp: 997 };   // same pixel scale
  const AR = { 'house-old': 398 / 600, 'house-new': 410 / 600, 'house-scaf': 453 / 600, 'house-dark': 319 / 600, gate: 473 / 520, lot: 469 / 200,
    'res-a': 134 / 240, 'res-b': 146 / 240, 'res-soot': 165 / 260, 'sey-proud': 391 / 1000, 'sey-inspect': 621 / 980, 'sey-approve': 397 / 1004, 'sey-disapprove': 568 / 989, 'sey-stamp': 461 / 997 };
  const HOUSE_SP = { up: { old: 'house-old', new: 'house-new' }, scaf: { old: 'house-scaf', new: 'house-scaf' }, dark: { old: 'house-dark', new: 'house-dark' } };
  const HOUSE_SAYS = { up: { old: 'old version, open', new: 'new version, open' }, scaf: { old: 'under scaffolding', new: 'under scaffolding' }, dark: { old: 'dark: failed its health check', new: 'dark: failed its health check' } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const px = n => Math.round(n * 10) / 10 + 'px';

  // A house's slot never changes during a job: the original houses keep theirs, rented ones go to the right, and a new
  // street (blue/green, traffic splitting) starts one slot further on, past its signpost.
  const slotOf = h => h.id + (h.env === 'b' ? 1 : 0);
  const slotX = i => X0 + i * STEP;
  const centreX = i => slotX(i) + SLOT_W / 2;

  // One sprite standing with its feet at (cx, feet), h tall in world pixels.
  function stand(name, h, cx, feet, o) {
    o = o || {};
    const w = h * (AR[name] || 0.6);
    const style = `left:${px(cx - w / 2)};top:${px(feet - h)};width:${px(w)};height:${px(h)};${o.z ? 'z-index:' + o.z + ';' : ''}${o.style || ''}`;
    return `<img class="rs-sp ${o.cls || ''}" src="${IMG(name)}" alt="${esc(o.alt || '')}" draggable="false" style="${style}">`;
  }
  const shadow = (cx, feet, w) => `<i class="rs-shadow" style="left:${px(cx - w * 0.45)};top:${px(feet - w * 0.05)};width:${px(w * 0.9)};height:${px(w * 0.1)}"></i>`;

  // ---- The world: background, gate, houses (or the plan's ghosts), residents, Seymour ----
  // street: { houses, ghost?: { houses:[{g}], extra, lane, bLane }, tick?: an aws-deploy tick, bad?: the cracked run,
  //           seymour?: pose, tap?: true to make the first three houses buttons that set the batch, turned?: marks }
  function world(o) {
    const hs = o.tick ? o.tick.houses : (o.ghost ? o.ghost.houses : []);
    let lastSlot = 0, out = '';
    const houses = hs.map(h => {
      const slot = slotOf(h); lastSlot = Math.max(lastSlot, slot);
      const st = h.st || 'up', v = h.v || 'old';
      const name = (HOUSE_SP[st] || HOUSE_SP.up)[v] || 'house-old';
      const hh = HOUSE * (st === 'dark' ? 0.97 : st === 'scaf' ? 1.01 : 1);
      return { h, slot, name, hh, say: (h.rented ? 'rented house, ' : 'house, ') + ((HOUSE_SAYS[st] || HOUSE_SAYS.up)[v] || '') };
    });
    // The plan's ghosts: rented lots, a new street's lots, each with a pale new house in blueprint ink.
    const ghosts = [];
    if (o.ghost) {
      const n = o.ghost.houses.length;
      for (let i = 0; i < (o.ghost.extra || 0); i++) ghosts.push(n + i);
      for (let i = 0; i < (o.ghost.lane || 0); i++) ghosts.push(n + i + (o.ghost.bLane ? 1 : 0));
      ghosts.forEach(s => { lastSlot = Math.max(lastSlot, s); });
    }
    const worldW = Math.max(W, slotX(lastSlot) + SLOT_W + 260);
    // The painting, then its mirror image, and so on: the edges always meet.
    for (let i = 0; i * W < worldW; i++) out += `<img class="rs-bg${i % 2 ? ' flip' : ''}" src="${IMG('street')}" alt="" draggable="false" style="left:${i * W}px">`;
    // The gate (the load balancer), its slate easel and its turned-away marks.
    const gH = HOUSE * 0.95, gW = gH * AR.gate, gx = GATE_X + gW / 2;
    out += shadow(gx, FEET + 4, gW) + stand('gate', gH, gx, FEET + 4, { alt: 'the gate: the load balancer' });
    if (o.turned) out += `<b class="rs-marks" style="left:${px(GATE_X + gW * 0.52)};top:${px(FEET - gH * 0.62)}">${'✗'.repeat(Math.min(o.turned, 12))}</b>`;
    // New street signpost.
    const bStart = hs.filter(h => h.env === 'b').map(slotOf).concat(o.ghost && o.ghost.bLane ? [o.ghost.houses.length + 1] : []);
    if (bStart.length) { const s = Math.min.apply(null, bStart) - 1; out += `<span class="rs-post" style="left:${px(centreX(s) - 70)};top:${px(FEET - 150)}">New street →</span>`; }
    // Ghost lots first (they're on the ground), then houses.
    ghosts.forEach(s => {
      out += stand('lot', SLOT_W / AR.lot, centreX(s), FEET + 14, { cls: 'rs-lot' });
      out += stand('house-new', HOUSE, centreX(s) + 6, FEET, { cls: 'rs-ghost', alt: 'planned new house' });
    });
    houses.forEach(x => {
      const cx = centreX(x.slot), w = x.hh * (AR[x.name] || 0.66);
      if (x.h.rented && o.tick) out += stand('lot', SLOT_W / AR.lot, cx, FEET + 14, { cls: 'rs-lot' });
      out += shadow(cx, FEET, w * 0.9) + stand(x.name, x.hh, cx, FEET, { alt: x.say, cls: 'rs-house' + (x.h.rented ? ' rented' : '') });
      if (x.h.g) out += `<i class="rs-batch g${x.h.g % 2}" style="left:${px(slotX(x.slot) - 6)};top:${px(FEET - HOUSE - 12)};width:${px(SLOT_W + 12)};height:${px(HOUSE + 22)}"><b>${x.h.g}</b></i>`;
    });
    // While planning: tap a house to wrap it and the ones before it in scaffolding (the first batch).
    if (o.tap) houses.slice(0, 3).forEach((x, i) => {
      out += `<button class="rs-hb" data-house="${i + 1}" aria-label="Scaffold ${i + 1} ${i ? 'houses' : 'house'} per batch" style="left:${px(slotX(x.slot))};top:${px(FEET - HOUSE)};width:${px(SLOT_W)};height:${px(HOUSE)}"></button>`;
    });
    // Seymour, by the gate.
    if (o.seymour) { const sp = 'sey-' + o.seymour; out += shadow(GATE_X + gW + 40, SEY_FEET, 60) + stand(sp, SEY_H * SEY_SRC[o.seymour] / 1000, GATE_X + gW + 40, SEY_FEET, { alt: 'Sir Seymour Backups', z: 3 }); }
    // Residents: one in front of each house that served someone this tick, soot on the ones who met the crack, and
    // the turned-away ones in a line at the gate.
    if (o.tick) out += folk(o.tick, houses, gx, gW);
    else if (o.folk) out += folk({ served: o.folk, soot: 0, turned: 0 }, houses, gx, gW);
    return { html: out, width: worldW, houses };
  }
  function folk(t, houses, gx, gW) {
    const rh = ph(RES_FEET) * 0.72, sh = ph(RES_FEET) * 0.78;
    const up = houses.filter(x => x.h.st === 'up' || x.h.st === 'dark');
    const newOnes = up.filter(x => x.h.v === 'new'), oldOnes = up.filter(x => x.h.v === 'old' && x.h.st === 'up');
    let soot = Math.min(t.soot || 0, newOnes.length), ok = Math.max(0, (t.served || 0) - (t.soot || 0));
    const spots = [];
    newOnes.slice(0, soot).forEach(x => spots.push([x, 1]));
    oldOnes.concat(newOnes.slice(soot).filter(x => x.h.st === 'up')).slice(0, ok).forEach(x => spots.push([x, 0]));
    let out = '';
    spots.forEach(([x, s], i) => {
      const cx = centreX(x.slot) + (i % 2 ? 26 : -26);
      out += `<span class="rs-walk${s ? ' soot' : ''}" style="animation-delay:${-(i * 0.17).toFixed(2)}s">${s
        ? stand('res-soot', sh, cx, RES_FEET + 4, { alt: 'a resident with soot' })
        : stand('res-a', rh, cx, RES_FEET, { cls: 'a', alt: 'a resident' }) + stand('res-b', rh, cx, RES_FEET, { cls: 'b', alt: '' })}</span>`;
    });
    for (let i = 0; i < Math.min(t.turned || 0, 6); i++) out += stand('res-a', rh, gx - gW * 0.3 - i * 46, RES_FEET + 8, { cls: 'rs-turned', alt: 'a resident turned away', style: 'transform:scaleX(-1);' });
    return out;
  }

  // ---- Night 3, the Blueprint Office: a stack in the Office's yard, torn down by DeletionPolicy ----
  // Each resource stands in a slot: the rooms are a cottage (EC2), the records well (RDS), the ledger cabinet
  // (DynamoDB) and the notice board (S3). After the teardown: Delete leaves rubble, Retain leaves it standing with a
  // wax-sealed tag (and it keeps costing lumber), Snapshot leaves a glass jar holding a tiny copy.
  // YARD_ART: [file, width / height, height in adults]. Until Ladi's renders arrive, the old PixelLab sprites stand in.
  // The yard is painted from much closer than the street: the garden wall's foot is at y 795 and an adult standing on
  // the yard (feet at y 860) is about 230px tall, from the wall (about 5.5 ft) and the lamp posts.
  const YF = 860, YA = 230, YX0 = 600, YSTEP = 380;
  const yx = i => YX0 + i * YSTEP;
  const YARD_ART = {
    bg: 'office-yard',
    ec2: ['house-old', AR['house-old'], 1.9], rds: ['../well', 39 / 42, 2.0], ddb: ['../ledger', 41 / 48, 2.0], s3: ['../board', 41 / 44, 2.1],
    jar: ['../jar', 28 / 32, 0.9], rubble: ['lot', AR.lot, 0.7], seal: null
  };
  const yardSp = (k, cx, feet, o) => {
    const a = YARD_ART[k]; if (!a) return '';
    const h = YA * a[2], w = h * a[1];
    return `<img class="rs-sp ${(o && o.cls) || ''}${a[0].startsWith('../') ? ' rs-px' : ''}" src="${IMG(a[0])}" alt="${esc((o && o.alt) || '')}" draggable="false" style="left:${px(cx - w / 2)};top:${px(feet - h)};width:${px(w)};height:${px(h)}">`;
  };
  const YARD_SAYS = { ec2: 'the rooms (an EC2 instance)', rds: 'the records well (an RDS database)', ddb: 'the ledger cabinet (a DynamoDB table)', s3: 'the notice board (an S3 bucket)' };
  // o: { stack: [{ id, type, name }], plan: { id: policy }, res: teardown results (or null while planning),
  //      upto: how many resources the teardown has reached, tap: true to make each a button that cycles its policy }
  function yard(o) {
    let out = '';
    const n = o.stack.length, worldW = Math.max(W, yx(n - 1) + 260);
    for (let i = 0; i * W < worldW; i++) out += `<img class="rs-bg${i % 2 ? ' flip' : ''}" src="${IMG(YARD_ART.bg)}" alt="" draggable="false" style="left:${i * W}px">`;
    o.stack.forEach((r, i) => {
      const cx = yx(i), res = o.res && i < (o.upto == null ? n : o.upto) ? o.res.find(x => x.id === r.id) : null;
      const pol = res ? res.policy : (o.plan && o.plan[r.id]) || 'Delete';
      if (!res) out += shadow(cx, YF, 300) + yardSp(r.type, cx, YF, { alt: `${r.name}: ${YARD_SAYS[r.type]}, marked ${pol}` });
      else if (res.kept === 'running') out += shadow(cx, YF, 300) + yardSp(r.type, cx, YF, { alt: `${r.name}, kept running (Retain)`, cls: 'rs-kept' }) + `<b class="rs-seal" style="left:${px(cx + 60)};top:${px(YF - YA * 1.2)}">⚙</b>`;
      else if (res.kept === 'snapshot') out += yardSp('rubble', cx, YF + 10, { alt: '' }) + yardSp('jar', cx, YF + 6, { alt: `${r.name}: a snapshot in a jar, then deleted`, cls: 'rs-jar' });
      else out += yardSp('rubble', cx, YF + 10, { alt: `${r.name}: deleted, and its data with it`, cls: 'rs-gone' });
      out += `<span class="rs-plq${res ? ' done' : ''}" style="left:${px(cx - 90)};top:${px(YF + 24)}">${esc(pol)}</span>`;
      if (o.tap && !o.res) out += `<button class="rs-hb" data-res="${esc(r.id)}" aria-label="${esc(r.name)}: change its DeletionPolicy (now ${esc(pol)})" style="left:${px(cx - YSTEP / 2 + 10)};top:${px(YF - YA * 2.3)};width:${px(YSTEP - 20)};height:${px(YA * 2.3 + 80)}"></button>`;
    });
    return { html: out, width: worldW, kind: 'yard' };
  }

  // ---- The scene: the world inside a camera, plus the foreground (Kai, and Seymour for close-ups) and the UI layer ----
  // o: world options + { shot: 'wide' | 'push' | 'close', focus: slot to push in on, kai: face, close: Seymour's pose,
  //      ui: html laid over the scene, label }
  function scene(o) {
    const w = o.stack ? yard(o) : world(o);
    const kai = o.kai ? `<img class="rs-kai" src="${IMG('kai-' + o.kai)}" alt="Kai" draggable="false" data-face="${esc(o.kai)}">` : '';
    const sey = o.close ? `<img class="rs-sey" src="${IMG('sey-' + o.close)}" alt="Sir Seymour Backups" draggable="false" style="--sh:${SEY_SRC[o.close] / 1000}">` : '';
    return `<div class="rs shot-${o.shot || 'wide'}${o.close ? ' rs-close' : ''}" data-ww="${Math.round(w.width)}" data-shot="${o.shot || 'wide'}" data-focus="${o.focus == null ? '' : o.focus}" data-kind="${w.kind || 'street'}" role="img" aria-label="${esc(o.label || 'Beanstalk Row: the gate and the houses')}">
      <div class="rs-cam"><div class="rs-sizer"><div class="rs-world" style="width:${Math.round(w.width)}px">${w.html}</div></div></div>
      <div class="rs-fg">${kai}${sey}</div><div class="rs-ui">${o.ui || ''}</div></div>`;
  }

  // The camera: a rectangle of the world, fitted to the scene's box. Planning scrolls sideways; runs cut between shots.
  function frame(el) {
    const cam = el.querySelector('.rs-cam'), sizer = el.querySelector('.rs-sizer'), wd = el.querySelector('.rs-world');
    if (!cam || !wd) return;
    const CW = cam.clientWidth, CH = cam.clientHeight; if (!CW || !CH) return;
    const wide = CW / CH >= 1.25;
    el.classList.toggle('rs-wide', wide);
    const ww = +el.dataset.ww || W, shot = el.dataset.shot;
    let y0, h, cx;
    const isYard = el.dataset.kind === 'yard';
    if (shot === 'push' && isYard) { h = H / (wide ? 1.7 : 1.4); y0 = YF - YA * 1.1 - h / 2 + 40; cx = el.dataset.focus !== '' ? yx(+el.dataset.focus) : W / 2; }
    else if (shot === 'push') { h = H / (wide ? 2.4 : 2.0); y0 = FEET - HOUSE * 0.5 - h / 2 + 30; cx = el.dataset.focus !== '' ? centreX(+el.dataset.focus) : (X0 + W) / 2; }
    else if (shot === 'close') { h = H; y0 = 0; cx = W / 2; }
    else if (wide) { h = H; y0 = 0; cx = W / 2; }
    else { h = 900; y0 = 172; cx = isYard ? yx(0) : centreX(0); }          // a phone: the street and the plaza, little sky
    // Fit the shot's height, but always cover the box: a wide box shows less sky rather than a dark edge.
    const s = Math.max(CH / h, CW / ww), vh = CH / s;
    if (vh < h) y0 = shot === 'push' ? y0 + (h - vh) / 2 : y0 + (h - vh);   // a push stays centred; the others keep the plaza
    // Never show past the painting's bottom edge or the world's ends.
    y0 = Math.max(0, Math.min(y0, H - vh));
    sizer.style.width = Math.round(ww * s) + 'px'; sizer.style.height = CH + 'px';
    wd.style.transform = `translate(0, ${-y0 * s}px) scale(${s})`;
    const left = Math.max(0, Math.min(cx * s - CW / 2, ww * s - CW));
    if (shot !== 'wide' || !el.dataset.framed) cam.scrollLeft = left;
    el.dataset.framed = '1';
  }

  // Kai: breath (CSS), a blink every few seconds, talking for a line, and a held reaction.
  function kaiLife(el) {
    const img = el.querySelector('.rs-kai'); if (!img || img.dataset.alive) return;
    img.dataset.alive = '1';
    let base = img.dataset.face || 'neutral', busy = 0;
    ['neutral', 'blink', 'talk', 'happy', 'worried'].forEach(f => { const i = new Image(); i.src = IMG('kai-' + f); });
    const set = f => { img.src = IMG('kai-' + f); };
    const blink = () => {
      if (!img.isConnected) return;
      if (!busy && base === 'neutral' && !reduced()) { set('blink'); setTimeout(() => { if (!busy) set(base); }, 140); }
      setTimeout(blink, 2400 + Math.random() * 2600);
    };
    setTimeout(blink, 1500);
    img.rsTalk = ms => {
      if (reduced()) return;
      busy++; let k = 0;
      const iv = setInterval(() => { if (!img.isConnected) return clearInterval(iv); set(k++ % 2 ? base : 'talk'); }, 170);
      setTimeout(() => { clearInterval(iv); busy--; set(base); }, ms || 1800);
    };
    img.rsFace = f => { base = f; set(f); };
  }

  function mount(root) {
    root.querySelectorAll('.rs').forEach(el => {
      frame(el); kaiLife(el);
      if (window.ResizeObserver && !el.rsRO) { el.rsRO = new ResizeObserver(() => frame(el)); el.rsRO.observe(el); }
      const k = el.querySelector('.rs-kai'); if (k && k.rsTalk && el.dataset.talk !== 'done' && el.querySelector('.rs-say')) { el.dataset.talk = 'done'; k.rsTalk(2000); }
    });
  }
  // A new tick: redraw the world only, so the camera box, Kai and the UI stay put.
  function update(el, o) {
    const w = o.stack ? yard(o) : world(o), wd = el.querySelector('.rs-world');
    wd.innerHTML = w.html; wd.style.width = Math.round(w.width) + 'px'; el.dataset.ww = Math.round(w.width);
    frame(el); return w;
  }
  // Change the shot (a cut) without rebuilding the scene.
  function cut(el, shot, focus) { el.dataset.shot = shot; el.dataset.focus = focus == null ? '' : focus; el.className = el.className.replace(/shot-\w+/, 'shot-' + shot); frame(el); }

  const css = document.createElement('style');
  css.id = 'reno-street-css';
  css.textContent = `
    .rs { position: relative; width: 100%; height: min(64vh, 470px); overflow: hidden; background: #2a1f22; color: #fff; isolation: isolate; }
    @media (min-width: 700px) { .rs { height: auto; aspect-ratio: 16 / 9; max-height: 72vh; } }
    .rs-cam { position: absolute; inset: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
    .shot-push .rs-cam, .shot-close .rs-cam, .rs.rs-run .rs-cam { overflow: hidden; }
    .rs-sizer { position: relative; overflow: hidden; }
    .rs-world { position: absolute; left: 0; top: 0; height: ${H}px; transform-origin: 0 0; }
    .rs-bg { position: absolute; top: 0; width: ${W}px; height: ${H}px; }
    .rs-bg.flip { transform: scaleX(-1); }
    .rs-sp { position: absolute; display: block; max-width: none; image-rendering: auto; pointer-events: none; }
    .rs-shadow { position: absolute; border-radius: 50%; background: radial-gradient(rgba(25,12,6,.5), rgba(25,12,6,0) 70%); pointer-events: none; }
    .rs-lot { opacity: .95; }
    .rs-ghost { opacity: .5; filter: grayscale(1) sepia(1) hue-rotate(175deg) saturate(3) brightness(1.25); outline: 4px dashed #bfe0ff; outline-offset: 4px; }
    .rs-house.rented { filter: drop-shadow(0 0 10px rgba(255,212,90,.9)); }
    .rs-batch { position: absolute; border: 6px dashed #bfe0ff; border-radius: 18px; pointer-events: none; }
    .rs-batch.g0 { border-color: #ffd45a; }
    .rs-batch b { position: absolute; top: -34px; left: 50%; transform: translateX(-50%); font: 800 36px/1 var(--f-head, sans-serif); min-width: 54px; padding: 6px 8px; text-align: center; border-radius: 28px; background: #1f4e8c; color: #fff; border: 3px solid #bfe0ff; }
    .rs-hb { position: absolute; background: none; border: 0; padding: 0; cursor: pointer; border-radius: 14px; }
    .rs-hb:focus-visible { outline: 6px solid #ffd45a; }
    .rs-marks { position: absolute; color: #ff5a4a; font: 900 44px/1 sans-serif; letter-spacing: -6px; text-shadow: 0 2px 0 #000; white-space: nowrap; z-index: 2; }
    .rs-post { position: absolute; font: 800 28px/1 var(--f-head, sans-serif); padding: 8px 14px; border-radius: 8px; background: #6b4423; border: 3px solid #3b2410; color: #ffe9b8; white-space: nowrap; }
    .rs-walk { position: absolute; left: 0; top: 0; animation: rs-in .55s ease-out both; }
    .rs-walk .b { animation: rs-step .5s steps(1) infinite; } .rs-walk .a { animation: rs-step .5s steps(1) infinite reverse; }
    @keyframes rs-step { 0% { opacity: 0; } 50% { opacity: 1; } }
    @keyframes rs-in { from { transform: translateX(70px); } to { transform: none; } }
    .rs-turned { opacity: .85; filter: saturate(.6); }
    .rs-px { image-rendering: pixelated; }
    .rs-gone { opacity: .9; } .rs-kept { filter: drop-shadow(0 0 12px rgba(255,212,90,.85)); }
    .rs-jar { filter: drop-shadow(0 0 16px rgba(190,230,255,.9)); animation: rs-pop .5s ease-out both; }
    @keyframes rs-pop { from { transform: translateY(-60px) scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }
    .rs-seal { position: absolute; font: 900 54px/1 sans-serif; color: #fff; background: #b23b3b; border: 4px solid #6e1c1c; border-radius: 50%; width: 72px; height: 72px; display: grid; place-items: center; }
    .rs-plq { position: absolute; width: 180px; text-align: center; font: 800 30px/1.2 var(--f-head, sans-serif); color: #3a2a12; background: linear-gradient(#ffe58a, #e0a030); border: 3px solid #5a3a12; border-radius: 10px; padding: 4px 0; }
    .rs-plq.done { background: linear-gradient(#e6d3a3, #b99b5e); }
    .rs-fg { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
    .rs-kai { position: absolute; left: 0; bottom: -8%; height: 96%; width: auto; transform-origin: 50% 100%; animation: rs-breathe 3.6s ease-in-out infinite alternate; filter: drop-shadow(0 6px 10px rgba(0,0,0,.45)); }
    @keyframes rs-breathe { from { transform: scaleY(1); } to { transform: scaleY(1.008) translateY(-1px); } }
    /* A phone, or a run: Kai talks from a portrait frame instead of standing in front of the street. */
    .rs:not(.rs-wide) .rs-kai, .rs.shot-push .rs-kai { left: 10px; top: auto; bottom: 10px; height: auto; width: 84px; aspect-ratio: 1; object-fit: cover; object-position: 50% 3%; border-radius: 14px; border: 3px solid #ffd45a; background: #3a2b26; animation: none; }
    @media (min-width: 700px) { .rs.shot-push .rs-kai { width: 120px; } }
    /* The close-up: Kai and Seymour on one front plane, so Seymour is a true head taller (1.30 x, plume included). */
    .rs-close .rs-cam { filter: brightness(.62) saturate(.8); }
    .rs.rs-close .rs-kai, .rs:not(.rs-wide).rs-close .rs-kai { left: 2%; bottom: -6%; height: 78%; width: auto; top: auto; aspect-ratio: auto; border: 0; background: none; border-radius: 0; object-fit: fill; animation: rs-breathe 3.6s ease-in-out infinite alternate; }
    .rs-sey { position: absolute; right: 3%; bottom: -6%; height: calc(78% * 1.3 * var(--sh, 1)); width: auto; filter: drop-shadow(0 6px 10px rgba(0,0,0,.45)); }
    .rs:not(.rs-wide).rs-close .rs-kai { height: 62%; left: 0; width: auto; }
    .rs:not(.rs-wide) .rs-hidephone { display: none; }
    .rs:not(.rs-wide) .rs-sey { height: calc(62% * 1.3 * var(--sh, 1)); right: 0; max-width: 58%; object-fit: contain; object-position: right bottom; }
    .rs-ui { position: absolute; inset: 0; pointer-events: none; z-index: 3; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; gap: 8px; }
    .rs-ui > * { pointer-events: auto; }
    .rs-row { display: flex; gap: 8px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; }
    .rs-col { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
    .rs-chip { display: inline-block; background: rgba(23,19,31,.82); color: #fff; border-radius: 10px; padding: 4px 10px; font-weight: 700; font-size: 14px; }
    .rs-chip.ok { background: rgba(40,140,80,.92); } .rs-chip.bad { background: rgba(178,59,59,.95); } .rs-chip.warn { background: rgba(200,120,20,.95); } .rs-chip.plan { background: rgba(31,78,140,.92); border: 1px dashed #bfe0ff; }
    .rs-say { max-width: min(460px, 70%); background: #fffaec; color: #1e1914; border: 3px solid #2a1f19; border-radius: 18px; padding: 8px 12px; font-size: 15px; line-height: 1.3; }
    .rs-wide .rs-say { margin-left: 22%; }
    .rs:not(.rs-wide) .rs-say, .shot-push .rs-say { margin-left: 0; }
    .rs-close .rs-say { margin: 0 0 0 auto; max-width: min(380px, 58%); }
    .rs-bar { display: flex; align-items: center; gap: 8px; align-self: flex-end; background: rgba(23,19,31,.88); border-radius: 14px; padding: 6px 8px 6px 12px; max-width: 100%; }
    .rs-bar b { color: #ffe6aa; font-size: 14px; white-space: nowrap; }
    .rs-ticks { display: flex; gap: 3px; flex-wrap: wrap; }
    .rs-ticks i { width: 12px; height: 12px; border-radius: 3px; background: #555066; } .rs-ticks i.on { background: #ffd45a; }
    .rs.rs-run::before, .rs.rs-run::after { content: ''; position: absolute; left: 0; right: 0; height: 5%; background: #000; z-index: 4; pointer-events: none; }
    .rs.rs-run::before { top: 0; } .rs.rs-run::after { bottom: 0; }
    .rs.rs-run .rs-ui { padding-top: calc(5% + 6px); padding-bottom: calc(5% + 6px); }
    .rs.rs-run .rs-kai { bottom: calc(5% + 10px); }
    .rs-ui .rn-chalk { max-width: 420px; }
    .rs:not(.rs-wide) .rs-ui .rn-chalk { display: none; }
    @media (prefers-reduced-motion: reduce) { .rs-kai, .rs-walk, .rs-walk .a, .rs-walk .b { animation: none !important; } .rs-walk .b { opacity: 0; } }
  `;
  document.head.appendChild(css);

  SD.renoStreet = { scene, mount, cut, update, frame, world, yard, slotOf, FEET, HOUSE, ADULT, SEY_H, ph };
})();
