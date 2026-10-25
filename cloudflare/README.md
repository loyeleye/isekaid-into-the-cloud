# Isekai'd Into the Cloud on Cloudflare

This folder hosts the game on Cloudflare Workers. It is the first game's Worker (Isekai'd Into Prod, `loyeleye/system-design-study`, branch `claude/pixellab-art-upgrade-68vl3t`, `cloudflare/`), reused as it is with its directory list extended for the Borderlands. One Worker serves everything:

- **The game itself:** every file in `game/` (except `game/tools/`, see `game/.assetsignore`) as static assets: the page, the scripts, the art, every voice line in `assets/audio/vo/` as its own file, and the typed-answer model (`assets/model/potion-base-8m.i8`, served as is, so no base64 copy is needed). Static requests are free and not metered. There is no build step: Cloudflare uploads `game/` exactly as it is in the repo.
- **Multiplayer rooms:** `/api/room/<name>`, a WebSocket per table (Durable Object `Room`). Same shape as the claude.ai `room` capability, so the Borderlands parties (chapter 1's Deny Mines, `game/js/raid.js`) run unchanged.
- **Open lobbies:** `/api/lobby/<game>`, one party directory per game (Durable Object `Directory`): the first 10 open parties, oldest first, and how many are open in all, pushed live to everyone looking for one at the cave mouth.
- **Cloud saves:** `/api/save/<code>` (Durable Object `SaveSlot`). Each browser gets a 32-character save code. The game doesn't use them yet; they're kept for playing on another device later.

The multiplayer backend is part of this same Worker, so there is nothing else to host or configure. The Durable Objects are created by the first deploy (the `migrations` block in `wrangler.jsonc`), and they work on the Free plan because they are the SQLite-backed kind.

The game knows it's on this Worker from a `Server-Timing: sd-cloud` header on its static files (`game/_headers`), and only then asks `api/hello` (`game/js/cloud.js`). The claude.ai artifact and a local `python3 -m http.server` copy send no request at all, so they log no errors and behave exactly as before.

**Why Workers and not Pages:** Cloudflare now puts static sites on Workers (static assets), and a Pages project can't define the Durable Objects the multiplayer rooms need. Everything below happens under **Workers & Pages** in the dashboard, but you create a Worker, not a Pages project.

## Setup: deploy from GitHub (recommended, about 15 minutes)

With this, Cloudflare redeploys the game by itself every time a PR is merged into `main`, so the merging thread's merge is also the Cloudflare release. You only use the browser.

1. **Create a Cloudflare account** at https://dash.cloudflare.com/sign-up. The Workers Free plan needs no card.
2. **Create the Worker from the repo.** In the dashboard, open **Workers & Pages** and select **Create application**. Choose **GitHub**, sign in to GitHub when asked, and let Cloudflare's GitHub app see `loyeleye/isekaid-into-the-cloud` (picking only that repo is enough). Then select the repo.
3. **Fill in the project settings** on the next screen:
   - **Project name:** `isekaid-into-the-cloud`. It has to match `"name"` in `cloudflare/wrangler.jsonc` exactly, or every build fails.
   - **Root directory** (under the advanced or build settings): `cloudflare`. This is the important one: the Wrangler file is in that folder, not at the top of the repo.
   - **Build command:** leave empty. The game has no build step.
   - **Deploy command:** `npx wrangler deploy` (the default).
   - **Production branch:** `main`.
4. Select **Save and Deploy** (or **Deploy**). The first build takes a few minutes: it installs Wrangler from `cloudflare/package.json` and uploads about 3,000 files from `game/`. You can watch it under the Worker's **Deployments** tab, **View build history**.
5. **Open the game.** When the build is green, the Worker's page shows its address, like `https://isekaid-into-the-cloud.<your-subdomain>.workers.dev`. The first time, Cloudflare may ask you to pick the `<your-subdomain>` part for your account.
6. **Turn off preview builds** (recommended). Go to the Worker's **Settings** > **Build** > **Branch control** and clear **Enable Preview Builds**. Feature threads push many branches; with previews on, each push builds a separate preview copy. Only `main` needs deploying.

If you created the Worker another way first (for example with `npx wrangler deploy` below), connect it instead: **Workers & Pages** > `isekaid-into-the-cloud` > **Settings** > **Builds** > **Connect**, and use the same settings as step 3.

## Setup: deploy from your computer

Use this to deploy once without connecting GitHub, or to try a build before it reaches `main`. You need Node.js (a current or LTS version) and a clone of the repo.

```sh
cd cloudflare
npm install
npx wrangler login     # opens a browser window to approve Wrangler for your Cloudflare account
npx wrangler deploy    # uploads game/ and the Worker, then prints the game's address
```

The first deploy asks you to pick a `workers.dev` subdomain if your account doesn't have one yet. To deploy a new build later, pull the latest `main` and run `npx wrangler deploy` again from this folder. If GitHub deploys are also connected, the next merge into `main` replaces whatever you deployed by hand.

## Check it works

After the first deploy, on the `workers.dev` address:

1. The title screen loads and a new game starts. Voice lines play in chapter 1 (sound effects switch on).
2. `https://<your address>/api/hello` shows `{"game":"isekaid"}`. That means the multiplayer backend is up.
3. Multiplayer: open the game in two different browsers (or one normal and one private window), take both to the Deny Mines cave mouth, host a party in one and join it from the other.

Saves live in each browser and belong to the site's address, so a save on the claude.ai artifact doesn't appear on the Cloudflare copy, and the `workers.dev` address and a custom domain each keep their own.

## Try it locally first

```sh
cd cloudflare
npm install
npx wrangler dev
```

Then open http://localhost:8787 in two different browsers to play each other. Rooms, lobbies and saves all run locally, and nothing is uploaded.

## Optional: your own domain

The domain has to be on your Cloudflare account first (registered with Cloudflare, or added as a site with its nameservers pointed at Cloudflare). Then: **Workers & Pages** > `isekaid-into-the-cloud` > **Settings** > **Domains & Routes** > **Add** > **Custom Domain**, enter a name such as `game.example.com`, and select **Add Custom Domain**. Cloudflare creates the DNS record and the certificate. The name can't already have a CNAME record. Rooms only accept connections from the address the page came from, so they work on the custom domain and on `workers.dev` alike.

## What it costs

On the **Workers Free** plan there is no bill. From Cloudflare's docs (checked 2026-10-25):

- **Static assets** (the game itself): free and unlimited, up to 20,000 files per deploy and 25 MiB per file. The game is about 3,000 files and its largest is the 7.3 MB model, so there is lots of room.
- **Worker requests:** 100,000 a day. Only `/api/*` runs the Worker (`run_worker_first` in `wrangler.jsonc`).
- **Durable Objects** (rooms, lobbies, saves): 100,000 requests a day, where incoming WebSocket messages count 20 to 1; 13,000 GB-s of run time a day (the rooms use the hibernation API, so an idle table doesn't count); 5 GB of storage.
- Daily limits reset at 00:00 UTC. Past one, `/api/*` answers 429 until the reset. The game then plays exactly like the claude.ai copy, without online parties, and the static files keep loading.

If the game outgrows that, **Workers Paid** is $5 a month for the account and includes 10 million Worker requests and 1 million Durable Object requests a month, then usage pricing. You can stay on Free and nothing is ever charged.

Sources (read from Cloudflare's docs repository, https://github.com/cloudflare/cloudflare-docs, which publishes these pages):
https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ ,
https://developers.cloudflare.com/workers/platform/limits/ ,
https://developers.cloudflare.com/workers/platform/pricing/ ,
https://developers.cloudflare.com/durable-objects/platform/pricing/ ,
https://developers.cloudflare.com/workers/ci-cd/builds/ ,
https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ ,
https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/ ,
https://developers.cloudflare.com/workers/configuration/routing/custom-domains/

## If something goes wrong

- **The build fails right away about the Worker's name:** the project name in the dashboard isn't `isekaid-into-the-cloud`. Rename it, or change `"name"` in `wrangler.jsonc` to match, and push.
- **The build says it can't find a Wrangler configuration, or opens an "automatic configuration" PR:** the root directory isn't set to `cloudflare`. Close that PR without merging, fix the root directory in **Settings** > **Builds**, and retry the build.
- **The game loads but no one can find a party:** check `/api/hello` (step 2 of "Check it works"). If it doesn't answer, look at the latest deploy's log; if it answers 429, a free daily limit is used up until 00:00 UTC.
- **A file in `game/` is over 25 MiB:** the deploy fails. Split or compress it before merging.

## Limits built into the Worker

- A message is at most 8 KB, presence at most 2 KB, and each socket gets about 20 messages a second.
- A table room holds up to 64 sockets; a lobby directory up to 5,000.
- Rooms and sockets only accept connections from the game's own address.
- A save is at most 1 MB, and an older save never overwrites a newer one.
