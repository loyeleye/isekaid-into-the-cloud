// Mira's Kitchen, in the room (Ladi, Nov 17: "is it another text box game" / "Yes do that"). The recipe's settings are
// things in the kitchen you handle, and a firing plays out on the stove. js/mode-kitchen.js puts this on its screens;
// the rules stay in js/kitchen-core.js.
//   - The ticket rail: one ticket per call, clipped up in the order they come (a burst comes as one clip of tickets).
//   - The stove: one burner per execution environment the order can need. A cold start is a burner being lit (and the
//     pantry opened if the connection is outside the handler); a warm burner is already burning. Provisioned cooks
//     (on the alias) are lit before the first ticket. Under it, two dials: Memory (a bigger flame) and the egg timer
//     (Timeout). Turn them by dragging round, or tap to step on (arrow keys too).
//   - The pantry key: hang it on the hook (opened once per cook, outside the handler) or drop it in the pot (opened on
//     every call, inside). Drag it, or tap where it should go.
//   - The tray at the hatch: with the statusCode tag on it, or just the dish (a 502 at the counter). Tap it.
//   - The pantry jar's label: chalked "test-pantry" (written in the code) or a brass plate read from the stage
//     (an environment variable). Tap it.
//   - The spoiled crate at the end of the pass: the on-failure destination. Tap its spot to put it there or take it away.
//   - The cook stand: provisioned concurrency, how many cooks and on which hook ($LATEST or the alias "live"). Tap it.
//   - A firing: each ticket lights up as its call starts, its burner lights (cold) or is already going (warm), the pan
//     cooks for the call's seconds (sped up), a call past the timer smokes and stops ("Task timed out"), an async call
//     goes again on the same burner, and the plate slides down the pass to its spot. Skip ends it at once; reduced
//     motion shows the end straight away.
// API: SD.kitchenScene.html(order, cfg, { r, live, hot })  r: K.fire's result to show on the pass (or null)
//      SD.kitchenScene.wire(root, cfg, set(key, value))      the objects, when live
//      SD.kitchenScene.play(root, r, done)                    plays a firing; returns stop() (Skip)
//      SD.kitchenScene.plate(p, i)                            one plate's HTML (the pass, and anywhere else)
(function () {
  if (!SD.kitchen) return;
  const K = SD.kitchen, KS = SD.kitchenScene = {};
  const esc = s => SD.ui.esc(String(s == null ? '' : s));
  const icon = (n, cls) => `<svg class="kx-gi${cls ? ' ' + cls : ''}" viewBox="0 0 512 512" aria-hidden="true">${(SD.icons && SD.icons[n]) || ''}</svg>`;
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const OUT = {
    served: ['✓', 'Served', 'good'], late: ['⌛', 'Late', 'warn'], '502': ['502', 'Bad Gateway', 'bad'], timeout: ['⏱', 'Timed out', 'bad'],
    wrong: ['≠', 'Wrong pantry', 'bad'], lost: ['✗', 'Lost', 'bad'], kept: ['⇩', 'Kept', 'keep']
  };
  KS.OUT = OUT;
  KS.plate = function (p, i) {
    const [g, word, cls] = OUT[p.out];
    const note = [p.cold ? 'cold start' : 'warm', p.tries > 1 ? `${p.tries} tries` : ''].filter(Boolean).join(' · ');
    const who = p.kind === 'api' ? 'counter' : 'photo';
    const label = `${who === 'counter' ? 'Counter' : 'Photo'}${p.stage === 'test' ? ' (test)' : ''}: ${word}${p.stuck ? ' (the corrupt file)' : ''}. ${p.d} seconds, ${note}.`;
    return `<li class="kt-plate ${cls}${p.stuck ? ' stuck' : ''}" data-pl="${i}" style="--i:${i}" role="img" aria-label="${esc(label)}" title="${esc(label)}">
      <span class="kt-pk">${icon(p.kind === 'api' ? 'coffee-cup' : 'film-strip')}${p.stage === 'test' ? '<b>T</b>' : ''}</span><span class="kt-pg">${esc(g)}</span><span class="kt-pw">${esc(word)}</span><span class="kt-pd">${p.d} s${p.cold ? ' ❄' : ''}${p.tries > 1 ? ' ↻' + p.tries : ''}</span></li>`;
  };

  // The calls as tickets, in the order they come.
  function tickets(o) {
    let n = 0;
    return o.guests.map((g, gi) => {
      const t = [];
      for (let i = 0; i < g.n; i++) t.push(`<span class="kx-tk ${g.kind}${g.stage === 'test' ? ' test' : ''}${g.stuck ? ' stuck' : ''}" data-tk="${n++}">${icon(g.stuck ? 'spider-web' : g.kind === 'api' ? 'coffee-cup' : 'film-strip')}${g.stage === 'test' ? '<b>T</b>' : ''}</span>`);
      const what = `${g.kind === 'api' ? 'Counter' : 'Photos'}${g.stage === 'test' ? ', test' : ''}: ${g.stuck ? 'a corrupt file' : g.burst ? `${g.n} at once` : g.n === 1 ? '1' : `${g.n}, one by one`}${g.stuck ? '' : g.kind === 'api' ? `, waits ${g.patience} s` : `, wanted in ${g.patience} s`}`;
      return `<div class="kx-clip${g.burst ? ' burst' : ''}" data-g="${gi}" title="${esc(what)}"><span class="kx-cl">${esc(what)}</span><span class="kx-tks">${t.join('')}</span></div>`;
    }).join('');
  }

  // A dial: N stops over 240 degrees, the pointer on the chosen one.
  function dial(key, c, live, hot) {
    const kn = K.KNOBS[key], opts = kn.opts, i = Math.max(0, opts.indexOf(c[key])), n = opts.length;
    const ang = j => -120 + (240 * j) / (n - 1);
    const ticks = opts.map((v, j) => { const a = ang(j) * Math.PI / 180; return `<circle cx="${50 + 40 * Math.sin(a)}" cy="${50 - 40 * Math.cos(a)}" r="${j === i ? 5 : 3}" class="${j === i ? 'on' : ''}"/>`; }).join('');
    const face = key === 'timeout' ? `<g class="kx-egg"><ellipse cx="50" cy="52" rx="22" ry="27"/><path d="M40 40 h20 l-10 12 z M40 66 h20 l-10 -12 z"/></g>` : '<circle cx="50" cy="50" r="27" class="kx-knob"/>';
    return `<div class="kx-dialw${hot === key ? ' hot' : ''}"><button type="button" class="kx-dial" data-dial="${key}" ${live ? '' : 'disabled'} role="slider" aria-label="${esc(kn.name)}" aria-valuemin="0" aria-valuemax="${n - 1}" aria-valuenow="${i}" aria-valuetext="${esc(kn.say(c[key]))}">
      <svg viewBox="0 0 100 100" aria-hidden="true">${ticks}${face}<line x1="50" y1="50" x2="${50 + 24 * Math.sin(ang(i) * Math.PI / 180)}" y2="${50 - 24 * Math.cos(ang(i) * Math.PI / 180)}" class="kx-ptr"/></svg></button>
      <span class="kx-dn">${esc(kn.name)}</span><b class="kx-dv">${esc(kn.say(c[key]))}</b></div>`;
  }

  // The things on the bench and shelf that this order lets you change (and the ones it doesn't, shown as they are).
  function props(o, c, live, hot) {
    const k = o.knobs, api = o.guests.some(g => g.kind === 'api'), s3 = o.guests.some(g => g.kind === 's3');
    const can = key => live && k.includes(key);
    const cls = key => `kx-prop${hot === key ? ' hot' : ''}${k.includes(key) ? '' : ' fixed'}`;
    const out = [];
    // The pantry key: on the hook (outside the handler) or in the pot (inside).
    const key = `<span class="kx-key" ${can('prep') ? 'data-drag="prep"' : ''} aria-hidden="true">${icon('key')}</span>`;
    out.push(`<div class="${cls('prep')} kx-keyw"><span class="kx-pn">Pantry key</span><div class="kx-slots">
      <button type="button" class="kx-slot${c.prep === 'outside' ? ' on' : ''}" data-set="prep" data-v="outside" ${can('prep') ? '' : 'disabled'} aria-pressed="${c.prep === 'outside'}"><span class="kx-hook" aria-hidden="true"></span>${c.prep === 'outside' ? key : ''}<span class="kx-sl">On the hook<br><i>once per cook</i></span></button>
      <button type="button" class="kx-slot${c.prep === 'inside' ? ' on' : ''}" data-set="prep" data-v="inside" ${can('prep') ? '' : 'disabled'} aria-pressed="${c.prep === 'inside'}"><span class="kx-pot" aria-hidden="true">${icon('full-wood-bucket')}</span>${c.prep === 'inside' ? key : ''}<span class="kx-sl">In the pot<br><i>every call</i></span></button></div></div>`);
    if (api || k.includes('ret')) out.push(`<button type="button" class="${cls('ret')} kx-tray${c.ret === 'proxy' ? ' tagged' : ''}" data-tog="ret" ${can('ret') ? '' : 'disabled'} aria-pressed="${c.ret === 'proxy'}" aria-label="The tray: ${esc(K.KNOBS.ret.say(c.ret))}">
      <span class="kx-pn">The tray</span><span class="kx-trayart" aria-hidden="true"><i class="kx-dish">${icon('cupcake')}</i>${c.ret === 'proxy' ? '<i class="kx-tag">statusCode 200<br>+ body</i>' : ''}</span><span class="kx-ps">${c.ret === 'proxy' ? 'Tagged: statusCode + body' : 'Just the dish'}</span></button>`);
    if (k.includes('env') || o.guests.some(g => g.stage === 'test')) out.push(`<button type="button" class="${cls('env')} kx-jar${c.env ? ' brass' : ''}" data-tog="env" ${can('env') ? '' : 'disabled'} aria-pressed="${!!c.env}" aria-label="The pantry jar: ${esc(K.KNOBS.env.say(c.env))}">
      <span class="kx-pn">Pantry jar</span><span class="kx-jarart" aria-hidden="true">${icon('database')}<i class="kx-label">${c.env ? '${PANTRY_TABLE}' : 'test-pantry'}</i></span><span class="kx-ps">${c.env ? 'Read from the stage' : 'Written in the code'}</span></button>`);
    if (k.includes('pc')) {
      const [n, on] = K.pcOf(c.pc);
      out.push(`<button type="button" class="${cls('pc')} kx-stand" data-cyc="pc" ${can('pc') ? '' : 'disabled'} aria-label="The cook stand: ${esc(K.KNOBS.pc.say(c.pc))}">
        <span class="kx-pn">Cook stand</span><span class="kx-hooks" aria-hidden="true"><span class="kx-h${on === 'latest' ? ' on' : ''}">$LATEST</span><span class="kx-h${on === 'alias' ? ' on' : ''}">live</span></span>
        <span class="kx-cooks" aria-hidden="true">${n ? Array.from({ length: n }, () => '<i class="kx-hat"></i>').join('') : '<i class="kx-none">no cooks waiting</i>'}</span><span class="kx-ps">${esc(K.KNOBS.pc.say(c.pc))}</span></button>`);
    }
    void s3;
    return out.join('');
  }

  KS.html = function (order, c, o2) {
    o2 = o2 || {};
    const o = K.ORDERS[order], r = o2.r, live = !!o2.live, hot = o2.hot;
    const s3 = o.guests.some(g => g.kind === 's3') || o.knobs.includes('dest');
    const burners = r && !r.refused ? r.burners : Math.max(1, ...o.guests.map(g => (g.burst ? g.n : 1)), K.pcOf(c.pc)[1] === 'alias' ? K.pcOf(c.pc)[0] : 0);
    const prelit = K.pcOf(c.pc)[1] === 'alias' ? K.pcOf(c.pc)[0] : 0;
    const bs = Array.from({ length: burners }, (_, i) => `<div class="kx-b${i < prelit ? ' lit pre' : ''}" data-b="${i}"><i class="kx-flame" aria-hidden="true"></i><span class="kx-pan" aria-hidden="true"><i class="kx-prog"></i></span><span class="kx-bt">${i < prelit ? 'ready' : ''}</span></div>`).join('');
    const crate = s3 ? `<button type="button" class="kx-crate${c.dest ? ' on' : ''}${hot === 'dest' ? ' hot' : ''}${o.knobs.includes('dest') ? '' : ' fixed'}" data-tog="dest" ${live && o.knobs.includes('dest') ? '' : 'disabled'} aria-pressed="${!!c.dest}" aria-label="The spoiled crate: ${esc(K.KNOBS.dest.say(c.dest))}">
        ${c.dest ? `${icon('cube')}<span>spoiled-queue<br><i>on-failure destination</i></span>` : '<span>No crate<br><i>failed photos are dropped</i></span>'}</button>` : '';
    const plates = r && !r.refused ? r.plates.map((p, i) => KS.plate(p, i)).join('') : '';
    return `<div class="kx${live ? ' live' : ''}" data-order="${esc(order)}">
      <div class="kx-rail" aria-label="The ticket rail: this order's calls">${tickets(o)}</div>
      <div class="kx-mid">
        <div class="kx-stove"><div class="kx-burners" aria-label="The stove: one burner per cook (execution environment)">${bs}</div>
          <div class="kx-dials">${dial('mem', c, live && o.knobs.includes('mem'), hot)}${dial('timeout', c, live && o.knobs.includes('timeout'), hot)}</div></div>
        <div class="kx-props">${props(o, c, live, hot)}</div>
      </div>
      <div class="kx-pass"><span class="kx-passl">The pass</span><ul class="kt-plates kx-plates">${plates || '<li class="kx-empty">Plates land here.</li>'}</ul>${crate}</div>
    </div>`;
  };

  // ---- Handling the objects ----
  KS.wire = function (root, c, set) {
    const x = root.querySelector('.kx.live');
    if (!x) return;
    x.querySelectorAll('[data-set]').forEach(el => el.onclick = () => { if (!el.disabled && c[el.dataset.set] !== el.dataset.v) set(el.dataset.set, el.dataset.v); });
    x.querySelectorAll('[data-tog]').forEach(el => el.onclick = () => {
      if (el.disabled) return;
      const k = el.dataset.tog;
      set(k, k === 'ret' ? (c.ret === 'proxy' ? 'body' : 'proxy') : !c[k]);
    });
    x.querySelectorAll('[data-cyc]').forEach(el => el.onclick = () => {
      if (el.disabled) return;
      const k = el.dataset.cyc, opts = K.KNOBS[k].opts;
      set(k, opts[(opts.indexOf(c[k]) + 1) % opts.length]);
    });
    x.querySelectorAll('[data-dial]').forEach(el => wireDial(el, c, set));
    const key = x.querySelector('[data-drag="prep"]');
    if (key) wireKey(key, x, set);
  };
  function wireDial(el, c, set) {
    if (el.disabled) return;
    const k = el.dataset.dial, opts = K.KNOBS[k].opts, n = opts.length;
    let start = null, moved = false, at = opts.indexOf(c[k]);
    const pick = e => {
      const b = el.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      const a = Math.atan2(dx, -dy) * 180 / Math.PI;
      return Math.max(0, Math.min(n - 1, Math.round(((a + 120) / 240) * (n - 1))));
    };
    el.addEventListener('pointerdown', e => { start = [e.clientX, e.clientY]; moved = false; try { el.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
    el.addEventListener('pointermove', e => {
      if (!start) return;
      if (!moved && Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 6) return;
      moved = true;
      const j = pick(e);
      if (j !== at) { at = j; const svg = el.querySelector('.kx-ptr'), a = (-120 + 240 * j / (n - 1)) * Math.PI / 180;
        if (svg) { svg.setAttribute('x2', 50 + 24 * Math.sin(a)); svg.setAttribute('y2', 50 - 24 * Math.cos(a)); }
        const v = el.parentNode.querySelector('.kx-dv'); if (v) v.textContent = K.KNOBS[k].say(opts[j]); }
    });
    const end = () => {
      if (!start) return;
      start = null;
      if (moved) { if (opts[at] !== c[k]) set(k, opts[at]); }
      else set(k, opts[(opts.indexOf(c[k]) + 1) % n]);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', () => { start = null; });
    el.onclick = e => e.preventDefault();
    el.onkeydown = e => {
      const i = opts.indexOf(c[k]);
      if (['ArrowRight', 'ArrowUp'].includes(e.key) && i < n - 1) { e.preventDefault(); set(k, opts[i + 1]); }
      if (['ArrowLeft', 'ArrowDown'].includes(e.key) && i > 0) { e.preventDefault(); set(k, opts[i - 1]); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(k, opts[(i + 1) % n]); }
    };
  }
  // The key follows the pointer and lands on the slot it's let go over.
  function wireKey(key, x, set) {
    let st = null;
    key.addEventListener('pointerdown', e => {
      e.stopPropagation();
      st = { x: e.clientX, y: e.clientY, moved: false };
      try { key.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    });
    key.addEventListener('pointermove', e => {
      if (!st) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved && Math.hypot(dx, dy) < 5) return;
      st.moved = true;
      key.classList.add('drag');
      key.style.transform = `translate(${dx}px, ${dy}px) rotate(-12deg)`;
      x.querySelectorAll('.kx-slot').forEach(s => s.classList.toggle('over', inside(s, e)));
    });
    const drop = e => {
      if (!st) return;
      const moved = st.moved; st = null;
      key.classList.remove('drag'); key.style.transform = '';
      const to = [...x.querySelectorAll('.kx-slot')].find(s => inside(s, e));
      x.querySelectorAll('.kx-slot').forEach(s => s.classList.remove('over'));
      if (moved && to && !to.classList.contains('on')) set('prep', to.dataset.v);
    };
    key.addEventListener('pointerup', drop);
    key.addEventListener('pointercancel', () => { st = null; key.classList.remove('drag'); key.style.transform = ''; });
    key.addEventListener('click', e => e.stopPropagation(), true);
  }
  const inside = (el, e) => { const b = el.getBoundingClientRect(); return e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom; };

  // ---- A firing, played out ----
  // Each try's time on screen: its seconds at about a quarter-second each, between 0.3 and 1.3 s, and the whole
  // firing squeezed to about 7 seconds when it runs longer.
  KS.timeline = function (r) {
    const steps = [];
    let T = 0, i = 0;
    const vis = a => Math.max(300, Math.min(1300, a.d * 260));
    while (i < r.plates.length) {
      const p0 = r.plates[i];
      if (p0.burst) {
        let end = T;
        for (; i < r.plates.length && r.plates[i].burst && r.plates[i].g === p0.g; i++) {
          const p = r.plates[i]; let t = T;
          p.att.forEach((a, j) => { steps.push({ p: i, b: p.cook, t, v: vis(a), a, j, last: j === p.att.length - 1 }); t += vis(a) + 120; });
          end = Math.max(end, t);
        }
        T = end + 80;
      } else {
        const p = r.plates[i];
        p.att.forEach((a, j) => { steps.push({ p: i, b: p.cook, t: T, v: vis(a), a, j, last: j === p.att.length - 1 }); T += vis(a) + 120; });
        i++;
      }
    }
    const k = T > 7000 ? 7000 / T : 1;
    steps.forEach(s => { s.t *= k; s.v *= k; });
    return { steps, total: T * k };
  };
  KS.play = function (root, r, done) {
    const x = root.querySelector('.kx');
    let over = false;
    const timers = [];
    const finish = () => {
      if (over) return; over = true;
      timers.forEach(clearTimeout);
      x.querySelectorAll('.kx-flying').forEach(el => el.remove());
      x.querySelectorAll('[data-pl]').forEach(el => el.classList.remove('kx-wait'));
      x.querySelectorAll('.kx-tk').forEach(el => { el.classList.remove('on'); el.classList.add('done'); });
      x.querySelectorAll('.kx-b').forEach(b => { b.classList.remove('lighting', 'cooking', 'smoke'); const pr = b.querySelector('.kx-prog'); if (pr) { pr.style.transition = 'none'; pr.style.width = '0'; } });
      x.classList.remove('firing');
      done && done();
    };
    if (!x || !r || r.refused || reduced()) { setTimeout(finish, 0); return finish; }
    x.classList.add('firing');
    x.querySelectorAll('[data-pl]').forEach(el => el.classList.add('kx-wait'));
    const tl = KS.timeline(r);
    const B = i => x.querySelector(`.kx-b[data-b="${i}"]`);
    tl.steps.forEach(s => {
      timers.push(setTimeout(() => {
        const b = B(s.b), tk = x.querySelector(`.kx-tk[data-tk="${s.p}"]`), bt = b && b.querySelector('.kx-bt'), pr = b && b.querySelector('.kx-prog');
        if (tk) tk.classList.add('on');
        if (!b) return;
        b.classList.remove('smoke');
        const cold = s.a.init > 0 && s.j === 0;
        const initMs = cold ? Math.min(s.v * 0.7, s.v * (s.a.init / Math.max(s.a.d, 0.01))) : 0;
        if (cold) { b.classList.add('lighting'); if (bt) bt.textContent = '❄ cold start'; }
        else if (bt) bt.textContent = s.j ? `↻ try ${s.j + 1}` : 'warm';
        timers.push(setTimeout(() => {
          b.classList.remove('lighting'); b.classList.add('lit', 'cooking');
          if (pr) { pr.style.transition = 'none'; pr.style.width = '0'; void pr.offsetWidth; pr.style.transition = `width ${Math.max(60, s.v - initMs)}ms linear`; pr.style.width = '100%'; }
        }, initMs));
        timers.push(setTimeout(() => {
          b.classList.remove('cooking');
          if (pr) { pr.style.transition = 'none'; pr.style.width = '0'; }
          if (s.a.timedOut) { b.classList.add('smoke'); if (bt) bt.textContent = '⏱ timed out'; }
          else if (bt) bt.textContent = `${s.a.d} s`;
          if (s.last) land(s.p, b, tk);
        }, s.v));
      }, s.t));
    });
    timers.push(setTimeout(finish, tl.total + 700));
    function land(i, b, tk) {
      const slot = x.querySelector(`[data-pl="${i}"]`);
      if (!slot) return;
      const from = b.getBoundingClientRect(), to = slot.getBoundingClientRect();
      const g = slot.cloneNode(true);
      g.classList.remove('kx-wait'); g.classList.add('kx-flying');
      g.style.cssText += `position:fixed;left:${from.left + from.width / 2 - to.width / 2}px;top:${from.top}px;width:${to.width}px;margin:0;z-index:50;animation:none;`;
      document.body.appendChild(g);
      const an = g.animate([{ transform: 'translate(0,0) scale(.8)' }, { transform: `translate(${to.left - (from.left + from.width / 2 - to.width / 2)}px, ${to.top - from.top}px) scale(1)` }], { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
      an.onfinish = () => { g.remove(); slot.classList.remove('kx-wait'); };
      if (tk) { tk.classList.remove('on'); tk.classList.add('done'); }
    }
    return finish;
  };

  const css = document.createElement('style');
  css.textContent = `
    .kx { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 14px; background: rgba(40, 26, 16, .78); box-shadow: inset 0 0 0 2px rgba(255, 220, 160, .18); color: #f6ead2; }
    .kx-gi { width: 18px; height: 18px; fill: currentColor; flex: 0 0 auto; }
    .kx-rail { display: flex; flex-wrap: wrap; gap: 6px 10px; padding: 8px; border-radius: 8px; background: linear-gradient(#8a6a40, #6b4f2c); box-shadow: inset 0 -3px 0 rgba(0,0,0,.25); }
    .kx-clip { display: flex; flex-direction: column; gap: 3px; }
    .kx-cl { font-size: 11px; font-weight: 700; color: #fff3da; }
    .kx-tks { display: flex; flex-wrap: wrap; gap: 3px; }
    .kx-clip.burst .kx-tks { padding: 2px; border-radius: 6px; box-shadow: 0 0 0 2px rgba(255, 220, 120, .5); }
    .kx-tk { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 34px; border-radius: 3px 3px 6px 6px; background: #fbf4e3; color: #3a2a18; box-shadow: 0 2px 0 rgba(0,0,0,.3); transition: transform .2s, opacity .3s; }
    .kx-tk::before { content: ''; position: absolute; top: -4px; left: 50%; width: 10px; height: 5px; margin-left: -5px; border-radius: 2px; background: #b8923a; }
    .kx-tk.s3 { background: #e7eef7; } .kx-tk.stuck { background: #f2d6cf; } .kx-tk b { position: absolute; bottom: 0; right: 2px; font-size: 9px; }
    .kx-tk.on { transform: translateY(4px) rotate(-6deg); box-shadow: 0 0 0 3px #ffd45a; }
    .kx-tk.done { opacity: .3; }
    .kx-mid { display: flex; flex-direction: column; gap: 8px; }
    .kx-stove { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px; background: linear-gradient(#2b2522, #1a1614); box-shadow: inset 0 0 0 2px #47403a; }
    .kx-burners { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
    .kx-b { position: relative; width: 62px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .kx-flame { display: block; width: 52px; height: 52px; border-radius: 50%; background: radial-gradient(circle, #3a3532 30%, #24201d 31%, #24201d 45%, #3a3532 46%, #2a2522 70%); box-shadow: inset 0 0 0 3px #4d4540; transition: background .3s, box-shadow .3s; }
    .kx-b.lit .kx-flame { background: radial-gradient(circle, #3a3532 30%, #ff8a2a 33%, #ffc24a 42%, #3a6ad0 47%, #2a2522 70%); box-shadow: inset 0 0 0 3px #4d4540, 0 0 16px rgba(255, 150, 50, .55); }
    .kx-b.lighting .kx-flame { animation: kxLight .5s ease-in-out infinite alternate; }
    @keyframes kxLight { from { box-shadow: inset 0 0 0 3px #4d4540, 0 0 2px rgba(255,150,50,.2); background: radial-gradient(circle, #3a3532 30%, #6a3a1a 33%, #3a3532 46%, #2a2522 70%); } to { box-shadow: inset 0 0 0 3px #4d4540, 0 0 18px rgba(255,150,50,.7); } }
    .kx-pan { position: absolute; top: 14px; width: 46px; height: 10px; border-radius: 0 0 8px 8px; background: #555; box-shadow: 0 -3px 0 #777; opacity: 0; overflow: hidden; }
    .kx-b.cooking .kx-pan, .kx-b.smoke .kx-pan { opacity: 1; }
    .kx-prog { display: block; height: 100%; width: 0; background: #ffd45a; }
    .kx-b.smoke .kx-flame { filter: grayscale(.8); }
    .kx-b.smoke::after { content: ''; position: absolute; top: -10px; left: 50%; width: 30px; height: 26px; margin-left: -15px; border-radius: 50%; background: radial-gradient(circle, rgba(200,200,200,.8), rgba(200,200,200,0) 70%); animation: kxSmoke .8s ease-out infinite; }
    @keyframes kxSmoke { from { transform: translateY(6px) scale(.6); opacity: .9; } to { transform: translateY(-12px) scale(1.3); opacity: 0; } }
    .kx-bt { font-size: 10px; min-height: 13px; text-align: center; white-space: nowrap; color: #ffe7b8; }
    .kx-dials { display: flex; justify-content: center; gap: 22px; }
    .kx-dialw { display: flex; flex-direction: column; align-items: center; gap: 1px; }
    .kx-dial { width: 72px; height: 72px; padding: 0; border: 0; border-radius: 50%; background: none !important; box-shadow: none !important; touch-action: none; cursor: grab; }
    .kx-dial:disabled { cursor: default; opacity: .75; }
    .kx-dial svg { width: 100%; height: 100%; }
    .kx-dial circle { fill: #8a7f75; } .kx-dial circle.on { fill: #ffd45a; }
    .kx-knob { fill: #c9b9a0 !important; stroke: #3a2a18; stroke-width: 3; }
    .kx-egg ellipse { fill: #f2e6c8; stroke: #3a2a18; stroke-width: 3; } .kx-egg path { fill: #c99a4a; }
    .kx-ptr { stroke: #9e3a34; stroke-width: 6; stroke-linecap: round; }
    .kx-dn { font-size: 11px; opacity: .85; } .kx-dv { font-size: 14px; color: #ffd45a; }
    .kx-dialw.hot .kx-dv, .kx-prop.hot .kx-ps, .kx-crate.hot span { animation: kxHot 1s ease-out; }
    @keyframes kxHot { from { background: rgba(255, 220, 120, .8); color: #2a1a06; } }
    .kx-props { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
    .kx-prop { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px; border-radius: 10px; background: rgba(255, 240, 210, .08) !important; color: #f6ead2 !important; border: 1px solid rgba(255, 230, 190, .25); font-size: 12px; text-align: center; min-height: 0; }
    .kx-prop.fixed { opacity: .7; } .kx-prop:disabled { cursor: default; }
    .kx.live .kx-prop:not(.fixed):not(.kx-keyw):hover { box-shadow: 0 0 0 2px #ffd45a; }
    .kx-pn { font-weight: 700; font-size: 13px; } .kx-ps { opacity: .9; }
    .kx-slots { display: flex; gap: 6px; width: 100%; }
    .kx-slot { position: relative; flex: 1 1 0; min-height: 96px; padding-top: 50px !important; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2px; padding: 4px; border-radius: 8px; border: 2px dashed rgba(255,230,190,.35) !important; background: rgba(0,0,0,.2) !important; color: #f6ead2 !important; font-size: 11px; }
    .kx-slot.on { border-style: solid !important; border-color: #ffd45a !important; }
    .kx-slot.over { background: rgba(255, 212, 90, .25) !important; }
    .kx-sl i { opacity: .8; }
    .kx-hook { position: absolute; top: 6px; width: 14px; height: 16px; border: 3px solid #b8923a; border-top: 0; border-radius: 0 0 8px 8px; }
    .kx-pot { position: absolute; top: 4px; } .kx-pot .kx-gi { width: 26px; height: 26px; fill: #9a8f78; opacity: .55; }
    .kx-slot .kx-pot + .kx-key { top: 22px; }
    .kx-key { position: absolute; top: 14px; display: inline-flex; color: #ffd45a; touch-action: none; cursor: grab; z-index: 2; }
    .kx-key .kx-gi { width: 28px; height: 28px; filter: drop-shadow(0 2px 0 rgba(0,0,0,.5)); }
    .kx-key.drag { cursor: grabbing; z-index: 60; transition: none; }
    .kx-trayart, .kx-jarart { position: relative; display: flex; align-items: center; justify-content: center; width: 96px; height: 54px; }
    .kx-trayart { border-radius: 50%; background: radial-gradient(ellipse at 50% 60%, #d8c9a8 0 55%, #8a7a5a 56% 62%, transparent 63%); }
    .kx-dish .kx-gi { width: 28px; height: 28px; fill: #c46a4a; }
    .kx-tag { position: absolute; right: -4px; top: -2px; padding: 2px 4px; border-radius: 3px; background: #fbf4e3; color: #2a1a06; font: 700 9px/1.1 ui-monospace, monospace; transform: rotate(8deg); box-shadow: 0 1px 0 rgba(0,0,0,.4); }
    .kx-jarart .kx-gi { width: 40px; height: 40px; fill: #b7c8d6; }
    .kx-label { position: absolute; bottom: 4px; padding: 1px 4px; border-radius: 3px; font: 700 10px/1.1 ui-monospace, monospace; background: #2a2a2a; color: #e8e8e8; }
    .kx-jar.brass .kx-label { background: linear-gradient(#f0d070, #b8923a); color: #2a1a06; }
    .kx-hooks { display: flex; gap: 6px; }
    .kx-h { padding: 1px 6px; border-radius: 4px; background: rgba(0,0,0,.3); font: 700 11px ui-monospace, monospace; opacity: .6; }
    .kx-h.on { opacity: 1; background: #ffd45a; color: #2a1a06; }
    .kx-cooks { display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; min-height: 18px; max-width: 120px; }
    .kx-hat { width: 14px; height: 16px; border-radius: 7px 7px 2px 2px; background: #fff; box-shadow: inset 0 -4px 0 #ddd; }
    .kx-none { font-size: 11px; opacity: .7; }
    .kx-pass { position: relative; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; padding: 10px; border-radius: 10px; background: linear-gradient(#b9b2a6, #8f887c); box-shadow: inset 0 3px 0 rgba(255,255,255,.3); color: #2a2018; }
    .kx-passl { flex: 0 0 100%; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .kx-plates { flex: 1 1 200px; margin: 0; }
    .kx-empty { list-style: none; font-size: 12px; opacity: .7; }
    .kx-plates .kt-plate { animation: none; }
    .kt-plate.kx-wait { visibility: hidden; }
    .kx-crate { flex: 0 0 auto; display: flex; gap: 6px; align-items: center; min-height: 54px; padding: 6px 8px; border-radius: 8px; border: 2px dashed #5a4a3a !important; background: rgba(255,255,255,.2) !important; color: #2a2018 !important; font-size: 12px; text-align: left; }
    .kx-crate.on { border-style: solid !important; background: linear-gradient(#a8784a, #7a5230) !important; color: #fff3da !important; }
    .kx-crate .kx-gi { width: 28px; height: 28px; }
    .kx-crate.fixed { opacity: .8; }
    .kt-pk { display: inline-flex; gap: 1px; align-items: center; font-size: 9px; opacity: .7; } .kt-pk .kx-gi { width: 12px; height: 12px; }
    @media (min-width: 760px) {
      .kx-mid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: stretch; }
      .kx-props { grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; }
    }
    @media (prefers-reduced-motion: reduce) { .kx-b.lighting .kx-flame, .kx-b.smoke::after { animation: none; } }`;
  document.head.appendChild(css);
})();
