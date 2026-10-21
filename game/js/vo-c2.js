// Chapter 2 act 1's recorded voice lines: 'who|text' to assets/audio/vo/<file>.mp3, as in js/vo.js. The visual-novel
// scenes (js/vn.js) play them as they type. Seymour's bunker goes through the dialogue box (SD.ui.dialog), which has
// no voices, so this file also listens to the box: each new line it starts typing plays its recording, if it has one.
// A line whose text changes goes quiet until it's recorded again. The text matches the act 1 world (js/c2-world.js)
// and the scenes it shares with js/vec-ch2.js.
(function () {
  const LINES = {
    'kai|Somebody say it. We deleted her.': 'kai-c2-edge-01',
    'seoyeon|You played the card, Kai.': 'seoyeon-c2-edge-01',
    'kai|Because every one of you said it was the only way.': 'kai-c2-edge-02',
    'dutch|Nobody said anything. Freya did. Every one of us heard what we wanted to.': 'dutch-c2-edge-01',
    'mira|Enough. Sit down, all of you. Eat something.': 'mira-c2-edge-01',
    'dutch|Same handwriting. Same person played all four of us.': 'dutch-c2-edge-02',
    'mira|Then we stop blaming each other, and start on her.': 'mira-c2-edge-02',
    "freya|Welcome to the Free Tier, everyone! Everything's free!": 'freya-c2-tower',
    "kai|Everything's free. Great. I've worked in places like that.": 'kai-c2-tower',
    "seymour|Go away. I'm offline. That's the whole point.": 'seymour-c2-01',
    "seymour|I know. I have one tape, made long before the end. Kyu's on it. I've tested it: it restores.": 'seymour-c2-02',
    'seymour|And keep the tape where nobody can touch it. Yes. Close the hatch on your way out.': 'seymour-c2-03',
    'coo|We should call it something. Every post office has a name.': 'coo-c2-fire-01',
    "faithful|Nobody here is on anyone's free tier. We're just free.": 'faithful-c2-fire',
    "coo|The Free Cloud! I'll need letterhead.": 'coo-c2-fire-02',
    "freya|Give me Thornwick's post, love, and every letter goes through. Tilly's too. It's free.": 'freya-c2-postbox-01',
    'freya|Take your time. Everything here does.': 'freya-c2-postbox-02'
  };
  // kai-c2-tower wasn't recorded (quota): left out until its file is in assets/audio/vo/.
  const MISSING = ['kai-c2-tower'];
  Object.keys(LINES).forEach(k => { if (MISSING.includes(LINES[k])) delete LINES[k]; });
  SD.vo = Object.assign(SD.vo || {}, LINES);

  // The dialogue box: remember each call's lines in order, and voice each one as it starts typing.
  const hook = () => {
    const U = SD.ui, el = document.getElementById('dlg-text');
    if (!U || !U.dialog || !el || U.dialog.vo2) return;
    let queue = [], prev = '';
    const dialog = U.dialog;
    U.dialog = function (lines) {
      queue = (Array.isArray(lines) ? lines : []).map(l => (l && typeof l === 'object' ? (l.s || '') + '|' + (typeof l.t === 'string' ? l.t : '') : ''));
      prev = '';
      return dialog.apply(this, arguments);
    };
    U.dialog.vo2 = true;
    new MutationObserver(() => {
      const cur = el.textContent;
      if (cur && (!prev || !cur.startsWith(prev))) {
        const k = queue.shift();
        if (k && SD.vo[k] && SD.audio && SD.audio.voice) SD.audio.voice(SD.vo[k]);
      }
      prev = cur;
    }).observe(el, { childList: true, characterData: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook, { once: true }); else hook();
})();
