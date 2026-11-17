// The Renovation's hands-on planning (Nov 17): the plan is set on the scene itself, not on rows of buttons.
//   Pieces: a tray of tokens (a Retain seal, a snapshot jar, the alarm bell...) that the player drags onto the world.
//           Any element with data-drop="<target>" is a place a piece can land; handlers.drop(token, target) sets the plan.
//           A tap on a piece picks it up (it glows) and a tap on a place puts it down, so a keyboard, a switch or a
//           shaky thumb can do the same without dragging. Escape or a tap anywhere else puts it back.
//   Handles: a track with stops (data-slide="<name>" data-stops="10,25,50" data-val="25"), its handle dragged along it
//           and snapping to the nearest stop (or a stop tapped, or the arrow keys); handlers.set(name, value).
//   Sweeps:  a run of places (data-sweep="<name>" on each, data-sweepi="1..n") the player drags across, as with a rope
//           strung from the first house along to the third; handlers.set(name, k) with the furthest one reached.
// While a piece or a rope is dragged near the scene's left or right edge the camera scrolls along, and near the top or
// bottom of the window the page scrolls, so a phone can reach a place that's off screen. Pure DOM, no art of its own.
(function () {
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const EDGE = 48;

  // Keeps the camera (and the page) moving while the pointer sits near an edge during a drag.
  function edgeScroller(root) {
    let pt = null, raf = 0;
    const cams = () => [...root.querySelectorAll('.rs-cam')];
    const tick = () => {
      raf = 0; if (!pt) return;
      let moved = false;
      cams().forEach(cam => {
        const r = cam.getBoundingClientRect();
        if (pt.y < r.top || pt.y > r.bottom) return;
        const dx = pt.x < r.left + EDGE ? -(r.left + EDGE - pt.x) : pt.x > r.right - EDGE ? pt.x - (r.right - EDGE) : 0;
        if (dx && cam.scrollWidth > cam.clientWidth) { cam.scrollLeft += Math.max(-18, Math.min(18, dx * 0.4)); moved = true; }
      });
      const vh = window.innerHeight, dy = pt.y < 60 ? -(60 - pt.y) : pt.y > vh - 60 ? pt.y - (vh - 60) : 0;
      if (dy) {   // the panel scrolls, not the window, in this game
        const sc = root.closest('.win-b') || document.scrollingElement;
        if (sc) { sc.scrollTop += Math.max(-16, Math.min(16, dy * 0.35)); moved = true; }
      }
      if (moved && pt.onMove) pt.onMove();
      raf = requestAnimationFrame(tick);
    };
    return {
      at(x, y, onMove) { pt = { x, y, onMove }; if (!raf) raf = requestAnimationFrame(tick); },
      stop() { pt = null; if (raf) cancelAnimationFrame(raf); raf = 0; }
    };
  }

  // The place under the pointer, ignoring the ghost that follows it.
  // Looks through the overlays (the scene's chips and rows, the slate) to the place underneath.
  const placeAt = (root, x, y, sel) => {
    for (const el of document.elementsFromPoint(x, y)) { const p = el.closest(sel); if (p && root.contains(p)) return p; }
    return null;
  };

  function bind(root, h) {
    h = h || {};
    if (root.rdBound) root.rdBound.abort();
    const ac = new AbortController(), sig = { signal: ac.signal };
    root.rdBound = ac;
    const scroll = edgeScroller(root);
    let armed = null;   // a piece picked up by a tap, waiting for a place
    const disarm = () => { if (armed) armed.classList.remove('rd-armed'); armed = null; root.classList.remove('rd-arming'); };
    const arm = tok => { disarm(); armed = tok; tok.classList.add('rd-armed'); root.classList.add('rd-arming'); if (h.armed) h.armed(tok.dataset.tok); };
    const fits = (tok, place) => !h.fits || h.fits(tok.dataset.tok, place.dataset.drop);

    // ---- Pieces ----
    root.querySelectorAll('[data-tok]').forEach(tok => {
      tok.setAttribute('aria-pressed', 'false');
      tok.addEventListener('pointerdown', e => {
        if (e.button) return;
        const x0 = e.clientX, y0 = e.clientY;
        let ghost = null, over = null;
        const show = (x, y) => {
          ghost.style.transform = `translate(${x - ghost.offsetWidth / 2}px, ${y - ghost.offsetHeight / 2}px)`;
          const p = placeAt(root, x, y, '[data-drop]'), ok = p && fits(tok, p) ? p : null;
          if (ok !== over) { if (over) over.classList.remove('rd-over'); over = ok; if (over) over.classList.add('rd-over'); }
        };
        const move = ev => {
          if (!ghost) {
            if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
            disarm();
            ghost = tok.cloneNode(true); ghost.classList.add('rd-ghost'); ghost.removeAttribute('data-tok'); ghost.removeAttribute('id');
            document.body.appendChild(ghost); root.classList.add('rd-dragging'); tok.classList.add('rd-lifted');
            if (h.lift) h.lift(tok.dataset.tok);
          }
          ev.preventDefault();
          show(ev.clientX, ev.clientY);
          scroll.at(ev.clientX, ev.clientY, () => show(ev.clientX, ev.clientY));
        };
        const up = ev => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
          scroll.stop();
          if (!ghost) return;   // a tap: the click below picks the piece up
          tok.rdDragged = true; setTimeout(() => { tok.rdDragged = false; }, 0);
          ghost.remove(); root.classList.remove('rd-dragging'); tok.classList.remove('rd-lifted');
          if (over) { over.classList.remove('rd-over'); if (ev.type === 'pointerup') h.drop(tok.dataset.tok, over.dataset.drop); }
        };
        window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      }, sig);
      tok.addEventListener('click', e => {
        e.preventDefault();
        if (tok.rdDragged) return;
        if (armed === tok) disarm(); else arm(tok);
        tok.setAttribute('aria-pressed', String(armed === tok));
      }, sig);
      tok.style.touchAction = 'none';
    });
    // A tap on a place while a piece is picked up puts it there, before the place's own tap (which would cycle it).
    root.addEventListener('click', e => {
      if (!armed) return;
      if (e.target.closest('[data-tok]')) return;
      const p = e.target.closest('[data-drop]');
      e.preventDefault(); e.stopPropagation();
      const tok = armed; disarm();
      if (p && fits(tok, p)) h.drop(tok.dataset.tok, p.dataset.drop);
    }, Object.assign({ capture: true }, sig));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') disarm(); }, sig);

    // ---- Handles on a track ----
    root.querySelectorAll('[data-slide]').forEach(tr => {
      const name = tr.dataset.slide, stops = tr.dataset.stops.split(',').map(v => (isNaN(+v) ? v : +v));
      const vert = tr.dataset.axis === 'y', knob = tr.querySelector('.rd-knob');
      let i = Math.max(0, stops.findIndex(v => String(v) === String(tr.dataset.val)));
      const frac = k => (stops.length > 1 ? k / (stops.length - 1) : 0.5);
      const place = (f, live) => {
        if (!knob) return;
        knob.style[vert ? 'top' : 'left'] = (vert ? 1 - f : f) * 100 + '%';
        tr.classList.toggle('rd-live', !!live);
      };
      const nearest = (x, y) => {
        const r = tr.getBoundingClientRect();
        const f = vert ? 1 - (y - r.top) / r.height : (x - r.left) / r.width;
        return { f: Math.max(0, Math.min(1, f)), k: Math.max(0, Math.min(stops.length - 1, Math.round(Math.max(0, Math.min(1, f)) * (stops.length - 1)))) };
      };
      const commit = k => { tr.querySelectorAll('[data-stop]').forEach((s, j) => s.classList.toggle('on', j === k)); if (String(stops[k]) !== String(tr.dataset.val)) h.set(name, stops[k]); else place(frac(k)); };
      if (knob) {
        knob.setAttribute('role', 'slider'); knob.tabIndex = 0;
        knob.setAttribute('aria-valuemin', 0); knob.setAttribute('aria-valuemax', stops.length - 1); knob.setAttribute('aria-valuenow', i);
        knob.setAttribute('aria-valuetext', tr.dataset.say ? tr.dataset.say.split('|')[i] : String(stops[i]));
        place(frac(i));
      }
      tr.style.touchAction = 'none';
      tr.addEventListener('pointerdown', e => {
        if (e.button) return;
        const st = e.target.closest('[data-stop]');
        let k = i, dragged = false;
        const move = ev => {
          const n = nearest(ev.clientX, ev.clientY); dragged = true;
          place(reduced() ? frac(n.k) : n.f, true);
          if (n.k !== k) { k = n.k; if (h.tick) h.tick(name, stops[k]); }
          ev.preventDefault();
        };
        const up = () => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
          tr.classList.remove('rd-live');
          if (!dragged && st) k = +st.dataset.stop;
          else if (!dragged) k = nearest(e.clientX, e.clientY).k;
          place(frac(k)); commit(k);
        };
        window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
        e.preventDefault();
      }, sig);
      if (knob) knob.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const k = Math.max(0, Math.min(stops.length - 1, i + d));
        if (k !== i) commit(k);
      }, sig);
    });

    // ---- Sweeps: a rope dragged across a run of places ----
    const sweeps = {};
    root.querySelectorAll('[data-sweep]').forEach(el => { (sweeps[el.dataset.sweep] = sweeps[el.dataset.sweep] || []).push(el); });
    Object.entries(sweeps).forEach(([name, els]) => {
      const mark = k => els.forEach(el => el.classList.toggle('rd-swept', +el.dataset.sweepi <= k));
      els.forEach(el => {
        el.style.touchAction = 'none';
        el.addEventListener('pointerdown', e => {
          if (e.button || armed) return;
          let k = +el.dataset.sweepi, moved = false;
          const x0 = e.clientX, y0 = e.clientY;
          root.classList.add('rd-sweeping'); mark(k);
          const at = (x, y) => { const p = placeAt(root, x, y, `[data-sweep="${name}"]`); if (p && +p.dataset.sweepi !== k) { k = +p.dataset.sweepi; mark(k); if (h.tick) h.tick(name, k); } };
          const move = ev => {
            if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
            moved = true; ev.preventDefault(); at(ev.clientX, ev.clientY);
            scroll.at(ev.clientX, ev.clientY, () => at(ev.clientX, ev.clientY));
          };
          const up = ev => {
            window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
            scroll.stop(); root.classList.remove('rd-sweeping');
            if (ev.type !== 'pointerup') { mark(0); return; }
            el.rdSwept = true; setTimeout(() => { el.rdSwept = false; }, 0);
            h.set(name, k);
          };
          window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
        }, sig);
        // The place's own tap (a keyboard Enter included) still sets it on its own; a sweep has already set it.
        el.addEventListener('click', e => { if (el.rdSwept) { e.preventDefault(); e.stopImmediatePropagation(); } }, Object.assign({ capture: true }, sig));
      });
    });
    return { disarm };
  }

  const css = document.createElement('style');
  css.id = 'reno-drag-css';
  css.textContent = `
    .rd-tray { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .rd-tok { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 4px 12px 4px 6px; border-radius: 12px; cursor: grab; user-select: none; -webkit-user-select: none;
      background: linear-gradient(#f3e3bf, #dcc290); color: #3a2410; border: 2px solid #8a6a3a; box-shadow: 0 3px 0 #5a4020, 0 6px 12px rgba(0,0,0,.35); font: 800 15px/1 var(--f-head, sans-serif); }
    .rd-tok img { width: 34px; height: 34px; object-fit: contain; pointer-events: none; }
    .rd-tok:focus-visible { outline: 3px solid #ffd45a; outline-offset: 2px; }
    .rd-tok.rd-armed { background: linear-gradient(#fff3c8, #ffd45a); box-shadow: 0 0 0 3px #ffd45a, 0 6px 14px rgba(0,0,0,.4); transform: translateY(-2px); }
    .rd-tok.rd-lifted { opacity: .45; }
    .rd-ghost { position: fixed; left: 0; top: 0; z-index: 9999; pointer-events: none; cursor: grabbing; transform-origin: 50% 50%; opacity: .95; box-shadow: 0 14px 24px rgba(0,0,0,.45); }
    .rd-dragging [data-drop], .rd-arming [data-drop] { outline: 6px dashed rgba(255,212,90,.85); outline-offset: -6px; }
    [data-drop].rd-over { outline: 8px solid #ffd45a !important; background: rgba(255,212,90,.22) !important; }
    .rd-slide { position: relative; touch-action: none; cursor: pointer; user-select: none; -webkit-user-select: none; }
    .rd-knob { position: absolute; cursor: grab; transition: left .18s ease-out, top .18s ease-out; }
    .rd-slide.rd-live .rd-knob { transition: none; cursor: grabbing; }
    .rd-knob:focus-visible { outline: 3px solid #ffd45a; outline-offset: 2px; }
    [data-sweep].rd-swept { outline: 8px solid #ffd45a; outline-offset: -8px; background: rgba(255,212,90,.18); }
    @media (prefers-reduced-motion: reduce) { .rd-knob { transition: none; } .rd-tok.rd-armed { transform: none; } }
  `;
  document.head.appendChild(css);

  SD.renoDrag = { bind };
})();
