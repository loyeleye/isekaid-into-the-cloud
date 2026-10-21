// The opening, "the files": a thunderstorm, Freya's pavilion at night, the man in the dark across the desk, the four
// files and the prayers stamped UNANSWERED, then choosing whose file to keep. It plays before chapter 1's prologues
// (js/ch1-world.js W1.opening). The pictures are painted stills, the one place the vector build shows images; the
// file cards and the lead select are drawn in code from the cast (js/vec-cast.js).
//
// The scene is a shot list (O.SHOTS below), so it can be re-cut by editing data, and compile() turns it into js/vn.js
// steps. The words are the script's, and the shots the storyboard's (Docs, "Opening scene: the files").
(function () {
  const K = SD.vec;
  const O = K.open = {};

  // What each file says about its lead: the card's "Known for" line and the select's one line of backstory.
  O.FILES = {
    mira: { known: 'keeping people alive.', line: 'A village healer the Church made into a beast. Her husband died on a tower stair with her hands on the wound.' },
    kai: { known: 'a mouth, and one bad hand.', line: 'A line cook who climbed out of the Abyss with his bare hands, one day too late for his sister.' },
    seoyeon: { known: 'Burning Peak Style, which every master can name on sight.', line: 'A sword disciple raised at the table of the man who burned her family. She froze once.' },
    dutch: { known: 'finding people who don\'t want to be found.', line: 'The Crown\'s best enforcer, until he wasn\'t. He went looking for whoever pushed his daughter, and found the wrong man.' }
  };

  // The painted stills (Gemini-generated, js/../assets/img/opening, credited in CREDITS.md). s1a-<face> is the wide
  // shot with Freya's face changed and nothing else, so a face change is a crossfade that only moves her face.
  // The ID photos on the files are the four leads, left to right in the lead select's order wherever they show.
  // s12, her hand on the file she kept, comes in four versions, one per lead; the files act swaps in the one picked.
  const STILLS = ['l1', 'l2', 'l3', 'l4', 's1b', 's2', 's2b', 's2c', 's2d', 's5', 's7', 's8', 's9a', 's9b', 's10', 's10b', 's13'];
  const FACES = ['warm', 'earnest', 'smirk', 'cold', 'amused', 'sad', 'unreadable', 'frustrated'];
  // On a phone held upright only about a quarter of a still's width shows, so each still names what to keep in
  // frame, as an object-position (js/vn.js); the ones not listed are centred. The lightning shots still hold still.
  const FOCUS = { l1: 70, l2: 78, l3: 46, l4: 56, s1b: 74, a: 36, s2: 40, s2b: 44, s2c: 44, s5: 45, s9a: 36, s9b: 80,
    s10: 84, s10b: 36, s13: 34 };
  const focus = id => FOCUS[id] === undefined ? undefined : FOCUS[id] + '% 50%';
  const kept = lead => ({ src: 'assets/img/opening/s12-' + lead + '.webp', label: 's12 ' + lead });
  O.scenes = () => Object.fromEntries(STILLS.map(id => ['op-' + id, { src: 'assets/img/opening/' + id + '.webp', label: id, focus: focus(id) }])
    .concat(FACES.map(f => ['op-a-' + f, { src: 'assets/img/opening/s1a-' + f + '.webp', label: 's1a ' + f, focus: focus('a') }]))
    .concat([['op-s12', kept(O.picked || SD.ch1story.order[0])]]));

  // Every stage direction is its own still: no narrator, no animation, only cuts, lightning and slow push-ins.
  // The lightning plays over the storm alone and holds still; the music and the push-ins start with the talking.
  // A shot is { still, pan, lines } or one of:
  //   { strike: still }   thunder, a lightning flash reveals the still, and it fades back to the dark
  //   { dark: true }      the slap: thunder and a folder on wood, with nothing to see
  //   { card: lead }      a file opens: the lead's card freezes with the prayer stamped UNANSWERED
  //   { files: true }     the four files become the lead select
  //   { sound: name }     a sound on its own (thunder far off)
  //   { music: name }     the music comes in
  //   { light: level, ms } the stills dim (the dark before the lamp) or come up to full over ms, then hold
  //   { fade: true }       out to black; the next still fades in from it
  // pan is 'slow' (a very slow push-in, the default), 'still', or js/vn.js's 'in', 'up' or 'left'. A cut to the same
  // framing (a face change on A, B to B) carries the push-in on instead of restarting it.
  // A: Freya's side, wide. B: over her shoulder.
  const A = (face, ...lines) => ({ still: 'a-' + face, lines: lines.map(t => ['freya', t]) });
  const B = (...lines) => ({ still: 's1b', lines: lines.map(t => ['man', t]) });
  O.SHOTS = [
    { light: 0.5 },
    { strike: 'l1' },
    { strike: 'l2', hold: 1900 },
    { dark: true },
    { strike: 'l3' },
    { light: 0.3 },
    { still: 'l4', pan: 'still', hold: 700 },
    { light: 1, ms: 2000, hold: 800 },
    { fade: true },
    { music: 'story' },
    B('You promised an army.'),
    A('warm', 'I promised the right people. Armies pray. These four stopped.'),
    { still: 's2', hold: 1400 },
    { card: 'mira' },
    B('A village healer. You\'ve brought me a nurse.'),
    A('earnest', 'The Church brought you a beast, and then forgot which way to point her. Her husband died on a tower stair with her hands on the wound. She prayed the whole time.'),
    B('Healers don\'t win wars.'),
    A('earnest', 'This one doesn\'t stop when the patient does. That\'s the trouble with her. It\'s also the point.'),
    { card: 'kai' },
    B('A cook.'),
    A('amused', 'A cook who climbed out of the Abyss with his bare hands. Nobody climbs out of the Abyss.'),
    B('Late, I hear.'),
    A('earnest', 'One day late. He\'ll never forgive himself for that day, which means he\'ll never stop. And that hand of his undoes things: blessings, barriers, whatever a god put there.'),
    { still: 's5', glint: true, lines: [['man', 'Whatever a god put there.']] },
    A('unreadable', 'That\'s what I said.'),
    { card: 'seoyeon' },
    B('She\'s a child.'),
    A('earnest', 'She\'s twenty. Raised at the table of the man who burned her family, and trained by the best sword sect alive. She froze once.'),
    B('Once is enough to get someone killed.'),
    A('sad', 'It was.', 'She\'s the only one of the four who\'s afraid of herself. That\'s who you want making the hard choices.'),
    { card: 'dutch' },
    B('A janitor.'),
    A('earnest', 'The Crown\'s best enforcer, until he wasn\'t. He took a mop and a night shift to find whoever pushed his daughter off a tower, and he found the wrong man.'),
    B('He\'ll ask questions.'),
    A('amused', 'Good. Somebody on this crew should.'),
    B('And when he asks you?'),
    A('unreadable', 'Then I\'ll answer him.'),
    { still: 's7', lines: [['man', 'Four broken people against a goddess. They\'ll lose.']] },
    A('frustrated', 'Four people she ignored.'),
    { still: 's8', lines: [['freya', 'She has a room in her temple stacked to the ceiling with prayers, ten thousand years of them, and she\'s never opened one.']] },
    A('frustrated', 'She had everything she needed to help them, and she let them bleed.'),
    B('And the goddess? Does she pay?'),
    A('cold', 'We make her listen.', 'If paying is what it takes, she\'ll pay.'),
    { sound: 'thunder' },
    { still: 's9b', glint: true, lines: [['man', 'Then you\'ll want me ready, my lady. And I\'d like a seat near the front.']] },
    { still: 's9a', lines: [['freya', 'Freya, love. We\'re not in church.'], ['freya', 'I\'ll send for you when it\'s time.']] },
    { still: 's2b', lines: [['freya', 'Leave those.']] },
    { still: 's2c', lines: [['man', 'Of course.']] },
    { still: 's2d', hold: 1300 },
    { still: 's10b', hold: 1500 },
    { still: 's10', rain: true, hold: 2200 },
    { files: true },
    { still: 's12', hold: 1500 },
    { still: 's13', lines: [['freya', 'Good. Let\'s get to work, then.']] }
  ];

  // Shots to js/vn.js steps.
  O.compile = function (shots) {
    const steps = [];
    const frame = s => s.still && s.still.startsWith('a-') ? 'a' : s.still;
    // The two facing shots come back again and again, so each return frames them differently: wide, then pushing
    // in on whoever's talking, then close on them.
    const VARY = { a: ['slow', 'pushA', 'closeA'], s1b: ['slow', 'pushB', 'closeB'] }, seen = {};
    let prev = null;
    shots.forEach(s => {
      const same = s.still && prev && frame(prev) === frame(s);
      if (s.still || s.card || s.files) prev = s.still ? s : null;
      if (s.card) { steps.push(['act', 'vcard', { lead: s.card }]); return; }
      if (s.files) { steps.push(['act', 'vfiles', {}]); return; }
      if (s.sound) { steps.push(['act', 'sound', { name: s.sound }]); return; }
      if (s.music) { steps.push(['act', 'music', { name: s.music }]); return; }
      if (s.light !== undefined) { steps.push(['act', 'light', { to: s.light, ms: s.ms || 0 }]); if (s.hold) steps.push(['wait', s.hold]); return; }
      if (s.fade) { steps.push(['fx', 'black'], ['act', 'light', { to: 1 }], ['wait', 400]); return; }
      if (s.strike) { steps.push(['fx', 'thunder'], ['cg', 'op-' + s.strike, 'still'], ['wait', s.hold || 1300], ['fx', 'black'], ['wait', 500]); return; }
      if (s.dark) { steps.push(['act', 'sound', { name: 'thunder' }], ['act', 'sound', { name: 'thud' }], ['fx', 'shake'], ['wait', 900]); return; }
      const f = frame(s);
      if (!same && VARY[f] && !s.pan) seen[f] = (seen[f] || 0) + 1;
      const pan = s.pan || (VARY[f] ? VARY[f][(seen[f] - 1) % 3] : 'slow');
      steps.push(['cg', 'op-' + s.still, pan === 'still' || !same ? pan : pan + '+']);
      if (s.rain) steps.push(['act', 'flaprain', { on: true }]);
      if (s.glint) steps.push(['act', 'glint', {}]);
      if (s.hold) steps.push(['wait', s.hold]);
      (s.lines || []).forEach(l => steps.push(l));
      if (s.rain) steps.push(['act', 'flaprain', { on: false }]);
    });
    return steps;
  };

  if (!K.on) return;

  // ---------- The two moments you play ----------
  const esc = s => SD.ui.esc(s);
  const css = document.createElement('style');
  css.textContent = `
#vn .kb-pushA > *, #vn .kb-closeA > * { transform-origin: 37% 30%; }
#vn .kb-pushB > *, #vn .kb-closeB > * { transform-origin: 73% 30%; }
#vn .kb-pushA > *, #vn .kb-pushB > * { animation: kbPush 14s ease-in-out forwards; animation-delay: var(--kbd, 0ms); }
#vn .kb-closeA > *, #vn .kb-closeB > * { animation: kbClose 30s linear forwards; animation-delay: var(--kbd, 0ms); }
@keyframes kbPush { from { transform: scale(1); } to { transform: scale(1.2); } }
@keyframes kbClose { from { transform: scale(1.32); } to { transform: scale(1.38); } }
#vn .vn-glint { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at var(--gx, 50%) var(--gy, 55%), rgba(255,236,170,.75), rgba(255,220,140,0) 4%); opacity: 0; mix-blend-mode: screen; }
#vn .vn-glint.on { animation: vnGlint 1.1s ease-out 0.5s; }
@keyframes vnGlint { 30% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { #vn .vn-glint.on { animation: none; } }
#vn .vn-halo { position: absolute; inset: 0; pointer-events: none; }
#vn .vn-halo i { position: absolute; inset: 0; background: rgba(0,0,0,var(--dark));
  -webkit-mask-image: radial-gradient(circle at var(--hx) var(--hy), transparent var(--r, 0px), #000 calc(var(--r, 0px) + 14vmax));
  mask-image: radial-gradient(circle at var(--hx) var(--hy), transparent var(--r, 0px), #000 calc(var(--r, 0px) + 14vmax)); }
#vn .vn-halo b { position: absolute; inset: 0; mix-blend-mode: screen; opacity: var(--bloom, 0);
  background: radial-gradient(circle at var(--hx) var(--hy), rgba(255,214,140,.32), rgba(255,170,80,.1) calc(var(--r, 0px) * .3 + 4vmax), rgba(255,170,80,0) calc(var(--r, 0px) * .55 + 8vmax)); }
#vn .vn-panel.vcard, #vn .vn-panel.vfiles { width: min(560px, calc(100% - 20px)); max-height: calc(100vh - 40px); overflow-y: auto; padding: 0; background: none; border: 0; }
.vc-card { position: relative; display: grid; grid-template-columns: 38% 1fr; gap: 14px; align-items: start; padding: 18px 16px 16px; background: linear-gradient(180deg, #ecdfba, #dcc996); color: #2b2340; border-radius: 6px 6px 10px 10px; box-shadow: 0 14px 40px rgba(0,0,0,.6), inset 0 0 0 2px rgba(43,35,64,.25); text-align: left; transform: rotate(-1deg); }
.vc-card::before { content: "FREE TIER · APPLICATION"; position: absolute; top: -13px; left: 18px; padding: 3px 12px; font: 800 10px ui-monospace, monospace; letter-spacing: .08em; color: #2b2340; background: #d9b878; border-radius: 6px 6px 0 0; }
.vc-por { background: #3a3550; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.4); transform: rotate(2deg); aspect-ratio: 120 / 140; overflow: hidden; }
.vc-por img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 0; display: block; image-rendering: pixelated; }
.vc-txt small { font: 700 11px ui-monospace, monospace; letter-spacing: .08em; opacity: .7; }
.vc-txt b { display: block; font: 700 clamp(20px, 5vw, 26px) Cinzel, serif; margin: 2px 0; }
.vc-txt i { display: block; font: 600 13px Nunito, sans-serif; font-style: normal; opacity: .8; }
.vc-txt p { margin: 10px 0 6px; font: 600 15px/1.35 Nunito, sans-serif; }
.vc-txt q { display: block; margin-top: 8px; padding: 8px 10px; font: italic 400 15px/1.4 Nunito, sans-serif; background: rgba(255,255,255,.45); border-left: 3px solid #8a2a34; }
.vc-stamp { position: absolute; right: 10px; bottom: 54px; padding: 6px 12px; font: 800 clamp(20px, 5.5vw, 28px) ui-monospace, monospace; color: #c0202e; border: 4px solid #c0202e; border-radius: 4px; transform: rotate(-12deg) scale(2.6); opacity: 0; mix-blend-mode: multiply; pointer-events: none; }
.vc-stamp.on { animation: vcStamp .28s cubic-bezier(.3, 1.6, .5, 1) forwards; }
@keyframes vcStamp { to { transform: rotate(-12deg) scale(1); opacity: .88; } }
.vc-card .vc-go, .vf-keep { grid-column: 1 / -1; justify-self: end; min-height: 44px; padding: 9px 18px; font: 700 14px Nunito, sans-serif; color: #fff; background: #2b2340; border: 0; border-radius: 6px; cursor: pointer; }
.vc-card .vc-go[disabled] { opacity: .35; }
.vf-head { margin: 0 0 10px; padding: 12px 14px; color: #e9e6f2; background: rgba(8,7,14,.88); border: 1px solid rgba(255,255,255,.16); border-radius: 10px; font: 600 14px/1.4 Nunito, sans-serif; text-align: left; }
.vf-head b { display: block; font: 700 15px Cinzel, serif; letter-spacing: .08em; margin-bottom: 2px; }
.vf-file { display: block; width: 100%; margin: 0 0 8px; padding: 0; border: 0; background: none; text-align: left; cursor: pointer; color: #2b2340; }
.vf-tab { display: flex; justify-content: space-between; align-items: center; min-height: 44px; box-sizing: border-box; padding: 10px 14px; background: linear-gradient(180deg, #e2cf9a, #d4ba7c); border-radius: 8px 8px 8px 8px; box-shadow: 0 3px 0 rgba(0,0,0,.35); font: 700 16px Cinzel, serif; }
.vf-tab small { font: 700 11px ui-monospace, monospace; color: #8a2a34; }
.vf-file.open .vf-tab { border-radius: 8px 8px 0 0; }
.vf-body { display: none; grid-template-columns: 30% 1fr; gap: 12px; padding: 12px 14px 14px; background: #ecdfba; border-radius: 0 0 8px 8px; font: 600 14px/1.35 Nunito, sans-serif; }
.vf-file.open .vf-body { display: grid; }
.vf-body q { display: block; margin-top: 6px; font-style: italic; font-weight: 400; }
.vf-body .vc-por { transform: none; }
`;
  document.head.appendChild(css);

  // The file photo is the lead's PixelLab face portrait (assets/img/portraits, credited in CREDITS.md).
  const portrait = id => `<div class="vc-por"><img src="assets/img/portraits/${id}-neutral.webp" alt=""></div>`;
  SD.vn.acts.vcard = async function (o, tools) {
    const T = SD.ch1story, l = T.leads[o.lead], f = O.FILES[o.lead], n = T.order.indexOf(o.lead) + 1;
    const p = tools.panel(`<div class="vc-card">${portrait(o.lead)}<div class="vc-txt"><small>FILE ${n} OF 4</small><b>${esc(l.name)}</b><i>${esc(l.title)} · ${l.age}</i>
      <p>Known for: ${esc(f.known)}</p><q>${esc(l.prayer)}</q></div><span class="vc-stamp">UNANSWERED</span><button class="vc-go" disabled>Next file</button></div>`, 'vcard');
    tools.sfx('page');
    await tools.sleep(1100);
    p.querySelector('.vc-stamp').classList.add('on'); tools.sfx('wrong');
    await tools.sleep(500);
    const go = p.querySelector('.vc-go'); go.disabled = false; go.textContent = n < 4 ? 'Next file' : 'Close the file';
    await new Promise(done => { go.addEventListener('click', done); if (tools.skipping()) done(); });
    tools.closePanel();
  };
  SD.vn.acts.vfiles = async function (o, tools) {
    const skip = document.getElementById('op-skip'); if (skip) skip.remove();
    const T = SD.ch1story;
    const p = tools.panel(`<div class="vf-head"><b>WHOSE FILE?</b>Freya keeps one file open. Whose story do you start with? The other three are in her camp either way.</div>
      ${T.order.map(id => { const l = T.leads[id]; return `<div class="vf-file" data-lead="${id}" role="button" tabindex="0"><div class="vf-tab">${esc(l.name)}<small>UNANSWERED</small></div>
        <div class="vf-body">${portrait(id)}<div><b>${esc(l.title)}</b> · ${l.age}<br>${esc(O.FILES[id].line)}<q>${esc(l.prayer)}</q></div><button class="vf-keep" data-keep="${id}">Keep this file</button></div></div>`; }).join('')}`, 'vfiles');
    await new Promise(done => {
      p.querySelectorAll('.vf-file').forEach(el => {
        const open = () => { p.querySelectorAll('.vf-file').forEach(x => x.classList.toggle('open', x === el)); tools.sfx('page'); };
        el.addEventListener('click', e => { if (!e.target.closest('.vf-keep')) open(); });
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      });
      p.querySelectorAll('.vf-keep').forEach(b => b.addEventListener('click', () => { O.picked = b.dataset.keep; SD.vn.addScenes({ 'op-s12': kept(O.picked) }); tools.sfx('ok'); done(); }));
    });
    tools.closePanel();
  };

  // A sound on its own, and the ring catching the lamp once: a soft point of light that blooms and fades.
  SD.vn.acts.sound = async (o, tools) => tools.sfx(o.name);
  // How lit the stills are: dim until Freya lights the lamp, then up to full.
  const light = (to, ms) => { const cg = document.querySelector('#vn .vn-cg'); if (!cg) return; cg.style.transition = 'filter ' + (ms || 0) + 'ms ease-in-out'; cg.style.filter = to >= 1 ? '' : 'brightness(' + to + ')'; };
  // Where the lamp's flame is on the painting. Lighting it brings the room up as a halo from the lamp: the still goes
  // to full at once under a dark layer with a hole around the whole lamp, which pulses twice with a warm bloom and
  // then spreads out to the edges of the screen.
  const LAMP = { 'op-l4': [.503, .39] };
  function halo(cg, from, ms, tools) {
    const vn = document.getElementById('vn'), at = SD.vn.onStill(...LAMP[vn.dataset.cg]);
    const h = document.createElement('div');
    h.className = 'vn-halo'; h.innerHTML = '<i></i><b></b>';
    h.style.setProperty('--hx', at[0]); h.style.setProperty('--hy', at[1]); h.style.setProperty('--dark', 1 - from);
    cg.style.transition = 'none'; cg.style.filter = '';
    cg.appendChild(h);
    const PULSE = 1400, r0 = cg.clientHeight * .3, R = Math.hypot(cg.clientWidth, cg.clientHeight) * 1.1, t0 = performance.now();
    return new Promise(done => {
      const step = now => {
        const t = now - t0, beat = Math.sin(2 * Math.PI * t / 700);
        let r, bloom, p = 0;
        if (t < PULSE) { r = r0 * (1 + .12 * beat); bloom = .6 + .4 * beat; }
        else {
          p = Math.min(1, (t - PULSE) / ms);
          const e = p < .5 ? 2 * p * p : 1 - Math.pow(2 - 2 * p, 2) / 2;
          r = r0 + (R - r0) * e; bloom = (.6 + .4 * beat) * (1 - p);
        }
        h.style.setProperty('--r', r + 'px'); h.style.setProperty('--bloom', bloom.toFixed(3));
        if (p < 1 && !tools.skipping()) requestAnimationFrame(step); else { h.remove(); done(); }
      };
      requestAnimationFrame(step);
    });
  }
  SD.vn.acts.light = async (o, tools) => {
    const vn = document.getElementById('vn'), cg = vn && vn.querySelector('.vn-cg');
    const from = cg && /brightness\(([\d.]+)\)/.test(cg.style.filter) ? +RegExp.$1 : 1;
    if (cg && o.to >= 1 && o.ms && from < 1 && LAMP[vn.dataset.cg] && !matchMedia('(prefers-reduced-motion: reduce)').matches) return halo(cg, from, o.ms, tools);
    light(o.to, o.ms); if (o.ms) await tools.sleep(o.ms);
  };
  // The music comes in under the storm that's already playing.
  SD.vn.acts.music = async o => SD.audio.music(o.name, true);

  // Rain only where the tent flap stands open (the outline, as fractions of the painting, leaves out the table and
  // chair in front of it). It's drawn inside the still, so it pans and fades with it.
  const FLAP = { 'op-s10': [[.877, .185], [.893, .26], [.916, .42], [.935, .6], [.958, .78], [.975, .88], [.975, .95], [.88, .95],
    [.888, .72], [.8, .655], [.8, .6], [.826, .42], [.86, .26]] };
  let flap = null;
  SD.vn.acts.flaprain = async o => {
    if (flap) { flap.remove(); flap = null; }
    SD.audio.weather(o.on ? 'rain' : null);
    const vn = document.getElementById('vn'), pic = vn && vn.querySelector('.vn-cg .vn-pic:last-child'), poly = vn && FLAP[vn.dataset.cg];
    if (!o.on || !pic || !poly || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = flap = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    pic.appendChild(cv);
    const ctx = cv.getContext('2d'), xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const drops = Array.from({ length: 60 }, () => ({ x: x0 + Math.random() * (x1 - x0), y: y0 + Math.random() * (y1 - y0), v: .6 + Math.random() * .8, l: .02 + Math.random() * .03 }));
    let lastT = performance.now();
    const step = t => {
      if (flap !== cv || !cv.isConnected) return;
      const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
      const w = cv.width = cv.clientWidth, h = cv.height = cv.clientHeight;
      const at = (x, y) => SD.vn.onStill(x, y).map((v, i) => parseFloat(v) / 100 * (i ? h : w));
      ctx.save(); ctx.beginPath();
      poly.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](...at(...p)));
      ctx.clip();
      ctx.strokeStyle = 'rgba(200,215,240,.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      drops.forEach(d => {
        d.y += d.v * dt * 1.6; d.x -= d.v * dt * .05;
        if (d.y > y1) { d.y = y0 - d.l; d.x = x0 + Math.random() * (x1 - x0); }
        ctx.moveTo(...at(d.x, d.y)); ctx.lineTo(...at(d.x - d.l * .05, d.y + d.l));
      });
      ctx.stroke(); ctx.restore();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  // Where the ring is on the painting; js/vn.js puts that on screen after a phone's crop.
  const GLINT = { 'op-s5': [.53, .46], 'op-s9b': [.80, .58] };
  SD.vn.acts.glint = async function () {
    const vn = document.getElementById('vn'), cg = vn && vn.querySelector('.vn-cg');
    if (!cg) return;
    const at = SD.vn.onStill(...(GLINT[vn.dataset.cg] || [.5, .55]));
    const g = document.createElement('div');
    g.className = 'vn-glint'; g.style.setProperty('--gx', at[0]); g.style.setProperty('--gy', at[1]);
    cg.appendChild(g); requestAnimationFrame(() => g.classList.add('on'));
    setTimeout(() => g.remove(), 2200);
  };

  // "Skip intro", top right over the opening: straight to the files, where you pick your lead.
  function skipButton() {
    const b = document.createElement('button');
    b.id = 'op-skip'; b.type = 'button'; b.textContent = 'Skip intro ⏭';
    b.style.cssText = 'position:fixed;top:max(10px, env(safe-area-inset-top));right:10px;z-index:41;font:600 13px Nunito,sans-serif;min-height:44px;padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.45);color:#e9e6f2;cursor:pointer';
    b.onclick = e => { e.stopPropagation(); b.remove(); const k = document.querySelector('#vn .vn-skip'); if (k) k.click(); };
    document.body.appendChild(b);
    return b;
  }

  // ---------- Playing it before chapter 1 ----------
  K.installs.push(() => {
    SD.cast.man = { name: '???', title: '' };
    SD.ui.voice('man', 180);
    const W1 = SD.ch1;
    W1.opening = async function () {
      O.picked = null;
      SD.vn.addScenes(O.scenes());
      SD.audio.music(null);
      SD.audio.weather('tempest');
      const files = O.SHOTS.findIndex(s => s.files), btn = skipButton();
      await SD.vn.play(O.compile(O.SHOTS));
      btn.remove();
      // Either skip (this button or the dialogue box's) lands on the files, never past them.
      if (!O.picked) {
        light(1);
        await SD.vn.play(O.compile([{ music: 'story' }, { still: 's10', pan: 'still' }, ...O.SHOTS.slice(files)]));
      }
      light(1);
      SD.audio.weather(null);
      return O.picked || await W1.choose();
    };
  });
})();
