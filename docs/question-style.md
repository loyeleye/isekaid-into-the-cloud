# Writing questions

Adapted from the first game's `docs/question-style.md`. The quiz engine is `game/js/quiz.js`; it shuffles options, so position never matters. See `docs/learning-design.md` for why the rules exist.

## What a good question does

It reads like the exam, it can't be answered by spotting the longest option, and it teaches a second idea through its wrong options. DVA-C02's wrong answers are real AWS services and settings that solve a different problem, so ours are too.

## Every multiple choice question

A multiple choice question is any object with `opts: [...]` and a numeric `a:` (the index of the right option): question-bank entries (`type: 'mc'`), boss `design` questions, deep-dive chains, events and anything else shaped like that.

1. **Ask what the exam asks.** Pick topics from the DVA-C02 exam guide's task statements and from what the well-regarded prep courses spend their time on (their syllabi and outlines, not their questions). The project's research on prep resources and real exam questions is in `/mnt/project-files/research/`; read it before writing a chapter's questions. A question about something the exam never tests is a wasted rep.
2. **Write it fresh.** Never copy or paraphrase a practice-exam or course question, including AWS's own sample questions. Build the scenario from the AWS documentation and your own example.
3. **Use the exam's shape** where it fits: a short scenario, the constraint that matters, and a qualifier when the choice really turns on one (*most* cost-effective, *least* operational overhead, *most* secure, *without* changing code). Keep stems short enough to read on a phone.
4. **Balance lengths.** The right answer is never more than 25% longer than the longest wrong option, and across a file it's the longest option only about a quarter to a third of the time. Move detail out of the right answer into `why`.
5. **Make every wrong option plausible and real.** Each is something a developer might reasonably pick: a real service, feature, setting or limit used in the wrong place, or a common misconception, stated with the same confidence as the right answer. No jokes, no "Never" or "Always", no "All of the above".
6. **Make every wrong option clearly wrong as asked.** Accuracy beats cleverness. If an option is defensible in some reading, change it. Check limits, defaults and quotas against the current AWS documentation, and leave a number out if you can't confirm it.
7. **Add `no: [...]`**, the same length as `opts`: `null` at the right answer's index, and for each wrong option one or two short sentences (under about 30 words) saying why it's wrong *here* and what it *is* for. This is how the game covers services it doesn't teach on their own.
8. **Keep `why` free of positions** ("the third option"), since options are shuffled. Name the idea instead.
9. **Style:** plain, direct English. Single-quoted JS strings with `\'` escapes, the file's key order, `no` right after `a`. No em dashes. Comic tone may live in `q` or `why`; options and `no` lines are straight technical content.

## Multiple response questions

The exam also has multiple response questions: two or more right answers out of five or more options (DVA-C02 exam guide, "Response types"). Use `type: 'multi'` for these, say how many to pick in the stem ("Choose two."), and apply rules 1 to 9 to every option: each right one about as long as the wrong ones, and each wrong one real.

## Typed estimates

Use `type: 'num'` with a range (`lo`, `hi`) for anything the exam expects you to work out: Lambda concurrency (requests per second times average duration in seconds), DynamoDB read and write capacity units, SQS visibility timeouts. Put the working in `ans`.

## Example (`game/js/content.js`, `q-sq2`)

```js
{ id: 'q-sq2', c: 'sqs', type: 'mc', q: 'A Lambda function with a 60-second timeout is triggered by an SQS queue. What visibility timeout does AWS recommend for the queue?',
  opts: ['At least 360 seconds, six times the function timeout', '30 seconds, the default', '60 seconds, the same as the function timeout', '12 hours, the maximum'], a: 0,
  no: [null, 'The default is shorter than the function can run, so messages reappear while they are still being processed.', 'Equal leaves no room for Lambda to retry a batch that was throttled while it was being processed.', 'The maximum would hold back a genuine retry for up to 12 hours after a failure.'],
  why: 'Six times the function timeout gives Lambda room to retry throttled batches before the messages become visible again.' },
```

## Checking your work

From `game/`: `node tools/question_lint.js` lists every flagged question (right answer too long, or missing `no` lines), and `node tools/question_lint.js --ids id1,id2` prints questions in full. New questions should not be flagged.
