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
    'res-a': 134 / 240, 'res-b': 146 / 240, 'res-pa': 142 / 245, 'res-pb': 141 / 245, 'res-soot': 165 / 260, 'sey-proud': 391 / 1000, 'sey-inspect': 621 / 980, 'sey-approve': 397 / 1004, 'sey-disapprove': 568 / 989, 'sey-stamp': 461 / 997 };
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
    if (o.seymour) { const sp = 'sey-' + o.seymour; out += shadow(GATE_X + gW + 40, SEY_FEET, 60) + stand(sp, SEY_H * SEY_SRC[o.seymour] / 1000, GATE_X + gW + 40, SEY_FEET, { alt: 'Sir Seymour Backups' }); }
    // Residents: one in front of each house that served someone this tick, soot on the ones who met the crack, and
    // the turned-away ones in a line at the gate.
    if (o.tick) out += folk(Object.assign({ live: true }, o.tick), houses, gx, gW);
    else if (o.folk) out += folk({ served: o.folk, soot: 0, turned: 0 }, houses, gx, gW);
    return { html: out, width: worldW, houses };
  }
  // ---- Walking: a resident who travels along a path, stepping through the walk frames, growing as they come nearer ----
  // The path is resampled to equal steps so the pace is even, and the frames step every quarter second while they walk.
  // A walker who arrives stops on the first frame (standing). WALK lists the frames in cycle order.
  const WALK = ['res-a', 'res-pa', 'res-b', 'res-pb'];   // stride, passing, the other stride, passing
  function traveler(frames, hAt, pts, o) {
    o = o || {};
    const [x0, y0] = pts[0], h0 = hAt(y0);
    // Resample the path to three equal steps.
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    const at = t => { if (!L) return pts[0]; let r = t * L; for (let i = 0; i < seg.length; i++) { if (r <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, r / seg[i]) : 1; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } r -= seg[i]; } return pts[pts.length - 1]; };
    const moving = L > 0 && !reduced();
    let vars = `transform-origin:${px(x0)} ${px(y0)};`;
    [1, 2, 3].forEach(i => { const [x, y] = at(i / 3); vars += `--x${i}:${px(x - x0)};--y${i}:${px(y - y0)};--s${i}:${(hAt(y) / h0).toFixed(3)};`; });
    const dur = o.dur || 1.2, loop = !!o.loop, n = frames.length;
    const anim = moving ? `animation:rs-path ${dur}s linear ${(o.delay || 0).toFixed(2)}s ${loop ? 'infinite' : 1} both;` : '';
    const flip = o.flip ? 'transform:scaleX(-1);' : '';
    const steps = loop ? 'infinite' : Math.max(1, Math.round(dur / 0.5));
    const imgs = frames.map((f, i) => {
      const st = n > 1 && moving ? `animation:rs-f${n}-${i} .5s linear ${(-(o.phase || 0)).toFixed(2)}s ${steps} both;` : (i ? 'opacity:0;' : '');
      return stand(f, h0 * ((o.scale && o.scale[f]) || 1), x0, y0, { alt: i ? '' : (o.alt || ''), style: flip + st });
    }).join('');
    return `<span class="rs-trav${o.cls ? ' ' + o.cls : ''}" style="${vars}${anim}">${imgs}</span>`;
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
    // Each tick, the residents walk the last stretch home from the direction of the gate; the sooty ones walk back out.
    // While planning (no tick) they stand at their doors.
    const live = !!t.live, hAt = y => ph(y) * 0.72;
    spots.forEach(([x, s], i) => {
      const cx = centreX(x.slot) + (i % 2 ? 26 : -26);
      out += s
        ? traveler(['res-soot'], y => ph(y) * 0.78, live ? [[cx, RES_FEET + 4], [cx - 150, RES_FEET + 8]] : [[cx, RES_FEET + 4]], { alt: 'a resident with soot', dur: 0.6, delay: i * 0.04 })
        : traveler(WALK, hAt, live ? [[cx - 170, RES_FEET + 6], [cx, RES_FEET]] : [[cx, RES_FEET]], { alt: 'a resident', flip: true, dur: 0.55, delay: i * 0.04, phase: i * 0.13 });
    });
    for (let i = 0; i < Math.min(t.turned || 0, 6); i++) {
      const x = gx - gW * 0.3 - i * 46;
      out += traveler(WALK, hAt, live ? [[x + 90, RES_FEET + 8], [x, RES_FEET + 8]] : [[x, RES_FEET + 8]], { cls: 'rs-turned', alt: 'a resident turned away', dur: 0.55, phase: i * 0.11 });
    }
    return out;
  }

  // ---- Night 3, the Blueprint Office: a stack in the Office's yard, torn down by DeletionPolicy ----
  // Each resource stands in a slot: the rooms are a cottage (EC2), the records well (RDS), the ledger cabinet
  // (DynamoDB) and the notice board (S3). After the teardown: Delete leaves rubble, Retain leaves it standing with a
  // wax-sealed tag (and it keeps costing lumber), Snapshot leaves a glass jar holding a tiny copy.
  // YARD_ART: [file, width / height, height in adults]. Ladi's Sogni renders (Nov 16).
  // The yard is painted from much closer than the street: the garden wall's foot is at y 795 and an adult standing on
  // the yard (feet at y 860) is about 230px tall, from the wall (about 5.5 ft) and the lamp posts.
  const YF = 860, YA = 230, YX0 = 600, YSTEP = 380;
  const yx = i => YX0 + i * YSTEP;
  const YARD_ART = {
    bg: 'office-yard',
    ec2: ['yard-hut', 708 / 653, 2.2], rds: ['yard-well', 761 / 953, 2.0], ddb: ['yard-ledger', 734 / 995, 1.6], s3: ['yard-board', 711 / 989, 1.8],
    jar: ['yard-jar', 658 / 981, 0.9], rubble: ['yard-rubble', 750 / 402, 0.85], seal: ['yard-seal', 176 / 240, 0.6]
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
      else if (res.kept === 'running') out += shadow(cx, YF, 300) + yardSp(r.type, cx, YF, { alt: `${r.name}, kept running (Retain)`, cls: 'rs-kept' }) + `<img class="rs-sp rs-seal" src="${IMG('yard-seal')}" alt="a wax-sealed Retain tag" draggable="false" style="left:${px(cx + 40)};top:${px(YF - YA * 1.25)};width:${px(YA * 0.6 * 176 / 240)};height:${px(YA * 0.6)}">`;
      else if (res.kept === 'snapshot') out += yardSp('rubble', cx, YF + 10, { alt: '' }) + yardSp('jar', cx, YF + 6, { alt: `${r.name}: a snapshot in a jar, then deleted`, cls: 'rs-jar' });
      else out += yardSp('rubble', cx, YF + 10, { alt: `${r.name}: deleted, and its data with it`, cls: 'rs-gone' });
      // The plaque hangs just above whatever stands there, so the cards along the bottom never cover it.
      const standing = !res || res.kept === 'running' ? r.type : res.kept === 'snapshot' ? 'jar' : 'rubble';
      out += `<span class="rs-plq${res ? ' done' : ''}" style="left:${px(cx - 90)};top:${px(YF - YA * (YARD_ART[standing] || [0, 0, 1])[2] - 56)}">${esc(pol)}</span>`;
      if (o.tap && !o.res) out += `<button class="rs-hb" data-res="${esc(r.id)}" aria-label="${esc(r.name)}: change its DeletionPolicy (now ${esc(pol)})" style="left:${px(cx - YSTEP / 2 + 10)};top:${px(YF - YA * 2.3)};width:${px(YSTEP - 20)};height:${px(YA * 2.3 + 80)}"></button>`;
    });
    return { html: out, width: worldW, kind: 'yard' };
  }

  // ---- Night 2, the Shrine Bridge: a Lambda function behind its live alias, traffic shifted by CodeDeploy ----
  // The walkers (the residents) cross the old stone bridge; on the far bank a signpost (the live alias) splits the
  // path between two shrines, the old version on the left and the new one on the right. Its arms carry the weights.
  // A cracked release is the new shrine gone dark and smoking: walkers who reach it come back with soot. The alarm bell
  // rings when soot passes its line and the signpost swings back on its own. The clockwork test walker is a hook.
  // Perspective, measured from the far cottage's door and the fence on the right: an adult whose feet are at y stands
  // BSL * (y - BHZ) tall (the horizon is at the far bank's tree line).
  const BHZ = 311, BSL = 1.07, bph = y => BSL * (y - BHZ);
  const BR = {
    old: { x: 640, y: 432 }, nw: { x: 1400, y: 442 }, sign: { x: 1000, y: 486 }, bell: { x: 1820, y: 478 }, sey: { x: 1590, y: 600 },
    // The walk: up onto the bridge from the near bank, over its crown, down to the far bank and the signpost.
    path: [[60, 640], [260, 540], [470, 478], [700, 488], [860, 512]]
  };
  const BAR = { 'shrine-old': 446 / 601, 'shrine-new': 445 / 600, 'shrine-cracked': 445 / 627, 'bridge-signpost': 382 / 560, 'bridge-bell': 251 / 440, 'bridge-tester': 213 / 300 };
  const bstand = (name, h, cx, feet, o) => {
    o = o || {};
    const w = h * (BAR[name] || AR[name] || 0.6);
    return `<img class="rs-sp ${o.cls || ''}" src="${IMG(name)}" alt="${esc(o.alt || '')}" draggable="false" style="left:${px(cx - w / 2)};top:${px(feet - h)};width:${px(w)};height:${px(h)};${o.style || ''}">`;
  };
  const BRIDGE_FOCUS = { old: BR.old.x, new: BR.nw.x, sign: BR.sign.x, bell: BR.bell.x };
  // o: { w: weight on the new version (0..1), demand: walkers a minute, soot: walkers who met the crack this minute,
  //      cracked: the new shrine shows its crack, first: no old version yet, note: the tick's note (pre, post, rollback,
  //      stuck), alarm: the bell is set up, rang: it's ringing, pre/post: the hooks are set up, ghost: planning,
  //      tap: make the bell and the test walker buttons, seymour: pose }
  function bridge(o) {
    let out = `<img class="rs-bg" src="${IMG('bridge')}" alt="" draggable="false" style="left:0">`;
    const w = Math.max(0, Math.min(1, o.w || 0)), pct = Math.round(w * 100);
    // The shrines: the old version (unless this function has never shipped one) and the new one.
    const shH = a => bph(a.y) * 2.3;
    if (!o.first) out += shadow(BR.old.x, BR.old.y, shH(BR.old) * 0.7) + bstand('shrine-old', shH(BR.old), BR.old.x, BR.old.y, { alt: 'the old shrine: the version the alias pointed at' });
    const cracked = !!o.cracked, nn = cracked ? 'shrine-cracked' : 'shrine-new';
    out += shadow(BR.nw.x, BR.nw.y, shH(BR.nw) * 0.7) + bstand(nn, shH(BR.nw) * (cracked ? 627 / 600 : 1), BR.nw.x, BR.nw.y,
      { cls: o.ghost ? 'rs-ghost' : (cracked ? 'rs-crack' : ''), alt: o.ghost ? 'the new shrine, planned' : cracked ? 'the new shrine, cracked and smoking' : 'the new shrine: the new version' });
    // The signpost (the live alias) with the weights on its arms.
    const sH = bph(BR.sign.y) * 1.45, sW = sH * BAR['bridge-signpost'], sx = BR.sign.x - sW / 2, sy = BR.sign.y - sH;
    const swing = o.note === 'rollback' ? ' rs-swing' : '';
    out += shadow(BR.sign.x, BR.sign.y, sW * 0.5) + `<span class="rs-sign${swing}" style="left:${px(sx)};top:${px(sy)};width:${px(sW)};height:${px(sH)}">`
      + `<img class="rs-sp" src="${IMG('bridge-signpost')}" alt="the signpost: the live alias, ${100 - pct}% to the old shrine and ${pct}% to the new" draggable="false" style="left:0;top:0;width:100%;height:100%">`
      + `<b class="rs-arm l${o.first ? ' off' : ''}" style="left:0;top:26%;width:46%;height:9%">${o.first ? '' : (100 - pct) + '%'}</b>`
      + `<b class="rs-arm r${pct ? ' on' : ''}" style="left:54%;top:38.5%;width:45%;height:10.5%">${pct}%</b></span>`;
    // The alarm bell: set up or not (a pale blueprint while planning, to tap), and ringing on a rollback.
    const bH = bph(BR.bell.y) * 1.5;
    if (o.alarm || o.tap) out += shadow(BR.bell.x, BR.bell.y, bH * 0.3) + bstand('bridge-bell', bH, BR.bell.x, BR.bell.y,
      { cls: (o.alarm ? '' : 'rs-ghost rs-off') + (o.rang ? ' rs-ring' : ''), alt: o.alarm ? (o.rang ? 'the alarm bell, ringing' : 'the alarm bell (a CloudWatch alarm)') : 'no alarm bell yet' });
    if (o.tap) out += `<button class="rs-hb" data-flip="alarm" aria-pressed="${!!o.alarm}" aria-label="The alarm bell: ${o.alarm ? 'take it down' : 'put it up'}" style="left:${px(BR.bell.x - bH * 0.3)};top:${px(BR.bell.y - bH)};width:${px(bH * 0.6)};height:${px(bH)}"></button>`;
    // The clockwork test walker: waits by the signpost while planning (a hook), walks to the new shrine on its turn.
    const tH = bph(BR.sign.y) * 0.55;
    const hook = o.pre || o.post;
    if (o.note === 'pre' || o.note === 'post') {
      const t = { x: (BR.sign.x + BR.nw.x) / 2 + 40, y: (BR.sign.y + BR.nw.y) / 2 };
      out += bstand('bridge-tester', bph(t.y) * 0.55, t.x, t.y, { cls: 'rs-tester', alt: o.note === 'pre' ? 'the test walker crossing first (the pre-traffic hook)' : 'the test walker checking (the post-traffic hook)', style: 'transform:scaleX(-1);' });
    } else if (o.ghost && (hook || o.tap)) {
      out += bstand('bridge-tester', tH, BR.sign.x - sW * 0.75, BR.sign.y + 6, { cls: hook ? '' : 'rs-ghost rs-off', alt: hook ? 'the test walker, waiting (a traffic hook)' : 'no test walker yet' });
      if (o.tap) out += `<button class="rs-hb" data-flip="pre" aria-pressed="${!!o.pre}" aria-label="The test walker: ${o.pre ? 'no pre-traffic test' : 'test before any traffic (pre-traffic hook)'}" style="left:${px(BR.sign.x - sW * 0.75 - tH * 0.4)};top:${px(BR.sign.y + 6 - tH)};width:${px(tH * 0.8)};height:${px(tH)}"></button>`;
    }
    // The walkers: two always on the bridge, and at each shrine a share of the crowd by the signpost's weights. Those
    // who met the crack carry soot and walk back toward the bridge.
    const d = o.demand || 0;
    if (d && o.note !== 'pre') {
      const rh = y => bph(y) * 0.72, live = o.note != null && !o.ghost;
      // Two walkers always crossing the bridge, on a loop: up from the near bank, over the crown, down to the signpost.
      const cross = BR.path.concat([[BR.sign.x - 40, BR.sign.y + 10]]);
      [0, 1].forEach(k => { out += traveler(WALK, rh, cross, { alt: 'a walker crossing the bridge', flip: true, loop: true, dur: 7, delay: -k * 3.5, phase: k * 0.2 }); });
      // At the shrines, a share of the crowd by the signpost's weights; on a run, each tick's arrivals walk there from
      // the signpost. Those who met the crack walk back out with soot.
      const nNew = w ? Math.max(1, Math.round(6 * w)) : 0, nOld = o.first ? 0 : 6 - nNew;
      const soot = Math.min(nNew, o.soot ? Math.max(1, Math.round(6 * Math.min(1, o.soot / d))) : 0);
      const from = [BR.sign.x, BR.sign.y + 14];
      let i = 0;
      for (let k = 0; k < nOld; k++) {
        const x = BR.old.x - 150 + (k % 3) * 100 + (k > 2 ? 50 : 0), y = BR.old.y + 22 + (k > 2 ? 28 : 0);
        out += traveler(WALK, rh, live ? [from, [x, y]] : [[x, y]], { alt: 'a walker at the old shrine', dur: 0.9, delay: k * 0.05, phase: (i++) * 0.13 });
      }
      for (let k = 0; k < nNew; k++) {
        const s = k < soot, x = BR.nw.x - 150 + (k % 3) * 100 + (k > 2 ? 50 : 0), y = BR.nw.y + 22 + (k > 2 ? 28 : 0);
        out += s
          ? traveler(['res-soot'], y2 => rh(y2) * 1.08, live ? [[x, y], [x - 140, y + 26]] : [[x - 120, y + 26]], { alt: 'a walker with soot', dur: 0.9, delay: k * 0.05 })
          : traveler(WALK, rh, live ? [from, [x, y]] : [[x, y]], { alt: 'a walker at the new shrine', flip: true, dur: 0.9, delay: k * 0.05, phase: (i++) * 0.13 });
      }
    }
    // Seymour watches from the far bank, beside the path.
    if (o.seymour) { const sp = 'sey-' + o.seymour, h = bph(BR.sey.y) * 1.30; out += shadow(BR.sey.x, BR.sey.y, h * 0.25) + stand(sp, h * SEY_SRC[o.seymour] / 1000, BR.sey.x, BR.sey.y, { alt: 'Sir Seymour Backups' }); }
    return { html: out, width: W, kind: 'bridge' };
  }

  // ---- The Grand Opening, in the market square: the ribbon arch in front of the fountain, the residents around it ----
  // Perspective from the clock tower's door and the stall counters: an adult whose feet are at y stands PSL * (y - PHZ).
  const PHZ = 489, PSL = 1.075, pph = y => PSL * (y - PHZ);
  const PAR = { arch: 493 / 640, 'arch-cut': 491 / 640, 'res-cheer': 164 / 260, 'res-cheer2': 164 / 256 };
  const pstand = (name, h, cx, feet, o) => {
    o = o || {};
    const w = h * (PAR[name] || AR[name] || 0.6);
    return `<img class="rs-sp ${o.cls || ''}" src="${IMG(name)}" alt="${esc(o.alt || '')}" draggable="false" style="left:${px(cx - w / 2)};top:${px(feet - h)};width:${px(w)};height:${px(h)};${o.style || ''}">`;
  };
  // o: { cut: the ribbon is cut, folk: how many residents came, soot: how many of them carry soot, seymour: pose }
  function plaza(o) {
    let out = `<img class="rs-bg" src="${IMG('square')}" alt="" draggable="false" style="left:0">`;
    const AX = 960, AY = 700, aH = pph(AY) * 1.75;
    // The crowd: behind the arch first (smaller, further back), then in front. Cheering once the ribbon is cut.
    const n = Math.min(o.folk || 0, 12), soot = Math.min(o.soot || 0, n);
    const spots = [[640, 650], [1280, 655], [520, 680], [1420, 685], [740, 720], [1180, 725], [400, 740], [1540, 745], [600, 785], [1360, 790], [760, 800], [1160, 805]];
    // Everyone in the square is drawn back to front by where their feet are, so whoever stands nearer covers whoever
    // stands behind: the residents, the arch and Seymour alike.
    const items = [];
    spots.slice(0, n).forEach(([x, y], i) => {
      const h = pph(y) * 0.72, s = i < soot, flip = x > AX ? 'transform:scaleX(-1);' : '';
      const ph0 = (-(i * 0.23)).toFixed(2), cheer = reduced() ? '' : 'animation:rs-f2-0 .7s linear ' + ph0 + 's infinite both;', jump = reduced() ? 'opacity:0;' : 'animation:rs-f2-1 .7s linear ' + ph0 + 's infinite both;';
      // Cheering: two frames, standing with both arms up, then mid-jump.
      const sp = o.cut && !s ? `<span class="rs-trav">${pstand('res-cheer', h * 1.04, x, y, { alt: 'a resident, cheering', style: flip + cheer })}${pstand('res-cheer2', h * 1.03, x, y - h * 0.08, { alt: '', style: flip + jump })}</span>`
        : s ? pstand('res-soot', h * 1.08, x, y, { alt: 'a resident with soot', style: flip })
        : pstand('res-a', h, x, y, { alt: 'a resident, waiting', style: flip });
      items.push([y, shadow(x, y, h * 0.5) + sp]);
    });
    items.push([AY, shadow(AX, AY, aH * 0.75) + pstand(o.cut ? 'arch-cut' : 'arch', aH, AX, AY, { cls: o.cut ? 'rs-pop' : '', alt: o.cut ? 'the ribbon arch, the ribbon cut' : 'the ribbon arch, the ribbon still whole' })]);
    if (o.seymour) { const sy = 735, h = pph(sy) * 1.30; items.push([sy, shadow(1300, sy, h * 0.25) + stand('sey-' + o.seymour, h * SEY_SRC[o.seymour] / 1000, 1300, sy, { alt: 'Sir Seymour Backups' })]); }
    items.sort((a, b) => a[0] - b[0]).forEach(([, html]) => { out += html; });
    return { html: out, width: W, kind: 'plaza' };
  }

  // ---- The scene: the world inside a camera, plus the foreground (Kai, and Seymour for close-ups) and the UI layer ----
  // o: world options + { shot: 'wide' | 'push' | 'close', focus: slot to push in on, kai: face, close: Seymour's pose,
  //      ui: html laid over the scene, label }
  function scene(o) {
    const w = o.plaza ? plaza(o) : o.bridge ? bridge(o) : o.stack ? yard(o) : world(o);
    const kai = o.kai ? `<img class="rs-kai" src="${IMG('kai-' + o.kai)}" alt="Kai" draggable="false" data-face="${esc(o.kai)}">` : '';
    const sey = o.close ? `<img class="rs-sey" src="${IMG('sey-' + o.close)}" alt="Sir Seymour Backups" draggable="false" style="--sh:${SEY_SRC[o.close] / 1000}">` : '';
    return `<div class="rs shot-${o.shot || 'wide'}${o.close ? ' rs-close' : ''}${o.cls ? ' ' + o.cls : ''}" data-ww="${Math.round(w.width)}" data-shot="${o.shot || 'wide'}" data-focus="${o.focus == null ? '' : o.focus}" data-kind="${w.kind || 'street'}" role="img" aria-label="${esc(o.label || 'Beanstalk Row: the gate and the houses')}">
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
    const isYard = el.dataset.kind === 'yard', isBridge = el.dataset.kind === 'bridge', isPlaza = el.dataset.kind === 'plaza';
    if (shot === 'push' && isBridge) { h = H / (wide ? 2.0 : 1.6); y0 = 400 - h / 2; cx = BRIDGE_FOCUS[el.dataset.focus] || W / 2; }
    else if (shot === 'push' && isYard) { h = H / (wide ? 1.7 : 1.4); y0 = YF - YA * 1.1 - h / 2 + 40; cx = el.dataset.focus !== '' ? yx(+el.dataset.focus) : W / 2; }
    else if (shot === 'push') { h = H / (wide ? 2.4 : 2.0); y0 = FEET - HOUSE * 0.5 - h / 2 + 30; cx = el.dataset.focus !== '' ? centreX(+el.dataset.focus) : (X0 + W) / 2; }
    else if (shot === 'close') { h = H; y0 = 0; cx = W / 2; }
    else if (wide) { h = H; y0 = 0; cx = W / 2; }
    else if (isBridge) { h = 760; y0 = 120; cx = BR.sign.x; }
    else if (isPlaza) { h = 1000; y0 = 40; cx = 1090; }   // a phone: the arch, Seymour and some of the crowd   // a phone: the far bank, the signpost between the shrines
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
    const w = o.plaza ? plaza(o) : o.bridge ? bridge(o) : o.stack ? yard(o) : world(o), wd = el.querySelector('.rs-world');
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
    .rs-trav { position: absolute; left: 0; top: 0; pointer-events: none; }
    @keyframes rs-path { 0% { transform: none; } 33.333% { transform: translate(var(--x1), var(--y1)) scale(var(--s1)); } 66.667% { transform: translate(var(--x2), var(--y2)) scale(var(--s2)); } 100% { transform: translate(var(--x3), var(--y3)) scale(var(--s3)); } }
    /* Walk frames: frame 0 shows last, so a walker who stops stands on it. Two frames, or four with the passing poses. */
    @keyframes rs-f2-0 { 0%, 49.9% { opacity: 0; } 50%, 100% { opacity: 1; } }
    @keyframes rs-f2-1 { 0%, 49.9% { opacity: 1; } 50%, 100% { opacity: 0; } }
    @keyframes rs-f4-0 { 0%, 74.9% { opacity: 0; } 75%, 100% { opacity: 1; } }
    @keyframes rs-f4-1 { 0%, 24.9% { opacity: 1; } 25%, 100% { opacity: 0; } }
    @keyframes rs-f4-2 { 0%, 24.9% { opacity: 0; } 25%, 49.9% { opacity: 1; } 50%, 100% { opacity: 0; } }
    @keyframes rs-f4-3 { 0%, 49.9% { opacity: 0; } 50%, 74.9% { opacity: 1; } 75%, 100% { opacity: 0; } }
    @keyframes rs-step { 0% { opacity: 0; } 50% { opacity: 1; } }
    @keyframes rs-in { from { transform: translateX(70px); } to { transform: none; } }
    .rs-turned { opacity: .85; filter: saturate(.6); }
    .rs-px { image-rendering: pixelated; }
    .rs-gone { opacity: .9; } .rs-kept { filter: drop-shadow(0 0 12px rgba(255,212,90,.85)); }
    .rs-jar { filter: drop-shadow(0 0 16px rgba(190,230,255,.9)); animation: rs-pop .5s ease-out both; }
    @keyframes rs-pop { from { transform: translateY(-60px) scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }
    .rs-seal { filter: drop-shadow(0 4px 6px rgba(0,0,0,.5)); transform: rotate(-8deg); }
    .rs-plq { position: absolute; width: 180px; text-align: center; font: 800 30px/1.2 var(--f-head, sans-serif); color: #3a2a12; background: linear-gradient(#ffe58a, #e0a030); border: 3px solid #5a3a12; border-radius: 10px; padding: 4px 0; }
    .rs-sign { position: absolute; transform-origin: 50% 100%; }
    .rs-sign.rs-swing { animation: rs-swing .9s ease-in-out both; }
    @keyframes rs-swing { 0% { transform: rotate(0); } 30% { transform: rotate(-6deg); } 60% { transform: rotate(4deg); } 100% { transform: rotate(0); } }
    .rs-arm { position: absolute; display: grid; place-items: center; font: 900 30px/1 var(--f-head, sans-serif); color: #ffe9b8; text-shadow: 0 2px 0 #2a160a, 0 0 6px #2a160a; pointer-events: none; }
    .rs-arm.r.on { color: #fff3a8; }
    .rs-off { opacity: .32; }
    .rs-crack { filter: drop-shadow(0 0 14px rgba(40,30,30,.8)); }
    .rs-ring { animation: rs-ring .25s ease-in-out infinite alternate; transform-origin: 50% 0; }
    @keyframes rs-ring { from { transform: rotate(-5deg); } to { transform: rotate(5deg); } }
    .rs-tester { animation: rs-in .55s ease-out both; }
    .rs-cheer { animation: rs-hop .6s ease-in-out infinite alternate; }
    @keyframes rs-hop { from { translate: 0 0; } to { translate: 0 -14px; } }
    .rs-pop { animation: rs-pop .5s ease-out both; }
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
    .rs:not(.rs-wide) .rs-hidephone, .rs.rs-nokp:not(.rs-wide) .rs-kai { display: none; }
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
    @media (prefers-reduced-motion: reduce) { .rs-cheer, .rs-pop, .rs-ring, .rs-swing, .rs-tester, .rs-kai, .rs-trav, .rs-trav img { animation: none !important; } }
  `;
  document.head.appendChild(css);

  SD.renoStreet = { scene, mount, cut, update, frame, world, yard, bridge, slotOf, FEET, HOUSE, ADULT, SEY_H, ph };
})();
