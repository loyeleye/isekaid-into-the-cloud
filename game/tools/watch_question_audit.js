// Question audit for the Night Watch (Ladi, Nov 18: "the longest answer is usually correct").
// Run from game/: node tools/watch_question_audit.js. Prints how often the right answer is the longest or shortest choice, and each one where it's longest.
const fs=require('fs'),vm=require('vm');const ctx={window:{SD:{}},console};vm.createContext(ctx);
for(const f of ['js/watch-content.js','js/watch-town.js']) vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const items=[];const seen=new Set();(function walk(o){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);
 if(Array.isArray(o.choices)&&o.choices.length){if(typeof o.answer==='number')items.push({id:o.q,c:o.choices,a:o.answer});else if(o.choices[0].text)items.push({id:o.id,c:o.choices.map(x=>x.text),a:o.choices.findIndex(x=>x.best)});}
 for(const k in o)walk(o[k]);})(ctx.window.WATCH_CONTENT);
let L=0,M=0;const off=[];items.forEach(x=>{const l=x.c.map(s=>s.length),o=Math.max(...l.filter((_,i)=>i!==x.a));if(l[x.a]>o)L++;if(l[x.a]>o){M++;off.push(`${l[x.a]} vs ${o}: ${x.id.slice(0,60)} | ${x.c[x.a]}`);}});
console.log(`items ${items.length}, correct longest ${L} (${Math.round(100*L/items.length)}%), clearly longest ${M}`);off.forEach(s=>console.log(' ',s));
let sh=0;items.forEach(x=>{const l=x.c.map(s=>s.length);if(l[x.a]<Math.min(...l.filter((_,i)=>i!==x.a)))sh++;});console.log('correct shortest',sh);
const pos={};items.forEach(x=>{const k=x.c.length+':'+x.a;pos[k]=(pos[k]||0)+1});console.log(pos);
