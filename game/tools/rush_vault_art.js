// Placeholder sprites for the Records Vault (claim 6 of the Rush), drawn on a canvas in Chromium and saved as webp
// into assets/img/rush/vault/. js/rush.js loads them by file name (VAULT_ART), so the real art drops in by
// replacing a file at the same size. Run again only to redraw the placeholders: node tools/rush_vault_art.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'assets', 'img', 'rush', 'vault');
// name: [width, height]. What each shows is in the comment on its drawing below.
const SIZES = {
  folder: [220, 166], 'folder-done': [220, 166], 'folder-bounced': [220, 166], drawer: [216, 320], cart: [116, 130],
  'cart-bolted': [116, 130], desk: [302, 300], cabinet: [188, 340], tube: [120, 560], wheel: [260, 260]
};
const DRAW = String.raw`
const ink = '#1e0f08';
function folder(g, w, h, stamp) {
  // A manila record folder, closed, seen from the front: a tab on top, a sheet peeking out, a string tie.
  g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = 6;
  g.fillStyle = '#c99a4a'; g.beginPath(); g.moveTo(12, 34); g.lineTo(70, 34); g.lineTo(82, 14); g.lineTo(140, 14); g.lineTo(150, 34); g.lineTo(w - 12, 34); g.lineTo(w - 12, h - 10); g.lineTo(12, h - 10); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#f4ead2'; g.fillRect(24, 26, w - 60, 16); g.lineWidth = 3; g.strokeRect(24, 26, w - 60, 16);
  g.fillStyle = '#e2b562'; g.beginPath(); g.moveTo(12, 46); g.lineTo(w - 12, 46); g.lineTo(w - 12, h - 10); g.lineTo(12, h - 10); g.closePath(); g.fill(); g.lineWidth = 6; g.stroke();
  g.fillStyle = '#f4ead2'; g.fillRect(36, 64, 90, 22); g.lineWidth = 3; g.strokeRect(36, 64, 90, 22);
  g.strokeStyle = 'rgba(90,60,30,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(44, 75); g.lineTo(116, 75); g.stroke();
  g.strokeStyle = '#8a3a22'; g.lineWidth = 4; g.beginPath(); g.arc(w - 46, h - 52, 10, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(w - 46, h - 42); g.quadraticCurveTo(w - 70, h - 20, w - 90, h - 30); g.stroke();
  if (stamp) {
    g.save(); g.translate(w / 2, h / 2 + 18); g.rotate(-.18); g.strokeStyle = stamp[1]; g.fillStyle = stamp[1]; g.lineWidth = 6;
    g.strokeRect(-86, -22, 172, 44); g.font = '800 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(stamp[0], 0, 2); g.restore();
  }
}
const D = {
  folder: (g, w, h) => folder(g, w, h),
  'folder-done': (g, w, h) => folder(g, w, h, ['FILED', '#2a8a4a']),
  'folder-bounced': (g, w, h) => folder(g, w, h, ['THROTTLED', '#c0392b']),
  // The queue: a free-standing filing drawer pulled open, folders standing in it on end.
  drawer: (g, w, h) => {
    g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = 6;
    g.fillStyle = '#2f5646'; g.fillRect(18, 120, w - 36, h - 140); g.strokeRect(18, 120, w - 36, h - 140);
    g.fillStyle = '#1f3a30'; g.fillRect(30, 200, w - 60, 60); g.strokeRect(30, 200, w - 60, 60);
    g.fillStyle = '#c9a23a'; g.fillRect(w / 2 - 22, 224, 44, 10);
    g.fillStyle = '#3c6b57'; g.beginPath(); g.moveTo(8, 60); g.lineTo(w - 8, 60); g.lineTo(w - 20, 128); g.lineTo(20, 128); g.closePath(); g.fill(); g.stroke();
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#e2b562' : '#c99a4a'; g.fillRect(30 + i * 27, 22 + (i % 3) * 8, 24, 64); g.lineWidth = 3; g.strokeRect(30 + i * 27, 22 + (i % 3) * 8, 24, 64); }
    g.fillStyle = '#1a1410'; g.fillRect(24, h - 22, 20, 18); g.fillRect(w - 44, h - 22, 20, 18);
  },
  // Mira's station: a little wheeled step stool for reaching the drawers.
  cart: (g, w, h) => {
    g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = 5;
    g.fillStyle = '#6b4e2a'; g.fillRect(12, 20, w - 24, 22); g.strokeRect(12, 20, w - 24, 22);
    g.fillStyle = '#8a6a3a'; g.fillRect(22, 62, w - 44, 16); g.strokeRect(22, 62, w - 44, 16);
    g.fillStyle = '#4a3418'; [[18, 42, 10, 70], [w - 28, 42, 10, 70]].forEach(r => { g.fillRect(...r); g.strokeRect(...r); });
    g.fillStyle = '#222'; [26, w - 26].forEach(x => { g.beginPath(); g.arc(x, h - 12, 10, 0, Math.PI * 2); g.fill(); g.stroke(); });
  },
  // The same station chained to a ring in the floor: reserved.
  'cart-bolted': (g, w, h) => {
    D.cart(g, w, h);
    g.strokeStyle = '#9aa3a8'; g.lineWidth = 5; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(36 + i * 11, h - 30 + (i % 2) * 4, 7, 4, .3, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = ink; g.lineWidth = 4; g.fillStyle = '#c9a23a'; g.beginPath(); g.ellipse(w / 2 + 18, h - 8, 14, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  },
  // The records desk: a heavy desk with a card-index box and a green banker's lamp.
  desk: (g, w, h) => {
    g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = 6;
    g.fillStyle = '#5a3a1e'; g.fillRect(14, 150, w - 28, 26); g.strokeRect(14, 150, w - 28, 26);
    g.fillStyle = '#4a2e16'; g.fillRect(26, 176, 90, h - 186); g.strokeRect(26, 176, 90, h - 186); g.fillRect(w - 60, 176, 34, h - 186); g.strokeRect(w - 60, 176, 34, h - 186);
    g.fillStyle = '#c9a23a'; [206, 246].forEach(y => g.fillRect(60, y, 22, 7));
    g.fillStyle = '#7a5a30'; g.fillRect(40, 98, 96, 52); g.strokeRect(40, 98, 96, 52);
    for (let i = 0; i < 6; i++) { g.fillStyle = '#f4ead2'; g.fillRect(48 + i * 14, 84 + (i % 2) * 6, 10, 20); g.lineWidth = 2; g.strokeRect(48 + i * 14, 84 + (i % 2) * 6, 10, 20); }
    g.lineWidth = 6; g.fillStyle = '#c9a23a'; g.fillRect(208, 110, 10, 40); g.strokeRect(208, 110, 10, 40); g.beginPath(); g.ellipse(213, 148, 30, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#2f9a5a'; g.beginPath(); g.moveTo(166, 104); g.quadraticCurveTo(213, 60, 262, 104); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,240,160,.35)'; g.beginPath(); g.moveTo(170, 106); g.lineTo(258, 106); g.lineTo(280, 150); g.lineTo(150, 150); g.closePath(); g.fill();
  },
  // One partition: a tall dark-green filing cabinet, three drawers, empty brass label holders.
  cabinet: (g, w, h) => {
    g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = 7;
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#1f3a30'); gr.addColorStop(.5, '#2f5646'); gr.addColorStop(1, '#1a3128');
    g.fillStyle = gr; g.fillRect(8, 8, w - 16, h - 16); g.strokeRect(8, 8, w - 16, h - 16);
    for (let j = 0; j < 3; j++) {
      const y = 22 + j * (h - 44) / 3, dh = (h - 44) / 3 - 12;
      g.fillStyle = 'rgba(10,22,16,.45)'; g.fillRect(22, y, w - 44, dh); g.lineWidth = 3; g.strokeStyle = 'rgba(160,200,170,.35)'; g.strokeRect(22, y, w - 44, dh);
      g.fillStyle = '#c9a23a'; g.fillRect(w / 2 - 30, y + dh * .62, 60, 10); g.fillStyle = '#e8dcc0'; g.fillRect(w / 2 - 24, y + 12, 48, 20);
    }
  },
  // The entry: a brass pneumatic tube down from the ceiling, a glass window part way, a flared mouth at the bottom.
  tube: (g, w, h) => {
    g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = 6;
    const br = g.createLinearGradient(20, 0, w - 20, 0); br.addColorStop(0, '#6b4e1c'); br.addColorStop(.45, '#e2bd62'); br.addColorStop(1, '#5a3f14');
    g.fillStyle = br; g.fillRect(30, 0, w - 60, h - 90); g.strokeRect(30, -6, w - 60, h - 84);
    g.fillStyle = 'rgba(200,230,240,.5)'; g.fillRect(38, 200, w - 76, 120); g.lineWidth = 4; g.strokeRect(38, 200, w - 76, 120);
    g.fillStyle = '#c99a4a'; g.fillRect(48, 236, w - 96, 50);
    g.fillStyle = '#8a6726'; [120, 360].forEach(y => { g.fillRect(22, y, w - 44, 18); g.strokeRect(22, y, w - 44, 18); });
    g.fillStyle = br; g.beginPath(); g.moveTo(30, h - 92); g.lineTo(w - 30, h - 92); g.lineTo(w - 6, h - 12); g.lineTo(6, h - 12); g.closePath(); g.fill(); g.lineWidth = 6; g.stroke();
    g.fillStyle = '#140c06'; g.beginPath(); g.ellipse(w / 2, h - 12, w / 2 - 8, 10, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  },
  // The lever: a vault door's spoked brass handwheel. It spins when pulled.
  wheel: (g, w, h) => {
    const c = w / 2, r = w / 2 - 14; g.strokeStyle = ink; g.lineCap = 'round';
    g.lineWidth = 30; g.strokeStyle = '#6b4e1c'; g.beginPath(); g.arc(c, c, r - 10, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 18; g.strokeStyle = '#e2bd62'; g.beginPath(); g.arc(c, c, r - 10, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineWidth = 16; g.strokeStyle = '#6b4e1c'; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * (r - 10), c + Math.sin(a) * (r - 10)); g.stroke(); g.lineWidth = 8; g.strokeStyle = '#d8b25a'; g.stroke();
      g.fillStyle = '#c8473b'; g.beginPath(); g.arc(c + Math.cos(a) * (r + 2), c + Math.sin(a) * (r + 2), 12, 0, Math.PI * 2); g.fill(); g.lineWidth = 4; g.strokeStyle = ink; g.stroke(); }
    g.fillStyle = '#c9a23a'; g.beginPath(); g.arc(c, c, 30, 0, Math.PI * 2); g.fill(); g.lineWidth = 6; g.strokeStyle = ink; g.stroke();
  }
};`;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(), pg = await browser.newPage();
  for (const [name, [w, h]] of Object.entries(SIZES)) {
    const url = await pg.evaluate(([src, name, w, h]) => {
      const D = new Function(src + '; return D;')();
      const c = document.createElement('canvas'); c.width = w; c.height = h; D[name](c.getContext('2d'), w, h);
      return c.toDataURL('image/webp', 0.9);
    }, [DRAW, name, w, h]);
    fs.writeFileSync(path.join(OUT, name + '.webp'), Buffer.from(url.split(',')[1], 'base64'));
    console.log(name, w + 'x' + h);
  }
  await browser.close();
})();
