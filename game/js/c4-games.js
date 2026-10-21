// The minigames of chapter 4's overworld (js/c4-world.js). Each opens with a prediction you make before you see the
// answer, then lets you play it out ("predict, then play"). Three small engines, and the games built on them:
//   door   a knowledge gate: build the rule (a security group rule, an ACL entry, an endpoint, a key policy line)
//          from chips, and try it on the gate
//   sort   put each thing where it belongs (packets through a gate, carts on a route table, secrets in a vault,
//          travellers at a guild gate), then check; wrong rows say why and stay open
//   order  tap the steps in the order they happen (envelope encryption, the Design Board's sign-in)
// The world asks the typed questions and the bank questions itself. AWS facts follow the current AWS documentation
// (VPC security groups and network ACLs, route tables, NAT gateways, VPC endpoints, Lambda in a VPC, IAM policy
// evaluation, KMS envelope encryption, key policies, grants and rotation, Secrets Manager and Parameter Store, Macie,
// S3 server-side encryption, Cognito tokens, API Gateway authorizers, GuardDuty and its neighbours, WAF and Shield).
// Every explanation is written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const U = SD.ui, S = SD.state, AU = SD.audio, Q = SD.quiz;
  const G = SD.c4games = {};
  const esc = s => U.esc(s);

  const css = document.createElement('style');
  css.textContent = `
.g4 { text-align: left; }
.g4-rule { font: 12px/1.45 ui-monospace, monospace; color: #ffd28a; background: #2a2236; border-radius: 6px; padding: 6px 8px; margin: 0 0 8px; white-space: pre-wrap; overflow-x: auto; }
.g4-note { min-height: 1.4em; margin: 8px 0 0; } .g4-note.ok { color: #7fe0a0; } .g4-note.bad { color: #ff9aa8; }
.g4-predict { border-left: 3px solid #ffd24a; padding-left: 10px; margin-bottom: 10px; }
.g4-predict b { color: #ffd24a; font-size: 12px; letter-spacing: .06em; }
.g4 .opts.col { display: flex; flex-direction: column; gap: 8px; } .g4 .opts.col .opt { text-align: left; min-height: 44px; }
.g4-field { margin: 8px 0; } .g4-field > b { display: block; font-size: 12px; color: #b7b0cc; letter-spacing: .04em; margin-bottom: 4px; }
.g4-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.g4-chips button { min-height: 44px; min-width: 44px; padding: 6px 10px; font: 13px ui-monospace, monospace; }
.g4-chips button.on, .g4-row button.on { background: var(--blue); color: #fff; }
.g4-row { display: flex; align-items: center; gap: 6px; margin: 8px 0; flex-wrap: wrap; padding: 6px 0; border-top: 1px solid rgba(255,255,255,.1); }
.g4-row > span { flex: 1 1 100%; font-size: 14px; }
.g4-row button { min-height: 44px; padding: 6px 10px; font-size: 13px; flex: 1 1 auto; }
.g4-row .why { flex-basis: 100%; font-size: 12px; margin: 2px 0 0; } .g4-row .why.ok { color: #7fe0a0; } .g4-row .why.bad { color: #ff9aa8; }
.g4-row.done button { opacity: .55; }
.g4-steps { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
.g4-steps button { min-height: 44px; text-align: left; }
.g4-done { counter-reset: s; margin: 6px 0; padding-left: 0; list-style: none; }
.g4-done li { counter-increment: s; font-size: 13px; padding: 4px 0 4px 26px; position: relative; color: #d9f5e0; }
.g4-done li::before { content: counter(s); position: absolute; left: 0; top: 3px; width: 18px; height: 18px; border-radius: 9px; background: #2c8a4b; color: #fff; font: 700 11px/18px sans-serif; text-align: center; }
/* Phone pass: these panels are parchment, so the light-on-dark colours above are re-inked to be read at arm's length,
   and the long step and bin labels use the body font instead of the heading capitals. */
.g4-note.ok, .g4-row .why.ok { color: #17582d; } .g4-note.bad, .g4-row .why.bad { color: #a3192e; }
.g4-note.ok, .g4-note.bad { font-weight: 600; }
.g4-predict { border-left-color: #c8901a; } .g4-predict b { color: #6e4700; }
.g4-field > b { color: #4a4458; }
.g4-row { border-top-color: rgba(43,35,64,.18); }
.g4-done li { color: #1e3a28; }
.g4-steps button, .g4-row button { font-family: var(--f-body); font-variant: normal; text-transform: none; letter-spacing: 0; font-weight: 600; font-size: 14px; line-height: 1.35; }
`;
  document.head.appendChild(css);

  function note(b, text, ok) { const n = b.querySelector(':scope > .g4-note') || b.querySelector('.g4-note'); n.textContent = text; n.className = 'g4-note ' + (ok ? 'ok' : 'bad'); if (text && n.scrollIntoView) n.scrollIntoView({ block: 'nearest' }); }
  const cont = (b, label) => new Promise(res => {
    const go = document.createElement('button'); go.className = 'primary'; go.id = 'g4-cont'; go.textContent = label || 'Continue';
    b.appendChild(go); go.focus(); go.onclick = () => { U.closePanel(); res(); };
  });
  // A prediction: pick one, see whether it was right and why. Resolves true if it was.
  function predict(b, p, concept) {
    return new Promise(res => {
      const box = document.createElement('div'); box.className = 'g4-predict';
      box.innerHTML = `<b>PREDICT FIRST</b><p>${esc(p.q)}</p><div class="opts col">${p.opts.map((o, i) => `<button class="opt" data-p="${i}">${esc(o.t)}</button>`).join('')}</div><p class="g4-note"></p>`;
      b.appendChild(box);
      box.querySelectorAll('[data-p]').forEach(el => el.onclick = () => {
        const o = p.opts[+el.dataset.p];
        box.querySelectorAll('[data-p]').forEach(x => { x.disabled = true; if (p.opts[+x.dataset.p].ok) x.classList.add('on'); });
        S.recordAnswer(concept, !!o.ok, 1, 15000);
        AU.sfx(o.ok ? 'right' : 'wrong');
        const n = box.querySelector('.g4-note');
        n.textContent = (o.ok ? 'Right. ' : (o.no || 'Not quite.') + ' ') + p.why; n.className = 'g4-note ' + (o.ok ? 'ok' : 'bad');
        setTimeout(() => res(!!o.ok), 300);
      });
    });
  }
  const shuffle = a => (Q && Q.shuffle ? Q.shuffle(a.slice()) : a.slice().sort(() => Math.random() - 0.5));

  // ---------- door: build a rule, try it on the gate ----------
  // o: { title, concept, intro, rule, predict, fields: [{ k, label, opts: [[value, text]] }], answer: { k: value },
  //      check(sel) -> null when right, else why it fails; done: what the open gate says }
  // Resolves { first, tries }.
  G.door = function (o) {
    S.seeConcept(o.concept);
    G.cur = { kind: 'door', o };
    return new Promise(async res => {
      const b = U.panel(`<div class="g4"><p>${o.intro}</p>${o.rule ? `<div class="g4-rule">${esc(o.rule)}</div>` : ''}</div>`, { title: o.title, noClose: true, cls: 'wide' });
      const g = b.querySelector('.g4');
      if (o.predict) await predict(g, o.predict, o.concept);
      const sel = {};
      const box = document.createElement('div');
      box.innerHTML = o.fields.map(f => `<div class="g4-field"><b>${esc(f.label)}</b><div class="g4-chips">${f.opts.map(([v, t]) => `<button class="ghost" data-f="${f.k}" data-v="${esc(v)}">${esc(t)}</button>`).join('')}</div></div>`).join('')
        + '<button class="primary" id="g4-try" disabled>Try the gate</button><p class="g4-note"></p>';
      g.appendChild(box);
      const tryB = box.querySelector('#g4-try');
      box.querySelectorAll('[data-f]').forEach(el => el.onclick = () => {
        sel[el.dataset.f] = el.dataset.v;
        box.querySelectorAll(`[data-f="${el.dataset.f}"]`).forEach(x => x.classList.toggle('on', x === el));
        tryB.disabled = o.fields.some(f => !(f.k in sel));
      });
      let tries = 0;
      tryB.onclick = async () => {
        tries++;
        const why = o.check(Object.assign({}, sel));
        if (tries === 1) S.recordAnswer(o.concept, !why, 1, 20000);
        if (why) { note(box, why, false); AU.sfx('wrong'); return; }
        box.querySelectorAll('button').forEach(x => { x.disabled = true; });
        note(box, o.done, true); AU.sfx('gate');
        await cont(g, 'Through the gate');
        G.cur = null;
        res({ first: tries === 1, tries });
      };
    });
  };

  // ---------- sort: everything where it belongs ----------
  // o: { title, concept, intro, rule, predict, bins: [label], items: [{ t, bin, why }], go, done }
  // Resolves { first: how many rows were right on the first check, of items.length }.
  G.sort = function (o) {
    S.seeConcept(o.concept);
    G.cur = { kind: 'sort', o };
    return new Promise(async res => {
      const order = shuffle(o.items.map((x, i) => i));
      const b = U.panel(`<div class="g4"><p>${o.intro}</p>${o.rule ? `<div class="g4-rule">${esc(o.rule)}</div>` : ''}</div>`, { title: o.title, noClose: true, cls: 'wide' });
      const g = b.querySelector('.g4');
      if (o.predict) await predict(g, o.predict, o.concept);
      const pick = {}, locked = {};
      const box = document.createElement('div');
      box.innerHTML = order.map(i => `<div class="g4-row" data-r="${i}"><span>${esc(o.items[i].t)}</span>${o.bins.map((l, v) => `<button class="ghost" data-i="${i}" data-v="${v}">${esc(l)}</button>`).join('')}<p class="why"></p></div>`).join('')
        + `<button class="primary" id="g4-go" disabled>${esc(o.go || 'Check')}</button><p class="g4-note"></p>`;
      g.appendChild(box);
      const go = box.querySelector('#g4-go');
      const ready = () => { go.disabled = o.items.some((x, i) => !(i in pick)); };
      box.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
        const i = +el.dataset.i; if (locked[i]) return;
        pick[i] = +el.dataset.v;
        box.querySelectorAll(`[data-i="${i}"]`).forEach(x => x.classList.toggle('on', x === el));
        ready();
      });
      let first = null;
      go.onclick = async () => {
        let right = 0;
        o.items.forEach((x, i) => {
          if (locked[i]) { right++; return; }
          const row = box.querySelector(`[data-r="${i}"]`), w = row.querySelector('.why'), ok = pick[i] === x.bin;
          if (first === null) S.recordAnswer(o.concept, ok, 1, 8000);
          w.textContent = (ok ? '' : 'No: ') + x.why; w.className = 'why ' + (ok ? 'ok' : 'bad');
          if (ok) { right++; locked[i] = true; row.classList.add('done'); } else delete pick[i];
          row.querySelectorAll('button').forEach(y => { if (!ok) y.classList.remove('on'); });
        });
        if (first === null) first = right;
        ready();
        if (right < o.items.length) { note(box, `${right} of ${o.items.length} right. Fix the red ones and check again.`, false); AU.sfx('wrong'); return; }
        go.disabled = true;
        note(box, o.done || 'All of them, right.', true); AU.sfx('right');
        await cont(g);
        G.cur = null;
        res({ first, of: o.items.length });
      };
    });
  };

  // ---------- order: the steps, in the order they happen ----------
  // o: { title, concept, intro, predict, steps: [{ t, why }] (in the right order), done }. Resolves { mistakes }.
  G.order = function (o) {
    S.seeConcept(o.concept);
    G.cur = { kind: 'order', o };
    return new Promise(async res => {
      const b = U.panel(`<div class="g4"><p>${o.intro}</p></div>`, { title: o.title, noClose: true, cls: 'wide' });
      const g = b.querySelector('.g4');
      if (o.predict) await predict(g, o.predict, o.concept);
      const box = document.createElement('div');
      box.innerHTML = `<ol class="g4-done"></ol><div class="g4-steps">${shuffle(o.steps.map((x, i) => i)).map(i => `<button class="ghost" data-s="${i}">${esc(o.steps[i].t)}</button>`).join('')}</div><p class="g4-note"></p>`;
      g.appendChild(box);
      let next = 0, mistakes = 0;
      box.querySelectorAll('[data-s]').forEach(el => el.onclick = async () => {
        const i = +el.dataset.s;
        if (i !== next) { mistakes++; note(box, 'Not yet: ' + o.steps[next].hint, false); AU.sfx('wrong'); return; }
        const li = document.createElement('li'); li.textContent = o.steps[i].t + ' ' + o.steps[i].why;
        box.querySelector('.g4-done').appendChild(li); el.remove(); AU.sfx('card');
        next++;
        if (next < o.steps.length) { note(box, '', true); return; }
        S.recordAnswer(o.concept, mistakes === 0, 1, 20000);
        note(box, o.done, true); AU.sfx('right');
        await cont(g);
        G.cur = null;
        res({ mistakes });
      });
    });
  };

  // ---------- The games ----------
  const P = (q, opts, why) => ({ q, opts: opts.map(([t, ok, no]) => ({ t, ok, no })), why });
  const I = (t, bin, why) => ({ t, bin, why });
  const DEF = G.DEF = {};

  // The Outer Wall, first gate: a security group on the pass's post office.
  DEF.sg = {
    title: 'THE FIRST GATE · A SECURITY GROUP', concept: 'sgnacl', card: 'k4-sgrule',
    intro: 'The gate in front of the pass\'s post office is a <b>security group</b>. The town\'s couriers all wear the badge <code>sg-couriers</code>, and they need to hand in letters over HTTPS. Nobody else should get in.',
    rule: 'sg-postoffice  (inbound rules)\n  (none)\n\nsg-postoffice  (outbound rules)\n  (none)',
    predict: P('When a courier\'s request is allowed in, does the gate also need an outbound rule so the reply can get back to them?', [
      ['Yes: an outbound rule on port 443', false, 'No.'], ['Yes: an outbound rule on the high ports, 1024 to 65535', false, 'That\'s a network ACL\'s problem, not this gate\'s.'], ['No: a security group remembers the request and lets its reply out', true]],
      'A security group is stateful: once a request is allowed in, its reply goes out whatever the outbound rules say. (And here there are none.)'),
    fields: [{ k: 'proto', label: 'PROTOCOL', opts: [['tcp', 'TCP'], ['udp', 'UDP'], ['icmp', 'ICMP']] },
      { k: 'port', label: 'PORT', opts: [['22', '22 (SSH)'], ['443', '443 (HTTPS)'], ['all', 'All ports']] },
      { k: 'src', label: 'SOURCE', opts: [['any', '0.0.0.0/0'], ['sg', 'sg-couriers'], ['self', 'sg-postoffice']] }],
    answer: { proto: 'tcp', port: '443', src: 'sg' },
    check: s => s.proto !== 'tcp' ? 'HTTPS runs over TCP. The couriers\' letters bounce off.'
      : s.port === '22' ? 'Port 22 is SSH: a way to log in to the post office, not to hand in a letter. The couriers stand there knocking on 443.'
      : s.port === 'all' ? 'Every port opens for the couriers. The guard frowns: least privilege means only the port they use.'
      : s.src === 'any' ? 'The gate swings open for the whole internet. The guard slams it again: the rule should name who may come, and a security group can be the source.'
      : s.src === 'self' ? 'Only things already wearing sg-postoffice could come in. The couriers wear sg-couriers.' : null,
    done: 'Inbound: TCP 443 from sg-couriers. A courier walks in, and the reply walks out after them without a rule of its own. The gate remembers.'
  };
  // The Outer Wall, second gate: a network ACL on the pass's subnet.
  DEF.nacl = {
    title: 'THE SECOND GATE · A NETWORK ACL', concept: 'sgnacl', card: 'k4-bothways',
    intro: 'Further up, the whole pass is a <b>subnet</b>, and its gate is a <b>network ACL</b>. Couriers\' requests on 443 get in. Their replies never come back out. Add the one entry that fixes it.',
    rule: 'acl-pass  INBOUND\n  100  TCP  443         0.0.0.0/0  ALLOW\n  *    ALL  ALL         0.0.0.0/0  DENY\nacl-pass  OUTBOUND\n  *    ALL  ALL         0.0.0.0/0  DENY',
    predict: P('Why do the replies die at this gate, when the security group up the road let them straight out?', [
      ['A network ACL is stateless: the reply is checked again on the way out, and nothing allows it', true],
      ['The reply goes out on port 443, and there\'s no outbound 443 rule', false, 'The reply leaves from 443, but it goes back to the courier\'s own port, a high one picked for that one connection.'],
      ['Network ACLs only allow traffic from inside the VPC', false, 'They allow whatever their rules allow.']],
      'Each direction is checked on its own, and the reply goes back to the caller\'s ephemeral port (somewhere in 1024 to 65535), so the outbound side needs those ports allowed.'),
    fields: [{ k: 'dir', label: 'DIRECTION', opts: [['in', 'Inbound'], ['out', 'Outbound']] },
      { k: 'port', label: 'PORT RANGE', opts: [['443', '443'], ['eph', '1024-65535'], ['22', '22']] },
      { k: 'act', label: 'ACTION', opts: [['allow', 'ALLOW'], ['deny', 'DENY']] }],
    answer: { dir: 'out', port: 'eph', act: 'allow' },
    check: s => s.act === 'deny' ? 'A deny rule can only take traffic away. The replies were already dying.'
      : s.dir === 'in' ? 'Inbound already lets the requests in. It\'s the replies, going out, that nothing allows.'
      : s.port === '443' ? 'The replies go out to the courier\'s side, to a high port picked for that one connection, not to 443.'
      : s.port === '22' ? 'Port 22 is for SSH. The replies are going to the couriers\' high ports.' : null,
    done: 'Outbound 110: TCP 1024-65535 to 0.0.0.0/0, ALLOW. The replies come down the pass. The guard checks every one of them, and forgets each the moment it\'s gone.'
  };
  // The Outer Wall's nook (optional): Rule 100, read in order.
  DEF.order100 = {
    title: 'RULE 100 · READ IN ORDER', concept: 'sgnacl',
    intro: 'A side gate with its whole network ACL carved in the stone. The guard reads the rules from the lowest number up and <b>stops at the first that matches</b>. Which travellers get through?',
    rule: 'INBOUND\n   90  TCP  443  10.0.9.0/24   DENY\n  100  TCP  443  0.0.0.0/0     ALLOW\n  110  TCP  443  10.0.9.7/32   ALLOW\n  120  TCP  22   0.0.0.0/0     DENY\n    *  ALL  ALL  0.0.0.0/0     DENY',
    bins: ['Through', 'Turned back'],
    items: [I('A courier from 203.0.113.5 on port 443', 0, 'Rule 90 doesn\'t match its address; rule 100 does, and allows it.'),
      I('A traveller from 10.0.9.7 on port 443', 1, 'Rule 90 matches first (10.0.9.7 is inside 10.0.9.0/24) and denies it. Rule 110 is never read.'),
      I('Someone from 198.51.100.2 on port 22', 1, 'Nothing before 120 matches port 22; 120 denies it.'),
      I('A traveller from 10.0.8.4 on port 443', 0, 'Not in 10.0.9.0/24, so rule 90 passes it by, and rule 100 allows it.'),
      I('Someone from 198.51.100.2 on port 80', 1, 'No numbered rule matches port 80, so the last rule, *, denies it.')],
    done: 'First match wins. Rule 110 can never do anything: anything it would allow, 100 or 90 has already decided.'
  };
  // The Hidden Valley: a private village's route table.
  DEF.routes = {
    title: 'WHERE DOES THE CART GO?', concept: 'subnets', card: 'k4-route',
    intro: 'The valley\'s villages are <b>private subnets</b>. Each cart leaving one follows the village\'s <b>route table</b>, and takes the most specific route that matches. Where does each one go?',
    rule: 'rtb-village (private subnet 10.0.2.0/24)\n  10.0.0.0/16     local\n  pl-s3 (Amazon S3)  vpce-0a1b (gateway endpoint)\n  0.0.0.0/0       nat-07c9 (NAT gateway, in a public subnet)',
    predict: P('What makes a subnet public?', [
      ['A route in its route table to an internet gateway', true], ['Instances with public IP addresses', false, 'A public IP does nothing without a road to an internet gateway.'],
      ['A NAT gateway in it', false, 'A NAT gateway lives in a public subnet; it doesn\'t make one.']],
      'Public or private is only the route table: a 0.0.0.0/0 (or other) route to an internet gateway makes it public.'),
    bins: ['Stays in the VPC', 'Gateway endpoint', 'NAT gateway', 'No way in'],
    items: [I('A cart to the mill at 10.0.3.7', 0, '10.0.3.7 is inside 10.0.0.0/16: the local route keeps it inside the VPC.'),
      I('A cart to a bucket in Amazon S3', 1, 'The S3 prefix list is more specific than 0.0.0.0/0, so it takes the gateway endpoint and never leaves AWS.'),
      I('A cart to the weather service on the internet', 2, 'Only 0.0.0.0/0 matches: out through the NAT gateway, which carries it to the internet gateway for them.'),
      I('A cart to a DynamoDB table', 2, 'This table has a gateway endpoint for S3 only. DynamoDB could have one too, but it doesn\'t here, so the cart goes out through the NAT.'),
      I('A stranger on the internet trying to reach the village', 3, 'A NAT gateway carries replies to connections that started inside, and nothing else. No road in.')],
    done: 'Most specific route wins, and a private village can reach out but nobody can reach in.'
  };
  // The Sealed Archive's door: reaching a service privately.
  DEF.archive = {
    title: 'THE SEALED ARCHIVE', concept: 'endpoints', card: 'k4-privlink',
    intro: 'The archive is sealed with a lock that answers only to the key-keepers\' service (AWS KMS), and the valley has <b>no road to the internet at all</b>. Open a way to KMS that never leaves the mountain.',
    predict: P('Gateway endpoints are free and sit in a route table. Which services have one?', [
      ['Amazon S3 and DynamoDB, only', true], ['Every AWS service', false, 'Most services only have interface endpoints.'], ['Only AWS KMS and Secrets Manager', false, 'Those need interface endpoints.']],
      'Only S3 and DynamoDB have gateway endpoints. Everything else, KMS included, is an interface endpoint (AWS PrivateLink): a network interface with a private IP in your subnet.'),
    fields: [{ k: 'type', label: 'WHAT TO BUILD', opts: [['gw', 'Gateway endpoint'], ['if', 'Interface endpoint (PrivateLink)'], ['nat', 'NAT gateway'], ['igw', 'Internet gateway']] },
      { k: 'dns', label: 'PRIVATE DNS NAME', opts: [['on', 'On'], ['off', 'Off']] }],
    answer: { type: 'if', dns: 'on' },
    check: s => s.type === 'gw' ? 'There\'s no gateway endpoint for KMS. Only S3 and DynamoDB have them.'
      : s.type === 'nat' || s.type === 'igw' ? 'That\'s a road to the internet, and the valley isn\'t allowed one. The request mustn\'t leave the mountain.'
      : s.dns === 'off' ? 'The endpoint works, but the seal calls kms.<region>.amazonaws.com and that still resolves to the public address. Turn on private DNS so the usual name points at your endpoint.' : null,
    done: 'An interface endpoint for KMS with private DNS on: the archive\'s lock calls the usual name and reaches a private address in the valley. The seal answers. Something inside says "FINALLY."'
  };
  // Camp: Ship It, a function inside the band's network.
  DEF.ship = {
    title: 'SHIP IT · A FUNCTION IN THE VPC', concept: 'subnets', card: 'k4-natgw',
    intro: 'The camp\'s order function has to reach the Alliance\'s private database, call a weather service on the internet, and read its database password. Fewer hints this time: which of these does it need?',
    predict: P('A Lambda function attached to private subnets calls a website on the internet. What does it need?', [
      ['A NAT gateway in a public subnet, and a route to it', true], ['A public IP on the function', false, 'A function in a VPC never gets a public IP, even in a public subnet.'], ['Nothing: Lambda always has internet access', false, 'Not once it\'s in your VPC: then it uses your VPC\'s roads.']],
      'Attached to a VPC, a function uses your subnets\' routes. Private subnets reach the internet through a NAT gateway.'),
    bins: ['Needed', 'Wrong or not needed'],
    items: [I('Private subnets in two Availability Zones', 0, 'Two AZs, so one going dark doesn\'t stop the function.'),
      I('A security group on the function, with outbound to the database port', 0, 'The function\'s own security group decides where it may connect.'),
      I('The database\'s security group allows inbound from the function\'s security group', 0, 'Name the function\'s group as the source: no IP ranges to keep up to date.'),
      I('A route to a NAT gateway for the weather service', 0, 'Private subnets reach the internet only through NAT.'),
      I('An interface endpoint for Secrets Manager', 0, 'So the password call stays inside the VPC (the NAT would also work, at a cost).'),
      I('An execution role that can create network interfaces', 0, 'Lambda makes network interfaces in your subnets, so its role needs those EC2 permissions (AWSLambdaVPCAccessExecutionRole has them).'),
      I('The database password in a plain environment variable in the package', 1, 'Secrets come from Secrets Manager at runtime, never in the package.'),
      I('An inbound rule on the function\'s security group from 0.0.0.0/0', 1, 'Nothing calls a function over the network; it\'s invoked through Lambda. Inbound rules do nothing for it.')],
    done: 'Shipped. The orders reach the database, the weather comes in through the NAT, and the password never touches the package.'
  };
  // Ryu's quest: Seal and Unseal, part one (envelope encryption).
  DEF.seal = {
    title: 'SEAL AND UNSEAL · RYU\'S LETTERS', concept: 'kmsenv', card: 'k4-envelope',
    intro: 'Ryu\'s letters are longer than the key-keepers will seal in one go. Seal one the way the house does it, with <b>envelope encryption</b>. Tap the steps in order.',
    predict: P('Why not hand the whole letter to KMS and ask it to Encrypt it?', [
      ['KMS Encrypt only takes up to 4 KB, and every byte would travel to KMS', true], ['KMS can\'t encrypt text', false, 'It can, up to 4 KB.'], ['It would be less secure', false, 'Not less secure, just limited and slow for big data.']],
      'Encrypt takes at most 4 KB. For anything bigger you encrypt locally with a data key, and KMS only ever protects the small data key.'),
    steps: [{ t: 'Ask KMS for a data key (GenerateDataKey) under Ryu\'s KMS key.', why: 'You get it twice: in plaintext, and encrypted under the KMS key.', hint: 'first you need a data key.' },
      { t: 'Encrypt the letter on your own desk with the plaintext data key.', why: 'Any size, and the letter never travels to KMS.', hint: 'the letter is sealed with the data key before anything else.' },
      { t: 'Throw away the plaintext data key.', why: 'Only the encrypted copy is kept.', hint: 'get rid of the plaintext key once it\'s used.' },
      { t: 'Store the encrypted data key with the sealed letter.', why: 'To read it, someone sends that small key to KMS to Decrypt, which needs kms:Decrypt on Ryu\'s key.', hint: 'the encrypted data key travels with the letter.' }],
    done: 'Sealed. Reading it back is the same in reverse: KMS decrypts the small data key, and the data key opens the letter.'
  };
  // Ryu's quest, part two: who can read it?
  DEF.readers = {
    title: 'SEAL AND UNSEAL · WHO CAN READ IT?', concept: 'kmskeys', card: 'k4-keypol',
    intro: 'Before you hand a letter over, read the key policy on Ryu\'s key. Who could open the letter today?',
    rule: 'Key policy: ryu-letters\n  Sid "Admins":  Allow namgung-steward  kms:Create*, kms:Put*, kms:Update*, kms:ScheduleKeyDeletion\n  Sid "Writer":  Allow ryu            kms:GenerateDataKey, kms:Encrypt\n  Sid "Reader":  Allow seoyeon        kms:Decrypt\n  (no statement for the account root)\nGrants: lexi  kms:Decrypt',
    bins: ['Can read it', 'Can\'t'],
    items: [I('Seo-yeon', 0, 'The key policy allows her kms:Decrypt.'),
      I('Lexi', 0, 'A grant gives her kms:Decrypt on this key, which is enough.'),
      I('Ryu, who wrote it', 1, 'He can make data keys and encrypt, but nothing gives him kms:Decrypt.'),
      I('The house steward, the key\'s administrator', 1, 'Administering the key isn\'t using it: no kms:Decrypt. (He could change the policy, and CloudTrail would show it.)'),
      I('An IAM admin of the house with kms:* in their IAM policy', 1, 'The key policy doesn\'t allow the account, so IAM policies count for nothing on this key.')],
    done: 'A key policy is the first word on a KMS key: if it doesn\'t let the account delegate to IAM, no IAM policy opens it.'
  };
  // Madam Ok's quest: Keys Under the Mat.
  DEF.mat = {
    title: 'KEYS UNDER THE MAT · THE CULT\'S TREASURY', concept: 'secrets', card: 'k4-vault',
    intro: 'Madam Ok tips the Cult\'s ledgers and config scrolls onto the table. "Every one of these is a key or a secret, child. Put each where it belongs, and I\'ll stop leaving them under the mat."',
    predict: P('Which service would find the members\' names and ID numbers sitting in the Cult\'s S3 books?', [
      ['Amazon Macie', true], ['Amazon GuardDuty', false, 'GuardDuty watches for threats in activity, not what\'s in your files.'], ['AWS Secrets Manager', false, 'That keeps secrets; it doesn\'t look for them.']],
      'Macie scans S3 objects for sensitive data like names, ID numbers and credentials, and reports where they are.'),
    bins: ['Secrets Manager', 'Parameter Store', 'Mask it', 'Delete: use a role'],
    items: [I('The treasury database password, which must change every 30 days', 0, 'Secrets Manager rotates it for you on a schedule.'),
      I('A setting: summer_menu=on', 1, 'Plain configuration: a Parameter Store String, at no extra cost.'),
      I('The courier service\'s API key, which never rotates', 1, 'A Parameter Store SecureString (encrypted with KMS) is enough when nothing needs rotating, and costs less.'),
      I('Members\' ID numbers printed in the debug log', 2, 'Logs shouldn\'t carry personal data: mask it before it\'s written.'),
      I('An access key, AKIA..., pasted into the code', 3, 'Delete the long-term key and give the code a role: short-lived credentials, nothing to leak.')],
    done: '"Good girl." Not one key under the mat. Ok counts them twice on her abacus, and smiles.'
  };
  // The Ruins' gate (after Ryu's Seal): policy evaluation.
  DEF.policy = {
    title: 'THE YARD GATE · ALLOWED TWICE', concept: 'iampol', card: 'k4-capped',
    intro: 'Old Gu scratched this into the yard gate years ago: <i>Allowed twice is allowed. Denied once is denied.</i> Your role\'s papers are below. Which of these does the gate let through?',
    rule: 'Your role\'s identity policy:   Allow s3:*  on yard-scrolls/*\nYour permissions boundary:     Allow s3:GetObject, s3:PutObject  on *\nThe bucket\'s own policy:      Deny s3:DeleteObject  to everyone',
    predict: P('A permissions boundary allows s3:* but your identity policy allows nothing. Can you read the scrolls?', [
      ['No: a boundary never grants anything, it only caps', true], ['Yes: the boundary allows it', false, 'A boundary is a ceiling, not a key.'], ['Only if the bucket policy also allows it', false, 'In the same account a bucket policy that names you could, but the boundary alone does nothing.']],
      'A boundary only limits what your identity policy grants. Nothing in the boundary works by itself.'),
    bins: ['Allowed', 'Denied'],
    items: [I('You read a scroll (GetObject)', 0, 'Your policy allows it and the boundary allows it.'),
      I('You add a scroll (PutObject)', 0, 'Both your policy and your boundary allow it.'),
      I('You change a scroll\'s permissions (PutObjectAcl)', 1, 'Your policy allows s3:*, but the boundary doesn\'t include it.'),
      I('You burn a scroll (DeleteObject)', 1, 'The bucket\'s explicit Deny wins over everything (and the boundary doesn\'t allow it either).'),
      I('A stranger from another account, whom the bucket policy allows to read', 1, 'Across accounts both sides must allow: the stranger\'s own account must allow it too, and here nothing does.')],
    done: 'Explicit deny first, then every gate that must say yes. The yard gate swings open, ash falling off its hinges.'
  };
  // The Ruins' optional side door: a resource policy that let a stranger in.
  DEF.respol = {
    title: 'THE SIDE DOOR · ITS OWN POLICY', concept: 'iampol', card: 'k4-respol',
    intro: 'A side door into the archive room has its own resource policy, and somebody wrote <code>"Principal": "*"</code> on it. Fix it so only the yard\'s own role can read, and only over an encrypted connection.',
    rule: '{ "Effect": "Allow", "Principal": "*", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::peak-archive/*" }',
    fields: [{ k: 'who', label: 'PRINCIPAL', opts: [['any', '"*"'], ['role', 'arn:aws:iam::111122223333:role/yard'], ['acct', 'arn:aws:iam::444455556666:root']] },
      { k: 'cond', label: 'CONDITION', opts: [['none', '(none)'], ['tls', 'aws:SecureTransport = true'], ['ip', 'aws:SourceIp = 0.0.0.0/0']] }],
    answer: { who: 'role', cond: 'tls' },
    check: s => s.who === 'any' ? 'Still anyone in the world. That\'s how the stranger got in.'
      : s.who === 'acct' ? 'That\'s another sect\'s account. You just handed them the door.'
      : s.cond === 'none' ? 'The right role, but over any connection. The scrolls should only travel encrypted.'
      : s.cond === 'ip' ? '0.0.0.0/0 matches every address, so it limits nothing.' : null,
    done: 'Only the yard\'s role, only over TLS. Behind the door, on a shelf, a page of Jin\'s forms.'
  };
  // Lexi's quest: Guild Cards, Please (Mountain Edition).
  DEF.cards = {
    title: 'GUILD CARDS, PLEASE · MOUNTAIN EDITION', concept: 'cognito', card: 'k4-verify',
    intro: 'Lexi has set up the first game\'s guild gate on the camp road, with tokens. The route is <code>GET /records</code>, which needs scope <code>records.read</code>, behind an HTTP API\'s JWT authorizer that trusts the Alliance\'s Cognito user pool. Let each traveller in, or turn them away with the right answer.',
    predict: P('A traveller\'s token is genuine and in date, but it doesn\'t carry the scope this route needs. What does the gate answer?', [
      ['403 Forbidden', true], ['401 Unauthorized', false, '401 means "I don\'t know who you are". This gate knows exactly who they are.'], ['200, and let them in', false, 'Scopes are the point.']],
      '401 is for a token that can\'t be trusted (missing, forged, expired, wrong pool). 403 is for a trusted token that isn\'t allowed this.'),
    bins: ['200: in', '401', '403'],
    items: [I('Signed by the pool, in date, scope records.read', 0, 'Signature, expiry, issuer and scope all check out.'),
      I('Expired an hour ago', 1, 'An expired token can\'t be trusted. They should use their refresh token for a new one.'),
      I('Signature doesn\'t match any of the pool\'s public keys', 1, 'Forged, or from somewhere else: the signature check fails.'),
      I('Issued by a different user pool', 1, 'Wrong issuer: this authorizer only trusts the Alliance\'s pool.'),
      I('No token at all', 1, 'Nobody to identify.'),
      I('Genuine and in date, but only scope profile.read', 2, 'Trusted, but not allowed this route.')],
    done: 'Lexi applauds. "Signature, expiry, issuer, audience, and then what they\'re allowed. In that order. Gary would have said no to all of them."'
  };
  // The Design Board: the Alliance's sign-in, in order.
  DEF.board = {
    title: 'DESIGN BOARD · THE ALLIANCE\'S SIGN-IN', concept: 'cognito', card: 'k4-refresh',
    intro: 'Draw how a disciple signs in and reads their sect\'s records. Tap the boxes in the order a request goes through them.',
    steps: [{ t: 'The disciple signs in to the Cognito user pool.', why: 'They get an ID token, an access token and a refresh token.', hint: 'nobody gets anywhere before signing in.' },
      { t: 'The app calls the API with the access token.', why: 'The scopes are in the access token.', hint: 'the token has to reach the API.' },
      { t: 'API Gateway\'s Cognito authorizer checks the token.', why: 'Before any code runs: signature, expiry, issuer, scopes.', hint: 'check the token before anything runs.' },
      { t: 'The function runs with a role that allows only what it needs.', why: 'No long-term key in the code.', hint: 'only then does the function run.' },
      { t: 'It reads the database password from Secrets Manager.', why: 'At runtime, not from the package.', hint: 'it needs its secret next.' },
      { t: 'It reads the records, sealed with data keys under a customer managed key.', why: 'The key policy names who may decrypt.', hint: 'the records come last.' }],
    done: 'The board checks out: no key in code, tokens checked at the API, and the data keys, not the KMS key, encrypt the records.'
  };
  // Namgung's house: the inner gate is a key policy.
  DEF.keydoor = {
    title: 'THE INNER GATE · A KEY POLICY', concept: 'kmskeys', card: 'k4-rotate',
    intro: 'The inner gate of Namgung\'s house is sealed with a KMS key, and you can add one statement to its key policy. Let Seo-yeon open it, and nobody else.',
    predict: P('Last year\'s letters were sealed before this key\'s yearly automatic rotation. After it rotates, can they still be opened?', [
      ['Yes: KMS keeps every older key material and uses it to decrypt', true], ['No: they must be re-encrypted first', false, 'Rotation never breaks old ciphertext.'], ['Only within 7 days of rotating', false, 'Old key material is kept for as long as the key exists.']],
      'Automatic rotation makes new key material for new encryption, and keeps the old material to decrypt anything sealed before. Nothing needs re-encrypting.'),
    fields: [{ k: 'who', label: 'PRINCIPAL', opts: [['any', '"*"'], ['root', 'the account root'], ['her', 'role/seoyeon']] },
      { k: 'act', label: 'ACTION', opts: [['all', 'kms:*'], ['dec', 'kms:Decrypt'], ['enc', 'kms:Encrypt']] }],
    answer: { who: 'her', act: 'dec' },
    check: s => s.who === 'any' ? 'Everyone in the world could ask. Even a key policy with a condition shouldn\'t start there.'
      : s.who === 'root' ? 'That hands the key to the account, and then any IAM policy in the house could open it. Not just her.'
      : s.act === 'all' ? 'kms:* would let her delete the key or rewrite its policy. She needs only to open it.'
      : s.act === 'enc' ? 'Encrypt seals things; it doesn\'t open them.' : null,
    done: 'Allow role/seoyeon kms:Decrypt. The gate opens for her, and stays shut for everyone else. That\'s how Namgung sealed his own account.'
  };
  // Namgung's house, the optional records room.
  DEF.sse = {
    title: 'THE RECORDS ROOM · FOUR SEALS', concept: 'sse', card: 'k4-ssekms',
    intro: 'Four shelves of records, each sealed a different way. Match each description to its kind of encryption.',
    bins: ['SSE-S3', 'SSE-KMS', 'SSE-C', 'Client-side'],
    items: [I('S3 manages the keys. Nothing to set up; every new object gets it by default.', 0, 'SSE-S3: keys owned and managed by S3.'),
      I('Each use of the key shows up in CloudTrail, and a key policy decides who can read.', 1, 'SSE-KMS: the KMS key\'s policy applies, and every use is logged.'),
      I('You send the key with every request, and S3 never stores it.', 2, 'SSE-C: lose the key and the object is gone.'),
      I('Sealed before it leaves your hands; S3 only ever holds ciphertext.', 3, 'Client-side encryption.')],
    done: 'Four seals, four keepers of the key. On the last shelf, a page of Jin\'s forms.'
  };
  // Namgung's study: who watches the house.
  DEF.detect = {
    title: 'THE WATCHERS IN THE RAFTERS', concept: 'detect', card: 'k4-guardduty',
    intro: 'Five watchers sit in the study\'s rafters, and each does one job. Which one would you ask?',
    bins: ['GuardDuty', 'Inspector', 'Detective', 'Security Hub', 'Macie'],
    items: [I('A role is calling the house\'s API from an address known for attacks.', 0, 'GuardDuty reads logs and network activity for threats like this.'),
      I('An instance in the stable runs software with a known vulnerability.', 1, 'Inspector scans instances, images and functions for known vulnerabilities.'),
      I('You want to follow one strange caller back through everything it did.', 2, 'Detective builds the picture of who did what, to investigate a finding.'),
      I('One page with every finding from all the watchers, across every account.', 3, 'Security Hub collects findings and checks them against standards.'),
      I('A bucket of letters has personal details nobody labelled.', 4, 'Macie finds sensitive data in S3.')],
    done: 'Every watcher in its rafter. The one that saw everything is the trail itself: CloudTrail.'
  };
  // Namgung's guards, before the Succession Hall.
  DEF.edge = {
    title: 'NAMGUNG\'S GUARDS', concept: 'edge', card: 'k4-waf',
    intro: 'The guards at the Succession Hall each stop a different thing. Which guard handles each?',
    bins: ['WAF', 'Shield', 'Network Firewall', 'Firewall Manager', 'CloudHSM'],
    items: [I('Requests with injected scripts in their query strings', 0, 'WAF rules inspect web requests: SQL injection, scripts, rate limits.'),
      I('A flood of traffic meant to knock the house over', 1, 'Shield protects against DDoS; Shield Advanced adds a response team and cost protection.'),
      I('Inspecting all traffic in and out of the VPC, with stateful rules', 2, 'Network Firewall filters at the VPC level.'),
      I('The same WAF rules on every sect\'s account at once', 3, 'Firewall Manager applies rules across the accounts in an organization.'),
      I('Keys that must live in hardware only you control', 4, 'CloudHSM: single-tenant hardware security modules.')],
    done: 'The guards step aside. Through the hall\'s doors, the whole Alliance is waiting.'
  };
})();
