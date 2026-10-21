// Recorded voice lines for the visual-novel scenes: 'who|text' (or 'pray|text') to assets/audio/vo/<file>.mp3.
// js/vn.js plays one as its line types. Change a line's text and it goes quiet until it's recorded again.
(function () {
  SD.vo = Object.assign(SD.vo || {}, {
    "mira|Bram. Bram, love, look at me. Hold still. I've had my hand in worse than you.": 'mira-heal',
    "pray|I've never asked you for anything in my life. Not him. Take the rest of me, not him.": 'mira-pray',
    "mira|Bram?": 'mira-bram-q',
    "mira|Uptima.": 'mira-uptima',
    "bram|Put the kettle on, love. I've brought you a disaster.": 'bram-kettle',
    "kai|Hana? ...No. No, no, no. Hana.": 'kai-hana',
    "pray|Tell her I didn't leave. That's all. Just tell her.": 'kai-pray',
    "hana|Kai. Where were you?": 'hana-where',
    "kai|Hana. I tried. I swear I...": 'kai-tried',
    "kai|And ignored them.": 'kai-ignored',
    "pray|Let me choose.": 'seoyeon-pray',
    "jin|Oi, kid. Forms. I'm up first, so you owe me.": 'jin-forms',
    "seoyeon|Sahyung?": 'seoyeon-sahyung',
    "seoyeon|Who?": 'seoyeon-who',
    "dutch|Haven't done this since I was a boy. So I'll keep it short.": 'dutch-short',
    "pray|Let her wake up. Once. Then take whatever you want.": 'dutch-pray',
    "lina|Night, Dad. You knock like a bear.": 'lina-night',
    "dutch|Lina.": 'dutch-lina',
    "dutch|Who was on call?": 'dutch-oncall'
  });
})();
