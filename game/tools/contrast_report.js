// Summarises tools/contrast_hook.js's flags: one line per distinct element style (path, colour), worst ratio first,
// with the checks and widths it showed up in and an example screenshot.   node tools/contrast_report.js dir [--md]
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || 'contrast-out', md = process.argv.includes('--md');
const f = path.join(dir, 'flags.jsonl');
if (!fs.existsSync(f)) { console.log('no flags: every text measured passes AA'); process.exit(0); }
const rows = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
const key = r => r.path.replace(/\.(is-|on|sel|picked|active)[\w-]*/g, '') + ' | rgba(' + r.fg.join(',') + ') x' + r.op.toFixed(2);
const groups = new Map();
for (const r of rows) {
  const k = key(r), g = groups.get(k) || { k, n: 0, min: 99, tags: new Set(), widths: new Set(), ex: r, texts: new Set() };
  g.n++; g.tags.add(r.shot.replace(/-\d+-\d+$/, '')); g.widths.add(r.width); g.texts.add(r.text);
  if (r.ratio < g.min) { g.min = r.ratio; g.ex = r; }
  groups.set(k, g);
}
const list = [...groups.values()].sort((a, b) => a.min - b.min);
for (const g of list) {
  const e = g.ex, line = `${g.min.toFixed(2)}${e.large ? ' (large)' : ''}${e.disabled ? ' [disabled]' : ''}${e.shadow ? ' [shadow]' : ''}  ${g.k}\n      "${[...g.texts].slice(0, 3).join('" / "')}"  bg rgb(${e.bg})  ${[...g.tags].join(',')} @${[...g.widths].join('/')}  e.g. ${e.shot}.png${e.src ? '\n      from: ' + e.src : ''}`;
  console.log(md ? '- ' + line : line);
}
console.log(`${list.length} distinct styles, ${rows.length} flags`);
