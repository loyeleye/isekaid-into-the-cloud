# FullGame economy

`game/js/economy.js` defines `SD.econ`, the FullGame's shard economy (FullGame plan, "Economy" and Addendum A). It loads only under the full profile (`SD.profile === 'full'`). Shards are the one currency, and the balance is the game's existing `S.save.shards`. Everything else the module saves lives under `S.save.fg.econ`.

## Sources

| Source | Pays | Cap and rules |
|---|---|---|
| Tonight's set (due reviews) | Right 6, wrong 2, Sure-and-right 7, Sure-and-wrong 0, skip 0 | 15 questions a night. A skip keeps the item due |
| Glimmer on a map | Same as the set | Counts against the 15. A concept already answered tonight pays 0 |
| Exam Hall mock | 30, +10 for each domain that rose | Only on a held-out form you haven't sat, at most once in 7 days. Mocks can't be bought with shards |
| Card offer skipped, poster cleared, fights, old daily quest | 0 | A cleared poster gives a Receipt. Fights give XP and cards |

The addendum's starting values were right 3, wrong 1, Sure-and-right 5. Sure pays off on an item you get right more than `wrong / (sureRight - right + wrong)` of the time. At the starting values that's 33%, so saying Sure on everything earned more than saying it honestly. On the 3 / 1 scale, no whole number gets close to the plan's "about 60%": Sure-and-right 4 gives 50%, which ties at 60% accuracy. So the set is doubled with the same ratios. Right is still 3 times wrong, and Sure-and-wrong and skip still pay 0. With Sure-and-right at 7, Sure breaks even at 67%. One night then comes to about 70 shards at 70% accuracy, which is the scale the game design review set its sink prices for.

## Sinks

| Sink | Opens | Cost |
|---|---|---|
| Seymour's tape / Kagemaru's tape | ch2 / ch6 | 50 / 100, read from `js/tapes.js` (`SD.tapes.RULES`). Once a day, after a passed 4-of-5 review |
| Seymour's "deprecate" (remove a starting card) | ch2 | 75, +25 each time |
| Kagemaru's door | ch3 | 40 (ch3–4), 70 (ch5), 100 (ch6). You agree the price at the door and pay only if your answer is right. A wrong answer costs nothing and that door stays shut until tomorrow. A right answer upgrades one card. In ch7 the price is a favour, not shards |
| Ayo's forge | ch5 | Upgrade 60 (once per card), remove 50 |
| Aigerim's card shop | ch6 | 40 / 70 / 110 by rarity, 2 cards a chapter, on concepts you've answered right twice |
| Cache Café cosmetics | ch2 | 16 items from 30 to 300 (2,280 in all), no power |

## Who owns a card

- **Run deck:** the starting deck (less any removals), plus the loadout, plus the picks. It's lost when the expedition ends and capped at 30.
- **Loadout:** up to 3 cards from the library.
- **Library:** the permanent collection, from set pieces, hardest finds and the shop.

Removal never takes the starting deck below 5 cards. Each card can be upgraded once.

## API

- **Pure functions:** `payout(result)`, `canAfford(balance, cost)`, `tapePrice(seller, ch)`, `doorPrice(ch)`, `doorCharge(price, ok)`, `deprecateCost(n)`, `removeCost(ch, n)`, `upgradeCost(ch)`, `shopPrice(rarity, ch)`, `cosmeticCost(id)`, `mockPayout(m)`, `fightShards(opts)`, `runDeck(starter, loadout, picks)`.
- **State helpers:** these take the econ state as an argument. They are `night`, `canAsk`, `answer`, `doorReady`, `doorAttempt`, `canUpgrade`, `upgrade`, `addToLibrary`, `setLoadout`, `startingDeck`, `canRemove` and `endExpedition`.
- **Save wrappers:** `state()`, `balance()`, `earn(n)`, `spend(cost)` and `record(result)`.

## The sim

From `game/`, run:

```
node tools/economy_sim.js
```

The sim loads `js/tapes.js` and `js/economy.js` the way the full profile would. It plays 60 nights through chapters 1–7 (5/8/9/9/9/10/10 nights). Players come in four accuracies (50, 60, 70 and 90%) and four habits:

- **honest:** says Sure from a 75% chance of being right.
- **overconfident:** says Sure from 45%.
- **always-Sure.**
- **always-skip.**

Each cell has 300 players. Every player spends greedily in this order: tapes (keeping 4 on hand), doors, removals, forge upgrades, the shop, then cosmetics above a 100-shard reserve.

It checks four targets and exits 1 if any fails:

1. 90% or more of the players who try can afford the first tape by night 2.
2. At 60% accuracy or lower, always-Sure never out-earns honest.
3. Skipping never out-earns trying, both per answer and over the game.
4. At each chapter's end, no balance is above 2× that chapter's sink total. That total is what was spent there plus what was still on offer.

The "w/o cosm" column shows the balance a player would have if cosmetics didn't exist. It's the late-game surplus that cosmetics absorb.

Options:

- `R`: players per cell.
- `SEED`: the random seed.
- `CONC`: how evenly a player knows the items. It's the Beta concentration, default 4.
- `RIGHT`, `WRONG`, `SURE_RIGHT`, `SURE_WRONG`: try other set payouts for one run, for example `RIGHT=3 WRONG=1 SURE_RIGHT=5`.
