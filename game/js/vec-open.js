// The vector proof of concept's opening, "the files": Freya's pavilion at night, the man in the dark across the desk,
// the four folders and the prayers stamped UNANSWERED, then choosing whose file to keep. It plays before chapter 1's
// prologues (js/ch1-world.js W1.opening), and every picture is drawn in code (js/vec-scenes.js, js/vec-cast.js).
//
// The scene is a shot list, so it can be re-cut by editing data. A shot is one of:
//   { shot, bg | cg, pan, fx: [...], cast: { who: [face, pos] }, hide: [...], lines: [[who, text, face], ...] }
//   { shot, card: lead }     a file opens: the lead's intro card freezes with the prayer stamped UNANSWERED
//   { shot, files: true }    the four files become the lead select; the chosen file goes in the next shots as 'chosen'
// compile() turns the list into js/vn.js steps. The words are the script's (Docs, "Opening scene: the files").
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

  O.SHOTS = [
    { shot: 'P1', bg: 'open-pav', fx: ['rain'], cast: { freya: ['tired', 'left'], man: ['neutral', 'right'] }, lines: [
      ['narr', 'Freya\'s pavilion, at night. Rain drums on the canvas. One lamp, a camp desk, and four manila folders stamped FREE TIER · APPLICATION.'],
      ['narr', 'The man across from her sits outside the lamplight in white gloves. As he sits, he slides a ring on over the left one: a snake eating its own tail.'],
      ['man', 'You promised an army.'],
      ['freya', 'I promised the right people. Armies pray. These four stopped.', 'warm']
    ] },
    { shot: 'P2', cg: 'open-hands', pan: 'in', lines: [['narr', 'She pushes the first folder into the light.']] },
    { shot: 'F1', card: 'mira' },
    { shot: 'P1', bg: 'open-pav', lines: [
      ['man', 'A village healer. You\'ve brought me a nurse.'],
      ['freya', 'The Church brought you a beast, and then forgot which way to point her. Her husband died on a tower stair with her hands on the wound. She prayed the whole time.', 'earnest'],
      ['man', 'Healers don\'t win wars.'],
      ['freya', 'This one doesn\'t stop when the patient does. That\'s the trouble with her. It\'s also the point.', 'neutral']
    ] },
    { shot: 'F2', card: 'kai' },
    { shot: 'P1', bg: 'open-pav', lines: [
      ['man', 'A cook.'],
      ['freya', 'A cook who climbed out of the Abyss with his bare hands. Nobody climbs out of the Abyss.', 'amused'],
      ['man', 'Late, I hear.'],
      ['freya', 'One day late. He\'ll never forgive himself for that day, which means he\'ll never stop. And that hand of his undoes things: blessings, barriers, whatever a god put there.', 'earnest']
    ] },
    { shot: 'P3', cg: 'open-ring', pan: 'in', lines: [['man', 'Whatever a god put there.']] },
    { shot: 'P1', bg: 'open-pav', lines: [['freya', 'That\'s what I said.', 'neutral']] },
    { shot: 'F3', card: 'seoyeon' },
    { shot: 'P1', bg: 'open-pav', lines: [
      ['man', 'She\'s a child.'],
      ['freya', 'She\'s twenty. Raised at the table of the man who burned her family, and trained by the best sword sect alive. She froze once.', 'neutral'],
      ['man', 'Once is enough to get someone killed.'],
      ['freya', 'It was.', 'sad'],
      ['freya', 'She\'s the only one of the four who\'s afraid of herself. That\'s who you want making the hard choices.', 'sad']
    ] },
    { shot: 'F4', card: 'dutch' },
    { shot: 'P1', bg: 'open-pav', lines: [
      ['man', 'A janitor.'],
      ['freya', 'The Crown\'s best enforcer, until he wasn\'t. He took a mop and a night shift to find whoever pushed his daughter off a tower, and he found the wrong man.', 'neutral'],
      ['man', 'He\'ll ask questions.'],
      ['freya', 'Good. Somebody on this crew should.', 'amused'],
      ['man', 'And when he asks you?'],
      ['freya', 'Then I\'ll answer him.', 'unreadable']
    ] },
    { shot: 'P4', cg: 'open-files', pan: 'up', lines: [
      ['narr', 'The four folders lie open in the lamplight.'],
      ['man', 'Four broken people against a goddess. They\'ll lose.']
    ] },
    { shot: 'P1', bg: 'open-pav', lines: [
      ['freya', 'Four people she ignored. She has a room in her temple stacked to the ceiling with prayers, ten thousand years of them, and she\'s never opened one. She had everything she needed to help them, and she let them bleed.', 'frustrated'],
      ['man', 'And the goddess? Does she pay?'],
      ['freya', 'We make her listen.', 'cold'],
      ['freya', 'If paying is what it takes, she\'ll pay.', 'cold']
    ] },
    { shot: 'P3', cg: 'open-ring', pan: 'up', lines: [['man', 'Then you\'ll want me ready, my lady. And I\'d like a seat near the front.']] },
    { shot: 'P1', bg: 'open-pav', lines: [
      ['freya', 'Freya, love. We\'re not in church.', 'neutral'],
      ['freya', 'I\'ll send for you when it\'s time.', 'warm']
    ] },
    { shot: 'P2', cg: 'open-hands', pan: 'left', lines: [
      ['narr', 'His gloved fingers come to rest on the files.'],
      ['freya', 'Leave those.'],
      ['man', 'Of course.']
    ] },
    { shot: 'P1', bg: 'open-pav', hide: ['man'], lines: [['narr', 'At the flap he slides the ring back under his glove, and goes out into the rain. Freya is alone with the four files.']] },
    { shot: 'SEL', files: true },
    { shot: 'P2', cg: 'open-hand-chosen', pan: 'in', lines: [['narr', 'She closes the other three, and keeps her hand flat on yours.']] },
    { shot: 'P1', bg: 'open-pav', cast: { freya: ['smirk', 'center'] }, lines: [['freya', 'Good. Let\'s get to work, then.', 'smirk']] }
  ];

  // Shots to js/vn.js steps.
  O.compile = function (shots) {
    const steps = [];
    shots.forEach(s => {
      if (s.card) { steps.push(['act', 'vcard', { lead: s.card }]); return; }
      if (s.files) { steps.push(['act', 'vfiles', {}]); return; }
      if (s.bg) steps.push(['bg', s.bg]);
      if (s.cg) steps.push(['cg', s.cg, s.pan || 'in']);
      (s.fx || []).forEach(f => steps.push(['fx', f]));
      (s.hide || []).forEach(w => steps.push(['hide', w]));
      Object.entries(s.cast || {}).forEach(([w, [face, pos]]) => steps.push(['show', w, face, pos]));
      (s.lines || []).forEach(l => steps.push(l));
    });
    return steps;
  };

  if (!K.on) return;

  // ---------- The two moments you play ----------
  const esc = s => SD.ui.esc(s);
  const css = document.createElement('style');
  css.textContent = `
#vn .vn-panel.vcard, #vn .vn-panel.vfiles { width: min(560px, calc(100% - 20px)); max-height: calc(100vh - 40px); overflow-y: auto; padding: 0; background: none; border: 0; }
.vc-card { position: relative; display: grid; grid-template-columns: 38% 1fr; gap: 14px; align-items: start; padding: 18px 16px 16px; background: linear-gradient(180deg, #ecdfba, #dcc996); color: #2b2340; border-radius: 6px 6px 10px 10px; box-shadow: 0 14px 40px rgba(0,0,0,.6), inset 0 0 0 2px rgba(43,35,64,.25); text-align: left; transform: rotate(-1deg); }
.vc-card::before { content: "FREE TIER · APPLICATION"; position: absolute; top: -13px; left: 18px; padding: 3px 12px; font: 800 10px ui-monospace, monospace; letter-spacing: .08em; color: #2b2340; background: #d9b878; border-radius: 6px 6px 0 0; }
.vc-por { background: #3a3550; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.4); transform: rotate(2deg); aspect-ratio: 120 / 140; overflow: hidden; }
.vc-por img { width: 100%; height: 100%; object-fit: cover; display: block; }
.vc-txt small { font: 700 11px ui-monospace, monospace; letter-spacing: .08em; opacity: .7; }
.vc-txt b { display: block; font: 700 clamp(20px, 5vw, 26px) Cinzel, serif; margin: 2px 0; }
.vc-txt i { display: block; font: 600 13px Nunito, sans-serif; font-style: normal; opacity: .8; }
.vc-txt p { margin: 10px 0 6px; font: 600 15px/1.35 Nunito, sans-serif; }
.vc-txt q { display: block; margin-top: 8px; padding: 8px 10px; font: italic 400 15px/1.4 Nunito, sans-serif; background: rgba(255,255,255,.45); border-left: 3px solid #8a2a34; }
.vc-stamp { position: absolute; right: 10px; bottom: 54px; padding: 6px 12px; font: 800 clamp(20px, 5.5vw, 28px) ui-monospace, monospace; color: #c0202e; border: 4px solid #c0202e; border-radius: 4px; transform: rotate(-12deg) scale(2.6); opacity: 0; mix-blend-mode: multiply; pointer-events: none; }
.vc-stamp.on { animation: vcStamp .28s cubic-bezier(.3, 1.6, .5, 1) forwards; }
@keyframes vcStamp { to { transform: rotate(-12deg) scale(1); opacity: .88; } }
.vc-card .vc-go, .vf-keep { grid-column: 1 / -1; justify-self: end; padding: 9px 18px; font: 700 14px Nunito, sans-serif; color: #fff; background: #2b2340; border: 0; border-radius: 6px; cursor: pointer; }
.vc-card .vc-go[disabled] { opacity: .35; }
.vf-head { margin: 0 0 10px; padding: 12px 14px; color: #e9e6f2; background: rgba(8,7,14,.88); border: 1px solid rgba(255,255,255,.16); border-radius: 10px; font: 600 14px/1.4 Nunito, sans-serif; text-align: left; }
.vf-head b { display: block; font: 700 15px Cinzel, serif; letter-spacing: .08em; margin-bottom: 2px; }
.vf-file { display: block; width: 100%; margin: 0 0 8px; padding: 0; border: 0; background: none; text-align: left; cursor: pointer; color: #2b2340; }
.vf-tab { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: linear-gradient(180deg, #e2cf9a, #d4ba7c); border-radius: 8px 8px 8px 8px; box-shadow: 0 3px 0 rgba(0,0,0,.35); font: 700 16px Cinzel, serif; }
.vf-tab small { font: 700 11px ui-monospace, monospace; color: #8a2a34; }
.vf-file.open .vf-tab { border-radius: 8px 8px 0 0; }
.vf-body { display: none; grid-template-columns: 30% 1fr; gap: 12px; padding: 12px 14px 14px; background: #ecdfba; border-radius: 0 0 8px 8px; font: 600 14px/1.35 Nunito, sans-serif; }
.vf-file.open .vf-body { display: grid; }
.vf-body q { display: block; margin-top: 6px; font-style: italic; font-weight: 400; }
.vf-body .vc-por { transform: none; }
`;
  document.head.appendChild(css);

  const portrait = id => `<div class="vc-por"><img src="${K.fig(id, 'neutral', 'head')}" alt=""></div>`;
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
      p.querySelectorAll('.vf-keep').forEach(b => b.addEventListener('click', () => { O.picked = b.dataset.keep; tools.sfx('ok'); done(); }));
    });
    SD.vn.addScenes({ 'open-hand-chosen': { src: K.scenes['open-hand-' + O.picked], label: 'Her hand on your file' } });
    tools.closePanel();
  };

  // ---------- Playing it before chapter 1 ----------
  K.installs.push(() => {
    SD.cast.man = { name: '???', title: '' };
    SD.ui.voice('man', 180);
    const W1 = SD.ch1;
    W1.opening = async function () {
      O.picked = null;
      // Freya at night, jacket off; the day's Freya comes back for the prologues.
      const day = SD.vn.art.sprites.freya;
      const night = ['tired', 'warm', 'earnest', 'neutral', 'amused', 'sad', 'unreadable', 'frustrated', 'cold', 'smirk'];
      SD.vn.addSprites({ freya: { faces: Object.fromEntries(night.map(f => [f, K.fig('freyan', f, 'bust')])) }, man: { faces: { neutral: K.fig('man', 'neutral', 'bust') } } });
      SD.audio.music('story');
      await SD.vn.play(O.compile(O.SHOTS));
      SD.vn.addSprites({ freya: day });
      return O.picked || await W1.choose();
    };
  });
})();
