// The Fire Drill's war-room board (js/mode-drill.js draws it; the rules are js/drill-core.js). Ladi, Nov 16: "I'm not
// convinced you've moved away from the boring text game style", then picked "Animated war-room board".
//   - The four leads stand at their stations along the request path (Callers, the Gate, the Queue on a queue path,
//     the Function, the Store), with the props from the Live shift (assets/img/ic-live) and their own sprites
//     (assets/img/lead). Each station shows its own gauge: the Gate's token bucket, the Queue's waiting messages and
//     dead-letter queue, the Function's busy environments, the Store's writes (per partition once Contributor
//     Insights is on).
//   - A deploy plays out tick by tick from the run's frames (SD.drill.lastFrames): orders fly along the path, 429s
//     bounce back to the callers, failures burst where they happen, the error budget drains as the run spills.
//   - X-Ray still decides what you see: a burst at a traced station shows its trace map colour and what it was; at an
//     untraced one it's a grey "?". A station's ring is its trace map status, so the map is the board.
//   - After the run each lead says their pager line in a bubble. Tap a station to work on it.
(function () {
  if (!SD.drill) return;
  const D = SD.drill, U = SD.ui;
  const esc = s => U.esc(String(s == null ? '' : s));
  const B = SD.drillBoard = { STEP_MS: 280 };
  const STATUS = { ok: 'OK', error: 'Error 4xx', fault: 'Fault 5xx', throttle: 'Throttle 429', dark: 'Not traced', off: '' };
  const PROP = { gate: 'gate', queue: 'reports', fn: 'desk', store: 'vault' };
  const LEAD = { seoyeon: 'seoyeon', mira: 'mira', kai: 'kai', dutch: 'dutch' };
  const img = (src, cls, alt) => `<img class="${cls}" src="${src}" alt="${esc(alt || '')}" draggable="false">`;
  const env = k => `assets/img/ic-live/${k}.webp`;
  const cap = (n, k) => Math.min(n, k);

  // Which stations are on this drill's path, left to right.
  B.path = drill => ['callers'].concat(D.ORDER.filter(k => k !== 'queue' || D.hasQueue(drill)));

  // The board, static: totals from the run's metrics. `at` is the station being worked on.
  B.html = function (f, e, at, notes) {
    const keys = B.path(f.drill);
    const note = (notes || []).map(([k, who, text]) => { const i = Math.max(0, keys.indexOf(k));
      return `<p class="db-note" style="--x:${((i + .5) / keys.length * 100).toFixed(1)}%" data-vo="${esc(who + '|' + text)}">${img(`assets/img/portraits/${who}-neutral.webp`, 'db-nface', '')}<span><b>${esc(D.NAMES[who] || who)}:</b> ${esc(text)}</span></p>`; }).join('');
    const cells = keys.map((k, i) => (i ? `<span class="db-wire" data-w="${keys[i - 1]}-${k}" aria-hidden="true"></span>` : '') + station(f, e, k, at)).join('');
    return `<div class="db" data-path="${D.DRILLS[f.drill].path}" role="group" aria-label="The war room: the request path and its stations">
      <div class="db-lane">${cells}</div>
      <div class="db-clock" aria-hidden="true"><span class="db-tick"></span></div>
      <div class="db-fly" aria-hidden="true"></div></div>${note}`;
  };
  function station(f, e, k, at) {
    if (k === 'callers') {
      return `<div class="db-st db-callers" data-st="callers"><span class="db-fx"></span>
        <span class="db-crowd">${[0, 1, 2].map(i => img(env('env'), 'db-env c' + i)).join('')}</span>
        <b class="db-name">Callers</b><span class="db-g db-g-callers">${gaugeCallers(e.m)}</span></div>`;
    }
    const s = D.station(f.drill, k), st = e.nodes[k] || 'dark';
    return `<button class="db-st st-${st}${k === at ? ' at' : ''}" data-at="${k}" data-st="${k}" aria-pressed="${k === at}" aria-label="${esc(s.name)}, ${esc(s.svc)}: ${esc(STATUS[st] || '')}">
      <span class="db-fx"></span>
      <span class="db-fig">${img(`assets/img/lead/${LEAD[s.who]}.webp`, 'db-lead', D.NAMES[s.who])}${img(`assets/img/ic-live/${PROP[k]}.webp`, 'db-prop')}</span>
      <b class="db-name">${esc(s.name)}</b><span class="db-svc">${esc(s.svc)}</span>
      <span class="db-ring">${esc(STATUS[st] || '')}</span>
      <span class="db-g db-g-${k}">${gauge(f, k, null, e.m)}</span></button>`;
  }
  // Gauges. With a frame: the state at that tick. Without: the run's totals.
  function gaugeCallers(m, fr) {
    const n = fr ? (fr.d.req | 0) : m.req, gave = fr ? fr.gave : m.gaveUp;
    return `<span class="db-num">${n}</span><span class="db-cap">${fr ? 'this tick' : 'orders'}</span>${gave ? `<span class="db-bad">${gave} gave up</span>` : ''}`;
  }
  function gauge(f, k, fr, m) {
    const cfg = f.cfg;
    if (k === 'gate') {
      const burst = fr ? fr.burst : (D.DRILLS[f.drill].setup(f.v || { k: 0 }).bucket || [40])[0];
      const tokens = fr ? fr.tokens : burst, show = Math.min(burst, 12), full = Math.round(tokens / burst * show);
      return `<span class="db-pips" title="Token bucket">${Array.from({ length: show }, (_, i) => `<i class="${i < full ? 'on' : ''}"></i>`).join('')}</span>
        <span class="db-cap">Bucket ${tokens} of ${burst}</span>${(fr ? fr.d.throttles429 : m.throttles429) ? `<span class="db-bad">${fr ? fr.d.throttles429 : m.throttles429} × 429</span>` : ''}`;
    }
    if (k === 'queue' && D.DRILLS[f.drill].hub) {
      const hub = D.DRILLS[f.drill].hub, tot = (n, x) => (fr ? fr.d[n] | 0 : m[x || n] | 0);
      if (hub === 'sns') {
        const out = tot('delivered'), skip = tot('filteredOut');
        return `<span class="db-stack">${Array.from({ length: cap(out, 8) }, () => img(env('env'), 'db-env')).join('')}</span>
          <span class="db-cap">${out} delivered · ${skip} filtered</span>`;
      }
      const okN = tot('succeeded'), bad = tot('execFailed');
      return `<span class="db-stack">${Array.from({ length: cap(okN, 8) }, () => img(env('env-done'), 'db-env')).join('')}</span>
        <span class="db-cap">${okN} succeeded</span>${bad ? `<span class="db-bad">${bad} failed</span>` : ''}`;
    }
    if (k === 'queue') {
      const wait = fr ? fr.qv + fr.qh : m.left + m.poisonLoose, dlq = fr ? fr.dlq : m.parked;
      return `<span class="db-stack">${Array.from({ length: cap(wait, 8) }, () => img(env('env'), 'db-env')).join('')}</span>
        <span class="db-cap">${wait} waiting${fr && fr.qh ? ` · ${fr.qh} hidden` : ''}</span>${cfg.queue.dlq || dlq ? `<span class="db-dlq">${img(env('env-poison'), 'db-env')} DLQ ${dlq}</span>` : ''}`;
    }
    if (k === 'fn') {
      const pool = cfg.fn.reserved != null ? cfg.fn.reserved : 10, busy = fr ? fr.busy : m.maxConc, show = Math.min(pool, 10);
      return `<span class="db-slots">${Array.from({ length: show }, (_, i) => `<i class="${i < busy ? 'on' : ''}${i < (cfg.fn.prov | 0) ? ' prov' : ''}"></i>`).join('')}</span>
        <span class="db-cap">${busy} of ${pool} busy</span>`;
    }
    if (k === 'store') {
      const parts = fr ? fr.parts : null, per = D.PER_PART;
      const bars = cfg.store.insights && parts
        ? `<span class="db-parts">${parts.map(p => `<i style="--h:${Math.min(1, p / per)}" class="${p >= per ? 'full' : ''}"></i>`).join('')}</span><span class="db-cap">Partitions</span>`
        : `<span class="db-drawer">${Array.from({ length: cap(fr ? (fr.done | 0) : m.ok, 8) }, () => img(env('env-done'), 'db-env')).join('')}</span><span class="db-cap">${fr ? fr.done : m.ok} written</span>`;
      return bars;
    }
    return '';
  }

  // The lead's lines after a run, as speech bubbles under the board.
  // Each lead's face reacts to what their station saw: a problem there, or not.
  const TROUBLE = {
    seoyeon: m => m.throttles429 || m.fault5xx || m.slow || m.forbidden || m.stale || m.cstale || m.leaked,
    mira: m => m.received > m.sent || m.parked || m.maxAge > 30 || m.lost || m.filtered || m.misrouted || m.execFailed,
    kai: m => m.timeouts || m.denied || m.iamDenied || m.hot || m.over || m.errors || m.condBlocked || m.upFail || m.misses * 2 > m.reads,
    dutch: m => m.dupes || m.hot + m.over || m.denied || m.iamDenied || m.stale || m.filtered || m.misrouted || m.stuck || m.cstale || m.evictions || m.upFail || m.userKey || m.pubPut
  };
  B.bubbles = function (lines, m) {
    const by = {};
    lines.forEach(([w, t]) => { (by[w] = by[w] || []).push(t); });
    return `<div class="db-chat" aria-live="polite">${Object.keys(by).map(w => `<p class="db-say${m && TROUBLE[w] && TROUBLE[w](m) ? ' bad' : ''}" data-vo="${esc(w + '|' + by[w][0])}">
      ${img(`assets/img/portraits/${w}-${m && TROUBLE[w] ? (TROUBLE[w](m) ? 'shock' : 'smile') : 'neutral'}.webp`, 'db-face', '')}<span class="db-bubble"><b>${esc(D.NAMES[w] || w)}</b> ${by[w].map(esc).join(' ')}</span></p>`).join('')}</div>`;
  };

  // ---- Playback ----
  // What a frame's deltas show at each station: [station, label, x-ray status].
  function events(f, fr) {
    const d = fr.d, out = [], async = D.DRILLS[f.drill].path === 'async';
    if (d.throttles429) out.push(['gate', `${d.throttles429} × 429`, 'throttle']);
    if (d.fault5xx && !async && !d.hot && !d.denied && !d.over) out.push(['gate', `${d.fault5xx} × ${d.iamDenied || d.v2Fail ? '502' : '5xx'}`, 'fault']);
    if (d.v2Fail) out.push(['fn', `${d.v2Fail} failed on v2`, 'fault']);
    if (d.hookFailed) out.push(['fn', 'Test failed: no shift', 'ok']);
    else if (d.stopped) out.push(['fn', 'Rolled back to v1', 'ok']);
    else if (d.shifted) out.push(['fn', 'v2 gets traffic', 'ok']);
    if (d.slow) out.push(['fn', `${d.slow} cold start${d.slow > 1 ? 's' : ''}`, 'fault']);
    if (d.timeouts) out.push(['fn', `Task timed out after ${f.cfg.fn.timeout} s`, 'fault']);
    if (d.errors && !d.timeouts && !d.hot && !d.denied && !d.iamDenied && !d.v2Fail && !d.over) out.push(['fn', `${d.errors} failed`, 'fault']);
    if (d.hot) out.push(['store', `${d.hot} × ThrottlingException`, 'throttle']);
    if (d.over) out.push(['store', `${d.over} × ProvisionedThroughputExceeded`, 'throttle']);
    if (d.denied) out.push(['store', `${d.denied} × AccessDenied: kms:Decrypt`, 'error']);
    if (d.forbidden) out.push(['gate', `${d.forbidden} × 403`, 'error']);
    if (d.unauth) out.push(['gate', `${d.unauth} × 401`, 'error']);
    if (d.leaked) out.push(['gate', `${d.leaked} wrong customer`, 'error']);
    else if (d.ghits) out.push(['gate', `${d.ghits} from cache`, 'ok']);
    if (d.stale) out.push(['store', `${d.stale} not found yet`, 'error']);
    if (d.cstale) out.push(['store', `${d.cstale} old price${d.cstale > 1 ? 's' : ''}`, 'error']);
    if (d.evictions) out.push(['store', `${d.evictions} evicted`, 'throttle']);
    if (d.misses) out.push(['store', `${d.misses} cache miss${d.misses > 1 ? 'es' : ''}`, 'ok']);
    if (d.up403) out.push(['store', `${d.up403} × 403 Request has expired`, 'error']);
    if (d.upToken) out.push(['store', `${d.upToken} × ExpiredToken`, 'error']);
    if (d.upDone) out.push(['store', `${d.upDone} upload${d.upDone > 1 ? 's' : ''} done`, 'ok']);
    if (d.iamDenied) out.push(['store', `${d.iamDenied} × AccessDenied: dynamodb:PutItem`, 'error']);
    if (d.dupes) out.push(['store', `${d.dupes} twice`, 'ok']);
    if (d.condBlocked) out.push(['store', `${d.condBlocked} × ConditionalCheckFailed`, 'error']);
    if (d.parked) out.push(['queue', `${d.parked} to ${D.DRILLS[f.drill].stream ? 'orders-failed' : 'DLQ'}`, 'ok']);
    if (d.purged) out.push(['queue', `Purged ${d.purged}`, 'ok']);
    if (d.noAttr) out.push(['queue', `${d.noAttr} filtered: no attributes`, 'error']);
    else if (d.filtered) out.push(['queue', `${d.filtered} filtered out`, 'error']);
    if (d.misrouted) out.push(['fn', `${d.misrouted} pickup${d.misrouted > 1 ? 's' : ''} labelled`, 'error']);
    if (d.fnThrottled) out.push(['fn', `${d.fnThrottled} × TooManyRequestsException${D.DRILLS[f.drill].hub === 'sfn' && f.cfg.flow.retry !== 'none' ? ', retried' : ''}`, 'throttle']);
    if (d.execFailed) out.push(['queue', `${d.execFailed} execution${d.execFailed > 1 ? 's' : ''} failed`, 'fault']);
    if (d.released) out.push(['queue', `${d.released} to ReleaseStock`, 'ok']);
    return out;
  }
  // Envelopes along the wires this tick: [from, to, count, kind].
  function flights(f, fr) {
    const d = fr.d, async = D.DRILLS[f.drill].path === 'async', o = [];
    const into = (d.req | 0) + (d.throttles429 | 0) - (d.gaveUp | 0);
    o.push(['callers', 'gate', Math.max(d.req | 0, Math.min(into, 8)), 'env']);
    if (d.throttles429) o.push(['gate', 'callers', d.throttles429, 'env-429']);
    const hub = D.DRILLS[f.drill].hub;
    if (hub) {
      if (d.published || d.started) o.push(['gate', 'queue', (d.published | 0) + (d.started | 0), 'env']);
      if (d.invocations) o.push(['queue', 'fn', d.invocations, 'env']);
    } else if (async) {
      if (d.sent) o.push(['gate', 'queue', d.sent, 'env']);
      if (d.received) o.push(['queue', 'fn', d.received, 'env']);
    } else if (d.invocations) o.push(['gate', 'fn', d.invocations, 'env']);
    const writes = (d.wcuUsed | 0) + (d.hot | 0) + (d.over | 0) + (d.denied | 0) + (d.iamDenied | 0);
    if (writes) o.push(['fn', 'store', writes, d.dupes ? 'env-twice' : 'env']);
    return o;
  }
  // Plays the frames on a board already in `root`. opts: { traced: {station: bool}, onTick(frame, i), gone() }.
  // Resolves when done (or skipped).
  B.play = async function (root, f, frames, opts) {
    opts = opts || {};
    const board = root.querySelector('.db');
    if (!board || !frames || !frames.length) return;
    const fly = board.querySelector('.db-fly'), tick = board.querySelector('.db-tick');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let skip = false;
    opts.skipBtn && (opts.skipBtn.onclick = () => { skip = true; });
    board.classList.add('playing');
    let gave = 0, done = 0;
    for (let i = 0; i < frames.length; i++) {
      if (opts.gone && opts.gone()) return;
      const fr = frames[i];
      gave += fr.d.gaveUp | 0;
      done += (fr.d.wcuUsed | 0) - (fr.d.dupes | 0);
      fr.gave = gave; fr.done = Math.max(0, done);
      if (skip) continue;
      tick.textContent = `${(fr.t + 1) * D.TICK_S}s${fr.t >= D.TICKS ? ' · draining' : ''}`;
      const cc = board.querySelector('.db-g-callers'); if (cc) cc.innerHTML = gaugeCallers(null, fr);
      D.ORDER.forEach(k => { const g = board.querySelector('.db-g-' + k); if (g) g.innerHTML = gauge(f, k, fr, null); });
      if (!reduce) flights(f, fr).forEach(([a, b, n, kind]) => launch(board, fly, a, b, Math.min(n, 5), kind));
      events(f, fr).forEach(([k, label, st]) => burst(board, k, label, opts.traced && opts.traced[k] ? st : 'dark'));
      if (opts.onTick) opts.onTick(fr, i);
      await new Promise(r => setTimeout(r, B.STEP_MS));
    }
    board.classList.remove('playing');
    tick.textContent = '';
  };
  function centre(board, k) {
    const el = board.querySelector(`[data-st="${k}"] .db-fig, [data-st="${k}"] .db-crowd`);
    if (!el) return null;
    const a = el.getBoundingClientRect(), b = board.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height * .6 };
  }
  function launch(board, fly, a, b, n, kind) {
    const p = centre(board, a), q = centre(board, b);
    if (!p || !q) return;
    for (let j = 0; j < n; j++) {
      const e = document.createElement('img');
      e.src = env(kind); e.className = 'db-flyer'; e.alt = '';
      const dy = (j - (n - 1) / 2) * 7;
      e.style.transform = `translate(${p.x - 12}px, ${p.y - 10 + dy}px)`;
      e.style.transitionDelay = (j * 32) + 'ms';
      fly.appendChild(e);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        e.style.transform = `translate(${q.x - 12}px, ${q.y - 10 + dy}px)`;
        e.style.opacity = '1';
      }));
      setTimeout(() => e.remove(), B.STEP_MS + 260 + j * 32);
    }
  }
  function burst(board, k, label, st) {
    const box = board.querySelector(`[data-st="${k}"] .db-fx`);
    if (!box) return;
    const e = document.createElement('span');
    e.className = 'db-pop st-' + st;
    e.textContent = st === 'dark' ? '?' : label;
    box.appendChild(e);
    const s = board.querySelector(`[data-st="${k}"]`); if (s) { s.classList.remove('hit'); void s.offsetWidth; s.classList.add('hit'); }
    setTimeout(() => e.remove(), 900);
  }

  // The living war room (js/drill-room.js) draws the same gauges, events and flights over its painted room.
  Object.assign(B, { gauge, gaugeCallers, events, flights, TROUBLE });

  const css = document.createElement('style');
  css.textContent = `
    .db { position: relative; border-radius: 14px; padding: 10px 8px 8px; overflow: hidden;
      background: linear-gradient(rgba(14, 12, 20, .35), rgba(14, 12, 20, .7)), repeating-linear-gradient(90deg, rgba(120, 80, 40, .25) 0 46px, rgba(90, 60, 30, .25) 46px 48px);
      border: 2px solid rgba(214, 178, 84, .45); box-shadow: inset 0 -30px 40px rgba(0, 0, 0, .45); }
    .db-lane { display: flex; align-items: stretch; gap: 0; }
    .db-wire { flex: 0 1 18px; min-width: 4px; align-self: center; height: 4px; margin-top: -40px; border-radius: 2px;
      background: repeating-linear-gradient(90deg, #d6b254 0 6px, transparent 6px 10px); opacity: .55; }
    .db.playing .db-wire { animation: dbwire .6s linear infinite; }
    @keyframes dbwire { to { background-position: 10px 0; } }
    .db-st { position: relative; flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 4px 2px 6px; border-radius: 12px; border: 3px solid rgba(141, 147, 168, .7); background: rgba(28, 25, 38, .72);
      color: #efe6d2; font: inherit; text-align: center; cursor: pointer; box-shadow: none; }
    .db-callers { cursor: default; border-style: solid; border-color: #5fb36b; }
    .db-st:hover:not(.db-callers) { background: rgba(48, 43, 64, .85); }
    .db-st.at { box-shadow: 0 0 0 3px #f3d36b, 0 0 18px rgba(243, 211, 107, .45); }
    .db-st.st-ok { border-color: #5fb36b; } .db-st.st-error { border-color: #e0c341; } .db-st.st-fault { border-color: #e0574b; }
    .db-st.st-throttle { border-color: #a46be0; } .db-st.st-dark { border-style: dashed; }
    .db-st.hit { animation: dbhit .35s ease-out; }
    @keyframes dbhit { 30% { transform: translateY(-3px) scale(1.03); } }
    .db-fig { position: relative; display: flex; align-items: flex-end; justify-content: center; height: 108px; width: 100%; }
    .db-lead { height: 100px; width: auto; image-rendering: pixelated; position: relative; z-index: 2; filter: drop-shadow(0 4px 2px rgba(0, 0, 0, .6)); }
    .db-prop { height: 48px; width: auto; image-rendering: pixelated; margin-left: -10px; position: relative; z-index: 1; filter: drop-shadow(0 3px 2px rgba(0, 0, 0, .6)); }
    .db-crowd { position: relative; height: 108px; width: 100%; display: block; }
    .db-crowd .db-env { position: absolute; width: 28px; image-rendering: pixelated; }
    .db-crowd .c0 { left: calc(50% - 26px); top: 54px; } .db-crowd .c1 { left: calc(50% - 4px); top: 44px; } .db-crowd .c2 { left: calc(50% - 16px); top: 68px; }
    .db-name { font-family: var(--f-head, serif); font-size: 14px; color: #f3e3b5; }
    .db-svc { font-size: 11px; color: #c9bfd6; }
    .db-ring { font-size: 10.5px; font-weight: 800; letter-spacing: .03em; }
    .st-ok .db-ring { color: #9be0a5; } .st-error .db-ring { color: #f1dc7a; } .st-fault .db-ring { color: #ff9d93; } .st-throttle .db-ring { color: #d1b0ff; } .st-dark .db-ring { color: #b9bdc9; }
    .db-g { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 52px; width: 100%; }
    .db-num { font-size: 22px; font-weight: 800; line-height: 1; }
    .db-cap { font-size: 11px; color: #d8cfe4; }
    .db-bad { font-size: 11px; font-weight: 800; color: #ff9d93; }
    .db-pips { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px; max-width: 92px; }
    .db-pips i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255, 255, 255, .12); border: 1px solid rgba(243, 211, 107, .5); }
    .db-pips i.on { background: #f3d36b; box-shadow: 0 0 5px rgba(243, 211, 107, .8); }
    .db-slots { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px; max-width: 96px; }
    .db-slots i { width: 14px; height: 9px; border-radius: 2px; background: rgba(255, 255, 255, .12); border: 1px solid rgba(160, 200, 255, .4); }
    .db-slots i.on { background: #ffd34d; box-shadow: 0 0 6px rgba(255, 211, 77, .8); }
    .db-slots i.prov { border-color: #9be0a5; }
    .db-stack, .db-drawer { display: flex; flex-wrap: wrap; justify-content: center; gap: 1px; min-height: 20px; max-width: 100px; }
    .db-stack .db-env, .db-drawer .db-env, .db-dlq .db-env { width: 18px; image-rendering: pixelated; }
    .db-dlq { display: inline-flex; gap: 3px; align-items: center; font-size: 11px; font-weight: 800; color: #ffcf9d; }
    .db-parts { display: flex; gap: 4px; align-items: flex-end; height: 30px; }
    .db-parts i { width: 16px; height: calc(4px + var(--h) * 26px); border-radius: 3px 3px 0 0; background: #6fa8dc; }
    .db-parts i.full { background: #d1b0ff; box-shadow: 0 0 8px rgba(164, 107, 224, .9); }
    .db-fx { position: absolute; left: 0; right: 0; top: 4px; z-index: 5; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
    .db-pop { padding: 2px 7px; border-radius: 10px; font-size: 12px; font-weight: 800; color: #17131f; background: #e6e6ee; border: 2px solid #17131f;
      animation: dbpop .9s ease-out forwards; white-space: nowrap; }
    .db-pop.st-throttle { background: #d1b0ff; } .db-pop.st-fault { background: #ff9d93; } .db-pop.st-error { background: #f1dc7a; } .db-pop.st-ok { background: #c9eccd; }
    .db-pop.st-dark { background: #8d93a8; color: #fff; min-width: 26px; text-align: center; }
    @keyframes dbpop { 0% { transform: translateY(14px) scale(.6); opacity: 0; } 20% { transform: translateY(0) scale(1.1); opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(-16px); opacity: 0; } }
    .db-fly { position: absolute; inset: 0; pointer-events: none; z-index: 4; }
    .db-flyer { position: absolute; left: 0; top: 0; width: 26px; image-rendering: pixelated; opacity: .6;
      transition: transform ${B.STEP_MS + 120}ms cubic-bezier(.3, .1, .4, 1), opacity 120ms; filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .6)); }
    .db-clock { position: absolute; left: 50%; top: 2px; transform: translateX(-50%); z-index: 6; }
    .db-tick:not(:empty) { display: inline-block; padding: 1px 10px; border-radius: 9px; background: rgba(12, 10, 16, .85); font-size: 12px; font-weight: 800; color: #f3d36b; }
    .db-say.bad .db-bubble { border-color: #9e3a34; }
    .db-note { position: relative; margin: 10px 0 0; display: flex; gap: 8px; align-items: center; padding: 6px 10px; border-radius: 10px; background: #fff3c4; color: #17131f;
      border: 2px solid #17131f; font-size: 14px; line-height: 1.3; box-shadow: 0 3px 0 rgba(0, 0, 0, .35); }
    .db-note::before { content: ''; position: absolute; top: -10px; left: clamp(12px, calc(var(--x) - 8px), calc(100% - 28px)); border: 8px solid transparent; border-bottom-color: #17131f; border-top: 0; }
    .db-note::after { content: ''; position: absolute; top: -7px; left: clamp(14px, calc(var(--x) - 6px), calc(100% - 26px)); border: 6px solid transparent; border-bottom-color: #fff3c4; border-top: 0; }
    .db-nface { width: 30px; height: 34px; object-fit: cover; object-position: top; border-radius: 6px; border: 2px solid #17131f; flex: 0 0 auto; background: #c7bca4; }
    .db-chat { display: flex; flex-direction: column; gap: 6px; }
    .db-say { display: flex; gap: 8px; align-items: flex-start; margin: 0; }
    .db-face { width: 38px; height: 44px; object-fit: cover; object-position: top; border-radius: 8px; border: 2px solid #17131f; background: #c7bca4; flex: 0 0 auto; }
    .db-bubble { position: relative; padding: 6px 10px; border-radius: 12px; background: #f6efdc; color: #17131f; font-size: 14px; line-height: 1.35;
      border: 2px solid #17131f; box-shadow: 0 2px 0 rgba(0, 0, 0, .35); }
    .db-bubble::before { content: ''; position: absolute; left: -8px; top: 12px; border: 6px solid transparent; border-right-color: #17131f; border-left: 0; }
    .db-bubble b { color: #6b3a1a; margin-right: 2px; }
    @media (min-width: 900px) {
      .db { padding: 14px 14px 12px; }
      .db-fig, .db-crowd { height: 172px; }
      .db-lead { height: 160px; } .db-prop { height: 72px; margin-left: -14px; }
      .db-crowd .db-env { width: 40px; } .db-crowd .c0 { top: 90px; } .db-crowd .c1 { top: 72px; } .db-crowd .c2 { top: 112px; }
      .db-crowd .c0 { left: calc(50% - 40px); } .db-crowd .c1 { left: calc(50% - 4px); } .db-crowd .c2 { left: calc(50% - 22px); }
      .db-wire { flex-basis: 40px; height: 5px; margin-top: -60px; }
      .db-name { font-size: 18px; } .db-svc { font-size: 12.5px; } .db-ring { font-size: 12px; } .db-cap, .db-bad, .db-dlq { font-size: 12.5px; }
      .db-pips { max-width: 140px; } .db-pips i { width: 12px; height: 12px; }
      .db-slots { max-width: 150px; } .db-slots i { width: 22px; height: 12px; }
      .db-stack .db-env, .db-drawer .db-env { width: 24px; } .db-stack, .db-drawer { max-width: 150px; }
      .db-flyer { width: 32px; }
      .db-pop { font-size: 14px; }
    }
    @media (max-width: 600px) {
      .db { padding: 8px 4px 6px; }
      .db-fig, .db-crowd { height: 70px; }
      .db-lead { height: 64px; } .db-prop { height: 30px; margin-left: -8px; }
      .db-crowd .db-env { width: 20px; } .db-crowd .c0 { top: 34px; } .db-crowd .c1 { top: 26px; } .db-crowd .c2 { top: 44px; }
      .db-name { font-size: 11px; line-height: 1.1; } .db-svc { display: none; } .db-ring { font-size: 9px; }
      .db-wire { flex-basis: 6px; margin-top: -30px; }
      .db-cap, .db-bad, .db-dlq { font-size: 9.5px; } .db-num { font-size: 17px; }
      .db-pips i { width: 6px; height: 6px; } .db-slots i { width: 8px; height: 6px; }
      .db-stack .db-env, .db-drawer .db-env { width: 12px; }
      .db-st { padding: 3px 1px 4px; border-width: 2px; }
      .db-pop { font-size: 10px; padding: 1px 4px; }
      .db-flyer { width: 16px; }
    }`;
  document.head.appendChild(css);
})();
