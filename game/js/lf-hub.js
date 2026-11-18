// One card for Dutch's two games (Ladi, Nov 17: "fold the selection into a menu before starting", like Incident
// Commander's pager board / live shift choice). The title's Lost and Found card opens a chooser in front of two doors:
// the Sorting Floor (js/mode-floor.js, the request-path game) or the Lost and Found's nights (js/mode-pop.js, staked
// bank questions). The Sorting Floor stays registered (folded: true keeps it off the carousel and the picker), so its
// own stage, music, stings, saves and checks are unchanged.
//   - The chooser's stage is 'lf': Dutch from behind, facing the two doors (assets/img/stage/lf-wide.webp, lf-tall.webp),
//     with the Sorting Floor's song, which carries on into either game (js/mode-stage.js keeps a song already playing).
//   - A game in progress shows Resume on its door and its status line; the card shows whichever is in progress.
// Loads after js/mode-pop.js and js/mode-floor.js.
(function () {
  const M = SD.modes, U = SD.ui;
  if (!M || !M.get) return;
  const pop = M.get('pop'), floor = M.get('floor');
  if (!pop || !floor) return;
  const esc = s => U.esc(String(s == null ? '' : s));
  const SAY = 'Two doors. Left\'s the floor: tickets down the chute all night, and you build what catches them. Right\'s the heap: everything in it says it\'s somebody\'s. Prove it.';
  const NAME = 'The Lost and Found';
  const STAGE = { id: 'lf', name: NAME };
  const stat = d => { try { return d.status ? d.status() || '' : ''; } catch (e) { return ''; } };

  floor.folded = true;
  // Each door's exam domains (Ladi, Nov 17): the floor's debriefs ask about the pieces played, which are mostly
  // Development questions with Troubleshooting next (SQS, SNS, EventBridge, Lambda concurrency, retries); the heap asks all four.
  const dom = list => { const t = M.domainLine ? M.domainLine(list) : ''; return t ? `<span class="lf-dom">${esc(t)}</span>` : ''; };
  function hub() {
    if (SD.modeStage && SD.modeStage.enter) SD.modeStage.enter(STAGE);
    const fs = stat(floor), ps = stat(pop);
    const b = U.panel(`<p class="lf-say"><b>Dutch:</b> ${esc(SAY)}</p>
      <div class="opts">
        <button class="opt md-mode" id="lf-floor"><span class="md-n">📦 ${fs ? 'Resume the Sorting Floor' : 'The Sorting Floor'}</span>${dom([1, 4])}<span class="small">Every claim is a workload. Build the architecture that handles it: queues, bins, bells and rules.${fs ? ' ' + esc(fs.replace(/^Resume · /, '')) + '.' : ''}</span></button>
        <button class="opt md-mode" id="lf-heap"><span class="md-n">🧳 ${ps ? 'Resume the Lost and Found' : 'The heap: stake and prove'}</span>${dom(0)}<span class="small">Exam questions from every domain. Stake your cards before you read the check, then prove it.${ps ? ' ' + esc(ps.replace(/^Resume · /, '')) + '.' : ''}</span></button>
      </div>`, { title: NAME });
    b.querySelector('#lf-floor').onclick = () => { remember('floor'); floor.start({}); };
    // The heap's own def was replaced on the registry (above), so it isn't wrapped by js/mode-stage.js: enter its stage here.
    b.querySelector('#lf-heap').onclick = () => { remember('pop'); if (SD.modeStage && SD.modeStage.enter) SD.modeStage.enter({ id: 'pop', name: NAME }); pop.start({}); };
  }
  // Which door was last used, so the card's status can lead with it.
  function remember(id) { try { const S = SD.state; if (S.save) { S.save.lfLast = id; S.persist(); } } catch (e) { /* fine */ } }

  M.register({
    id: 'pop', name: NAME, minutes: 'about 18', host: 'Dutch',
    blurb: 'Two doors in Dutch\'s basement: the Sorting Floor, where you build what handles the load, or the heap, where you stake and prove.',
    start: hub, sim: pop.sim,
    status: () => {
      const fs = stat(floor), ps = stat(pop);
      const last = SD.state && SD.state.save && SD.state.save.lfLast;
      const f = fs && 'Sorting Floor · ' + fs.replace(/^Resume · /, ''), p = ps && 'Heap · ' + ps.replace(/^Resume · /, '');
      const one = last === 'pop' ? (p || f) : (f || p);
      return one ? 'Resume · ' + one : '';
    }
  });
  SD.lfHub = { open: hub, floor, pop };

  const css = document.createElement('style');
  css.textContent = `
    .lf-say { font-size: 15px; line-height: 1.4; margin: 0 0 10px; }
    .lf-dom { display: block; margin: 1px 0 2px; color: #e9c56d; font-size: 12px; font-weight: 700; letter-spacing: .02em; }
    /* The chooser sits high and only as tall as its two doors' buttons, so Dutch stays in view below it. */
    body.in-mode[data-stage="lf"] #panel .win { min-height: 0; align-self: flex-start; margin-top: 12px; }
    @media (orientation: portrait) and (max-width: 700px) { body.in-mode[data-stage="lf"] #panel .win { align-self: flex-end; margin-top: 0; } }`;
  document.head.appendChild(css);
})();
