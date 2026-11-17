// The Fire Drill (design: project files game-modes/multiplayer-real/design.md, approved by Ladi Nov 16 as its own mode;
// Multiplayer, js/raid.js, is unchanged). Uptima runs drills on a copy of the castle's order system, and four
// champions each own one station of it. Nobody says what's broken: the trace map, each station's CloudWatch metrics
// and the pager are the clues (L9: the state is on the board). The rules are js/drill-core.js on js/aws-sim-ops.js.
//   - You're the incident commander. Tap a station to see its metrics and its settings. The champions report on the
//     pager after every run, but they never pick a fix: you do, up to 3 changes a deploy and 3 deploys a drill.
//   - No walkthrough screens: the warm-up run shows the fault, and each rule's first appearance carries one line from
//     a champion (SD.drill.TEACH, once per save).
//   - The question is the debrief: after each drill, one bank question on its cause, verified only, on the plain exam
//     screen with the shared stake table (SD.modes.ask). A miss's twin opens next night's first debrief.
//   - Saves after every step (S.save.drill). Ends on the last boss, win or lose, then Pip's "why did that work?".
(function () {
  if (!SD.modes || !SD.drill || !SD.awsSim) return;
  const M = SD.modes, U = SD.ui, S = SD.state, D = SD.drill, C = D.CARDS;
  const E = () => SD.exam, TD = () => SD.topicDrill;
  const ID = 'drill', TITLE = 'THE FIRE DRILL';
  const esc = s => U.esc(String(s == null ? '' : s));
  const sv = () => S.save;
  const cur = () => sv().drill || null;
  const keep = () => (sv().drillKeep = sv().drillKeep || { night: 0, taught: {}, carry: [], best: null, clean: {} });
  const save = s => { sv().drill = s; S.persist(); };
  const icon = (n, cls) => `<svg class="dr-gi${cls ? ' ' + cls : ''}" viewBox="0 0 512 512" aria-hidden="true">${(SD.icons && SD.icons[n]) || ''}</svg>`;
  const head = (who, mood) => { try { return SD.art && SD.art.portrait ? `<span class="dr-head">${SD.art.portrait(who, 34, mood || 'neutral')}</span>` : ''; } catch (e) { return ''; } };
  const NAMES = Object.assign({ uptima: 'Uptima' }, D.NAMES);
  const say = (who, mood, line) => `<p class="dr-say" data-vo="${esc(who + '|' + line)}">${head(who, mood)}<span><b>${esc(NAMES[who] || who)}:</b> ${esc(line)}</span></p>`;
  const panel = html => U.panel(`<div class="dr">${html}</div>`, { title: TITLE, onClose: stopNow, cls: 'dr-win' });
  function stopNow() { const s = cur(); if (s) save(s); if (SD.today && SD.today.render) SD.today.render(); }
  const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;
  const NODE_ICON = { callers: 'conversation', gate: 'medieval-gate', queue: 'mailbox', fn: 'lightning-helix', store: 'database' };
  const STATUS = { ok: 'OK', error: 'Error 4xx', fault: 'Fault 5xx', throttle: 'Throttle 429', dark: 'Not traced', off: 'Not on this path' };
  const SAY = {
    arrive: 'Behold, mortals! Thy goddess hath devised a trial most... okay, I copied the order system and broke something. On purpose! Mostly. Find it before the error budget runs out. I\'ll be supervising. From the snack table.',
    again: 'Another drill! Same system, brand new break. I\'d tell you what I broke, but I didn\'t write it down.',
    won: 'Every drill closed! Praise Uptima. Thank Uptima. Credit... okay, fine. Credit them a little.',
    next: 'Next one! This one\'s definitely fine. Probably. Don\'t quote me.',
    pm: 'Postmortem time! One answer, and tell me how sure you are. If you\'re right, I\'m taking the credit.',
    zero: 'The budget\'s gone. In a real outage, this is where everyone gets paged. Including me. Please don\'t page me. We\'ll try again tomorrow.'
  };

  const RM = () => SD.drillRoom;
  // Uptima's cutscenes (storyboard panels 2 and 10): the interface drops away and she stands full size over the
  // blurred war room, blinking, her mouth moving while she talks. A pose 'a>b@ms' switches pose mid-line (the grand
  // opening collapsing at "...okay"). One tap per beat; then done().
  function cutScreen(beats, done) {
    let i = 0;
    const fuss = []; beats.forEach(([, t], k) => { fuss[k] = /!/.test(t) && !fuss[k - 1]; });
    const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const show = () => {
      const [pose, text] = beats[i];
      const m = /^([\w-]+)(?:>([\w-]+)@(\d+))?$/.exec(pose) || [0, pose];
      const first = i === 0 && !calm;
      const b = panel(`<div class="dr-cut">
        <div class="dr-cut-room">${RM().scene(m[1], !first)}</div>
        <button class="dr-cut-box" id="dr-cut-next" data-vo="${esc('uptima|' + text)}"><b>Uptima</b><span>${esc(text)}</span><i aria-hidden="true">▼</i></button></div>`);
      const rm = b.querySelector('.rm'), fig = b.querySelector('.rm-up .up-fig');
      // She glides down from her cloud to the desk as the scene opens, and floats back up when it closes.
      if (first) setTimeout(() => rm.classList.add('talk'), 250);
      if (fig) fig.classList.add('talking');
      // Fuss lines only on lines that shout, and never two beats running.
      const sq = b.querySelector('.rm-sq');
      if (sq && fuss[i]) setTimeout(() => sq.classList.add('fuss'), first ? 900 : 120);
      RM().mount(b.querySelector('.dr-cut-room'));
      if (i === 0) RM().listen(true);   // the leads turn toward her
      const talkMs = Math.min(11000, 800 + text.length * 62);
      const t1 = m[2] ? setTimeout(() => RM().setPose(fig, m[2]), +m[3]) : 0;
      const t2 = setTimeout(() => fig && fig.classList.remove('talking'), talkMs);
      const next = b.querySelector('#dr-cut-next');
      next.onclick = () => {
        clearTimeout(t1); clearTimeout(t2); i++;
        if (i < beats.length) return show();
        RM().listen(false);
        if (calm) return done();
        next.disabled = true; rm.classList.remove('talk');
        setTimeout(done, 750);
      };
      next.focus({ preventScroll: true });
    };
    show();
  }

  function start() {
    let s = cur();
    if (!s || s.v !== 1 || s.phase === 'done') {
      const k = keep();
      s = D.newNight({ night: k.night + 1, taught: k.taught, carry: k.carry });
      s.tally = M.newTally();
      s.fresh = true;
      s.at = 'fn';
    }
    save(s);
    draw(s);
  }
  // The war room's music (Mureka, Nov 16): the stage plays m-drill; the two bosses swap in m-drill-boss while they run.
  function music(s) {
    const A = SD.audio, ST = SD.modeStage;
    if (!A || !A.music || !ST || ST.active() !== ID) return;
    const boss = s.drill && (s.phase === 'drill' || s.phase === 'debrief') && D.DRILLS[s.drill.drill].boss;
    if (boss) { if (A.add) A.add({ songs: { 'stage-drill-boss': 'm-drill-boss' } }); A.music('stage-drill-boss'); }
    else if (A.loopName === 'stage-drill-boss') A.music('stage-drill');
  }
  function draw(s) {
    music(s);
    ({ map: mapScreen, drill: drillScreen, debrief: debriefScreen, end: endScreen, zero: endScreen }[s.phase] || mapScreen)(s);
  }
  function budgetJar(s) {
    const b = Math.max(0, s.budget);
    return `<div class="dr-jar" role="img" aria-label="Error budget ${b}%"><span class="dr-jar-l">${icon('checked-shield')}Error budget</span><span class="dr-jar-b"><i style="width:${b}%"></i></span><b>${b}%</b></div>`;
  }

  // ---- The map: one row per drill, bosses marked. Night 1 is one path; later nights fork (L7). ----
  function mapScreen(s) {
    const rows = D.ROWS.map((r, i) => {
      const ch = D.choices(s.night, i);
      return `<div class="dr-row">${ch.map(id => {
        const d = D.DRILLS[id], here = i === s.row, done = s.done[i] && s.done[i].drill === id;
        const how = done ? (s.done[i].clean ? ' · clean fix' : s.done[i].state === 'contained' ? ' · contained' : ' · escalated') : '';
        return `<button class="dr-door${d.boss ? ' boss' : ''}${here ? ' reach' : ''}${done ? ' done' : ''}" data-drill="${id}" ${here ? '' : 'disabled'}>
          <span class="dr-dn">${d.boss ? icon('siren') : ''}${esc(d.name)}</span><span class="dr-dt">${d.stream ? 'With a stream' : d.hub === 'sns' ? 'With a topic' : d.hub === 'sfn' ? 'With a state machine' : d.path === 'async' ? 'With a queue' : 'Straight through'}${d.boss ? ' · two faults' : ''}${how}</span></button>`;
      }).join('')}</div>`;
    }).reverse().join('');
    const first = s.fresh && s.night === 1 && !s.done.length;
    const cutKey = s.night + ':' + s.row;
    if (RM() && s.cutAt !== cutKey) {
      const beat = first ? ['bluffing>caught@4300', SAY.arrive] : s.done.length ? ['bluffing>caught@2400', SAY.next] : ['snack', SAY.again];
      return cutScreen([beat], () => { s.cutAt = cutKey; save(s); draw(s); });
    }
    const b = panel(`<p class="dr-night">Night ${s.night}</p>
      ${RM() ? '' : say('uptima', 'neutral', first ? SAY.arrive : s.done.length ? SAY.next : SAY.again)}
      ${budgetJar(s)}
      <div class="dr-map">${rows}</div>
      <div class="dr-dock"><button class="ghost" id="dr-stop">☰ Stop for now</button></div>`);
    b.querySelectorAll('[data-drill]').forEach(el => el.onclick = () => {
      if (el.disabled) return;
      s.fresh = false;
      D.startDrill(s, el.dataset.drill, s.night * 7919 + s.row * 31);
      s.at = D.DRILLS[el.dataset.drill].path === 'async' ? 'queue' : 'gate';
      s.zoom = false;
      save(s);
      if (SD.drillBoard && D.lastFrames) playing = { frames: D.lastFrames, budget0: s.budget, cost: 0 };
      draw(s);
    });
    b.querySelector('#dr-stop').onclick = () => { U.closePanel(); stopNow(); };
  }

  // ---- The drill ----
  function traceMap(f, e) {
    const d = D.DRILLS[f.drill];
    const order = ['callers'].concat(D.ORDER.filter(k => k !== 'queue' || D.hasQueue(f.drill)));
    return `<div class="dr-trace" role="list" aria-label="Trace map">${order.map((k, i) => {
      const st = k === 'callers' ? 'ok' : e.nodes[k];
      const name = k === 'callers' ? 'Callers' : D.station(f.drill, k).svc;
      const btn = k !== 'callers';
      const tag = btn ? 'button' : 'span';
      return `${i ? '<span class="dr-edge" aria-hidden="true"></span>' : ''}<${tag} role="listitem" class="dr-node st-${st}${btn && k === cur().at ? ' at' : ''}" ${btn ? `data-at="${k}"` : ''} aria-label="${esc(name)}: ${esc(STATUS[st])}">
        ${icon(NODE_ICON[k])}<b>${esc(name)}</b><span class="dr-st">${esc(k === 'callers' ? '' : STATUS[st])}</span></${tag}>`;
    }).join('')}</div>`;
  }
  // ---- A station's console: its metrics as small charts, its settings as controls (Ladi, Nov 16: less text, as
  // long as it's more fun or doesn't hurt learning). Dials put a setting's values side by side (30 s, 60 s, 2 m, 6 m),
  // switches are on or off, looks (observing) are their own row. Each control's full description is its title and
  // shows in the line under the controls when it's hovered, focused or tapped.
  const DIALS = {
    authttl: { at: 'gate', needs: 'auth', label: 'Authorizer cache', icon: 'hourglass', ids: ['ttl0', 'ttl300', 'ttl3600'] },
    retry: { at: 'gate', label: 'Retry on 429', icon: 'anticlockwise-rotation', ids: ['immediate', 'backoff'] },
    vis: { at: 'queue', label: 'Visibility timeout', icon: 'hourglass', ids: ['vis30', 'vis60', 'vis120', 'vis360'] },
    timeout: { at: 'fn', label: 'Function timeout', icon: 'stopwatch', ids: ['to30', 'to60', 'to120'] },
    shift: { at: 'fn', needs: 'release', label: 'Deployment', icon: 'bird-cage', ids: ['allatonce', 'canary', 'linear'] },
    sec: { at: 'fn', needs: 'secret', label: 'The ledger password', icon: 'key', ids: ['secinit', 'secttl', 'seccall'] },
    batch: { at: 'fn', label: 'Batch size', icon: 'card-random', ids: ['b1', 'b3'], cur: c => (c.fn.batch === 1 || c.fn.batch === 3 ? '' : String(c.fn.batch)) },
    key: { at: 'store', label: 'Partition key', icon: 'key', ids: ['kstatus', 'korder', 'kshard'] },
    sfnretry: { at: 'queue', needs: 'sfn', label: 'Charge: Retry, 3 attempts', icon: 'anticlockwise-rotation', ids: ['rnone', 'rtrans', 'rall'] },
    sfncatch: { at: 'queue', needs: 'sfn', label: 'Catch CardDeclined → ReleaseStock', icon: 'return-arrow', ids: ['catchnone', 'catchno', 'catchrp'] },
    rot: { at: 'store', needs: 'secret', label: 'Secret rotation', icon: 'anticlockwise-rotation', ids: ['rotsingle', 'rotalt', 'rotoff'] },
    kp: { at: 'store', label: 'Key policy', icon: 'padlock', ids: ['kprole', 'kpiam'], cur: c => (c.store.keyPolicy === 'admins' ? 'Admins only' : '') }
  };
  const SHORT = { backoff: 'Backoff + jitter', immediate: 'Right away', plan: 'Usage plan: batch client', burst: 'Bigger account burst', gtrace: 'X-Ray on the stage',
    vis30: '30 s', vis60: '60 s', vis120: '2 min', vis360: '6 min', dlq: 'Redrive → orders-dlq', dlqfifo: 'Redrive → orders-dlq.fifo', groups: 'MessageGroupId = customerId', purge: 'Purge the queue',
    to30: '30 s', to60: '60 s', to120: '2 min', b1: '1', b3: '3', partial: 'ReportBatchItemFailures', reserved: 'Reserved concurrency 20', prov: 'Provisioned 6 on alias live',
    provlatest: 'Provisioned 6 on $LATEST', rolekms: 'Role allows kms:Decrypt', admin: 'AdministratorAccess', cond: 'Conditional write', ftrace: 'X-Ray active tracing',
    ddbput: 'Allow PutItem on orders', ddbstar: 'Allow dynamodb:* on *', allatonce: 'All at once', canary: 'Canary 10%', linear: 'Linear 10%/min',
    alarm: 'Roll back on Errors alarm', hook: 'PreTraffic test',
    secinit: 'Once, at start-up', secttl: 'Extension, 5 min', seccall: 'Every call', refetch: 'Login fails? Read it again',
    ttl0: 'Off', ttl300: '5 min', ttl3600: '1 hour', authwild: 'Policy covers the whole API', fninvoke: 'Allow execute-api:Invoke',
    consread: 'ConsistentRead', daxnode: 'Add a DAX node', gsiread: 'Consistent read on the index',
    rotsingle: 'Single user', rotalt: 'Alternating', rotoff: 'Off', bisect: 'Bisect on error', retry2: 'Max retries 2', onfail: 'On failure → orders-failed',
    snsattr: 'order_type as an attribute', scopebody: 'Filter reads the body', nofilter: 'Remove the filter', subdlq: 'Redrive → shipping-dlq', rawon: 'Raw message delivery',
    rnone: 'Off', rtrans: 'Lambda ×3', rall: 'States.ALL', catchnone: 'Off', catchno: 'On', catchrp: 'On + $.error', catchfirst: 'States.ALL first',
    kstatus: 'status', korder: 'orderId', kshard: 'status#1-9', wcu: '2× table WCU', kprole: 'Names the role', kpiam: 'Lets IAM decide', insights: 'Contributor Insights', trail: 'CloudTrail' };
  const SW_ICON = { plan: 'ticket', burst: 'padlock', dlq: 'return-arrow', dlqfifo: 'return-arrow', groups: 'card-random', purge: 'broom', partial: 'scroll-quill', reserved: 'checked-shield',
    prov: 'campfire', provlatest: 'campfire', rolekms: 'key', admin: 'key', cond: 'checked-shield', wcu: 'pie-chart',
    ddbput: 'key', ddbstar: 'padlock-open', alarm: 'ringing-bell', hook: 'checked-shield',
    refetch: 'anticlockwise-rotation', authwild: 'ticket', fninvoke: 'key', consread: 'checked-shield', daxnode: 'pie-chart', gsiread: 'card-random', bisect: 'split-arrows', retry2: 'anticlockwise-rotation', onfail: 'mailbox',
    snsattr: 'ticket', scopebody: 'scroll-quill', nofilter: 'broom', subdlq: 'return-arrow', rawon: 'mailbox', catchfirst: 'card-random' };
  const inDial = id => Object.keys(DIALS).some(k => DIALS[k].ids.includes(id));
  const spark = (arr, bad) => {
    if (!arr || !arr.length) return '';
    const max = Math.max(1, ...arr), w = 100, h = 22, n = arr.length;
    const pts = arr.map((v, i) => `${(i / Math.max(1, n - 1) * w).toFixed(1)},${(h - 1 - v / max * (h - 3)).toFixed(1)}`).join(' ');
    return `<svg class="dr-spark${bad ? ' bad' : ''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/></svg>`;
  };
  const BAD = { '4XXError': 1, '5XXError': 1, Errors: 1, WriteThrottleEvents: 1 };
  function control(f, id, opts) {
    const c = C[id], on = c.on(f.cfg), why = on ? '' : D.why(f, id), placed = f.changes.includes(id);
    return `<button class="${opts.cls}${on ? ' on' : ''}${why && !on ? ' no' : ''}${placed ? ' new' : ''}" data-card="${id}" aria-pressed="${on}" title="${esc(c.name + ': ' + c.text)}" data-tip="${esc(c.text)}">
      ${opts.icon ? icon(opts.icon) : ''}<span>${esc(SHORT[id] || c.name)}</span>${opts.sw ? `<i class="dr-sw" aria-hidden="true"></i>` : ''}</button>`;
  }
  // talk: { lines, notes } — in the room, what this station's lead says, shown as their speech bubble at their desk.
  function stationHtml(s, f, e, talk) {
    const k = s.at, st = D.station(f.drill, k), d = D.DRILLS[f.drill];
    if (k === 'queue' && !D.hasQueue(f.drill)) return `<div class="dr-station ms-lt"><p class="small muted">No queue on this path: the Gate calls the function directly.</p></div>`;
    const mt = D.metrics(f.drill, f.cfg, e.m)[k], sp = (e.spark || {})[k] || {};
    const left = D.CHANGES - f.changes.length;
    // A release's settings show only in a drill that has a release, as the queue's show only with a queue.
    const CD = SD.drillCode, file = CD && CD.file(f.drill, k), held = file ? CD.held(f.drill, k) : [];
    const hand = D.HANDS[k].filter(id => D.shown(f.drill, id) && !held.includes(id));
    const dials = Object.keys(DIALS).filter(n => DIALS[n].at === k && DIALS[n].ids.some(id => D.shown(f.drill, id) && !held.includes(id))).map(n => {
      const g = DIALS[n], cur = g.cur ? g.cur(f.cfg) : '';
      return `<div class="dr-dial" role="group" aria-label="${esc(g.label)}"><span class="dr-dl">${icon(g.icon)}${esc(g.label)}</span>
        <span class="dr-seg">${cur ? `<span class="dr-cur" title="The current setting">${esc(cur)}</span>` : ''}${g.ids.map(id => control(f, id, { cls: 'dr-card dr-pick' })).join('')}</span></div>`;
    }).join('');
    const sws = hand.filter(id => !inDial(id) && !C[id].obs).map(id => control(f, id, { cls: 'dr-card dr-tog' + (C[id].once ? ' once' : ''), icon: SW_ICON[id], sw: !C[id].once })).join('');
    const looks = hand.filter(id => C[id].obs).map(id => control(f, id, { cls: 'dr-card dr-look obs', icon: 'all-seeing-eye' })).join('');
    return `<div class="dr-station ms-lt"><div class="dr-sh">${head(st.who)}<b>${esc(st.name)}</b><span class="small">${esc(NAMES[st.who])} · ${esc(st.svc)}</span>
        <span class="dr-left" aria-label="${plural(left, 'change')} left this deploy">${Array.from({ length: D.CHANGES }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span></div>
      ${talk ? said(k, st.who, talk, e.m) : ''}
      <div class="dr-metrics" aria-label="CloudWatch metrics, last run">${mt.map(([n, v]) => `<span class="dr-mt"><code>${esc(n).replace(/([a-z])([A-Z-])/g, '$1<wbr>$2')}</code><b>${esc(v)}</b>${spark(sp[n], BAD[n] && /[1-9]/.test(String(v)))}</span>`).join('')}</div>
      ${file ? codeHtml(s, f, k, file) + (dials || sws ? `<details class="dr-more"><summary>Other settings</summary>${dials}${sws ? `<div class="dr-hand dr-togs">${sws}</div>` : ''}</details>` : '')
        : `${dials}${sws ? `<div class="dr-hand dr-togs">${sws}</div>` : ''}`}
      ${looks ? `<div class="dr-looks"><span class="dr-dl">${icon('all-seeing-eye')}Look closer</span>${looks}</div>` : ''}
      <p class="dr-tip small" aria-live="polite">${plural(left, 'change')} left this deploy. Settings say what they set, never whether they help.</p></div>`;
  }
  // The code desk (js/drill-code.js): the station's file in blocks. The open block lists its edits as diffs.
  function codeHtml(s, f, k, file) {
    const open = s.blk && s.blk.k === k && s.blk.d === f.drill ? s.blk.i : -1;
    const blocks = file.blocks.map((b, i) => {
      const code = esc(b.code(f.cfg));
      const edits = i === open ? (b.edits.some(id => !C[id].on(f.cfg)) ? `<div class="dr-edits" role="group" aria-label="Edits for this block">${b.edits.filter(id => !C[id].on(f.cfg)).map(id => {
        const c = C[id], on = c.on(f.cfg), why = on ? '' : D.why(f, id), placed = f.changes.includes(id);
        const dl = on ? [] : SD.drillCode.diff(b, f.cfg, id), cut = Math.min(...dl.map(([, l]) => l.match(/^ */)[0].length));
        const diff = dl.map(([m, l]) => [m, l.slice(cut)]).map(([m, l]) => `<span class="dr-dl-${m === '+' ? 'add' : m === '-' ? 'del' : 'ctx'}">${m} ${esc(l)}</span>`).join('\n');
        return `<button class="dr-edit${on ? ' on' : ''}${why && !on ? ' no' : ''}${placed ? ' new' : ''}" data-card="${id}" aria-pressed="${on}" data-tip="${esc(c.text)}" title="${esc(c.name)}">
          ${on ? `<span class="dr-en">${icon('checked-shield')}As it is now</span>` : ''}${diff ? `<pre class="dr-diff">${diff}</pre>` : ''}</button>`;
      }).join('')}</div>` : '<p class="dr-edits none small">Nothing to change in this block.</p>') : '';
      return `<button class="dr-blk${i === open ? ' open' : ''}" data-blk="${i}" aria-expanded="${i === open}"><pre>${code}</pre></button>${edits}`;
    }).join('');
    return `<div class="dr-code"><p class="dr-file">${icon('scroll-quill')}<code>${esc(file.file)}</code><span>Tap the part you'd change.</span></p>${blocks}</div>`;
  }
  function said(k, who, talk, m) {
    const ls = (talk.lines || []).filter(x => x[0] === who).map(x => x[1]);
    const ns = (talk.notes || []).filter(x => x[0] === k);
    if (!ls.length && !ns.length) return '';
    const bad = SD.drillBoard && SD.drillBoard.TROUBLE[who] && SD.drillBoard.TROUBLE[who](m);
    return `<div class="dr-said" aria-live="polite">${ns.map(([, w, t]) => `<p class="dr-say teach" data-vo="${esc(w + '|' + t)}">${w !== who ? `<b>${esc(NAMES[w])}</b> ` : ''}${esc(t)}</p>`).join('')}${ls.length ? `<p class="dr-say${bad ? ' bad' : ''}" data-vo="${esc(who + '|' + ls[0])}">${ls.map(esc).join(' ')}</p>` : ''}</div>`;
  }
  // Where each teach line points on the board ('here': the station being worked on).
  const TEACH_AT = { '429': 'gate', vis: 'queue', hot: 'store', kms: 'store', cold: 'fn', fifo: 'queue', poison: 'fn', refused: 'here', grey: 'fn', iam: 'store', canary: 'fn', secret: 'store', stream: 'queue', auth: 'gate', reads: 'store', fanout: 'queue', flow: 'queue' };
  // A run being played out on the board (js/drill-board.js): { frames, budget0, cost }. Not saved: a reload shows the result.
  let playing = null;
  function drillScreen(s) {
    const f = s.drill, d = D.DRILLS[f.drill], e = f.log[f.log.length - 1];
    const over = f.state === 'contained' || f.state === 'escalated';
    const BD = SD.drillBoard, play = playing;
    const teach = play ? [] : (e.teach || []);
    const head1 = e.warm ? 'Warm-up run, with the fault in place' : `Deploy ${f.deploys} of ${D.DEPLOYS}`;
    const verdict = play ? '' : e.warm ? `<p class="ms-lt dr-res">${icon('siren')} Something's wrong. Watch where the orders go wrong, then tap a station to change it.</p>`
      : e.ok ? `<p class="ms-lt dr-res good">${icon('checked-shield')} Contained${D.clean(f) ? ', first deploy: a clean fix' : ''}. ${e.cost ? `It cost ${e.cost}% on the way.` : 'Nothing spilled.'}</p>`
        : `<p class="ms-lt dr-res bad">Not contained. This run cost <b>${e.cost}%</b> of the budget.${f.state === 'escalated' ? ` It escalates: another ${D.ESCALATE}%.` : ''}</p>`;
    const reveal = !play && f.state === 'escalated' ? `<div class="dr-reveal ms-lt">${icon('magnifying-glass')}<span><b>What was broken:</b> ${esc(d.hidden)}<br><span class="small">A fix: ${esc(d.fix[0].map(id => C[id].name).join(' + '))}.</span></span></div>` : '';
    // The verdict as a stamp across the board (with the cost under it), once the run has played.
    const stamp = play || !BD ? '' : e.warm ? `<div class="dr-stamp warm" role="status"><b>Find the fault</b><span>Warm-up run, free</span></div>`
      : e.ok ? `<div class="dr-stamp good" role="status"><b>Contained</b><span>${D.clean(f) ? 'First deploy: a clean fix · ' : ''}${e.cost ? `cost ${e.cost}%` : 'nothing spilled'}</span></div>`
        : `<div class="dr-stamp bad" role="status"><b>${f.state === 'escalated' ? 'Escalated' : 'Not contained'}</b><span>This run cost ${e.cost}%${f.state === 'escalated' ? ` · escalation ${D.ESCALATE}% more` : ''}</span></div>`;
    const lines = play ? '' : BD ? BD.bubbles(e.lines, e.m)
      : `<div class="dr-pager" aria-live="polite"><p class="dr-ph">${icon('walkie-talkie')}<b>The pager</b></p>${e.lines.map(([w, t]) => `<p class="dr-pl" data-vo="${esc(w + '|' + t)}"><b>${esc(NAMES[w])}:</b> ${esc(t)}</p>`).join('')}</div>`;
    const jarS = play ? Object.assign({}, s, { budget: play.budget0 }) : s;
    const RO = RM(), zoom = !!(RO && s.zoom && !play && !over);
    const dock = play ? '<button class="ghost" id="dr-skip">Skip to the end</button>'
      : `<button class="ghost" id="dr-stop">☰ Stop</button>${RO ? (zoom ? '<button class="ghost" id="dr-back">‹ Back to the room</button>' : over ? '' : '<span class="dr-hint">Tap a lead to work their station.</span>') : ''}${over ? '<button class="primary" id="dr-next">Debrief</button>' : `<button class="primary" id="dr-deploy">${icon('cloud-upload')}Deploy${f.changes.length ? ` (${plural(f.changes.length, 'change')})` : ''}</button>`}`;
    const notes = teach.map(t => [TEACH_AT[t] === 'here' ? s.at : TEACH_AT[t] || 'gate', D.TEACH[t][0], D.TEACH[t][1]]);
    const b = RO ? panel(`<div class="dr-top"><div><p class="dr-claim">${d.boss ? icon('siren') : ''}${esc(d.name)}</p><p class="small">"${esc(d.says)}"</p></div>
        <p class="dr-turn">${esc(play ? (e.warm ? 'Warm-up run' : `Deploy ${f.deploys}: running`) : head1)}</p></div>
      ${budgetJar(jarS)}
      <div class="dr-bw dr-roomw${zoom ? ' zoomed' : ''}">${RO.html(f, e, { at: s.at, zoom, notes: play ? [] : notes, lines: play ? [] : e.lines, m: e.m, play: !!play })}${stamp}
        ${zoom ? `<div class="dr-tray">${stationHtml(s, f, e, { lines: e.lines, notes })}</div>` : ''}</div>
      ${reveal}
      <div class="dr-dock">${dock}</div>`) : panel(`<div class="dr-top"><div><p class="dr-claim">${d.boss ? icon('siren') : ''}${esc(d.name)}</p><p class="small">"${esc(d.says)}"</p></div>
        <p class="dr-turn">${esc(play ? (e.warm ? 'Warm-up run' : `Deploy ${f.deploys}: running`) : head1)}</p></div>
      ${budgetJar(jarS)}
      <div class="dr-bw">${BD ? BD.html(f, e, s.at, notes) : traceMap(f, e)}${stamp}</div>
      <div class="dr-cols"><div class="dr dr-l">${BD ? '' : verdict}${reveal}
      ${lines}
      ${BD ? '' : teach.map(t => say(...D.TEACH[t].slice(0, 1), 'neutral', D.TEACH[t][1])).join('')}</div>
      <div class="dr dr-r">${over || play ? '' : stationHtml(s, f, e)}</div></div>
      <div class="dr-dock">${dock}</div>`);
    // The walk-in intro plays once, on the first night only (Ladi: "otherwise it would get a little annoying").
    const intro = RO && s.night === 1 && !s.introSeen;
    if (intro) { s.introSeen = true; save(s); }
    if (RO) RO.mount(b, s.night + ':' + s.row + ':' + f.drill, intro ? 'intro' : null);
    if (play) {
      if (play.started) return;
      play.started = true;
      const wb = b.closest('.win-b') || b; wb.scrollTop = 0;   // the run plays on the board: start at the top
      const traced = {}; D.ORDER.forEach(k => { traced[k] = e.nodes[k] && e.nodes[k] !== 'dark' && e.nodes[k] !== 'off'; });
      let spill = 0;
      // On the walk-in night the run waits for the leads to reach their bells.
      const wait = intro && RO.introMs ? RO.introMs() : 0;
      (wait ? new Promise(r => setTimeout(r, wait)) : Promise.resolve()).then(() => document.body.contains(b) && (RO || BD).play(b, f, play.frames, {
        traced, skipBtn: b.querySelector('#dr-skip'), gone: () => !document.body.contains(b),
        onTick: fr => {
          const x = fr.d;
          spill += (x.gaveUp | 0) + (x.fault5xx | 0) + (x.slow | 0) + (x.dupes | 0) + (x.lost | 0) + (x.goodParked | 0);
          const left = Math.max(0, play.budget0 - Math.min(play.cost, spill));
          const jar = b.querySelector('.dr-jar'); if (jar) { jar.querySelector('i').style.width = left + '%'; jar.querySelector('b').textContent = left + '%'; }
        }
      })).then(() => {
        if (playing !== play || !document.body.contains(b)) return;
        playing = null;
        draw(s);
        const res = document.querySelector('.dr-stamp.good, .dr-res.good');
        if (res && U.burst) U.burst(res, D.clean(f));
        if (RO) RO.emote(document.querySelector('.rm'), res ? 'good' : 'wow');
        if (RO && (f.state === 'contained' || f.state === 'escalated')) RO.mood(f.state === 'contained' ? 'clear' : 'slump');
      });
      return;
    }
    b.querySelectorAll('[data-at]').forEach(el => el.onclick = () => { s.at = el.dataset.at; if (RO && !over) s.zoom = true; save(s); draw(s); });
    b.querySelectorAll('[data-blk]').forEach(el => el.onclick = () => {
      const i = +el.dataset.blk, o = s.blk;
      s.blk = o && o.k === s.at && o.d === f.drill && o.i === i ? null : { k: s.at, d: f.drill, i };
      save(s); draw(s);
    });
    const back = b.querySelector('#dr-back');
    if (back) back.onclick = () => { s.zoom = false; save(s); draw(s); };
    b.querySelectorAll('[data-card]').forEach(el => el.onclick = () => {
      const id = el.dataset.card, why = D.place(f, id);
      if (why) {
        if (/^Refused/.test(why) && !s.taught.refused) { s.taught.refused = 1; e.teach = (e.teach || []).concat('refused'); }
        if (U.float) U.float(el, why);
        save(s); if (/^Refused/.test(why)) draw(s);
        return;
      }
      save(s); draw(s);
    });
    const tip = b.querySelector('.dr-tip');
    if (tip) { const base = tip.textContent; b.querySelectorAll('[data-tip]').forEach(el => { const show = () => { tip.textContent = el.dataset.tip; }; el.onmouseenter = show; el.onfocus = show; el.onmouseleave = () => { tip.textContent = base; }; }); }
    b.querySelector('#dr-stop').onclick = () => { U.closePanel(); stopNow(); };
    const dep = b.querySelector('#dr-deploy');
    if (dep) dep.onclick = () => {
      const budget0 = s.budget;
      s.zoom = false;   // pull back to the room to watch the run
      const r = D.deploy(f);
      r.teach = D.teachFor(f, r, s.taught);
      r.teach.forEach(t => { s.taught[t] = 1; });
      keep().taught = s.taught;
      D.afterDeploy(s, r);
      if (s.phase === 'debrief') s.phase = 'drill';   // show the result first; Debrief moves on
      save(s);
      if (SD.drillBoard && D.lastFrames) { playing = { frames: D.lastFrames, budget0, cost: r.cost + (f.state === 'escalated' ? D.ESCALATE : 0) }; drillScreen(s); return; }
      draw(s);
    };
    const nx = b.querySelector('#dr-next');
    if (nx) nx.onclick = () => { s.phase = 'debrief'; save(s); draw(s); };
    // The warm-up's teach lines: the first time, say what grey means.
    if (e.warm && !e.teach) { e.teach = D.teachFor(f, e, s.taught); e.teach.forEach(t => { s.taught[t] = 1; }); keep().taught = s.taught; save(s); if (e.teach.length) draw(s); }
  }

  // ---- The debrief: "why did that work?" (or, after an escalation, "what was it?") ----
  function debriefQuestion(s) {
    const k = keep(), d = D.DRILLS[s.drill.drill];
    const used = new Set((s.debriefs || []).map(x => x.q));
    while (s.carry.length) {
      const id = s.carry.shift(), q = E().find(id);
      if (q && E().allowed(q) && !used.has(q.id)) { k.carry = s.carry.slice(); return q; }
    }
    const text = q => [q.q].concat(q.opts || []).join(' ');
    const r = M.pick({ match: q => d.q.test(text(q)), n: 1, verifiedOnly: true, mix: 0, avoid: Array.from(used) });
    return r.items[0] ? E().find(r.items[0].q) : null;
  }
  function debriefScreen(s) {
    const f = s.drill, d = D.DRILLS[f.drill], ok = f.state === 'contained';
    const lead = d.lead;
    const b = panel(`<p class="dr-claim">${esc(d.name)}: ${ok ? (D.clean(f) ? 'a clean fix' : 'contained') : 'escalated'}</p>
      ${budgetJar(s)}
      ${say(lead, ok ? 'smile' : 'tired', ok ? 'Held. Write it up before you forget why.' : 'We didn\'t find it in time. Now we know where to look.')}
      <div class="dr-reveal ms-lt">${icon('scroll-unfurled')}<span><b>The cause:</b> ${esc(d.hidden)}<br><span class="small">${esc(d.fix[0].map(id => C[id].back).join(' '))}</span></span></div>
      ${RM() ? '' : say('uptima', 'neutral', SAY.pm)}
      <div class="dr-dock"><button class="primary" id="dr-ask">Answer the postmortem</button></div>`);
    b.querySelector('#dr-ask').onclick = () => RM() ? cutScreen([['smug', SAY.pm]], ask) : ask();
    const ask = async () => {
      const q = debriefQuestion(s);
      if (!q) { D.settle(s, false); save(s); draw(s); return; }
      document.body.classList.add('dr-pm');   // the question on the war room's chalkboard (CSS below)
      let r;
      try { r = await M.ask(q, { tally: s.tally, title: 'THE POSTMORTEM' }); } finally { document.body.classList.remove('dr-pm'); }
      if (r.closed || r.skipped) { save(s); draw(s); return; }
      s.debriefs.push({ q: q.id, ok: !!r.ok, conf: r.conf, pts: r.pts, drill: f.drill });
      if (!r.ok) {
        const tw = ((SD.twins && SD.twins[q.id]) || []).map(id => E().find(id)).filter(x => x && E().allowed(x) && TD().isVerified(x));
        keep().carry = (keep().carry || []).concat([tw.length ? tw[0].id : q.id]).slice(-3);
      }
      if (D.clean(f)) keep().clean[f.drill] = (keep().clean[f.drill] | 0) + 1;
      D.settle(s, !!r.ok);
      save(s); draw(s);
    };
  }

  // ---- The end: the last boss, win or lose (L1), then one line and Pip ----
  function endScreen(s) {
    const k = keep(), zero = s.phase === 'zero';
    if (RM() && !s.cutEnd) {
      return cutScreen([zero ? ['derpy>hiding@3200', SAY.zero] : ['applauding>entitled@2600', SAY.won]], () => { s.cutEnd = 1; save(s); draw(s); });
    }
    if (!s.paid) {
      s.paid = M.pay(ID) || ' ';
      if (SD.modeStage && SD.modeStage.sting) SD.modeStage.sting(ID, zero ? 'lose' : 'win');
      k.night = s.night; k.taught = s.taught;
      if (!k.best || s.budget > k.best) k.best = Math.max(0, s.budget);
    }
    const clean = s.done.filter(x => x.clean).length, held = s.done.filter(x => x.state === 'contained').length;
    const proofs = s.debriefs.filter(x => x.ok).length;
    const b = panel(`<p class="dr-night">Night ${s.night}: ${zero ? 'budget spent' : 'all drills closed'}</p>
      ${RM() ? '' : say('uptima', zero ? 'tired' : 'smile', zero ? SAY.zero : SAY.won)}
      ${budgetJar(s)}
      <p>Drills contained <b>${held} of ${s.done.length}</b> · Clean fixes <b>${clean}</b> · Postmortems right <b>${proofs} of ${s.debriefs.length}</b></p>
      ${s.tally ? M.calibHtml(s.tally, 'How sure you were in the postmortems') : ''}
      ${s.paid && s.paid.trim() ? `<p class="small">${esc(s.paid)}</p>` : ''}
      ${M.pipHtml()}
      <p class="small muted">That's the night. Stop here.</p>
      <div class="dr-dock"><button class="primary" id="dr-done">Done</button></div>`);
    M.pipWire(b, 'The Fire Drill');
    b.querySelector('#dr-done').onclick = () => { s.phase = 'done'; save(s); U.closePanel(); stopNow(); };
    save(s);
  }

  M.register({
    id: ID, name: 'The Fire Drill', minutes: 'about 20', host: 'Uptima',
    blurb: 'Something in the system is broken. Four leads, four stations, real metrics. Find it and fix it together.',
    start,
    status: () => { const s = cur(); if (!s || s.v !== 1 || s.phase === 'done') return '';
      return `Resume · Night ${s.night} · ${s.drill ? D.DRILLS[s.drill.drill].name + ' · ' : ''}Budget ${Math.max(0, s.budget)}%`; }
  });
  SD.drillUi = { draw: () => { const s = cur(); if (s) draw(s); }, start };

  const css = document.createElement('style');
  css.textContent = `
    .dr { display: flex; flex-direction: column; gap: 8px; }
    .dr p { margin: 0; }
    .dr-gi { width: 18px; height: 18px; vertical-align: -4px; flex: 0 0 auto; fill: currentColor; }
    .dr-night, .dr-claim { font-family: var(--f-head); font-weight: 700; font-size: 18px; display: flex; gap: 6px; align-items: center; }
    .dr-top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    .dr-turn { text-align: right; font-weight: 700; font-size: 13px; max-width: 45%; }
    .dr-say { display: flex; gap: 8px; align-items: flex-start; font-size: 15px; line-height: 1.35; }
    .dr-head { flex: 0 0 34px; width: 34px; height: 40px; overflow: hidden; border-radius: 8px; border: 2px solid var(--ink, #17131f); background: var(--paper, #c7bca4); display: inline-block; }
    .dr-head .bust, .dr-head svg { width: 30px !important; height: 36px !important; }
    .dr-head img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .dr-jar { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .dr-jar-l { display: inline-flex; gap: 4px; align-items: center; font-weight: 700; }
    .dr-jar-b { flex: 1; height: 12px; border: 2px solid var(--ink, #17131f); border-radius: 6px; overflow: hidden; background: var(--bone, #e2dbcb); }
    .dr-jar-b i { display: block; height: 100%; background: var(--blue, #3f5f80); }
    .dr-map { display: flex; flex-direction: column; gap: 8px; padding: 8px; border-radius: 12px; border: 3px solid var(--ink, #17131f); background: #23283a; }
    .dr-row { display: flex; gap: 6px; justify-content: center; }
    .dr-door { flex: 1 1 0; max-width: 170px; min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border: 3px solid var(--ink, #17131f); border-radius: 10px; background: #c9c2b2; color: var(--ink, #17131f); font-size: 13px; }
    .dr-door:disabled { opacity: 1; }
    .dr-door.reach { background: var(--bone, #e2dbcb); box-shadow: 0 0 0 3px #e0823a; font-weight: 700; }
    .dr-door.done { background: #9fb09a; }
    .dr-door.boss { max-width: none; background: #5a2f2f; color: #fff; }
    .dr-door.boss.reach { background: #9e3a34; }
    .dr-door.boss.done { background: #4f6b52; }
    .dr-dn { font-weight: 800; display: inline-flex; gap: 4px; align-items: center; } .dr-dt { font-size: 11px; }
    .dr-trace { display: flex; align-items: stretch; gap: 0; padding: 8px 6px; border-radius: 10px; border: 3px solid var(--ink, #17131f); background: #1d2130; }
    .dr-edge { flex: 0 1 8px; min-width: 2px; align-self: center; height: 3px; background: #8d93a8; }
    .dr-node { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 2px; border-radius: 10px; border: 3px solid #8d93a8; background: #2c3248; color: #fff; font-size: 11px; line-height: 1.1; text-align: center; }
    .dr-node b { font-size: 11px; overflow-wrap: anywhere; }
    .dr-node .dr-gi { width: 22px; height: 22px; }
    .dr-node.at { box-shadow: 0 0 0 3px #f3d36b; }
    .dr-st { font-size: 10px; font-weight: 700; }
    .dr-node.st-ok { border-color: #5fb36b; } .dr-node.st-ok .dr-st { color: #9be0a5; }
    .dr-node.st-error { border-color: #e0c341; } .dr-node.st-error .dr-st { color: #f1dc7a; }
    .dr-node.st-fault { border-color: #e0574b; } .dr-node.st-fault .dr-st { color: #ff9d93; }
    .dr-node.st-throttle { border-color: #a46be0; } .dr-node.st-throttle .dr-st { color: #d1b0ff; }
    .dr-node.st-dark { border-style: dashed; color: #b9bdc9; }
    .dr-node.st-off { opacity: .5; }
    .dr-res { padding: 6px 8px; border: 3px double var(--ink, #17131f); border-radius: 8px; background: #fff; color: #17131f; font-size: 14px; display: flex; gap: 6px; align-items: flex-start; }
    .dr-res.good { border-color: var(--mint, #4f7f5c); }
    .dr-res.bad { border-color: var(--red, #9e3a34); color: var(--red, #9e3a34); display: block; }
    .dr-reveal { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; border-left: 4px solid #17131f; background: #e2dbcb; color: #17131f; font-size: 14px; }
    .dr-reveal .dr-gi { width: 26px; height: 26px; }
    .dr-pager { border: 2px solid var(--ink, #17131f); border-radius: 10px; padding: 6px 8px; background: #20242f; color: #e8f0e0; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12.5px; display: flex; flex-direction: column; gap: 3px; }
    .dr-ph { display: flex; gap: 4px; align-items: center; color: #f3d36b; font-family: var(--f-body, inherit); }
    .dr-pl b { color: #f3d36b; }
    .dr-station .small { color: #2a2333; }
    .dr-station { border: 3px solid var(--ink, #17131f); border-radius: 10px; padding: 6px 8px; background: #c9b590; color: #17131f; display: flex; flex-direction: column; gap: 6px; }
    .dr-sh { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    /* The lead speaks from their portrait: a comic speech bubble, not a text box. */
    .dr-said { display: flex; flex-direction: column; gap: 4px; margin: 2px 0 0 4px; }
    .dr-say { position: relative; margin: 0; padding: 6px 10px; border-radius: 14px; background: #fffaf0; color: #17131f; border: 2px solid #17131f; font-size: 14px; line-height: 1.3; }
    .dr-said .dr-say:first-child::before { content: ''; position: absolute; top: -9px; left: 12px; border: 8px solid transparent; border-bottom-color: #17131f; border-top: 0; }
    .dr-say.bad { background: #fbe4dc; border-color: #9e3a34; } .dr-said .dr-say.bad:first-child::before { border-bottom-color: #9e3a34; }
    .dr-say.teach { background: #fff3c4; }
    .dr-said .dr-say { display: block; }
    .dr-code { margin: 8px 0; border-radius: 10px; background: #1c1a24; border: 2px solid #17131f; box-shadow: inset 0 0 0 1px rgba(214, 178, 84, .35), 0 3px 6px rgba(0, 0, 0, .45); overflow: hidden; }
    .dr-file { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 0; padding: 6px 10px; background: #2b2735; color: #e8d6b0; font-size: 12px; }
    .dr-file code { color: #ffd98a; } .dr-file span { margin-left: auto; font-style: italic; opacity: .8; }
    .dr-blk { display: block; width: 100%; margin: 0; padding: 2px 8px; border: 0; border-left: 3px solid transparent; background: none; text-align: left; cursor: pointer; color: #e9e4f2; }
    .dr-blk:hover, .dr-blk:focus-visible { background: rgba(255, 255, 255, .05); }
    .dr-blk.open { border-left-color: #ffd257; background: rgba(255, 210, 87, .08); }
    .dr-blk pre, .dr-diff { margin: 0; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    .dr-edits { display: grid; gap: 6px; padding: 6px 8px 8px 14px; background: rgba(255, 210, 87, .06); }
    .dr-edits.none { margin: 0; color: #c9bfae; font-style: italic; }
    .dr-edit { display: block; width: 100%; text-align: left; padding: 6px 8px; border-radius: 8px; border: 2px solid #8a6a2a; background: #f6ecd2; color: #17131f; cursor: pointer; }
    .dr-edit .dr-en { display: flex; align-items: center; gap: 4px; font-weight: 700; font-size: 13px; margin-bottom: 3px; }
    .dr-edit .dr-gi { width: 16px; height: 16px; }
    .dr-edit .dr-diff { background: #fffaf0; border-radius: 4px; padding: 3px 5px; color: #17131f; }
    .dr-dl-add { color: #1f6b33; background: #dcf3dc; display: inline-block; width: 100%; } .dr-dl-del { color: #8a2a24; background: #f8dcd8; display: inline-block; width: 100%; text-decoration: line-through; text-decoration-color: rgba(138, 42, 36, .5); }
    .dr-dl-ctx { color: #6b6378; display: inline-block; width: 100%; }
    .dr-edit.new { box-shadow: 0 0 0 2px #ffd257; }
    .dr-edit.no { opacity: .7; }
    @media (max-width: 420px) { .dr-code .dr-blk pre, .dr-code .dr-diff { font-size: 11px; } }
    .dr-more { margin: 6px 0; color: #e8d6b0; } .dr-more summary { cursor: pointer; font-weight: 700; padding: 4px 0; }
    .dr-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .dr-mt { display: flex; flex-direction: column; padding: 3px 6px; border-radius: 6px; background: #fffaf0; color: #17131f; border: 2px solid var(--ink, #17131f); min-width: 0; }
    .dr-mt code { font-size: 10.5px; overflow-wrap: anywhere; color: #3a3346; background: none; padding: 0; }
    .dr-mt b { font-size: 15px; }
    .dr-hand { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .dr-card { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 76px; padding: 6px 8px; text-align: left; border: 3px solid var(--ink, #17131f); border-radius: 10px; background: #fff; color: var(--ink, #17131f); font-size: 13px; line-height: 1.2; }
    .dr-card b { display: inline-flex; gap: 4px; align-items: flex-start; }
    .dr-card.on { background: #dbe8f3; color: #17131f; box-shadow: inset 0 0 0 3px #3f5f80; opacity: 1; }
    .dr-card.no { background: #e6dfd0; color: #17131f; }
    .dr-card.obs { border-style: dashed; }
    .dr-ct { font-size: 12px; overflow-wrap: anywhere; }
    .dr-why { font-size: 11px; font-weight: 800; color: var(--red, #9e3a34); }
    .dr-tag { font-size: 11px; font-weight: 800; color: #2b4a6b; }
    body.in-mode #panel .win .dr-card.on[aria-pressed="true"] { background: #dbe8f3; border-color: #2a4360; color: #17131f; }
    .dr-bw { position: relative; }
    .dr-stamp { position: absolute; z-index: 7; top: 40px; left: 10px; display: flex; flex-direction: column; align-items: center; padding: 4px 14px 5px; transform: rotate(-6deg);
      border: 4px double currentColor; border-radius: 10px; background: rgba(250, 244, 228, .92); pointer-events: none; animation: drstamp .4s ease-out both; }
    .dr-stamp { max-width: min(46%, 300px); text-align: center; }
    .dr-stamp b { font-family: var(--f-head, serif); font-size: 26px; letter-spacing: .08em; text-transform: uppercase; line-height: 1.05; }
    .dr-stamp span { font-size: 12px; font-weight: 800; color: #3a3346; }
    .dr-stamp.good { color: #2f6b3f; } .dr-stamp.bad { color: #9e3a34; } .dr-stamp.warm { color: #9a6a12; }
    @keyframes drstamp { from { transform: rotate(-6deg) scale(.3); opacity: 0; } 70% { transform: rotate(-6deg) scale(1.06); opacity: 1; } to { transform: rotate(-6deg) scale(1); opacity: 1; } }
    @media (max-width: 600px) { .dr-stamp { top: 30px; left: 4px; padding: 2px 8px; } .dr-stamp b { font-size: 17px; } .dr-stamp span { font-size: 10px; } }
    .dr-left { margin-left: auto; display: inline-flex; gap: 3px; } .dr-left i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid #17131f; background: transparent; } .dr-left i.on { background: #d6a63a; }
    .dr-spark { display: block; width: 100%; height: 22px; margin-top: 2px; } .dr-spark polyline { fill: none; stroke: #3f5f80; stroke-width: 2; vector-effect: non-scaling-stroke; }
    .dr-spark.bad polyline { stroke: #b23a2f; }
    .dr-dial { display: flex; flex-direction: column; gap: 3px; }
    .dr-dl { display: inline-flex; gap: 5px; align-items: center; font-weight: 800; font-size: 13px; color: #2a2333; }
    .dr-seg { display: flex; gap: 0; border: 3px solid #17131f; border-radius: 10px; overflow: hidden; background: #fffaf0; }
    .dr-seg > * + * { border-left: 2px solid #17131f !important; }
    body.in-mode #panel .win .dr-card.dr-pick, .dr-card.dr-pick { flex: 1 1 0; min-height: 40px; min-width: 0; border: 0; border-radius: 0; align-items: center; justify-content: center; text-align: center; padding: 4px; font-weight: 800; font-size: 13.5px; box-shadow: none; }
    .dr-cur { flex: 0 1 auto; display: flex; align-items: center; justify-content: center; padding: 4px 8px; font-size: 12px; font-weight: 800; color: #6a5a48; background: #e6dfd0; }
    body.in-mode #panel .win .dr-card.dr-pick.on[aria-pressed="true"], .dr-card.dr-pick.on { background: #3f5f80; color: #fff; box-shadow: none; }
    .dr-card.new { outline: 3px solid #d6a63a; outline-offset: -3px; }
    .dr-togs { grid-template-columns: 1fr 1fr; }
    .dr-card.dr-tog, .dr-card.dr-look { min-height: 48px; flex-direction: row; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; }
    .dr-card.dr-tog > span, .dr-card.dr-look > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .dr-sw { flex: 0 0 auto; width: 30px; height: 17px; border-radius: 9px; background: #b9b2a2; position: relative; border: 2px solid #17131f; }
    .dr-sw::after { content: ''; position: absolute; top: 1px; left: 1px; width: 11px; height: 11px; border-radius: 50%; background: #fff; transition: left .15s; }
    .dr-card.on .dr-sw { background: #4f7f5c; } .dr-card.on .dr-sw::after { left: 14px; }
    .dr-card.dr-tog.once { border-color: #9e3a34; }
    .dr-card.no { opacity: .75; }
    .dr-looks { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; } .dr-looks .dr-dl { width: 100%; }
    .dr-card.dr-look { flex: 1 1 140px; border-style: dashed; }
    .dr-tip { min-height: 2.6em; padding: 4px 8px; border-radius: 8px; background: rgba(255, 250, 240, .7); }
    .dr-dock { position: sticky; bottom: -16px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin: 4px -16px -16px; padding: 10px 16px; background: var(--cream, #fffaf0); border-top: 3px solid var(--ink, #17131f); }
    .dr-dock button { min-height: 44px; display: inline-flex; gap: 6px; align-items: center; justify-content: center; }
    .dr-dock .primary { flex: 1 1 auto; }
    /* No window box (Ladi, Nov 16: every mode edge to edge, as Monster Hunt now is): on the stage the drill fills
       everything under the top bar, the war room behind a darker wash, and the text keeps a readable column in the
       middle. Wide screens put the map, verdict and pager on the left and the station you're working on the right.
       Only the drill's own screens: the postmortem stays on the shared exam screen. */
    body.in-mode[data-stage="drill"] #panel:has(> .win.dr-win) { padding: calc(56px + env(safe-area-inset-top, 0px)) 0 0; align-items: stretch; }
    body.in-mode[data-stage="drill"] #panel .win.dr-win { width: 100%; max-width: none; height: 100%; min-height: 100%; max-height: 100%; align-self: stretch;
      padding: 0; border: 0; border-radius: 0; -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: none;
      background: radial-gradient(120% 90% at 50% 40%, rgba(12, 10, 16, .55), rgba(12, 10, 16, .85)); }
    body.in-mode[data-stage="drill"] #panel .win.dr-win .win-h { display: none; }   /* the bar above already names it */
    body.in-mode[data-stage="drill"] #panel .win.dr-win .win-b { border-radius: 0; background: none; box-shadow: none; overflow-y: auto;
      padding: 14px max(16px, calc((100% - 1148px) / 2)) 0; }
    body.in-mode[data-stage="drill"] #panel .win.dr-win .dr > .dr-say, body.in-mode[data-stage="drill"] #panel .win.dr-win :is(.dr-night, .dr-claim, .dr-top .small) { text-shadow: 0 1px 3px rgba(0, 0, 0, .8); }
    body.in-mode[data-stage="drill"] #panel .win.dr-win .win-b > .dr { min-height: 100%; }   /* so the dock sits at the bottom of the screen */
    body.in-mode[data-stage="drill"] #panel .win.dr-win .win-b > .dr:not(:has(.dr-cols)) { width: 100%; max-width: 820px; margin: 0 auto; }
    body.in-mode[data-stage="drill"] #panel .win.dr-win .dr-dock { bottom: 0; margin: auto calc(50% - 50vw) 0;
      padding: 10px calc(50vw - 50%) calc(10px + env(safe-area-inset-bottom, 0px));
      background: rgba(20, 17, 28, .94); border-top: 2px solid #0c0a10; }
    .dr-cols { display: flex; flex-direction: column; gap: 8px; }
    .dr-wait { opacity: .55; pointer-events: none; filter: saturate(.6); }
    .dr-l, .dr-r { min-width: 0; }
    .dr-r:empty { display: none; }
    @media (min-width: 900px) {
      body.in-mode .dr-cols { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 12px 24px; align-items: start; }
      body.in-mode .dr-cols > .dr-r { position: sticky; top: 0; }
      body.in-mode .dr-cols > .dr-r:empty { display: none; }
      body.in-mode .dr-cols:has(> .dr-r:empty) { grid-template-columns: minmax(0, 760px); justify-content: center; }
      body.in-mode .dr-win .dr-door { max-width: 260px; min-height: 64px; font-size: 14px; }
      body.in-mode .dr-win .dr-map { padding: 14px; gap: 12px; }
      body.in-mode .dr-win .dr-node { font-size: 13px; padding: 8px 4px; } body.in-mode .dr-win .dr-node b { font-size: 13px; } body.in-mode .dr-win .dr-node .dr-gi { width: 30px; height: 30px; }
      body.in-mode .dr-win .dr-edge { flex-basis: 18px; }
      body.in-mode .dr-win .dr-hand { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
      body.in-mode .dr-win .dr-metrics { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
    }
    /* The living war room (js/drill-room.js): the room is the screen; the station's desk slides up over it. */
    .dr-roomw { position: relative; }
    .dr-hint { flex: 1 1 auto; align-self: center; font-weight: 700; font-size: 14px; opacity: .85; }
    .dr-tray { position: relative; z-index: 8; margin-top: 8px; animation: drtray .4s cubic-bezier(.2, .8, .2, 1) both; }
    @keyframes drtray { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
    .dr-tray .dr-station { box-shadow: 0 -6px 24px rgba(0, 0, 0, .55); border-radius: 14px; }
    /* The desk itself, not a panel (Ladi, Nov 16: "there's still a box"). Pushing in on a lead slides their desk up
       from the counter: wood planks with the metrics pinned to it as paper notes, the dials as brass lever plates,
       the switches as brass tags and the looks as index cards. */
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-station { border: 0; border-radius: 0; padding: 12px 12px 10px; gap: 9px; color: #f3e6c8; box-shadow: inset 0 6px 10px rgba(0, 0, 0, .45);
      background: linear-gradient(180deg, #6b4524 0, #6b4524 5px, #3b2413 5px, #3b2413 8px, transparent 8px),
        repeating-linear-gradient(180deg, rgba(0, 0, 0, 0) 0 38px, rgba(0, 0, 0, .28) 38px 40px),
        repeating-linear-gradient(97deg, rgba(255, 220, 160, .035) 0 3px, rgba(0, 0, 0, .04) 3px 9px),
        linear-gradient(180deg, #7a5230, #5c3a1e 60%, #4a2e17); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-station .small { color: #e8d6b0; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-sh b { font-family: var(--f-head, serif); color: #2a1a08; padding: 1px 10px; border-radius: 4px; border: 2px solid #5a3b10;
      background: linear-gradient(#e3c06a, #a77d2c); box-shadow: 0 2px 0 rgba(0, 0, 0, .45), inset 0 1px 0 rgba(255, 255, 255, .45); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-head { display: none; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-left i { border-color: #2a1a08; background: #3b2413; } :is(body.in-mode #panel .win, #panel) .dr-tray .dr-left i.on { background: radial-gradient(circle at 35% 35%, #ffe7a0, #c9952d 60%, #7a5418); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-metrics { gap: 10px 8px; padding: 2px 2px 4px; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-mt { position: relative; border: 0; border-radius: 1px; background: linear-gradient(#fbf4df, #efe3c2); color: #2a2018; padding: 8px 7px 4px;
      box-shadow: 1px 3px 4px rgba(0, 0, 0, .5); transform: rotate(-1.2deg); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-mt:nth-child(2n) { transform: rotate(1.4deg); } :is(body.in-mode #panel .win, #panel) .dr-tray .dr-mt:nth-child(3n) { transform: rotate(.4deg); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-mt::before { content: ''; position: absolute; top: 2px; left: calc(50% - 4px); width: 8px; height: 8px; border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ff9a8a, #b0302a 65%); box-shadow: 0 1px 1px rgba(0, 0, 0, .5); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-mt code { color: #5a4a3a; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-dl { color: #f0dcb0; text-shadow: 0 1px 0 rgba(0, 0, 0, .6); } :is(body.in-mode #panel .win, #panel) .dr-tray .dr-dl .dr-gi { fill: currentColor; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-seg { border: 2px solid #3b2413; border-radius: 7px; padding: 3px; gap: 3px; background: linear-gradient(#d7b462, #9b7228); box-shadow: 0 2px 0 rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .4); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-seg > * + * { border-left: 0 !important; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.dr-pick { border-radius: 4px; background: rgba(255, 244, 210, .35); color: #2a1a08; min-height: 36px; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.dr-pick.on[aria-pressed="true"], :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.dr-pick.on { background: #3b2413; color: #ffe7a0; box-shadow: inset 0 2px 4px rgba(0, 0, 0, .7); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-cur { background: transparent; color: #4a2e10; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.dr-tog { border: 2px solid #5a3b10; border-radius: 6px; background: linear-gradient(#e6c879, #b48a38); color: #2a1a08;
      box-shadow: 0 2px 0 rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .45); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.dr-tog.on[aria-pressed="true"], :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.dr-tog.on { background: linear-gradient(#f5dc8e, #c99a3c); border-color: #2a1a08; color: #2a1a08; box-shadow: 0 0 0 2px #ffe7a0, 0 2px 0 rgba(0, 0, 0, .5); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.dr-tog.no { background: linear-gradient(#b9a77c, #8a7448); opacity: .8; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.dr-tog.once { border-color: #7a1f1a; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-sw { background: #3b2413; border-color: #2a1a08; } :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.on .dr-sw { background: #4f7f5c; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.dr-look { border: 0; border-radius: 2px; background: repeating-linear-gradient(180deg, #fbf6e6 0 15px, #d9e3ee 15px 16px); color: #2a2018; box-shadow: 1px 3px 4px rgba(0, 0, 0, .5); }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-card.new { outline: 3px solid #ffe7a0; outline-offset: 1px; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-tip { background: none; color: #e8d6b0; font-style: italic; padding: 0 2px; min-height: 2.4em; }
    :is(body.in-mode #panel .win, #panel) .dr-tray .dr-say { box-shadow: 0 2px 4px rgba(0, 0, 0, .45); }
    @media (max-width: 700px) { .dr-roomw.zoomed .dr-tray { margin-top: -64px; } .dr-roomw.zoomed .dr-tray .dr-station { box-shadow: inset 0 6px 10px rgba(0, 0, 0, .45); } }
    @media (min-width: 900px) {
      .dr-roomw.zoomed .dr-tray { position: absolute; left: 50%; bottom: 0; width: min(780px, 92%); max-height: 74%; overflow-y: auto; margin: 0;
        transform: translateX(-50%); animation: drtrayw .45s cubic-bezier(.2, .8, .2, 1) both; }
      .dr-roomw.zoomed .dr-tray .dr-station { border-radius: 14px 14px 0 0; border-bottom: 0; }
      @keyframes drtrayw { from { transform: translate(-50%, 60%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    }
    body.in-mode[data-stage="drill"] #panel .win.dr-win .win-b > .dr:has(.dr-roomw) { max-width: 1240px; margin: 0 auto; }
    @media (max-height: 820px) and (min-width: 900px) {
      body.in-mode[data-stage="drill"] #panel .win.dr-win .win-b > .dr:has(.dr-roomw) { max-width: min(1240px, calc((100vh - 230px) * 1.79)); }
    }
    /* Uptima's cutscenes: the interface drops away, she stands full size over the blurred room. */
    .dr:has(> .dr-cut) { min-height: 100%; }
    .dr-cut { position: relative; flex: 1; min-height: min(78vh, 760px); display: flex; align-items: flex-end; justify-content: center; overflow: hidden;
      margin: -14px calc(50% - 50vw) 0; }
    .dr-cut-room { position: absolute; inset: 0; container-type: size; overflow: hidden; background: #120e0a; }
    .dr-cut-room .rm { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: max(100cqw, 179.1cqh); border-radius: 0; }
    @keyframes drcutin { from { transform: translateY(8%); opacity: 0; } to { transform: none; opacity: 1; } }
    body.in-mode #panel .win .dr-cut-box, .dr-cut-box { position: relative; z-index: 2; width: min(980px, calc(100% - 32px)); margin: 0 auto calc(22px + env(safe-area-inset-bottom, 0px));
      display: block; text-align: left; padding: 18px 24px 22px; border-radius: 16px; background: rgba(22, 19, 30, .93); color: #efe6d2;
      border: 2px solid rgba(214, 178, 84, .6); font: inherit; font-size: 19px; line-height: 1.45; cursor: pointer; box-shadow: 0 10px 30px rgba(0, 0, 0, .5); min-height: 0; }
    .dr-cut-box b { display: block; font-family: var(--f-head, serif); color: #e9c56d; font-size: 19px; margin-bottom: 4px; }
    .dr-cut-box i { font-style: normal; color: #d6b254; margin-left: 6px; display: inline-block; animation: drmore 1s ease-in-out infinite; }
    @keyframes drmore { 50% { transform: translateY(3px); } }
    @media (min-width: 900px) { .dr-cut-box { margin-left: max(16px, calc(50% - 160px)); width: min(760px, 52%); } }
    @media (max-width: 600px) { .dr-cut-box { font-size: 16px; } }
    /* The postmortem on the war room's chalkboard: the question in chalk, the answers as cards on the counter. */
    body.dr-pm.in-mode #panel .win.quiz { background: #24382c; border: 12px solid #6b4a2a; border-radius: 8px; box-shadow: 0 16px 40px rgba(0, 0, 0, .7), inset 0 0 40px rgba(0, 0, 0, .45); }
    body.dr-pm.in-mode #panel .win.quiz .win-b { background: transparent; color: #f2f2e6; }
    body.dr-pm.in-mode #panel .win.quiz .win-h { background: transparent; color: #f2f2e6; border-bottom: 2px dashed rgba(242, 242, 230, .35); }
    body.dr-pm.in-mode #panel .win.quiz :is(h2, h3, p, label, legend, .q, .stem) { color: #f2f2e6; font-family: 'Patrick Hand', 'Comic Sans MS', 'Segoe Print', cursive, var(--f-body); }
    body.dr-pm.in-mode #panel .win.quiz button:not(.primary):not(.ghost) { background: #f6efdc; color: #17131f; border: 3px solid #17131f; border-radius: 10px; box-shadow: 0 4px 0 #0c0a10; }`;
  document.head.appendChild(css);
})();
