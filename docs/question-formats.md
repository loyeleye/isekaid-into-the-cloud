# Question formats (FullGame)

Six formats join `mc`, `multi`, `order`, `num` and `explain` from `game/js/quiz.js`. They are learning tools, not exam simulation: the associate exam guides list only multiple choice and multiple response, so the Exam Hall never draws them unless a guide adds new types.

The engine is `game/js/qformats.js` (`SD.qf`). It is loaded only under the full profile (`SD.profile === 'full'`), and it doesn't change `quiz.js`: a later hook in `SD.quiz.ask` hands any type that `SD.qf.has(type)` to `SD.qf.ask`. Items live in `game/js/fmt-*.js` and push into `SD.fmtItems`. `node tools/format_check.js` checks them.

All the rules in `docs/question-style.md` apply: write fresh, check facts against current AWS docs, plain direct English, no em dashes, every wrong choice real and wrong for a stated reason.

## Fields every item has

| Field | Meaning |
| --- | --- |
| `id` | Unique: `fmt-<type>-<nn>`, e.g. `fmt-seq-07` |
| `type` | `compare`, `seq`, `predict`, `spot`, `recall` or `faded` |
| `tracks` | Exam tracks it is valid for: any of `'DVA-C02'`, `'SAA-C03'` (`'DVA-C03'` only after its guide is out and the item is checked against it) |
| `task` | Exam-guide task, e.g. `{ dva: '3.2' }` or `{ saa: '2.1' }` (both keys allowed) |
| `topic` | Main service or idea, lower case (`sqs`, `codedeploy`, `iam`) |
| `c` | Optional concept key in `SD.concepts`, when a chapter adopts it |
| `title` | Short label shown above the item (a few words) |
| `why` | The takeaway, shown after answering, one to three sentences |
| `doc` | Array of AWS documentation URLs that back the answer |
| `eli5` | One plain sentence for the ELI5 button |

## compare: contrasting cases ("triplet scrolls")

Three options side by side, the same properties for each. The player picks which column fits the scenario, then which property decided it.

```js
{ id: 'fmt-compare-01', type: 'compare', tracks: ['DVA-C02', 'SAA-C03'], task: { dva: '1.1' }, topic: 'messaging',
  title: 'Queue, topic or bus?',
  q: 'Orders must reach the billing, email and analytics services at once, and analytics only wants orders over $500.',
  cols: ['Amazon SQS', 'Amazon SNS', 'Amazon EventBridge'],
  rows: ['Delivery', 'Consumers per message', 'Filtering', 'Ordering'],
  cells: [ // cells[row][col]
    ['Consumers poll', 'Pushed to subscribers', 'Rules route to targets'],
    ['One', 'Many', 'Many (one per matching rule target)'],
    ['None on the queue', 'Subscription filter policies', 'Event patterns on any field'],
    ['FIFO queues', 'FIFO topics', 'Not guaranteed'] ],
  a: 1, key: 1,               // the right column, and the row that decides it
  alsoOk: [2],               // optional: other columns that also work, with `no` explaining the trade-off
  no: ['Each message is read by one consumer, so three services would compete for it.', null, 'Works too, but ...'],
  why: '...', doc: ['...'], eli5: '...' }
```

## seq: ordering with decoys

Put real steps in order; decoys look plausible but don't belong. Deployment hooks must name the compute platform in `platform` and in the stem.

```js
{ id: 'fmt-seq-01', type: 'seq', tracks: ['DVA-C02'], task: { dva: '3.4' }, topic: 'codedeploy', platform: 'Lambda',
  title: 'Lambda deployment hooks',
  q: 'Put the hooks of a CodeDeploy deployment to a Lambda alias in the order they run.',
  steps: ['BeforeAllowTraffic', 'AllowTraffic', 'AfterAllowTraffic'],   // the right order
  decoys: [ { t: 'BeforeInstall', no: 'An EC2/on-premises hook. Lambda deployments have no install step.' } ],
  why: '...', doc: ['...'], eli5: '...' }
```

## predict: predict, then reveal

Pick one of three outcomes before the game shows what happens.

```js
{ id: 'fmt-predict-01', type: 'predict', tracks: ['DVA-C02'], task: { dva: '1.2' }, topic: 'sqs',
  title: 'Visibility timeout',
  setup: 'A Lambda function takes 90 seconds per batch. Its SQS queue has a 30-second visibility timeout.',
  q: 'What happens to a message while the function is still working on it?',
  opts: ['It becomes visible again and can be processed twice', 'It stays hidden until the function returns', 'It goes straight to the dead-letter queue'],
  a: 0,
  no: [null, 'Hidden only for the visibility timeout, not until the consumer finishes.', 'Only after maxReceiveCount receives, and only if a redrive policy is set.'],
  reveal: 'At 30 seconds the message reappears; a second invocation picks it up while the first is still running.',
  anim: 'visibility',        // optional key for a canned animation; the engine falls back to showing `reveal` as text
  why: '...', doc: ['...'], eli5: '...' }
```

## spot: spot the line

A short config or policy; one line is wrong. Tap the line, then pick the reason.

```js
{ id: 'fmt-spot-01', type: 'spot', tracks: ['DVA-C02'], task: { dva: '2.1' }, topic: 'iam', lang: 'json',
  title: 'The bucket that lets everyone in',
  q: 'This bucket policy should let only the reporting role read objects. Which line is wrong?',
  lines: ['{', '  "Version": "2012-10-17",', '  "Statement": [{', '    "Effect": "Allow",', '    "Principal": "*",', ...],
  bad: 4,                    // index into lines
  reasons: ['It grants the action to every principal', 'The Version date is wrong', 'Effect must be Deny'],
  a: 0,                      // index into reasons
  fix: '    "Principal": { "AWS": "arn:aws:iam::111122223333:role/reporting" },',
  no: [null, '...', '...'],  // why each wrong reason is wrong
  why: '...', doc: ['...'], eli5: '...' }
```

Keep `lines` under 16 and each line under 60 characters, so it reads on a 375 px phone.

## recall: free recall

List what you remember. On a phone it's a word bank (answers plus decoys); on desktop, short typed entries matched against `t` and `alt`.

```js
{ id: 'fmt-recall-01', type: 'recall', tracks: ['DVA-C02'], task: { dva: '1.2' }, topic: 'lambda',
  title: 'Ways to invoke a function',
  q: 'Name the ways Lambda invokes a function.',
  answers: [ { t: 'Synchronous', alt: ['sync', 'request-response', 'RequestResponse'] },
             { t: 'Asynchronous', alt: ['async', 'event', 'Event'] },
             { t: 'Event source mapping', alt: ['polling', 'poller', 'ESM'] } ],
  decoys: [ { t: 'Scheduled push', no: '...' } ],    // word-bank only; each with why it's not one
  need: 2,                                           // how many count as a pass
  why: '...', doc: ['...'], eli5: '...' }
```

## faded: faded worked example

A worked procedure whose steps are revealed or left blank by fade level. Level 0 shows every step; level 1 blanks the last; level 2 blanks the last two; level 3 blanks all `blankable` steps. Each blank is a tap-to-fill choice.

```js
{ id: 'fmt-faded-01', type: 'faded', tracks: ['DVA-C02'], task: { dva: '2.2' }, topic: 'kms',
  title: 'Envelope encryption',
  q: 'Encrypt a 5 MB file with a KMS key.',
  steps: [ { t: 'Call GenerateDataKey for the KMS key', why: '...', opts: ['Call Encrypt with the file', 'Call GenerateDataKey for the KMS key', 'Call CreateKey'] },
           { t: 'Encrypt the file locally with the plaintext data key', why: '...', opts: [...] },
           ... ],
  why: '...', doc: ['...'], eli5: '...' }
```

Each step's `opts` must contain its own `t` exactly once. A step may also carry `no`, lined up with `opts` (`null` at the right one), saying why each wrong option is wrong; it shows in feedback when that option was picked.

## How a format is introduced

The engine tracks per-format exposure in `S.save.fg.fmt[type]` (count seen, last two results). First appearance: worked (answer shown, a "Got it" button, unscored). Second: faded (one hint shown, unscored). Third onward: scored. Two right in a row skips the walkthrough for that format from then on.
