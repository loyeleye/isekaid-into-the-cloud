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
    // The climb-only edge (js/vec-ch2.js, in the cutscene viewer) cuts her off with "We'll...": same recording.
    "mira|Enough. Sit down, all of you. Eat something. We'll...": 'mira-c2-edge-01',
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
    'freya|Take your time. Everything here does.': 'freya-c2-postbox-02',
    // Mira's other spoken lines, both acts.
    'mira|The way I pretend to hate. Listen. The new letter.': 'mira-c2-wagon',
    'mira|Not in the dark. Not like this. The basket first.': 'mira-c2-basket',
    'mira|The band played here on Sundays. Badly. Everyone came anyway.': 'mira-c2-band',
    "mira|Seymour. It's Mira. Freya has Kyu.": 'mira-c2-seymour',
    'mira|Then restore her.': 'mira-c2-restore',
    'mira|...Home.': 'mira-c2-home',
    "mira|Thornwick. It's exactly how I left it. That's what's wrong with it.": 'mira-c2-thornwick',
    "mira|They've drawn the wrong arm.": 'mira-c2-arm',
    'mira|Tilly...': 'mira-c2-tilly',
    "mira|You didn't ask me what I want. You told me what you want.": 'mira-c2-unmake-01',
    'mira|No, Kai.': 'mira-c2-unmake-02',
    "mira|People look at the eye first. Let them. Then they look at your hands, and that's where you tell them who you are.": 'mira-c2-sunlight-01',
    "mira|And I've delivered six babies with it.": 'mira-c2-sunlight-02',
    'mira|And somewhere at the bottom of all this, someone reads them.': 'mira-c2-office',
    "mira|Sized right, he finishes. That's all they needed.": 'mira-c2-bench',
    'mira|Nobody gets left in there. Not even you.': 'mira-c2-chains',
    'mira|He was there.': 'mira-c2-anselm',
    'mira|Please leave.': 'mira-c2-leave',
    "mira|She's better off hating a beast than having one for a mother.": 'mira-c2-beast',
    'mira|How old were you?': 'mira-c2-howold',
    'mira|Patient. It keeps coming back with something wrong with it.': 'mira-c2-patient',
    'mira|Now you know.': 'mira-c2-felt',
    'mira|He died on that stair.': 'mira-c2-stair',
    'mira|Someone carried her out.': 'mira-c2-ferry',
    'mira|Yes.': 'mira-c2-yes',
    'mira|I know.': 'mira-c2-iknow',
    "mira|I'll take them myself. Door by door.": 'mira-c2-door',
    "mira|You'd have said no.": 'mira-c2-prayer',
    'mira|Every day.': 'mira-c2-everyday',
    "mira|It wasn't me, Bram. It was never me.": 'mira-c2-bram',
    'mira|I know every stone of this.': 'mira-c2-stones',
    'mira|I do. Keep walking.': 'mira-c2-walking',
    "mira|I'm asking you.": 'mira-c2-asking',
    "mira|Thornwick's court can decide what you are.": 'mira-c2-court'
  };
  SD.vo = Object.assign(SD.vo || {}, LINES);

  // The dialogue box: remember each call's lines in order, and voice each one as it starts typing.
  const hook = () => {
    const U = SD.ui, el = document.getElementById('dlg-text');
    if (!U || !U.dialog || !el || U.dialog.vo2 || typeof MutationObserver !== 'function') return;
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
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook, { once: true }); else hook();
})();
