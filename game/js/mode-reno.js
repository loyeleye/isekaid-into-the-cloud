// The Renovation (design: project files game-modes/architects-draft/real-game-design.md, approved by Ladi Nov 16):
// Architect's Draft as a real game, replacing the client-board draft loop (Ladi's OK). Pingsby's Quarter is lived in:
// every job ships a new version of a client's building while residents keep walking in, and Sir Seymour Backups checks
// each plan twice, once with a sound release and once with a cracked beam. The rules are js/reno-core.js on
// js/aws-deploy.js. The Quarter, its buildings, scaffolding and the Wall link are js/draft.js's, unchanged.
//   - Everything shows on the street (L9): the gate's turned-away marks, soot on residents, scaffolding, rented lots,
//     the signpost's weights on the bridge, the jars of the Blueprint Office. No walkthrough screens: each rule's first
//     appearance carries one line (TEACH, once per save), and a refused plan says why in the client's words.
//   - Cards say what they set, never whether they help. No hint before the plan runs; the debrief says why.
//   - The question is the debrief: after each job, one verified bank question on that district (multiple-response
//     first, the Draft's own format), on the plain exam screen with the shared stake table (SD.modes.ask). Right: Seymour
//     signs and the building stands. Wrong: scaffolding, and the question goes on the Wall (every miss, as the Draft
//     always did); by the twins rule a verified twin opens next night's first debrief.
//   - Saves after every step (S.save.reno). A night is five jobs ending on a Grand Opening, about 18 minutes.
(function () {
  if (!SD.modes || !SD.reno || !SD.awsDeploy || !SD.draft) return;
  const M = SD.modes, U = SD.ui, S = SD.state, R = SD.reno, AD = SD.awsDeploy, DR = SD.draft;
  const E = () => SD.exam, D = () => SD.topicDrill;
  const TITLE = 'ARCHITECT\'S DRAFT';
  const esc = s => U.esc(String(s == null ? '' : s));
  const sv = () => S.save;
  const cur = () => sv().reno || null;
  const keep = () => (sv().renoKeep = sv().renoKeep || { night: 0, taught: {}, carry: [], misses: [], last: {} });
  const save = s => { sv().reno = s; S.persist(); };
  const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NAMES = { mira: 'Mira', seoyeon: 'Seo-yeon', dutch: 'Dutch', kai: 'Kai', marrow: 'Goodwife Marrow', pip: 'Pip', coo: 'Postmaster Coo', ayo: 'Ayo', seymour: 'Sir Seymour Backups' };
  // The cast's PixelLab portraits straight from the files, as js/draft.js draws them; the shared art as a fallback.
  const FACES = ['mira', 'seoyeon', 'dutch', 'kai', 'marrow', 'pip', 'coo', 'ayo', 'seymour'];
  const head = who => {
    if (FACES.includes(who) && !window.SD_VECTOR) return `<span class="rn-head"><img src="assets/img/portraits/${who}-neutral.webp" alt="" draggable="false"></span>`;
    try { return SD.art && SD.art.portrait ? `<span class="rn-head">${SD.art.portrait(who, 34, 'neutral')}</span>` : ''; } catch (e) { return ''; }
  };
  const say = (who, line) => `<p class="rn-say" data-vo="${esc(who + '|' + line)}">${head(who)}<span><b>${esc(NAMES[who] || who)}:</b> ${esc(line)}</span></p>`;
  // A screen with the living street (js/reno-street.js) puts the street behind everything, filling the screen, and the
  // text floats over it in boxes (Ladi, Nov 16: boxes around the scene take away the real-world feel).
  const panel = (html, title) => U.panel(`<div class="rn${html.includes('class="rs ') ? ' rn-world' : ''}">${html}</div>`, { title: title || TITLE, onClose: stopNow, cls: 'rn-win' });
  function stopNow() { const s = cur(); if (s) save(s); if (SD.today && SD.today.render) SD.today.render(); }
  const foreman = () => DR.foremanId();

  // ---- One line the first time each thing happens (L9) ----
  const TEACH = {
    turned: ['seymour', 'A red mark on the gate. Someone came home and every door was shut. I counted them. Twice.'],
    soot: ['seymour', 'Soot. That resident walked into the cracked beam. In my second run, the beam is always cracked. Plan for it.'],
    straggler: ['seymour', 'Some residents still had the old map. Directions take a while to reach everybody, so keep the old street up until they do.'],
    rented: ['seymour', 'Rented lots cost lumber. The slate says how much you may spend.'],
    mixed: ['seymour', 'For a while, some residents were in old rooms and some in new ones. Both at once.'],
    alarm: ['seymour', 'The bell rang and the signpost swung back by itself. That is what an alarm on a deployment is for.'],
    pre: ['seymour', 'The test walker crossed first, found the crack, and nobody else set foot on it.'],
    stuck: ['seymour', 'Nobody was watching for errors, so the signpost kept pointing at the crack.'],
    refused: ['seymour', 'That plan can\'t be built at all. The reason is on the scroll in red. It costs you nothing.']
  };
  function teachLines(s, events) {
    const k = keep(); k.taught = k.taught || {};
    return events.filter(e => TEACH[e] && !k.taught[e]).slice(0, 2).map(e => { k.taught[e] = 1; return say(...TEACH[e]); }).join('');
  }

  // ---- Start, resume ----
  function start() {
    let s = cur();
    if (!s || s.v !== 1 || s.phase === 'done') {
      const k = keep();
      s = R.newNight({ night: k.night + 1, misses: k.misses });
      s.tally = M.newTally();
      s.carry = (k.carry || []).slice();
    }
    save(s);
    draw(s);
  }
  function draw(s) {
    ({ board: boardScreen, plan: planScreen, debrief: debriefScreen, after: afterScreen, end: endScreen }[s.phase] || boardScreen)(s);
    // A new screen opens at its top. js/ui.js keeps a window's scroll when the next one has the same title (all of
    // these do), so a phone that scrolled down to "Take the job" opened the plan with the street half covered
    // (playtest, Nov 17). A redraw of the same screen (a knob, a refused plan) doesn't come through here and keeps it.
    const wb = document.querySelector('#panel > .win > .win-b'); if (wb) wb.scrollTop = 0;
    const rn = wb && wb.querySelector(':scope > .rn'); if (rn) rn.classList.remove('rn-up');
  }
  const jobOf = (s, i) => R.job(s.jobs[i].id, s.jobs[i].seed);

  // ---- The night's board: the jobs pinned on a map of Pingsby's Quarter, the Grand Opening's ribbon in the square (L7) ----
  // Pin spots are percentages of the painted map, assets/img/reno/street/quarter-map.webp (16:9), where each pin's point
  // lands: Beanstalk Row's gatehouse and cottages by the crane top left, the walled Blueprint Office in the middle, the
  // Shrine Bridge's arch and two shrines over the river, and the market square's fountain (every Grand Opening's spot).
  // A pin stands about a fifth of the map's height above its point, so no point sits higher than y 21% (the map clips).
  const SPOTS = { eb: [[15, 43], [23, 33], [31, 23], [40, 21]], lam: [[44, 73], [54, 63], [66, 77], [77, 79]], cfn: [[44, 37], [51, 43], [59, 33], [42, 52]], grand: [[83, 52]] };
  const streetImg = (n, cls) => `<img class="${cls}" src="assets/img/reno/street/${n}.webp" alt="" draggable="false">`;
  function mapHtml(s) {
    const used = {};
    const pins = s.jobs.map((j, i) => {
      const job = jobOf(s, i), k = job.grand ? 'grand' : job.d, n = used[k] = (used[k] || 0) + 1;
      const [x, y] = SPOTS[k][(n - 1) % SPOTS[k].length];
      const st = j.done ? (j.pass ? 'ok' : 'bad') : i === s.at ? 'on' : '';
      return `<span class="rn-pin ${st}${job.grand ? ' grand' : ''}" style="left:${x}%;top:${y}%">${job.grand ? streetImg('arch', 'rn-ribbon') : ''}${streetImg('pin', 'rn-pinsp')}<b>${j.done ? (j.pass ? '✓' : '✗') : i + 1}</b></span>`;
    }).join('');
    return `<div class="rn-map" role="img" aria-label="Map of Pingsby's Quarter with tonight's ${s.jobs.length} jobs pinned">${streetImg('quarter-map', 'rn-mapsp')}${pins}</div>`;
  }
  function boardScreen(s) {
    const F = DR.foreman(), first = s.at === 0 && !s.jobs[0].plans.length;
    const rows = s.jobs.map((j, i) => {
      const job = jobOf(s, i), dd = R.DISTRICTS[job.d];
      const st = j.done ? (j.pass ? '✓ signed' : '✗ scaffolding') : i === s.at ? '▶ next' : '';
      return `<li class="rn-job${i === s.at ? ' on' : ''}${j.done ? ' done' : ''}${job.grand ? ' grand' : ''}"><span class="rn-num">${i + 1}</span>${head(job.client)}<span><b>${esc(job.title)}</b><br><span class="small">${esc(NAMES[job.client])} · ${esc(job.grand ? 'the market square' : dd.name)}</span></span><span class="rn-st small">${esc(st)}</span></li>`;
    }).join('');
    const newD = s.night <= 3 ? R.DISTRICTS[Object.keys(R.DISTRICTS).find(d => R.DISTRICTS[d].night === s.night)] : null;
    const b = panel(`<p class="rn-night">Night ${s.night}${newD ? `: ${esc(newD.name)} opens` : ''}</p>
      ${first ? say(foreman(), s.night === 1 ? 'Pingsby\'s Quarter is lived in again. Every job is a new version of someone\'s building, and the residents don\'t stop coming home while you work. Seymour checks everything twice.' : newD ? `New tonight: ${newD.name}. ${newD.what[0].toUpperCase() + newD.what.slice(1)}. Same rules: ship it, and nobody should notice.` : F.intro) : ''}
      <div class="rn-boardgrid">${mapHtml(s)}<ol class="rn-jobs">${rows}</ol></div>
      <div class="rn-dock"><button class="primary" id="rn-go">${s.jobs[s.at].plans.length ? 'Back to the job' : 'Take the job'}</button><button class="ghost" id="rn-q">Pingsby's Quarter</button><button class="ghost" id="rn-stop">Stop for now</button></div>`);
    b.querySelector('#rn-go').onclick = () => { s.phase = 'plan'; save(s); draw(s); };
    b.querySelector('#rn-q').onclick = () => DR.quarter(() => draw(cur()));
    b.querySelector('#rn-stop').onclick = () => { save(s); U.closePanel(); stopNow(); };
  }

  // ---- The plan: the scroll, the slate, the street, the cards and their knobs ----
  const POLICY_TEXT = {
    allAtOnce: 'Deploys to every house at once.',
    rolling: 'Deploys to the houses a batch at a time.',
    rollingBatch: 'Rents one extra batch first, then deploys a batch at a time. Hands the extra batch back at the end.',
    immutable: 'Rents one new house, then a full new set once it\'s healthy, then tears the old ones down.',
    split: 'Rents a full new set and sends a share of residents to it for an evaluation time, then everyone.',
    blueGreen: 'Builds a whole new street on its own address, then swaps the signposts.'
  };
  const LAM_TEXT = { all: 'AllAtOnce: the signpost swings in one go.', canary: 'Canary: 10% of walkers, then the rest after the wait.', linear: 'Linear: 10% more walkers every interval.' };
  // Number choices are brass plaques on the scaffolding; on/off choices are a lever between its two plaques.
  const TOGGLE = ['ignoreHC', 'publish', 'alarm', 'pre', 'post'];
  function seg(name, opts, val, label) {
    const btn = o => `<button data-k="${name}" data-v="${esc(o[0])}" class="${String(o[0]) === String(val) ? 'on' : ''}" aria-pressed="${String(o[0]) === String(val)}">${esc(o[1])}</button>`;
    if (TOGGLE.includes(name)) {
      const on = String(val) === 'true';
      return `<div class="rn-knob rn-lk"><span class="small">${esc(label)}</span><div class="rn-seg rn-lever">${btn(opts[0])}<button class="rn-lv${on ? ' up' : ''}" data-flip="${name}" aria-label="${esc(label)}: pull the lever">${streetImg('lever', 'rn-lvsp')}</button>${btn(opts[1])}</div></div>`;
    }
    return `<div class="rn-knob"><span class="small">${esc(label)}</span><div class="rn-seg">${opts.map(btn).join('')}</div></div>`;
  }
  // The slate: what the client needs, chalked on a board nailed to the gate.
  function slateHtml(job, res) {
    return `<div class="rn-chalk"><p class="rn-chalkh">The slate</p><ul class="rn-slate">${job.lines.map((t, i) => {
      const r = res && res.lines[i];
      return `<li class="${r ? (r.ok ? 'ok' : 'bad') : ''}">${r ? (r.ok ? '✓ ' : '✗ ') : '▢ '}${esc(t)}${r ? ` <span class="small">(${esc(r.got)})</span>` : ''}</li>`;
    }).join('')}</ul></div>`;
  }
  function planOf(s, job) {
    const j = s.jobs[s.at];
    if (!j.plan) j.plan = R.defaultPlan(job, keep().last[job.d]);
    return j.plan;
  }
  function planScreen(s) {
    const job = jobOf(s, s.at), j = s.jobs[s.at], p = planOf(s, job);
    const left = R.PLANS - j.plans.length;
    let cards = '', knobs = '', scene = '';
    const bp = (attr, id, on, name, text) => `<button class="rn-card${on ? ' on' : ''}" ${attr}="${id}" aria-pressed="${on}">${on ? streetImg('pin', 'rn-tack') : ''}${streetImg('blueprint', 'rn-bpsp')}<b>${esc(name)}</b><span class="small">${esc(text)}</span></button>`;
    if (job.d === 'eb') {
      const st = job.street, g = ghostOf(job, p);
      const info = `${plural(st.houses, 'house')} · ${st.demand ? plural(st.demand, 'resident') + ' coming home every tick' : 'nobody lives here yet'} · the gate is ${st.gate === 'alb' ? 'an Application Load Balancer' : 'a Classic Load Balancer'}`;
      const tap = p.policy === 'rolling' || p.policy === 'rollingBatch';
      scene = SD.renoStreet ? SD.renoStreet.scene({ ghost: g, tap, seymour: 'proud', folk: st.demand, kai: 'neutral', shot: 'wide',
        label: `Beanstalk Row: ${info}`,
        ui: `<div class="rs-row"><span class="rs-col"><span class="rs-chip rs-hidephone">${esc(info)}</span>${g.tag ? `<span class="rs-chip plan">Blueprint: ${esc(g.tag)}</span>` : ''}</span>${slateHtml(job)}</div>
          <div class="rs-row"><span></span>${tap ? '<span class="rs-chip">Tap a house: that many per batch</span>' : ''}</div>` })
        : streetRow(job, { houses: g.houses }, { ghost: g, slate: slateHtml(job), info, folk: st.demand ? residents({ served: Math.min(st.demand, 8) }) : '' });
      cards = job.hand.map(id => bp('data-pol', id, p.policy === id, AD.EB_NAME[id], POLICY_TEXT[id])).join('');
      if (p.policy === 'rolling' || p.policy === 'rollingBatch') knobs = seg('batch', [[1, '1 house'], [2, '2 houses'], [3, '3 houses']], p.batch, 'Batch size (fixed)') + seg('ignoreHC', [['false', 'Off'], ['true', 'On']], String(!!p.ignoreHC), 'Ignore health check');
      if (p.policy === 'split') knobs = seg('split', [[10, '10%'], [25, '25%'], [50, '50%']], p.split, 'Traffic split') + seg('evalT', [[2, '2 ticks'], [3, '3 ticks'], [4, '4 ticks']], p.evalT, 'Evaluation time');
      if (p.policy === 'blueGreen') knobs = seg('wait', [[0, 'Right away'], [2, 'After 2 ticks']], p.wait, 'Tear down the old street');
    } else if (job.d === 'lam') {
      const w0 = p.cfg === 'all' ? 1 : 0.1;
      const info = `${plural(job.fn.demand, 'walker')} a minute cross the bridge${job.fn.first ? ' · this function has never shipped a version' : ' · the live alias points at the current version'}`;
      scene = SD.renoStreet ? SD.renoStreet.scene({ bridge: true, w: w0, demand: job.fn.demand, first: job.fn.first, alarm: !!p.alarm, pre: !!p.pre, post: !!p.post, ghost: true, tap: true, seymour: 'proud', kai: 'neutral', shot: 'wide',
        label: `The Shrine Bridge: ${info}. The signpost's first swing sends ${Math.round(w0 * 100)}% to the new shrine`,
        ui: `<div class="rs-row"><span class="rs-col"><span class="rs-chip rs-hidephone">${esc(info)}</span><span class="rs-chip plan">Blueprint: ${esc(AD.cfgName(p))}</span></span>${slateHtml(job)}</div>
          <div class="rs-row"><span></span><span class="rs-chip">Tap the bell or the test walker to set them up</span></div>` })
        : `<div class="rn-street rn-river"><div class="rn-gatepost">${slateHtml(job)}</div><p class="rn-street-info small">${esc(info)}</p>${bridgeRow(w0, 0, { alarm: p.alarm, ghost: true })}</div>`;
      cards = ['all', 'canary', 'linear'].map(id => bp('data-cfg', id, p.cfg === id, id === 'all' ? 'All at once' : id[0].toUpperCase() + id.slice(1), LAM_TEXT[id])).join('');
      if (p.cfg === 'canary') knobs += seg('wait', AD.CANARY.map(m => [m, m + ' min']), p.wait, 'Wait before the other 90%');
      if (p.cfg === 'linear') knobs += seg('every', AD.LINEAR.map(m => [m, 'every ' + m]), p.every, 'Minutes between steps');
      knobs += `<p class="small rn-cfg">Deployment configuration: <b>${esc(AD.cfgName(p))}</b></p>`;
      knobs += seg('publish', [['false', 'Off ($LATEST)'], ['true', 'On']], String(!!p.publish), 'Publish a version (AutoPublishAlias: live)')
        + seg('alarm', [['false', 'None'], ['true', 'On errors']], String(!!p.alarm), 'CloudWatch alarm on the deployment')
        + seg('pre', [['false', 'None'], ['true', 'Test function']], String(!!p.pre), 'Pre-traffic hook (BeforeAllowTraffic)')
        + seg('post', [['false', 'None'], ['true', 'Test function']], String(!!p.post), 'Post-traffic hook (AfterAllowTraffic)');
      if (job.crack) scene += `<p class="small rn-crack">Seymour's cracked run: ${job.crack === 'test' ? 'a crack a test can find' : 'a crack that only shows under real traffic'}.</p>`;
    } else {
      scene = SD.renoStreet ? SD.renoStreet.scene({ stack: job.stack, plan: p, tap: true, seymour: 'proud', kai: 'neutral', shot: 'wide',
        label: 'The Blueprint Office yard: the stack to tear down, each resource with its DeletionPolicy plaque',
        ui: `<div class="rs-row"><span class="rs-col"><span class="rs-chip">The stack is being torn down. Mark each resource's DeletionPolicy.</span></span>${slateHtml(job)}</div>
          <div class="rs-row"><span></span><span class="rs-chip">Tap a resource to change its plaque</span></div>` })
        : `<div class="rn-street rn-office"><div class="rn-gatepost">${slateHtml(job)}</div><p class="rn-street-info small">The stack is being torn down. Mark each resource's DeletionPolicy.</p>${stackRow(job)}</div>`;
      knobs = job.stack.map(r => seg('cfn:' + r.id, ['Delete', 'Retain', 'Snapshot'].map(o => [o, o + (AD.cfnDefault(r.type) === o ? ' (default)' : '')]), p[r.id], `${r.name} · ${AD.TYPE_NAME[r.type]}`)).join('');
    }
    const slateBelow = SD.renoStreet ? `<div class="rn-slatebelow">${slateHtml(job)}</div>` : '';
    const refused = j.refused ? `<div class="rn-refused">${say(job.client, j.refused)}${j.teachRef || ''}</div>` : '';
    const b = panel(`<div class="rn-top">${head(job.client)}<div><p class="rn-title">${esc(job.title)}</p><p class="small">${esc(NAMES[job.client])} · ${esc(R.DISTRICTS[job.d].name)}</p></div></div>
      <p class="rn-scroll">“${esc(job.scroll)}”</p>
      <div class="rn-bleed">${scene}</div>
      ${slateBelow}
      ${refused}
      ${cards ? `<p class="q-ctx">${job.d === 'eb' ? 'Deployment policy: pick a blueprint' : 'Traffic shifting: pick a blueprint'}</p><div class="rn-cards">${cards}</div>` : ''}
      ${knobs ? `<p class="q-ctx">${job.d === 'cfn' ? 'DeletionPolicy plaques' : 'On the scaffolding'}</p><div class="rn-knobs">${knobs}</div>` : ''}
      <div class="rn-dock"><button class="primary" id="rn-run">${job.d === 'cfn' ? 'Tear it down' : 'Renovate'}</button><span class="small">${plural(left, 'plan')} left · Seymour runs it twice</span></div>
      <div class="rn-dock"><button class="ghost" id="rn-board">The night's jobs</button><button class="ghost" id="rn-stop">Stop for now</button></div>`);
    if (SD.renoStreet) SD.renoStreet.mount(b);
    // A refused plan redraws the screen: bring the client's reason into view, or it sits below the fold on a phone.
    if (j.refused) { const rf = b.querySelector('.rn-refused'); if (rf && rf.scrollIntoView) rf.scrollIntoView({ block: 'center' }); }
    const redraw = () => { j.refused = null; j.teachRef = ''; save(s); planScreen(s); };
    b.querySelectorAll('[data-pol]').forEach(el => el.onclick = () => { p.policy = el.dataset.pol; redraw(); });
    b.querySelectorAll('[data-cfg]').forEach(el => el.onclick = () => { p.cfg = el.dataset.cfg; redraw(); });
    b.querySelectorAll('[data-k]').forEach(el => el.onclick = () => {
      const k = el.dataset.k, v = el.dataset.v;
      if (k.startsWith('cfn:')) p[k.slice(4)] = v;
      else p[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
      redraw();
    });
    b.querySelectorAll('[data-res]').forEach(el => el.onclick = () => {   // tap a resource: Delete, Retain, Snapshot, round again
      const k = el.dataset.res, o = ['Delete', 'Retain', 'Snapshot'];
      p[k] = o[(o.indexOf(p[k] || 'Delete') + 1) % 3]; redraw();
    });
    b.querySelectorAll('[data-house]').forEach(el => el.onclick = () => { p.batch = +el.dataset.house; redraw(); });   // tap a house on the street
    b.querySelectorAll('[data-flip]').forEach(el => el.onclick = () => { const k = el.dataset.flip; p[k] = !p[k]; redraw(); });
    b.querySelector('#rn-run').onclick = () => run(s, job);
    b.querySelector('#rn-board').onclick = () => { s.phase = 'board'; save(s); draw(s); };
    b.querySelector('#rn-stop').onclick = () => { save(s); U.closePanel(); stopNow(); };
  }

  // ---- The street, drawn from a tick's houses (PixelLab sprites in assets/img/reno, credited in CREDITS.md) ----
  const CL = id => (DR.CLIENTS && DR.CLIENTS[id]) || {};
  const NEW_ROOF = '#e0a030';
  const IMG = n => `assets/img/reno/${n}.webp`;
  const sprite = (n, cls, alt) => `<img class="rn-sp ${cls || ''}" src="${IMG(n)}" alt="${esc(alt || '')}" draggable="false">`;
  const HOUSE = { up: { old: 'house-old', new: 'house-new' }, scaf: { old: 'house-scaf', new: 'house-scaf' }, dark: { old: 'house-dark', new: 'house-dark' } };
  const HOUSE_SAYS = { up: { old: 'old version, open', new: 'new version, open' }, scaf: { old: 'under scaffolding', new: 'under scaffolding' }, dark: { old: 'dark: failed its health check', new: 'dark: failed its health check' } };
  // The plan, ghosted onto the street in blueprint ink: which houses go in which batch, and what gets built beside them.
  function ghostOf(job, p) {
    const n = job.street.houses, bsz = p.batch || 1;
    const houses = Array.from({ length: n }, (_, i) => ({ id: i, env: 'a', v: 'old', st: 'up' }));
    const g = { houses, extra: 0, lane: 0, tag: '' };
    if (p.policy === 'allAtOnce') { houses.forEach(h => { h.g = 1; }); g.tag = 'every house at once'; }
    if (p.policy === 'rolling' || p.policy === 'rollingBatch') {
      houses.forEach((h, i) => { h.g = Math.floor(i / bsz) + 1; });
      if (p.policy === 'rollingBatch') g.extra = bsz;
      g.tag = `batches of ${plural(bsz, 'house')}${g.extra ? ', one extra batch rented first' : ''}`;
    }
    if (p.policy === 'immutable') { g.lane = n; g.tag = 'a new set beside the old: one house first, then the rest'; }
    if (p.policy === 'split') { g.lane = n; g.bLane = true; g.tag = `a new set takes ${p.split}% of residents for ${plural(p.evalT, 'tick')}`; }
    if (p.policy === 'blueGreen') { g.lane = n; g.bLane = true; g.tag = 'a whole new street on its own address'; }
    return g;
  }
  const ghostHouse = i => `<span class="rn-h rn-ghost">${sprite('house-new', '', 'planned new house')}${i ? `<i class="rn-bn">+</i>` : ''}</span>`;
  // The street scene: sky, the backdrop, the gate (with the slate chalked on it while planning), the houses, and the road.
  function streetRow(job, tick, o) {
    o = o || {};
    const hs = tick.houses || [], gh = o.ghost;
    const row = env => hs.filter(h => h.env === env).map(h => `<span class="rn-h ${h.st} ${h.v}${h.rented ? ' rented' : ''}${h.g ? ' g' + (h.g % 2) : ''}">${sprite((HOUSE[h.st] || HOUSE.up)[h.v] || 'house-old', '', (h.rented ? 'rented house, ' : 'house, ') + ((HOUSE_SAYS[h.st] || HOUSE_SAYS.up)[h.v] || ''))}${h.g ? `<i class="rn-bn">${h.g}</i>` : ''}</span>`).join('');
    const a = row('a') + (gh ? Array.from({ length: gh.extra }, () => ghostHouse(1)).join('') : '');
    const bb = row('b') || (gh && gh.lane ? Array.from({ length: gh.lane }, () => ghostHouse(0)).join('') : '');
    return `<div class="rn-street${o.slate ? ' rn-plan' : ''}">
      ${o.slate ? `<div class="rn-gatepost">${o.slate}</div>` : ''}
      ${o.info ? `<p class="rn-street-info small">${esc(o.info)}</p>` : ''}
      ${gh && gh.tag ? `<p class="rn-planpin small">${streetImg('blueprint', 'rn-bpmini')} Blueprint: ${esc(gh.tag)}</p>` : ''}
      <div class="rn-lanes">${bb ? `<div class="rn-lane b${gh && !row('b') ? ' ghosted' : ''}"><span class="rn-lab small">New street</span>${bb}</div>` : ''}
        <div class="rn-lane">${sprite('gate', 'rn-gatesp', 'the gate: the load balancer')}${a || sprite('lot-rented', '', 'an empty lot')}</div></div>
      <div class="rn-road">${o.folk || ''}</div></div>`;
  }
  // The residents this tick, walking up the road to the gate: who got in, who got soot, who was turned away.
  function residents(tick) {
    const sooty = Math.min(tick.soot || 0, 12), ok = Math.min(Math.max(0, (tick.served || 0) - (tick.soot || 0)), 12 - sooty), turned = Math.min(tick.turned || 0, 8);
    if (!sooty && !ok && !turned) return '<p class="small rn-empty">Nobody on the road this tick.</p>';
    const walk = (n, i) => ` style="animation-delay:${-(i * 0.13).toFixed(2)}s"`;
    return `<div class="rn-folk" aria-label="${tick.served || 0} got in, ${tick.soot || 0} with soot, ${tick.turned || 0} turned away">${Array.from({ length: ok }, (_, i) => `<span class="rn-walk"${walk(0, i)}>${sprite('resident')}</span>`).join('')}${Array.from({ length: sooty }, (_, i) => `<span class="rn-walk"${walk(0, i + ok)}>${sprite('resident-soot')}</span>`).join('')}${Array.from({ length: turned }, () => `<span class="rn-turn">${sprite('resident', 'rn-out')}<b>✗</b></span>`).join('')}</div>`;
  }
  function bridgeRow(w, soot, o) {
    o = o || {};
    const pct = Math.round(w * 100);
    return `<div class="rn-bridgebox">${sprite('bridge', 'rn-bridgesp', 'the bridge to the shrine, its signpost with two arms')}${o.alarm ? sprite('bell', 'rn-bell' + (o.rang ? ' rang' : ''), o.rang ? 'the alarm bell, ringing' : 'the alarm bell') : ''}</div>
      ${o.ghost ? `<p class="rn-planpin small">${streetImg('blueprint', 'rn-bpmini')} Blueprint: the first swing of the signpost</p>` : ''}
      <div class="rn-bridge${o.ghost ? ' rn-ghost' : ''}" aria-label="${pct}% of walkers on the new version"><span class="rn-arm old" style="flex:${100 - pct || 0.001}">old ${100 - pct}%</span><span class="rn-arm new" style="flex:${pct || 0.001}">${pct ? 'new ' + pct + '%' : ''}</span></div>${soot ? `<p class="small rn-sootline">${Array.from({ length: Math.min(soot, 10) }, () => sprite('resident-soot', 'rn-mini')).join('')} ${plural(soot, 'walker')} hit the crack</p>` : ''}`;
  }
  const RES_SP = { ec2: 'house-old', rds: 'well', ddb: 'ledger', s3: 'board' };
  function stackRow(job) {
    return `<div class="rn-stack">${job.stack.map(r => `<span class="rn-res1">${sprite(RES_SP[r.type], '', r.name)}<span class="small">${esc(r.name)}</span></span>`).join('')}</div>`;
  }

  // ---- Running a plan: Seymour's two runs, side by side, playing out on their own ----
  function run(s, job) {
    const j = s.jobs[s.at], p = Object.assign({}, planOf(s, job));
    const res = R.inspect(job, p);
    if (res.refused) { j.refused = res.refused; j.teachRef = teachLines(s, ['refused']); save(s); return planScreen(s); }
    j.plans.push({ plan: p, pass: res.pass, lines: res.lines.map(l => l.ok) });
    keep().last[job.d] = p;
    j.pass = res.pass;
    save(s);
    showRun(s, job, res);
  }
  function events(job, res, plan) {
    const ev = [], g = res.good, b = res.bad;
    if (job.d === 'eb') {
      if (g.turned + b.turned) ev.push('turned');
      if (b.soot) ev.push('soot');
      if (Math.max(g.lumber, b.lumber)) ev.push('rented');
      if (plan.policy === 'blueGreen') ev.push('straggler');
      else if (job.street.demand && g.mixed) ev.push('mixed');
    }
    if (job.d === 'lam') { if (b.caughtBy === 'alarm') ev.push('alarm'); if (b.caughtBy === 'pre') ev.push('pre'); if (b.recover === Infinity) ev.push('stuck'); if (b.soot) ev.push('soot'); }
    return ev;
  }
  function showRun(s, job, res) {
    if (job.d === 'eb' && SD.renoStreet) return showStreetRun(s, job, res);
    if (job.d === 'cfn' && SD.renoStreet) return showYardRun(s, job, res);
    if (job.d === 'lam' && SD.renoStreet) return showBridgeRun(s, job, res);
    const j = s.jobs[s.at], left = R.PLANS - j.plans.length;
    const pass = res.pass, last = left <= 0;
    const ev = events(job, res, j.plans[j.plans.length - 1].plan);
    const runBox = (label, r, which) => `<div class="rn-run" data-run="${which}"><p class="rn-runh"><b>${esc(label)}</b> <span class="small rn-tick"></span></p><div class="rn-view"></div><p class="small rn-sum"></p></div>`;
    const verdict = pass ? '🏛 SEYMOUR SIGNS' : last ? '🚧 NOT SIGNED' : '✗ NOT YET';
    const b = panel(`<div class="rn-top">${head('seymour')}<div><p class="rn-title">${esc(job.title)}</p><p class="small">Plan ${j.plans.length} of ${R.PLANS} · ${esc(planName(job, j.plans[j.plans.length - 1].plan))}</p></div></div>
      <div class="rn-runs">${job.d === 'cfn' ? runBox('The teardown', res.good, 'g') : runBox('Run 1: a sound release', res.good, 'g') + runBox('Run 2: the cracked beam', res.bad, 'b')}</div>
      <div class="rn-after" hidden>
        <div class="verdict-row"><div class="verdict ${pass ? 'ok' : 'bad'}">${verdict}</div></div>
        ${slateHtml(job, res)}
        ${teachLines(s, ev)}
        ${pass ? say('seymour', DR.SEYMOUR.clean) : last ? say('seymour', 'Three plans, none signed. The scaffolding goes up anyway, and the permit question still gets asked.') : say(job.client, CL(job.client).wrong || 'Not like that.')}
        <div class="rn-dock">${pass || last ? '<button class="primary" id="rn-deb">The permit question</button>' : '<button class="primary" id="rn-again">Change the plan</button><button class="ghost" id="rn-give">Take it to the permit as it is</button>'}</div>
      </div>
      <div class="rn-dock rn-skipd"><button class="ghost" id="rn-skip">Skip to the end of the runs</button></div>`, 'SEYMOUR\'S INSPECTION');
    const planNow = j.plans[j.plans.length - 1].plan;
    const runs = job.d === 'cfn' ? [['g', res.good]] : [['g', res.good], ['b', res.bad]];
    const n = Math.max.apply(null, runs.map(([, r]) => (r.ticks ? r.ticks.length : 1)));
    let t = 0, timer = null;
    const frame = k => runs.forEach(([which, r]) => {
      const box = b.querySelector(`[data-run="${which}"]`); if (!box) return;
      const view = box.querySelector('.rn-view'), tk = box.querySelector('.rn-tick'), sum = box.querySelector('.rn-sum');
      if (job.d === 'cfn') {
        view.innerHTML = `<ul class="rn-res">${r.res.map(x => `<li>${sprite(x.kept === 'snapshot' ? 'jar' : RES_SP[x.type], 'rn-mini2' + (x.kept ? '' : ' rn-gone'), '')}<span><b>${esc(nameIn(job, x.id))}</b> · ${esc(x.policy)}${x.dflt ? ' (default)' : ''}<br><span class="small">${x.kept === 'running' ? 'still standing, still costing lumber' : x.kept === 'snapshot' ? 'a snapshot in a jar, then deleted' : 'gone, and its data with it'}</span></span></li>`).join('')}</ul>`;
        sum.textContent = `${r.lumber} lumber a night afterwards`;
        return;
      }
      const i = Math.min(k, r.ticks.length - 1), tick = r.ticks[i];
      const upto = r.ticks.slice(0, i + 1);
      const turned = upto.reduce((a, x) => a + (x.turned || 0), 0), soot = upto.reduce((a, x) => a + (x.soot || 0), 0);
      tk.textContent = job.d === 'lam' ? `minute ${tick.t}` : `tick ${tick.t}`;
      if (job.d === 'eb') {
        view.innerHTML = `${streetRow(job, tick, { folk: residents(tick) })}<p class="small rn-gate">Gate: ${turned ? `<span class="rn-red">${'✗'.repeat(Math.min(turned, 24))}</span> ${turned} turned away` : 'nobody turned away'}${soot ? ` · <span class="rn-soot">${'●'.repeat(Math.min(soot, 24))}</span> ${soot} soot` : ''}</p>`;
      } else {
        view.innerHTML = '<div class="rn-street rn-river">' + bridgeRow(tick.w, soot, { alarm: !!planNow.alarm, rang: tick.note === 'rollback' }) + (tick.note === 'pre' ? '<p class="small">The test walker crosses first.</p>' : tick.note === 'post' ? '<p class="small">The post-traffic test walker checks it.</p>' : tick.note === 'rollback' ? '<p class="small"><b>The signpost swings back.</b></p>' : tick.note === 'stuck' ? '<p class="small">Nobody notices the crack.</p>' : '') + '</div>';
      }
      if (i === r.ticks.length - 1) sum.textContent = runSummary(job, r, which);
    });
    const finish = () => {
      if (timer) clearInterval(timer); timer = null;
      frame(n - 1);
      const a = b.querySelector('.rn-after'); if (a) a.hidden = false;
      const sk = b.querySelector('.rn-skipd'); if (sk) sk.remove();
      if (pass && U.burst) { const v = b.querySelector('.verdict'); if (v) U.burst(v); }
      wire();
    };
    function wire() {
      const deb = b.querySelector('#rn-deb'), again = b.querySelector('#rn-again'), give = b.querySelector('#rn-give');
      if (deb) deb.onclick = () => { s.phase = 'debrief'; j.done = true; save(s); draw(s); };
      if (again) again.onclick = () => { s.phase = 'plan'; save(s); draw(s); };
      if (give) give.onclick = () => { s.phase = 'debrief'; j.done = true; j.pass = false; save(s); draw(s); };
    }
    b.querySelector('#rn-skip').onclick = finish;
    frame(0);
    if (reduced() || n <= 1) return finish();
    timer = setInterval(() => { t++; if (t >= n) return finish(); frame(t); }, job.d === 'lam' ? 260 : 520);
    s.phase = 'plan'; save(s);
  }
  // Beanstalk Row's runs as a cutscene (storyboard 1, Nov 16): letterboxed and hands-off, run 1 (the sound release),
  // Seymour's "Again", run 2 (the cracked beam), the camera cutting in on whatever is changing; then the verdict as a
  // close-up of Kai and Seymour. Both runs' summaries sit under the scene, and fast-forward skips to the verdict.
  function showStreetRun(s, job, res) {
    const RS = SD.renoStreet, j = s.jobs[s.at], left = R.PLANS - j.plans.length;
    const pass = res.pass, last = left <= 0;
    const planNow = j.plans[j.plans.length - 1].plan;
    const ev = events(job, res, planNow);
    const verdict = pass ? '🏛 SEYMOUR SIGNS' : last ? '🚧 NOT SIGNED' : '✗ NOT YET';
    const seyLine = pass ? DR.SEYMOUR.clean : last ? 'Three plans, none signed. The scaffolding goes up anyway, and the permit question still gets asked.' : 'Not like that. Look at the slate.';
    const runRow = (label, which) => `<div class="rn-run" data-run="${which}"><p class="rn-runh"><b>${esc(label)}</b> <span class="small rn-tick"></span></p><p class="small rn-sum"></p></div>`;
    const b = panel(`<div class="rn-top">${head('seymour')}<div><p class="rn-title">${esc(job.title)}</p><p class="small">Plan ${j.plans.length} of ${R.PLANS} · ${esc(planName(job, planNow))}</p></div></div>
      <div class="rn-bleed rn-cut">${RS.scene({ tick: res.good.ticks[0], seymour: 'proud', kai: 'neutral', shot: 'wide', label: 'Seymour\'s first run, a sound release, playing out on the street',
        ui: `<div class="rs-row"><span class="rs-chip rs-runlab">Run 1: a sound release</span><span class="rs-chip rs-gate ok">Nobody turned away</span></div><div class="rs-row rs-mid"></div><div class="rs-bar"><b class="rs-tk">tick 1</b><span class="rs-ticks"></span></div>` })}</div>
      <div class="rn-runs rn-runrows">${runRow('Run 1: a sound release', 'g')}${runRow('Run 2: the cracked beam', 'b')}</div>
      <div class="rn-bleed rn-verdict" hidden>${RS.scene({ shot: 'close', kai: pass ? 'happy' : 'worried', close: pass ? 'approve' : 'disapprove', tick: res.good.ticks[res.good.ticks.length - 1],
          label: pass ? 'Seymour gives a thumbs-up; Kai grins' : 'Seymour holds up a gauntlet: stop. Kai looks worried',
          ui: `<div class="rs-row"><span></span><p class="rs-say"><b>Seymour:</b> ${esc(seyLine)}</p></div><div></div>` })}</div>
      <div class="rn-after" hidden>
        <div class="verdict-row"><div class="verdict ${pass ? 'ok' : 'bad'}">${verdict}</div></div>
        ${slateHtml(job, res)}
        ${teachLines(s, ev)}
        ${pass ? '' : last ? '' : say(job.client, CL(job.client).wrong || 'Not like that.')}
        <div class="rn-dock">${pass || last ? '<button class="primary" id="rn-deb">The permit question</button>' : '<button class="primary" id="rn-again">Change the plan</button><button class="ghost" id="rn-give">Take it to the permit as it is</button>'}</div>
      </div>
      <div class="rn-dock rn-skipd"><button class="ghost" id="rn-skip">▶▶ Skip to the verdict</button></div>`, 'SEYMOUR\'S INSPECTION');
    const el = b.querySelector('.rn-cut .rs');
    el.classList.add('rs-run');
    const rnBox = b.querySelector('.rn'); if (rnBox) rnBox.classList.add('rn-playing');
    RS.mount(b);
    const kai = () => el.querySelector('.rs-kai');
    const ui = sel => el.querySelector(sel);
    const runs = [['g', res.good], ['b', res.bad]];
    let said = {};
    const kaiSays = (key, line, face) => {
      if (said[key]) return; said[key] = 1;
      const mid = ui('.rs-mid'); if (mid) mid.innerHTML = `<p class="rs-say"><b>Kai:</b> ${esc(line)}</p>`;
      const k = kai(); if (k && k.rsFace) { if (face) k.rsFace(face); if (k.rsTalk) k.rsTalk(1600); }
    };
    // The camera: in on the first house being worked on or breaking, else the wide street.
    const focusOf = tick => {
      const h = tick.houses.find(x => x.st === 'dark') || tick.houses.find(x => x.st === 'scaf') || tick.houses.find(x => x.rented);
      return h ? RS.slotOf(h) : null;
    };
    const show = (which, r, i) => {
      const tick = r.ticks[Math.min(i, r.ticks.length - 1)], upto = r.ticks.slice(0, i + 1);
      const turned = upto.reduce((a, x) => a + (x.turned || 0), 0), soot = upto.reduce((a, x) => a + (x.soot || 0), 0);
      RS.update(el, { tick, bad: which === 'b', seymour: which === 'b' ? 'inspect' : 'proud', turned });
      const f = focusOf(tick);
      RS.cut(el, f == null ? 'wide' : 'push', f);
      ui('.rs-tk').textContent = `tick ${tick.t}`;
      ui('.rs-ticks').innerHTML = r.ticks.map((x, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('');
      const g = ui('.rs-gate');
      g.className = 'rs-chip rs-gate ' + (turned ? 'bad' : 'ok');
      g.textContent = (turned ? `✗ ${turned} turned away` : 'Nobody turned away') + (soot ? ` · ${soot} soot` : '');
      if (turned) kaiSays('turned', 'Someone got turned away at the gate!', 'worried');
      if (soot) kaiSays('soot', 'That new one is cracked!', 'worried');
      const row = b.querySelector(`[data-run="${which}"]`);
      row.querySelector('.rn-tick').textContent = `tick ${tick.t}`;
      if (i >= r.ticks.length - 1) row.querySelector('.rn-sum').textContent = runSummary(job, r, which);
    };
    let timer = null, phase = 0, t = 0, ended = false;
    const finish = () => {
      if (ended) return; ended = true;
      if (timer) clearTimeout(timer); timer = null;
      runs.forEach(([w, r]) => { const row = b.querySelector(`[data-run="${w}"]`); row.querySelector('.rn-tick').textContent = `tick ${r.ticks[r.ticks.length - 1].t}`; row.querySelector('.rn-sum').textContent = runSummary(job, r, w); });
      show('b', res.bad, res.bad.ticks.length - 1);
      const a = b.querySelector('.rn-after'); if (a) a.hidden = false;
      const vd = b.querySelector('.rn-verdict'); if (vd) vd.hidden = false;
      if (rnBox) rnBox.classList.remove('rn-playing');
      const cutBox = b.querySelector('.rn-cut'); if (cutBox) cutBox.hidden = true;
      const sk = b.querySelector('.rn-skipd'); if (sk) sk.remove();
      RS.mount(vd);
      if (pass && U.burst) { const v = b.querySelector('.verdict'); if (v) U.burst(v); }
      const deb = b.querySelector('#rn-deb'), again = b.querySelector('#rn-again'), give = b.querySelector('#rn-give');
      if (deb) deb.onclick = () => { s.phase = 'debrief'; j.done = true; save(s); draw(s); };
      if (again) again.onclick = () => { s.phase = 'plan'; save(s); draw(s); };
      if (give) give.onclick = () => { s.phase = 'debrief'; j.done = true; j.pass = false; save(s); draw(s); };
    };
    const step = () => {
      if (ended) return;
      const [which, r] = runs[phase];
      show(which, r, t);
      t++;
      if (t < r.ticks.length) { timer = setTimeout(step, 620); return; }
      if (phase === 0) {
        // Seymour's line between the runs: the same plan again, with a bad release.
        phase = 1; t = 0;
        timer = setTimeout(() => {
          if (ended) return;
          RS.update(el, { tick: res.bad.ticks[0], seymour: 'inspect' }); RS.cut(el, 'wide');
          ui('.rs-runlab').textContent = 'Run 2: the cracked beam';
          // Run 2 starts clean: run 1's count and ticks don't carry over into the second run's opening shot.
          const g = ui('.rs-gate'); g.className = 'rs-chip rs-gate ok'; g.textContent = 'Nobody turned away';
          ui('.rs-tk').textContent = `tick ${res.bad.ticks[0].t}`;
          ui('.rs-ticks').innerHTML = res.bad.ticks.map((x, k) => `<i class="${k ? '' : 'on'}"></i>`).join('');
          ui('.rs-mid').innerHTML = '<p class="rs-say"><b>Seymour:</b> Again. This time the beam is cracked.</p>';
          said = {};
          timer = setTimeout(step, 1700);
        }, 900);
        return;
      }
      timer = setTimeout(finish, 900);
    };
    b.querySelector('#rn-skip').onclick = finish;
    s.phase = 'plan'; save(s);
    if (reduced()) return finish();
    step();
  }
  // The Blueprint Office's teardown as a cutscene: the camera goes resource by resource, each one becomes rubble, a jar,
  // or stays standing with its seal; then Seymour's verdict, as on Beanstalk Row.
  function showYardRun(s, job, res) {
    const RS = SD.renoStreet, j = s.jobs[s.at], left = R.PLANS - j.plans.length;
    const pass = res.pass, last = left <= 0, planNow = j.plans[j.plans.length - 1].plan, g = res.good;
    const verdict = pass ? '🏛 SEYMOUR SIGNS' : last ? '🚧 NOT SIGNED' : '✗ NOT YET';
    const seyLine = pass ? DR.SEYMOUR.clean : last ? 'Three plans, none signed. The scaffolding goes up anyway, and the permit question still gets asked.' : 'Not like that. Look at the slate.';
    const b = panel(`<div class="rn-top">${head('seymour')}<div><p class="rn-title">${esc(job.title)}</p><p class="small">Plan ${j.plans.length} of ${R.PLANS} · ${esc(planName(job, planNow))}</p></div></div>
      <div class="rn-bleed rn-cut">${RS.scene({ stack: job.stack, plan: planNow, res: g.res, upto: 0, seymour: 'inspect', kai: 'neutral', shot: 'wide', label: 'The teardown playing out in the Office yard',
        ui: `<div class="rs-row"><span class="rs-chip">The teardown</span><span class="rs-chip rs-lumber">0 lumber a night afterwards</span></div><div class="rs-row rs-mid"></div><div></div>` })}</div>
      <div class="rn-runs rn-runrows"><div class="rn-run" data-run="g"><p class="rn-runh"><b>The teardown</b></p><p class="small rn-sum"></p></div></div>
      <div class="rn-bleed rn-verdict" hidden>${RS.scene({ shot: 'close', kai: pass ? 'happy' : 'worried', close: pass ? 'approve' : 'disapprove', stack: job.stack, plan: planNow, res: g.res,
        label: pass ? 'Seymour gives a thumbs-up; Kai grins' : 'Seymour holds up a gauntlet: stop. Kai looks worried',
        ui: `<div class="rs-row"><span></span><p class="rs-say"><b>Seymour:</b> ${esc(seyLine)}</p></div><div></div>` })}</div>
      <div class="rn-after" hidden>
        <div class="verdict-row"><div class="verdict ${pass ? 'ok' : 'bad'}">${verdict}</div></div>
        ${slateHtml(job, res)}
        <ul class="rn-res">${g.res.map(x => `<li><span><b>${esc(nameIn(job, x.id))}</b> · ${esc(x.policy)}${x.dflt ? ' (default)' : ''}<br><span class="small">${x.kept === 'running' ? 'still standing, still costing lumber' : x.kept === 'snapshot' ? 'a snapshot in a jar, then deleted' : 'gone, and its data with it'}</span></span></li>`).join('')}</ul>
        ${pass || last ? '' : say(job.client, CL(job.client).wrong || 'Not like that.')}
        <div class="rn-dock">${pass || last ? '<button class="primary" id="rn-deb">The permit question</button>' : '<button class="primary" id="rn-again">Change the plan</button><button class="ghost" id="rn-give">Take it to the permit as it is</button>'}</div>
      </div>
      <div class="rn-dock rn-skipd"><button class="ghost" id="rn-skip">▶▶ Skip to the verdict</button></div>`, 'SEYMOUR\'S INSPECTION');
    const el = b.querySelector('.rn-cut .rs'), rnBox = b.querySelector('.rn');
    el.classList.add('rs-run'); if (rnBox) rnBox.classList.add('rn-playing');
    RS.mount(b);
    let i = 0, timer = null, ended = false;
    const show = k => {
      RS.update(el, { stack: job.stack, plan: planNow, res: g.res, upto: k, seymour: 'inspect' });
      if (k > 0 && k <= job.stack.length) RS.cut(el, 'push', k - 1); else RS.cut(el, 'wide');
      const lum = g.res.slice(0, k).reduce((a, x) => a + x.cost, 0);
      el.querySelector('.rs-lumber').textContent = `${lum} lumber a night afterwards`;
      const x = g.res[k - 1];
      if (x) el.querySelector('.rs-mid').innerHTML = `<p class="rs-say"><b>${esc(nameIn(job, x.id))}:</b> ${esc(x.policy)}. ${x.kept === 'running' ? 'Still standing, still costing.' : x.kept === 'snapshot' ? 'Into the jar, then down it comes.' : 'Gone, and everything in it.'}</p>`;
    };
    const finish = () => {
      if (ended) return; ended = true; if (timer) clearTimeout(timer);
      b.querySelector('[data-run="g"] .rn-sum').textContent = `${g.lumber} lumber a night afterwards`;
      const vd = b.querySelector('.rn-verdict'); vd.hidden = false; b.querySelector('.rn-after').hidden = false; b.querySelector('.rn-cut').hidden = true;
      if (rnBox) rnBox.classList.remove('rn-playing');
      const sk = b.querySelector('.rn-skipd'); if (sk) sk.remove();
      RS.mount(vd);
      if (pass && U.burst) { const v = b.querySelector('.verdict'); if (v) U.burst(v); }
      const deb = b.querySelector('#rn-deb'), again = b.querySelector('#rn-again'), give = b.querySelector('#rn-give');
      if (deb) deb.onclick = () => { s.phase = 'debrief'; j.done = true; save(s); draw(s); };
      if (again) again.onclick = () => { s.phase = 'plan'; save(s); draw(s); };
      if (give) give.onclick = () => { s.phase = 'debrief'; j.done = true; j.pass = false; save(s); draw(s); };
    };
    const step = () => { if (ended) return; i++; show(i); timer = setTimeout(i < job.stack.length ? step : finish, i < job.stack.length ? 1300 : 1600); };
    b.querySelector('#rn-skip').onclick = finish;
    s.phase = 'plan'; save(s);
    if (reduced()) return finish();
    timer = setTimeout(step, 900);
  }
  // The Shrine Bridge's runs as a cutscene, like Beanstalk Row's: run 1 (a sound release), Seymour's "Again", run 2 (the
  // cracked one). The camera cuts in on the new shrine when walkers meet the crack, on the bell when it rings, and on
  // the test walker when a hook runs; then the verdict close-up.
  function showBridgeRun(s, job, res) {
    const RS = SD.renoStreet, j = s.jobs[s.at], left = R.PLANS - j.plans.length;
    const pass = res.pass, last = left <= 0, planNow = j.plans[j.plans.length - 1].plan;
    const ev = events(job, res, planNow);
    const verdict = pass ? '🏛 SEYMOUR SIGNS' : last ? '🚧 NOT SIGNED' : '✗ NOT YET';
    const seyLine = pass ? DR.SEYMOUR.clean : last ? 'Three plans, none signed. The scaffolding goes up anyway, and the permit question still gets asked.' : 'Not like that. Look at the slate.';
    const crackName = !job.crack ? 'the same sound release' : job.crack === 'test' ? 'a crack a test can find' : 'a crack only a crowd finds';
    const runRow = (label, which) => `<div class="rn-run" data-run="${which}"><p class="rn-runh"><b>${esc(label)}</b> <span class="small rn-tick"></span></p><p class="small rn-sum"></p></div>`;
    const base = { bridge: true, demand: job.fn.demand, first: job.fn.first, alarm: !!planNow.alarm, pre: !!planNow.pre, post: !!planNow.post };
    const at = (r, i, bad) => {
      const tick = r.ticks[Math.min(i, r.ticks.length - 1)], upto = r.ticks.slice(0, i + 1);
      const soot = upto.reduce((a, x) => a + (x.soot || 0), 0);
      const caughtNow = bad && i >= r.ticks.length - 1 && (r.caughtBy === 'pre' || r.caughtBy === 'post');
      return { tick, soot, o: Object.assign({}, base, { w: tick.w, soot: tick.soot, note: tick.note, rang: tick.note === 'rollback', cracked: bad && (soot > 0 || caughtNow) }) };
    };
    const g0 = res.good.ticks.length ? at(res.good, 0, false).o : base;
    // The verdict's signpost stays where the run that decided it left it (a pass: the sound run's end), not back at 0%.
    const endRun = pass ? res.good : res.bad, endW = endRun.ticks.length ? endRun.ticks[endRun.ticks.length - 1].w || 0 : 0;
    const b = panel(`<div class="rn-top">${head('seymour')}<div><p class="rn-title">${esc(job.title)}</p><p class="small">Plan ${j.plans.length} of ${R.PLANS} · ${esc(planName(job, planNow))}</p></div></div>
      <div class="rn-bleed rn-cut">${RS.scene(Object.assign({}, g0, { seymour: 'proud', kai: 'neutral', shot: 'wide', label: 'Seymour\'s first run, a sound release, playing out at the Shrine Bridge',
        ui: `<div class="rs-row"><span class="rs-chip rs-runlab">Run 1: a sound release</span><span class="rs-chip rs-gate ok">Nobody has soot</span></div><div class="rs-row rs-mid"></div><div class="rs-bar"><b class="rs-tk">minute 1</b><span class="rs-ticks"></span></div>` }))}</div>
      <div class="rn-runs rn-runrows">${runRow('Run 1: a sound release', 'g')}${runRow('Run 2: ' + crackName, 'b')}</div>
      <div class="rn-bleed rn-verdict" hidden>${RS.scene(Object.assign({}, base, { w: endW, shot: 'close', kai: pass ? 'happy' : 'worried', close: pass ? 'approve' : 'disapprove',
          label: pass ? 'Seymour gives a thumbs-up; Kai grins' : 'Seymour holds up a gauntlet: stop. Kai looks worried',
          ui: `<div class="rs-row"><span></span><p class="rs-say"><b>Seymour:</b> ${esc(seyLine)}</p></div><div></div>` }))}</div>
      <div class="rn-after" hidden>
        <div class="verdict-row"><div class="verdict ${pass ? 'ok' : 'bad'}">${verdict}</div></div>
        ${slateHtml(job, res)}
        ${teachLines(s, ev)}
        ${pass || last ? '' : say(job.client, CL(job.client).wrong || 'Not like that.')}
        <div class="rn-dock">${pass || last ? '<button class="primary" id="rn-deb">The permit question</button>' : '<button class="primary" id="rn-again">Change the plan</button><button class="ghost" id="rn-give">Take it to the permit as it is</button>'}</div>
      </div>
      <div class="rn-dock rn-skipd"><button class="ghost" id="rn-skip">▶▶ Skip to the verdict</button></div>`, 'SEYMOUR\'S INSPECTION');
    const el = b.querySelector('.rn-cut .rs'), rnBox = b.querySelector('.rn');
    el.classList.add('rs-run'); if (rnBox) rnBox.classList.add('rn-playing');
    RS.mount(b);
    const ui = sel => el.querySelector(sel), kai = () => el.querySelector('.rs-kai');
    const runs = [['g', res.good], ['b', res.bad]];
    let said = {};
    const kaiSays = (key, line, face) => {
      if (said[key]) return; said[key] = 1;
      const mid = ui('.rs-mid'); if (mid) mid.innerHTML = `<p class="rs-say"><b>Kai:</b> ${esc(line)}</p>`;
      const k = kai(); if (k && k.rsFace) { if (face) k.rsFace(face); if (k.rsTalk) k.rsTalk(1600); }
    };
    const show = (which, r, i) => {
      const x = at(r, i, which === 'b'), tick = x.tick;
      RS.update(el, Object.assign({}, x.o, { seymour: which === 'b' ? 'inspect' : 'proud' }));
      const n = tick.note;
      RS.cut(el, n === 'rollback' ? 'push' : (n === 'pre' || n === 'post') ? 'push' : tick.soot ? 'push' : 'wide', n === 'rollback' ? 'sign' : tick.soot || n === 'pre' || n === 'post' ? 'new' : null);
      ui('.rs-tk').textContent = `minute ${tick.t}`;
      ui('.rs-ticks').innerHTML = r.ticks.map((y, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('');
      const g = ui('.rs-gate');
      g.className = 'rs-chip rs-gate ' + (x.soot ? 'bad' : 'ok');
      g.textContent = (x.soot ? `${x.soot} with soot` : 'Nobody has soot') + ` · new ${Math.round((tick.w || 0) * 100)}%`;
      if (n === 'pre') kaiSays('pre', 'The little test walker goes first!', null);
      if (n === 'post') kaiSays('post', 'The test walker is checking it after the switch.', null);
      if (tick.soot) kaiSays('soot', 'They came back covered in soot!', 'worried');
      if (n === 'rollback') kaiSays('back', 'The bell! The signpost swung back on its own.', 'happy');
      if (which === 'b' && i >= r.ticks.length - 1 && r.caughtBy === 'pre') kaiSays('caught', 'The test walker found the crack. Nobody else went near it.', 'happy');
      if (n === 'stuck') kaiSays('stuck', 'Nobody is stopping it. Everyone is walking into the crack.', 'worried');
      const row = b.querySelector(`[data-run="${which}"]`);
      row.querySelector('.rn-tick').textContent = `minute ${tick.t}`;
      if (i >= r.ticks.length - 1) row.querySelector('.rn-sum').textContent = runSummary(job, r, which);
    };
    let timer = null, phase = 0, t = 0, ended = false;
    const finish = () => {
      if (ended) return; ended = true;
      if (timer) clearTimeout(timer); timer = null;
      runs.forEach(([w, r]) => { const row = b.querySelector(`[data-run="${w}"]`); if (r.ticks.length) row.querySelector('.rn-tick').textContent = `minute ${r.ticks[r.ticks.length - 1].t}`; row.querySelector('.rn-sum').textContent = runSummary(job, r, w); });
      const vd = b.querySelector('.rn-verdict'); vd.hidden = false; b.querySelector('.rn-after').hidden = false; b.querySelector('.rn-cut').hidden = true;
      if (rnBox) rnBox.classList.remove('rn-playing');
      const sk = b.querySelector('.rn-skipd'); if (sk) sk.remove();
      RS.mount(vd);
      if (pass && U.burst) { const v = b.querySelector('.verdict'); if (v) U.burst(v); }
      const deb = b.querySelector('#rn-deb'), again = b.querySelector('#rn-again'), give = b.querySelector('#rn-give');
      if (deb) deb.onclick = () => { s.phase = 'debrief'; j.done = true; save(s); draw(s); };
      if (again) again.onclick = () => { s.phase = 'plan'; save(s); draw(s); };
      if (give) give.onclick = () => { s.phase = 'debrief'; j.done = true; j.pass = false; save(s); draw(s); };
    };
    const step = () => {
      if (ended) return;
      const [which, r] = runs[phase];
      if (r.ticks.length) show(which, r, t);
      t++;
      // Hold on the moments that teach: the test walker, the first soot, the bell.
      const was = r.ticks[t - 1], hold = was && (was.soot || was.note === 'pre' || was.note === 'post' || was.note === 'rollback') ? 1700 : 950;
      if (t < r.ticks.length) { timer = setTimeout(step, hold); return; }
      if (phase === 0) {
        phase = 1; t = 0;
        timer = setTimeout(() => {
          if (ended) return;
          RS.update(el, Object.assign({}, base, { w: 0, seymour: 'inspect' })); RS.cut(el, 'wide');
          ui('.rs-runlab').textContent = 'Run 2: ' + crackName;
          const g = ui('.rs-gate'); g.className = 'rs-chip rs-gate ok'; g.textContent = 'Nobody has soot · new 0%';
          ui('.rs-tk').textContent = 'minute 0';
          ui('.rs-ticks').innerHTML = res.bad.ticks.map(() => '<i></i>').join('');
          ui('.rs-mid').innerHTML = `<p class="rs-say"><b>Seymour:</b> ${job.crack ? `Again. This time the new shrine has ${esc(crackName)}.` : 'Again. I check everything twice.'}</p>`;
          said = {};
          timer = setTimeout(step, 1700);
        }, 900);
        return;
      }
      timer = setTimeout(finish, 1900);
    };
    b.querySelector('#rn-skip').onclick = finish;
    s.phase = 'plan'; save(s);
    if (reduced()) return finish();
    step();
  }
  const nameIn = (job, id) => { const r = job.stack.find(x => x.id === id); return r ? r.name : id; };
  function planName(job, p) {
    if (job.d === 'eb') return AD.EB_NAME[p.policy] + (p.policy === 'rolling' || p.policy === 'rollingBatch' ? `, batch ${p.batch}${p.ignoreHC ? ', ignoring health checks' : ''}` : p.policy === 'split' ? `, ${p.split}% for ${p.evalT} ticks` : p.policy === 'blueGreen' ? (p.wait ? ', old street kept 2 ticks' : ', old street torn down at once') : '');
    if (job.d === 'lam') return [AD.cfgName(p), p.alarm && 'alarm', p.pre && 'pre-traffic hook', p.post && 'post-traffic hook'].filter(Boolean).join(' + ');
    return job.stack.map(r => `${r.name}: ${p[r.id]}`).join(', ');
  }
  function runSummary(job, r, which) {
    if (job.d === 'eb') {
      const parts = [`${r.turned} turned away`];
      if (which === 'b') parts.push(`${r.soot} soot`, r.recover === Infinity ? 'never back' : `back on the old version after ${r.recover}`);
      else parts.push(`done at tick ${r.finish === Infinity ? '—' : r.finish}`);
      parts.push(`${r.lumber} rented`);
      return parts.join(' · ');
    }
    if (which === 'b') return `${r.soot} hit the crack · ${r.caughtBy ? `caught by the ${r.caughtBy === 'pre' ? 'pre-traffic hook' : r.caughtBy === 'post' ? 'post-traffic hook' : 'alarm'}` : 'nobody caught it'}`;
    return `everyone on the new version at minute ${r.finish}`;
  }

  // ---- The debrief: the permit question ----
  const RE = {
    eb: /Elastic Beanstalk|Beanstalk/i,
    lam: /CodeDeploy|canary|Linear10|AllAtOnce|traffic shift|weighted alias|alias routing|BeforeAllowTraffic|AfterAllowTraffic|DeploymentPreference|AutoPublishAlias/i,
    cfn: /DeletionPolicy|UpdateReplacePolicy|change set|CloudFormation stack|stack is deleted|delete the stack/i
  };
  const isMulti = q => q && q.type === 'multi' && Array.isArray(q.items);
  const qText = q => [q.q].concat(q.opts || [], (q.items || []).map(i => i.t)).join(' ');
  function debriefQuestion(s, d) {
    const used = new Set((s.debriefs || []).map(x => x.q));
    while (s.carry && s.carry.length) {
      const id = s.carry.shift(), q = E().find(id);
      keep().carry = s.carry.slice();
      if (q && E().allowed(q) && !used.has(q.id)) return q;
    }
    const match = q => RE[d].test(qText(q));
    const avoid = Array.from(used);
    let r = M.pick({ match, n: 1, verifiedOnly: true, mix: 0, avoid, filter: isMulti });
    if (!r.items.length) r = M.pick({ match, n: 1, verifiedOnly: true, mix: 0, avoid });
    return r.items[0] ? E().find(r.items[0].q) : null;
  }
  function verifiedTwin(q, avoid) {
    return ((SD.twins && SD.twins[q.id]) || []).map(id => E().find(id)).find(x => x && E().allowed(x) && D() && D().isVerified(x) && !avoid.has(x.id)) || null;
  }
  // The permit office (Ladi's Sogni painting, Nov 17): one close-up for every district. Seymour stands at his desk with
  // his magnifier while you answer; a right answer gets his stamp, a wrong one his disapproval. Kai waits on the left.
  const PERMIT_X = 1120;   // a narrow screen centres on the desk's corner, so the desk side stays in view
  const permitScene = (pose, face, ui) => SD.renoStreet.scene({ shot: 'close', bg: 'permit-office', focus: PERMIT_X, close: pose, kai: face, ui,
    label: 'The permit office: Sir Seymour Backups at his desk, Kai waiting for the verdict' });
  const PERMIT_ASK = 'Before I sign anything: one question on what you just did. Say how sure you are. I will be checking.';
  function debriefScreen(s) {
    const job = jobOf(s, s.at), j = s.jobs[s.at], RS = SD.renoStreet;
    const b = panel(`<div class="rn-top">${head('seymour')}<div><p class="rn-title">The permit</p><p class="small">${esc(job.title)} · ${j.pass ? 'the plan held twice' : 'the plan didn\'t hold'}</p></div></div>
      ${RS ? `<div class="rn-bleed">${permitScene('inspect', 'neutral', `<div class="rs-row"><span></span><p class="rs-say"><b>Seymour:</b> ${esc(PERMIT_ASK)}</p></div><div></div>`)}</div>` : say('seymour', PERMIT_ASK)}
      <div class="rn-dock"><button class="primary" id="rn-ask">Answer the permit question</button></div>`, 'THE PERMIT');
    if (RS) RS.mount(b);
    b.querySelector('#rn-ask').onclick = async () => {
      const q = debriefQuestion(s, job.d);
      if (!q) { settle(s, job, null, null); return; }
      const off = permitStage();
      let r;
      try { r = await M.ask(q, { tally: s.tally, title: 'THE PERMIT' }); } finally { off(); }
      if (r.closed || r.stopped || r.skipped) { save(s); draw(s); return; }
      if (!r.ok && r.conf < 2) M.sureMiss(q.id);       // every miss goes up, as the Draft always did
      s.debriefs.push({ q: q.id, ok: !!r.ok, conf: r.conf, pts: r.pts || 0, job: job.id, d: job.d });
      if (!r.ok) {
        const tw = verifiedTwin(q, new Set(s.debriefs.map(x => x.q)));
        keep().carry = (keep().carry || []).concat([tw ? tw.id : q.id]).slice(-3);
      }
      settle(s, job, q, r);
    };
  }
  // The question itself is js/quiz.js's exam screen, untouched (through SD.modes.ask): while it's up, the permit office
  // stands behind its window, which floats over the scene like the plan's boxes. Once the verdict shows, Seymour
  // stamps (right) or disapproves (wrong), and Kai is happy or worried. Nothing here knows the answer before the verdict.
  function permitStage() {
    const RS = SD.renoStreet, p = document.querySelector('#panel');
    if (!RS || !RS.pose || !p || !window.MutationObserver) return () => {};
    const box = document.createElement('div');
    box.className = 'rn-pq';
    box.innerHTML = permitScene('inspect', 'neutral', '');
    const el = box.firstElementChild;
    let beat = '', live = true;
    const put = () => {
      if (!live) return;
      const win = p.hidden ? null : p.querySelector(':scope > .win.quiz');
      if (!win) return;
      if (box.parentNode !== win) { win.classList.add('rn-pqwin'); win.prepend(box); RS.mount(box); RS.frame(el); }
      const v = win.querySelector(':scope > .win-b > .verdict-row > .verdict');
      const now = v ? (v.classList.contains('ok') ? 'ok' : 'bad') : 'q';
      if (now !== beat) { beat = now; RS.pose(el, now === 'ok' ? 'stamp' : now === 'bad' ? 'disapprove' : 'inspect', now === 'ok' ? 'happy' : now === 'bad' ? 'worried' : 'neutral'); }
    };
    const obs = new MutationObserver(put);
    obs.observe(p, { childList: true, subtree: true });
    put();
    return () => { live = false; obs.disconnect(); box.remove(); };
  }
  // The permit question's window over the office: no frame, the scene fills the stage under the top bar, and the
  // question, options and feedback are blueprint boxes floating in a column between Kai and Seymour (on a phone, under
  // the scene's top, scrolling up over it).
  {
    const PQ = 'body.in-mode #panel:has(> .win.rn-pqwin)', WIN = 'body.in-mode #panel > .win.quiz.rn-pqwin';
    const pqCss = document.createElement('style');
    pqCss.id = 'reno-permit-css';
    pqCss.textContent = `
      ${PQ} { padding: calc(56px + env(safe-area-inset-top, 0px)) 0 0; align-items: stretch; }
      ${WIN} { width: 100%; max-width: none; height: 100%; min-height: 100%; max-height: 100%; align-self: stretch; padding: 0; border: 0; border-radius: 0;
        -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: none; background: transparent; animation: none; }
      .rn-pq { position: fixed; left: 0; right: 0; top: calc(56px + env(safe-area-inset-top, 0px)); bottom: 0; z-index: 0; }
      .rn-pq .rs { height: 100%; max-height: none; aspect-ratio: auto; }
      ${WIN} .win-h { position: relative; z-index: 2; width: 100%; max-width: 1180px; margin: 0 auto; padding: 10px 16px 6px; border: 0; background: none; color: #cfe6ff; letter-spacing: .12em; text-shadow: 0 1px 3px #000; }
      ${WIN} .win-h > span:first-child { visibility: hidden; }
      ${WIN} .win-b { position: relative; z-index: 1; background: none; box-shadow: none; border-radius: 0; padding: 0 12px calc(24px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 8px; }
      ${WIN} .win-b::before { content: ''; flex: none; height: max(150px, calc(52vh - 120px)); }
      ${WIN} .win-b > * { flex: none; margin: 0; background: rgba(29, 61, 107, .94); border-radius: 12px; padding: 8px 12px; box-shadow: 0 4px 14px rgba(0,0,0,.4); }
      ${WIN} .win-b > :is(.q-ctx, .verdict-row) { align-self: flex-start; max-width: 100%; }
      ${WIN} .win-b > .q-ctx { background: rgba(23, 33, 58, .9); padding: 4px 10px; }
      ${WIN} .q-recap .qr-peek { color: #b9cce4; }
      /* A phone: Kai and Seymour stand in the band above the boxes, so the verdict's stamp or wave-off stays in view. */
      @media (max-width: 899px) {
        .rn-pq .rs-fg { bottom: auto; height: calc(max(150px, 52vh - 120px) + 74px); }
        .rn-pq .rs:not(.rs-wide).rs-close .rs-kai { height: 80%; }
        .rn-pq .rs:not(.rs-wide) .rs-sey { height: calc(80% * 1.3 * var(--sh, 1)); }
      }
      @media (min-width: 900px) {
        ${WIN} .win-b::before { height: 2vh; }
        ${WIN} .win-b { padding-left: max(16px, 17vw); padding-right: max(16px, 33vw); }
        ${WIN} .win-h { padding-left: max(16px, 17vw); }
        .rn-pq .rs-close .rs-kai { height: 66%; }
        .rn-pq .rs-sey { height: calc(66% * 1.3 * var(--sh, 1)); }
      }
    `;
    document.head.appendChild(pqCss);
  }
  // The building: it stands when the plan held and the permit question was right; otherwise scaffolding, which comes
  // down with the question's Wall poster (js/draft.js).
  function settle(s, job, q, r) {
    const j = s.jobs[s.at];
    j.done = true;
    j.ok = !!(r && r.ok);
    if (q) {
      const town = DR.save().town, prev = town[q.id];
      const stands = j.pass && j.ok;
      const free = DR.freePlots ? DR.freePlots() : [];
      town[q.id] = Object.assign({}, prev || {}, { q: q.id, d: prev ? prev.d : (E().domainOf(q) || 3), client: prev ? prev.client : job.client,
        floors: Math.max(0, (prev ? prev.floors : 0) + (r.pts || 0) + (j.pass ? 1 : 0)), cracks: (prev ? prev.cracks | 0 : 0) + (!r.ok && r.conf === 2 ? 1 : 0),
        scaf: !stands, t: prev ? prev.t : Date.now(), last: Date.now(), idea: prev && prev.idea ? prev.idea : job.title, plot: prev && prev.plot != null ? prev.plot : (free.length ? free[0] : null) });
      j.bld = q.id;
    }
    const k = keep();
    k.misses = (k.misses || []).filter(id => id !== job.id);
    if (!j.pass) k.misses.push(job.id);
    s.phase = 'after';
    save(s); draw(s);
  }
  function afterScreen(s) {
    const job = jobOf(s, s.at), j = s.jobs[s.at], d = s.debriefs[s.debriefs.length - 1];
    const bld = j.bld ? DR.save().town[j.bld] : null, c = CL(job.client);
    const stands = bld && !bld.scaf;
    const line = stands ? c.right : d && !d.ok && d.conf === 2 ? c.sure : c.wrong;
    // Still in the permit office the question was asked in: Seymour stamps it or waves it off, and says so (playtest,
    // Nov 17: a plain blueprint page here dropped the world between the permit and the next job).
    const sey = stands ? DR.SEYMOUR.clean : DR.SEYMOUR.scaf;
    const office = SD.renoStreet ? `<div class="rn-bleed">${permitScene(stands ? 'stamp' : 'disapprove', stands ? 'happy' : 'worried',
      `<div class="rs-row"><span></span><p class="rs-say" data-vo="${esc('seymour|' + sey)}"><b>Seymour:</b> ${esc(sey)}</p></div><div></div>`)}</div>` : '';
    const b = panel(`${office}<div class="verdict-row"><div class="verdict ${stands ? 'ok' : 'bad'}">${stands ? '🏛 IT STANDS' : '🚧 SCAFFOLDING'}</div>${d ? `<span class="chip">${esc(M.CONF[d.conf])}</span><span class="chip">${M.sgn(d.pts)} points</span>` : ''}</div>
      <div class="rn-result"><canvas class="rn-bcv" width="96" height="96" aria-hidden="true"></canvas><div>
        ${bld ? `<p class="small"><b>${esc(DR.buildingName(job.client))}</b>: ${plural(bld.floors, 'floor')}, ${stands ? 'standing' : 'under scaffolding'}${bld.plot != null && DR.rules ? ` on ${esc(DR.rules.name(bld.plot))}` : ''}.</p>` : ''}
        ${line ? say(job.client, line) : ''}
        ${office ? '' : say('seymour', sey)}
      </div></div>
      ${!stands ? `<p class="small rn-wallnote">${j.pass ? 'The plan held, but the permit question didn\'t. It\'s on the Wall: bring that poster down and the scaffolding comes off.' : 'The plan didn\'t hold. This job comes back first on a later night.'}${d && !d.ok ? ' A question on the same idea opens the next night\'s first permit.' : ''}</p>` : ''}
      <div class="rn-dock"><button class="primary" id="rn-next">${s.at + 1 < s.jobs.length ? 'Next job' : 'End the night'}</button></div>`);
    if (office) SD.renoStreet.mount(b);
    const cv = b.querySelector('.rn-bcv');
    if (cv && bld && SD.draftArt) { try { SD.draftArt.building(cv, { client: Object.assign({}, c, { roof: NEW_ROOF }), floors: Math.max(1, Math.min(6, bld.floors)), scaf: !!bld.scaf, cracks: bld.cracks }); } catch (e) { /* optional */ } }
    b.querySelector('#rn-next').onclick = () => {
      if (s.at + 1 < s.jobs.length) { s.at++; s.phase = 'board'; }
      else s.phase = 'end';
      save(s); draw(s);
    };
  }

  // ---- The end: the Grand Opening, win or lose (L1), then one line and Pip ----
  function endScreen(s) {
    const k = keep();
    if (!s.paid) { s.paid = M.pay('draft') || ' '; k.night = s.night; save(s); }
    const signed = s.jobs.filter(j => j.pass).length, proofs = s.debriefs.filter(d => d.ok).length;
    const g = s.jobs[s.jobs.length - 1], gj = jobOf(s, s.jobs.length - 1);
    const F = DR.foreman();
    const lastWin = s.jobs.map((j, i) => [j, i]).filter(([j]) => j.pass).pop();
    const top = lastWin ? planName(jobOf(s, lastWin[1]), lastWin[0].plans[lastWin[0].plans.length - 1].plan) : '';
    // The market square (Sogni, CREDITS.md): the ribbon arch in front of the fountain. A pass cuts the ribbon a beat after
    // the screen opens and the residents cheer; a miss leaves the ribbon whole and the square nearly empty.
    const folk = g.pass ? 10 : 2, soot = s.jobs.reduce((a, j) => a + (j.pass ? 0 : 1), 0);
    const sq = SD.renoStreet ? `<div class="rn-bleed">${SD.renoStreet.scene({ plaza: true, cls: 'rs-nokp', cut: false, folk, soot: g.pass ? Math.min(soot, 2) : 0, seymour: g.pass ? 'proud' : 'disapprove', kai: g.pass ? 'happy' : 'worried', shot: 'wide',
      label: g.pass ? 'The market square: the residents gather at the ribbon arch' : 'The market square: the ribbon stays uncut',
      ui: `<div class="rs-row"><span class="rs-chip ${g.pass ? 'ok' : 'bad'}">${g.pass ? 'The Grand Opening' : 'The ribbon stays uncut'}</span><span></span></div><div></div>` })}</div>` : '';
    const b = panel(`<p class="rn-night">Night ${s.night}: ${g.pass ? `${esc(gj.title.replace(/^Grand Opening: /, ''))} opens` : 'the ribbon stays uncut'}</p>
      ${sq}
      <div class="rn-endbox">${say(foreman(), g.pass ? (top ? `${top}. That's what carried you tonight. ${F.end}` : F.end) : 'Not tonight. The Grand Opening comes back, and so does everything Seymour wrote down.')}
      <p>Jobs signed <b>${signed} of ${s.jobs.length}</b> · Permit questions right <b>${proofs} of ${s.debriefs.length}</b></p>
      ${s.tally ? M.calibHtml(s.tally) : ''}
      ${s.paid && s.paid.trim() ? `<p class="small">${esc(s.paid)}</p>` : ''}
      ${M.pipHtml ? M.pipHtml() : ''}
      <p class="small muted">That's the night. Stop here: the next one opens tomorrow.</p></div>
      <div class="rn-dock"><button class="ghost" id="rn-q">Pingsby's Quarter</button><button class="primary" id="rn-done">Done</button></div>`);
    if (M.pipWire) M.pipWire(b, gj.title);
    if (SD.renoStreet && sq) {
      SD.renoStreet.mount(b);
      const el = b.querySelector('.rs');
      if (g.pass && el) {
        // The ribbon is cut (Mureka, CREDITS.md) as the ribbon falls in the square, once a night (playtest, Nov 17: it
        // used to play at Seymour's verdict, a screen and a permit question before the ribbon was cut).
        const cut = () => {
          if (!el.isConnected) return;
          SD.renoStreet.update(el, { plaza: true, cut: true, folk, soot: Math.min(soot, 2), seymour: 'approve' }); if (U.burst) U.burst(el);
          if (!s.cutSting && SD.modeStage && SD.modeStage.sting) { s.cutSting = 1; save(s); SD.modeStage.sting('draft', 'win'); }
        };
        if (reduced()) cut(); else setTimeout(cut, 1100);
      }
    }
    b.querySelector('#rn-q').onclick = () => DR.quarter(() => draw(cur()));
    b.querySelector('#rn-done').onclick = () => { s.phase = 'done'; save(s); U.closePanel(); stopNow(); };
  }

  // ---- Simulation for tools/modes_sim.js: five jobs, a plan or two each, one permit question each ----
  function sim(policy, rng) {
    const pool = SD.topicDrill.base().filter(q => RE.eb.test(qText(q)) || RE.lam.test(qText(q)) || RE.cfn.test(qText(q)));
    let pts = 0, qs = 0;
    for (let i = 0; i < R.JOBS; i++) { const q = pool[Math.floor(rng() * pool.length)]; if (!q) continue; const a = M.simAnswer(q, policy, rng); pts += a.pts; qs++; }
    // Planning and watching Seymour's runs is the game (about 2 minutes a job), so it counts as play, not as map time;
    // map time is moving between jobs on the board (about 10 seconds each).
    const planSecs = R.JOBS * 2 * 60, mapSecs = R.JOBS * 10, secs = planSecs + mapSecs + qs * M.SIM_Q_SECS;
    return { pts, minutes: secs / 60, mapShare: mapSecs / secs, questions: qs, zero: pts <= 0 };
  }

  // Architect's Draft is now the Renovation (Ladi, Nov 16: replace the draft loop). The old contract loop stays in
  // js/draft.js (SD.draft.open) for its checks and its Quarter.
  M.register({
    id: 'draft', name: 'Architect\'s Draft', minutes: 'about 18', host: DR.foreman().name, icon: '🏛',
    blurb: 'Renovate Pingsby\'s Quarter while people live in it. Pick how to ship each new version, and Seymour checks your plan twice: once sound, once cracked.',
    start,
    status: () => { const s = cur(); if (!s || s.v !== 1 || s.phase === 'done') return ''; return `Resume · Night ${s.night} · job ${s.at + 1} of ${s.jobs.length}`; },
    sim
  });
  SD.renoUi = { start, draw: () => { const s = cur(); if (s) draw(s); } };
  // Once the sheet scrolls up over the living scene, the scene's own chips and Kai's portrait frame fade out: between
  // the boxes they only peek through in pieces (playtest, Nov 17). Back at the top, they return.
  document.addEventListener('scroll', e => {
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains('win-b')) return;
    const rn = t.querySelector(':scope > .rn.rn-world');
    if (rn) rn.classList.toggle('rn-up', t.scrollTop > 40);
  }, true);

  const css = document.createElement('style');
  css.id = 'reno-css';
  css.textContent = `
    .rn { display: flex; flex-direction: column; gap: 8px; }
    .rn p { margin: 0; }
    .rn-night, .rn-title { font-family: var(--f-head); font-weight: 700; font-size: 18px; }
    .rn-say { display: flex; gap: 8px; align-items: flex-start; font-size: 15px; line-height: 1.35; }
    .rn-head { flex: 0 0 34px; width: 34px; height: 40px; overflow: hidden; border-radius: 8px; border: 2px solid var(--ink, #17131f); background: var(--paper, #c7bca4); display: inline-block; }
    .rn-head .bust, .rn-head svg { width: 30px !important; height: 36px !important; }
    .rn-head img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .rn-top { display: flex; gap: 10px; align-items: center; }
    .rn-jobs { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .rn-job { display: flex; gap: 8px; align-items: center; padding: 6px 8px; border: 2px solid var(--ink, #17131f); border-radius: 10px; background: #f6ecd2; }
    .rn-job > span:nth-child(3) { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .rn-job.on { border-width: 3px; border-color: #e0a030; background: #fff1c9; }
    .rn-job.done { opacity: .75; }
    .rn-job.grand { box-shadow: inset 0 -4px 0 #e0a030; }
    .rn-st { white-space: nowrap; font-weight: 700; }
    .rn-scroll { font-style: italic; background: #f3e7c8; border: 2px solid #b79a62; border-radius: 10px; padding: 8px 10px; overflow-wrap: anywhere; }
    .rn-slate li.ok { color: #9be3b0; } .rn-slate li.bad { color: #ffb1a1; }
    .rn-cards { display: flex; flex-direction: column; gap: 6px; }
    .rn-knob { display: flex; flex-direction: column; gap: 3px; }
    .rn-seg { display: flex; flex-wrap: wrap; gap: 4px; }
    .rn-dock { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .rn-lab { flex: 0 0 100%; font-weight: 700; }
    .rn-sp { image-rendering: pixelated; display: block; }
    .rn-h.rented { background: rgba(224,160,48,.35); box-shadow: inset 0 -3px 0 #e0a030; }
    .rn-folk { display: flex; flex-wrap: wrap; gap: 1px; align-items: flex-end; min-height: 30px; }
    .rn-turn { position: relative; display: inline-block; }
    .rn-turn .rn-out { opacity: .45; }
    .rn-turn b { position: absolute; left: 4px; top: 2px; color: #b23b3b; font-size: 18px; }
    .rn-bridgebox { position: relative; display: flex; justify-content: center; align-items: flex-end; }
    .rn-bridgesp { width: min(200px, 100%); height: auto; }
    .rn-bell { width: 30px; height: auto; position: absolute; right: 8px; top: 0; }
    .rn-bell.rang { animation: rn-ring .25s ease-in-out 4 alternate; }
    @keyframes rn-ring { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
    .rn-bpmini { width: 24px; height: auto; display: inline-block; vertical-align: -4px; }
    .rn-mini { width: 16px; height: auto; display: inline-block; vertical-align: -4px; }
    .rn-mini2 { width: 36px; height: auto; flex: none; }
    .rn-gone { opacity: .35; filter: grayscale(1); }
    .rn-res li { display: flex; gap: 8px; align-items: center; margin: 4px 0; }
    .rn-res { list-style: none; padding-left: 0; }
    .rn-stack { display: flex; flex-wrap: wrap; gap: 8px; padding: 6px; border-radius: 10px; background: #c9c0a6; }
    .rn-res1 { display: flex; flex-direction: column; align-items: center; width: 70px; text-align: center; }
    .rn-res1 .rn-sp { width: 44px; height: auto; }
    .rn-gate { margin-top: 2px; }
    .rn-red { color: #b23b3b; letter-spacing: -1px; overflow-wrap: anywhere; }
    .rn-soot { color: #3a3a3a; letter-spacing: -1px; overflow-wrap: anywhere; }
    .rn-runs { display: flex; flex-direction: column; gap: 8px; }
    .rn-run { border: 2px solid var(--ink, #17131f); border-radius: 10px; padding: 6px 8px; background: #fbf6e9; }
    .rn-runh { display: flex; justify-content: space-between; gap: 6px; }
    .rn-bridge { display: flex; height: 26px; border: 2px solid var(--ink, #17131f); border-radius: 8px; overflow: hidden; font-size: 12px; font-weight: 700; }
    .rn-arm { display: flex; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden; }
    .rn-arm.old { background: #9bb7d4; } .rn-arm.new { background: ${NEW_ROOF}; }
    .rn-sootline { overflow-wrap: anywhere; }
    .rn-refused .rn-say { background: #ffe1da; border-radius: 8px; padding: 6px; }
    .rn-crack, .rn-cfg { background: #eef2f7; border-radius: 8px; padding: 4px 8px; }
    .rn-result { display: flex; gap: 12px; align-items: flex-start; }
    .rn-bcv { width: 96px; height: 96px; flex: none; }
    .rn-wallnote { background: #fff1c9; border-radius: 8px; padding: 6px 8px; }
    /* Light paper inside the blueprint frame (js/mode-stage.js makes --ink light): keep dark ink on it. */
    .rn :is(.rn-job, .rn-scroll, .rn-run, .rn-stack, .rn-wallnote, .rn-crack, .rn-cfg, .rn-refused .rn-say, .rn-bridge) { color: #17131f; }
    .rn .rn-run .muted { color: #5a5266; }
  `;
  // Edge to edge (Ladi, Nov 16: every mode fills the screen like Monster Hunt, PR #179): no window box around the
  // Renovation's screens. The blueprint sheet is the whole stage under the top bar; the text keeps a readable column,
  // and on a wide screen Seymour's two runs sit side by side. Scoped to panels holding .rn, so the permit question
  // (the plain exam screen) and the classic contract loop keep js/mode-stage.js's drafting-table frame.
  const FULL = 'body.in-mode[data-stage="draft"] #panel:has(.rn)';
  css.textContent += `
    /* The stage's generic pressed-button style (js/mode-stage.js) would turn a chosen card translucent blue: keep it gold. */
    body.in-mode #panel .win .rn .rn-card.on[aria-pressed="true"] { background-color: #2c69b5; border-color: #ffd45a; color: #fff; }
    body.in-mode #panel .win .rn .rn-seg button.on[aria-pressed="true"] { background: linear-gradient(#ffe58a, #e0a030); border-color: #5a3a12; color: #2a1a06; }
    ${FULL} { padding: calc(56px + env(safe-area-inset-top, 0px)) 0 0; align-items: stretch; }
    ${FULL} :is(.win, .win.wide) { width: 100%; max-width: none; height: 100%; min-height: 100%; max-height: 100%; align-self: stretch;
      padding: 0; border: 0; border-radius: 0; -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: none; background: #1d3d6b; }
    ${FULL} .win-h { width: 100%; max-width: 1180px; margin: 0 auto; padding: 10px 16px 6px; border: 0; background: none; color: #cfe6ff; letter-spacing: .12em; }
    ${FULL} .win-h > span:first-child { visibility: hidden; }
    ${FULL} .win-b { border-radius: 0; box-shadow: none; padding: 8px max(16px, calc((100% - 1148px) / 2)) calc(24px + env(safe-area-inset-bottom, 0px)); }
    ${FULL} .rn { max-width: 1148px; margin: 0 auto; }
    @media (min-width: 900px) {
      ${FULL} .rn-runs { display: grid; grid-template-columns: 1fr 1fr; }
      ${FULL} .rn-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
      ${FULL} .rn-knobs { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
      ${FULL} .rn-jobs { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
    }
    @media (max-width: 899px) {
      ${FULL} .rn-boardgrid .rn-map { width: auto; max-width: none; margin: 0 -16px; border-width: 3px 0; border-radius: 0; }
    }`;
  // The scene (Ladi, Nov 16: "I don't want it to be another basic text game"): the street fills the screen, the slate is
  // chalk on the gate, policies are blueprints, knobs are brass plaques and levers on the scaffolding, the board is a map.
  css.textContent += `
    ${FULL} .win-b { padding-left: 0; padding-right: 0; }
    ${FULL} :is(.win, .win.wide) { animation: none; } /* a full-screen scene doesn't pop in like a window */
    ${FULL} .rn { max-width: none; }
    ${FULL} .rn > * { width: 100%; max-width: 1180px; margin-left: auto; margin-right: auto; padding-left: 16px; padding-right: 16px; box-sizing: border-box; }
    ${FULL} .rn > .rn-bleed { max-width: none; padding-left: 0; padding-right: 0; }
    ${FULL} .rn > .rn-runs { padding-left: 0; padding-right: 0; }
    ${FULL} .rn > .rn-runs { max-width: 1400px; padding-left: 12px; padding-right: 12px; }
    .rn-street { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px 0; color: #fff;
      background: url(assets/img/reno/street-bg.webp) center bottom 30px / auto calc(100% - 30px) repeat-x, linear-gradient(#f2a65a 0%, #f7cf8a 45%, #3b2a2a 100%);
      image-rendering: pixelated; min-height: 230px; overflow: hidden; }
    .rn-run .rn-street { min-height: 190px; border-radius: 8px; }
    .rn-street-info, .rn-planpin { align-self: flex-start; background: rgba(23,19,31,.72); color: #fff; border-radius: 8px; padding: 3px 8px; }
    .rn-planpin { background: rgba(31,78,140,.92); border: 1px dashed #bfe0ff; display: flex; gap: 6px; align-items: center; }
    .rn-lanes { margin-top: auto; display: flex; flex-direction: column; gap: 2px; }
    .rn-lane { display: flex; gap: 2px; align-items: flex-end; min-width: 0; }
    .rn-lane.b { transform-origin: bottom center; padding: 0 6% 0 10%; }
    .rn-lane.b .rn-h { opacity: .95; flex-basis: 64px; }
    .rn-lane.ghosted .rn-lab { background: rgba(31,78,140,.92); }
    .rn-lab { flex: 0 0 auto; align-self: center; background: rgba(23,19,31,.72); color: #fff; border-radius: 6px; padding: 1px 6px; margin-right: 4px; font-weight: 700; white-space: nowrap; }
    .rn-gatesp { flex: 0 1 64px; min-width: 26px; width: 64px; height: auto; margin-right: 4px; }
    .rn-h { position: relative; flex: 0 1 92px; min-width: 0; display: flex; align-items: flex-end; justify-content: center; border-radius: 6px; }
    .rn-h .rn-sp { width: 100%; height: auto; }
    .rn-h.rented { background: rgba(224,160,48,.35); box-shadow: inset 0 -3px 0 #e0a030; }
    .rn-h.rn-ghost .rn-sp { filter: grayscale(1) brightness(1.5) sepia(1) hue-rotate(175deg) saturate(4); opacity: .6; }
    .rn-h.rn-ghost { outline: 2px dashed #bfe0ff; outline-offset: -2px; }
    .rn-h.g1, .rn-h.g0 { outline: 2px dashed #bfe0ff; outline-offset: -2px; } .rn-h.g0 { outline-color: #ffd45a; }
    .rn-bn { position: absolute; top: 2px; left: 2px; font-style: normal; font-weight: 800; font-size: 12px; min-width: 18px; text-align: center; border-radius: 9px; background: #1f4e8c; color: #fff; border: 1px solid #bfe0ff; }
    .rn-road { min-height: 34px; margin: 0 -12px; padding: 4px 12px; display: flex; align-items: flex-end;
      background: repeating-linear-gradient(90deg, #5b4a3c 0 14px, #6a5746 14px 28px); border-top: 3px solid #3b2f27; }
    .rn-empty { color: #e9dcc7; }
    .rn-folk { display: flex; flex-wrap: wrap; gap: 2px; align-items: flex-end; min-height: 28px; }
    .rn-folk .rn-sp { width: 22px; height: auto; }
    .rn-walk { display: inline-block; animation: rn-walk .5s steps(3) both; }
    @keyframes rn-walk { from { transform: translateX(40px); opacity: .2; } to { transform: none; opacity: 1; } }
    .rn-turn { animation: rn-away .5s steps(3) both; }
    @keyframes rn-away { from { transform: none; } to { transform: translateX(10px); } }
    /* The slate: chalk on a board nailed to the gate. */
    .rn-gatepost { align-self: stretch; }
    .rn-chalk { position: relative; background: #2d3a31; border: 6px solid #7a5230; border-radius: 6px; box-shadow: 0 3px 0 #3b2716, inset 0 0 18px rgba(0,0,0,.45); padding: 6px 10px 8px; color: #f4f1e6;
      font-family: 'Patrick Hand', 'Comic Sans MS', 'Chalkboard SE', cursive; }
    .rn-chalk::before, .rn-chalk::after { content: ''; position: absolute; top: -4px; width: 6px; height: 6px; border-radius: 50%; background: #c9c3b6; }
    .rn-chalk::before { left: 6px; } .rn-chalk::after { right: 6px; }
    .rn-chalkh { font-size: 15px; letter-spacing: .08em; text-transform: uppercase; opacity: .85; border-bottom: 1px dashed rgba(244,241,230,.4); margin-bottom: 3px !important; }
    .rn-slate { list-style: none; margin: 0; padding: 0; font-size: 16px; line-height: 1.25; display: flex; flex-direction: column; gap: 2px; text-shadow: 0 0 1px rgba(255,255,255,.5); }
    .rn-slate .small { opacity: .8; }
    .rn-after .rn-chalk { max-width: 640px; }
    /* Policies are blueprints you pin onto the street. */
    .rn-card { position: relative; display: grid; grid-template-columns: 44px 1fr; column-gap: 8px; align-items: center; text-align: left; padding: 10px 12px; border: 2px solid #9cc7f2; border-radius: 6px; color: #fff; overflow-wrap: anywhere;
      background: linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px) 0 0 / 14px 14px, linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px) 0 0 / 14px 14px, #1f4e8c; box-shadow: 0 3px 0 #10284a; }
    .rn-card b { font-family: var(--f-head); } .rn-card .rn-bpsp { grid-row: span 2; width: 48px; height: auto; }
    .rn-card .small { color: #dbeaff; }
    .rn-card.on { transform: rotate(-1deg); border: 3px solid #ffd45a; box-shadow: 0 0 0 3px rgba(255,212,90,.35), 0 4px 0 #10284a; }
    .rn-tack { position: absolute; top: -12px; right: 12px; width: 18px; height: auto; }
    /* The scaffolding: brass plaques and levers on wooden planks. */
    .rn-knobs { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 6px; border: 3px solid #4a2f18; color: #fff4dc;
      background: repeating-linear-gradient(0deg, #8a5a32 0 22px, #7a4e2b 22px 24px, #95653a 24px 46px, #6e4526 46px 48px); }
    .rn-knob > .small { font-weight: 700; text-shadow: 0 1px 0 #2a1a0c; }
    .rn-seg { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .rn-seg button { flex: 1 1 auto; min-height: 40px; padding: 6px 10px; border: 2px solid #3a2410; border-radius: 6px; font-size: 13px; font-weight: 700; color: #3a2a12;
      background: linear-gradient(#e6d3a3, #b99b5e); box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 2px 0 #3a2410; }
    .rn-seg button.on { background: linear-gradient(#ffe58a, #e0a030); color: #2a1a06; box-shadow: inset 0 2px 3px rgba(90,58,18,.6), 0 0 10px rgba(255,212,90,.8); }
    .rn-lever { flex-wrap: nowrap; }
    .rn-lever button[data-k] { flex: 1 1 0; }
    .rn .rn-seg .rn-lv { flex: 0 0 56px; min-height: 48px; padding: 0; border: 0; background: none; box-shadow: none; }
    .rn-lv img { height: 54px; width: auto; transition: transform .15s; }
    .rn-lv.up img { transform: scaleX(-1); filter: drop-shadow(0 0 4px #6dff8e); }
    .rn-knobs .rn-cfg { color: #17131f; }
    /* The board: tonight's jobs pinned on the map of the Quarter. */
    .rn-boardgrid { display: flex; flex-direction: column; gap: 10px; }
    .rn-map { position: relative; width: 100%; max-width: 760px; margin: 0 auto; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 10px;
      border: 3px solid #4a2f18; background: #6e8f5a; box-shadow: 0 6px 18px rgba(0,0,0,.35), inset 0 0 0 2px rgba(255,236,190,.25); }
    .rn-mapsp { display: block; width: 100%; height: 100%; object-fit: cover; image-rendering: auto; }
    /* The painted pin: a red head on a brass point. The point's tip sits on the spot; the badge sits on the head. */
    .rn-pin { --pw: clamp(24px, 6.4vw, 36px); position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; pointer-events: none; }
    .rn-pinsp { display: block; width: var(--pw); height: auto; image-rendering: auto; filter: drop-shadow(1px 3px 2px rgba(0,0,0,.45)); }
    .rn-pin b { position: absolute; left: 50%; bottom: calc(var(--pw) * 1.616 * .69); transform: translate(-50%, 50%); width: calc(var(--pw) * .66); height: calc(var(--pw) * .66);
      display: grid; place-items: center; border-radius: 50%; background: #fff3d6; color: #17131f; border: 1.5px solid #5a1410; font-size: calc(var(--pw) * .46); font-weight: 800; line-height: 1; text-shadow: none; }
    .rn-pin.on { animation: rn-pinbob .7s ease-in-out infinite alternate; }
    .rn-pin.on .rn-pinsp { filter: drop-shadow(0 0 5px #ffd45a) drop-shadow(1px 3px 2px rgba(0,0,0,.45)); }
    .rn-pin.ok b { background: #9be3b0; } .rn-pin.bad b { background: #cfc8bc; } .rn-pin.on b { background: #ffd45a; }
    @keyframes rn-pinbob { from { translate: 0 0; } to { translate: 0 -5px; } }
    .rn-ribbon { width: clamp(30px, 6vw, 52px); height: auto; margin-bottom: -2px; }
    .rn-num { flex: none; width: 22px; height: 22px; border-radius: 50%; background: #b23b3b; color: #fff; font-weight: 800; font-size: 12px; display: grid; place-items: center; }
    .rn-job.grand { box-shadow: inset 0 -4px 0 #b23b3b; }
    .rn-river { background: linear-gradient(#8fc6e8, #cfe8d0 55%, #4d8fb0 56%, #2f6d8f); color: #17131f; padding-bottom: 8px; }
    .rn-river .rn-bridgesp { width: min(320px, 90%); }
    .rn-office { background: linear-gradient(#e9dcc0, #c9b48a); color: #17131f; padding-bottom: 10px; }
    .rn-bridge.rn-ghost { border-style: dashed; opacity: .85; }
    @media (min-width: 900px) {
      .rn-street { min-height: 400px; padding: 14px 18px 0; }
      .rn-h { flex-basis: 140px; } .rn-gatesp { flex-basis: 96px; width: 96px; } .rn-lane.b .rn-h { flex-basis: 90px; }
      .rn-run .rn-h { flex-basis: 84px; } .rn-run .rn-gatesp { flex-basis: 60px; width: 60px; } .rn-folk .rn-sp { width: 30px; }
      .rn-run .rn-street { min-height: 240px; }
      .rn-plan.rn-street { padding-left: 380px; }
      .rn-plan .rn-gatepost { position: absolute; left: 18px; top: 14px; width: 340px; }
      .rn-river .rn-gatepost, .rn-office .rn-gatepost { max-width: 520px; }
      .rn-road { margin: 0 -18px; padding: 4px 18px; }
      .rn-plan .rn-road { margin-left: -380px; padding-left: 380px; }
      .rn-boardgrid { display: grid; grid-template-columns: minmax(0, 3fr) minmax(300px, 2fr); align-items: start; }
      ${FULL} .rn-boardgrid .rn-jobs { display: flex; }
    }
    @media (prefers-reduced-motion: reduce) { .rn-walk, .rn-turn, .rn-pin.on { animation: none; } }
  `;
  css.textContent += `
    /* The living street fills the stage: fixed behind the screen's boxes, which scroll up over it from below. */
    ${FULL}:has(.rn-world) :is(.win, .win.wide), ${FULL}:has(.rn-world) .win-b { background: transparent; }
    ${FULL}:has(.rn-world) .win-h { position: relative; z-index: 2; }
    ${FULL} .rn.rn-world > .rn-bleed:not([hidden]) { position: fixed; left: 0; right: 0; top: calc(56px + env(safe-area-inset-top, 0px)); bottom: 0; z-index: 0; margin: 0; width: auto; max-width: none; }
    ${FULL} .rn.rn-world .rs { height: 100% !important; max-height: none; aspect-ratio: auto; }
    ${FULL} .rn.rn-world::before { content: ''; flex: none; height: calc(100vh - 56px - 170px); min-height: 60vh; }
    /* While Seymour's runs play, nothing covers the street but the fast-forward button. */
    ${FULL} .rn.rn-world.rn-playing > :not(.rn-bleed):not(.rn-skipd) { display: none; }
    ${FULL} .rn.rn-world.rn-playing > .rn-skipd { position: fixed; z-index: 3; left: auto; right: 12px; bottom: calc(5% + 62px); width: auto; background: none; box-shadow: none; padding: 0; }
    ${FULL} .rn.rn-world.rn-playing::before { height: 0; min-height: 0; }
    ${FULL} .rn.rn-world > :not(.rn-bleed) { position: relative; z-index: 1; width: calc(100% - 24px); max-width: 1148px; }
    /* The boxes rest over the scene's bottom min(170px, 40vh - 56px) (the ::before above): keep the scene's own bottom
       row and Kai's portrait frame above that line, so they don't peek out from under the first box. */
    ${FULL} .rn.rn-world > .rn-bleed .rs:not(.rs-close) :is(.rs-ui, .rs-kai) { transition: opacity .2s; }
    ${FULL} .rn.rn-world.rn-up > .rn-bleed .rs:not(.rs-close) :is(.rs-ui, .rs-kai) { opacity: 0; pointer-events: none; }
    ${FULL} .rn.rn-world:not(.rn-playing) > .rn-bleed .rs-ui { padding-bottom: calc(min(170px, 40vh - 56px) + 10px); }
    ${FULL} .rn.rn-world:not(.rn-playing) > .rn-bleed .rs:not(.rs-wide):not(.rs-close) .rs-kai { bottom: calc(min(170px, 40vh - 56px) + 10px); }
    ${FULL} .rn.rn-world:not(.rn-playing) > .rn-bleed .rs:not(.rs-wide):not(.rs-close):has(.rs-kai) .rs-ui > .rs-row:last-child { padding-left: 98px; }
    /* The night's tally over the market square: one box, so its lines never sit bare on the painting. */
    ${FULL} .rn.rn-world > .rn-endbox { display: flex; flex-direction: column; gap: 8px; color: #fff; }
    ${FULL} .rn.rn-world > :is(.rn-top, .rn-scroll, .rn-dock, .verdict-row, .rn-say, .rn-slatebelow, .rn-refused, .rn-result, .rn-endbox, .rn-night) { background: rgba(23, 33, 58, .9); border-radius: 12px; padding: 8px 12px; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
    ${FULL} .rn.rn-world > .rn-scroll { background: #f3e7c8; }
    ${FULL} .rn.rn-world > .rn-after { display: flex; flex-direction: column; gap: 8px; }
    ${FULL} .rn.rn-world > .rn-after > :is(.verdict-row, .rn-say, .rn-dock) { background: rgba(23, 33, 58, .9); border-radius: 12px; padding: 8px 12px; }
    ${FULL} .rn.rn-world > .rn-after > .rn-say { color: #fff; }
    ${FULL} .rn.rn-world > .rn-q-ctx, ${FULL} .rn.rn-world > .q-ctx { background: rgba(23, 33, 58, .85); border-radius: 8px; padding: 4px 10px; align-self: flex-start; width: auto; margin-left: 12px; }
    ${FULL} .rn.rn-world > :last-child { margin-bottom: 16px; }
    .rn-slatebelow { display: block; }
    @media (min-width: 700px) { .rn-slatebelow { display: none; } }
    .rn-cut .rs { height: min(66vh, 480px); } @media (min-width: 700px) { .rn-cut .rs { height: auto; } }
    .rn-runrows { display: flex; flex-direction: column; gap: 6px; }
    .rn-runrows .rn-run { padding: 4px 8px; }
  `;
  document.head.appendChild(css);
})();
