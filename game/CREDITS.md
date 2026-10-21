# Credits and licenses

Everything here was first made for or gathered by the first game, [Isekai'd Into Prod](https://github.com/loyeleye/system-design-study) (branch `claude/pixellab-art-upgrade-68vl3t`, `game/CREDITS.md` and `game/CREDITS-arc.md`), and is reused with its credit line. Every new asset adds its line here in the same commit. The repo and the published game are public, so nothing copyrighted goes in.

## Art

| Asset | Author and source | License | Used for |
| --- | --- | --- | --- |
| "Character Portrait ~ Maid" (`assets/img/portraits/uptima-*.webp`) | Jupiter's Daughter, https://opengameart.org/content/character-portrait-maid | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Uptima's portraits (cropped to busts) |
| The hero's portraits (`assets/img/portraits/you-*.webp`), the dungeon map's floors, props and room icons (`assets/img/dungeon`), the battle backdrops and your fighter's animations (`assets/img/battle`) and the incident monsters (`assets/img/monsters`) | Generated for this game with [PixelLab](https://pixellab.ai) on Ladi's subscription (first made for Isekai'd Into Prod), processed by `tools/village_art.py`, `tools/battle_art.py` and `tools/pixel_portraits.py` | Used under PixelLab's [Terms of Service](https://pixellab.ai/termsofservice) | The dungeon map, fights and dialogue |
| Particle Pack (`assets/img/fx`), Emotes Pack (`assets/img/emotes.png`) | Kenney (www.kenney.nl), via OpenGameArt | CC0 | Hit sparks in combat, speech-bubble emotes |
| Chapter 1's leads and Freya: Mira's, Kai's, Seo-yeon's and Dutch's full bodies and Freya's three forms (`assets/img/lead/*.webp`), and their portraits (`assets/img/portraits/mira-neutral`, `kai-neutral`, `seoyeon-neutral`, `dutch-neutral`, `freya-promoter`, `freya-smile` (her neutral until 2026-10-21, when a straight-faced `freya-neutral` edited from it took its place), `freya-virus`) | Generated for this game with [PixelLab](https://pixellab.ai) on Ladi's subscription: Ladi's picks from the concept-art variants generated on 2026-10-20 (Mira D, Kai A, Seo-yeon C, Dutch D, and goddess alternate C for Freya the brand promoter), resized for the game. The four leads' portraits were redrawn on 2026-10-21 from the agreed designs (Mira D, Kai A, Seo-yeon C and Dutch P1) | Used under PixelLab's [Terms of Service](https://pixellab.ai/termsofservice) | Choosing your lead, dialogue, and your fighter in chapter 1's battles |
| Chapter 1's painted prologue art: Mira's tower-stair background and the still of her holding Bram (`assets/img/vn/m1.webp`, `m2.webp`), and the sprites of Mira grieving and Freya smiling (`mira-grief.webp`, `freya-smile.webp`) | Generated for this game with Google's Gemini 3 Pro Image through the Gemini API on Ladi's account on 2026-10-20, painted from Ladi's concept-art picks, then resized (sprites cut out from a flat backdrop) | Used under the [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) | The visual-novel prologues (`js/vn.js`) |
| The rest of the four backstories' stills, one per shot of the backstory storyboard (`assets/img/vn/m2b` to `m3c`, `k1` to `k3c`, `s0a` to `s7c`, `d1` to `d1c`) | Generated for this game with Google's Gemini image model (gemini-nano-banana-2.1) through the Gemini API on Ladi's account on 2026-10-21, from the agreed character designs, the two Mira stills above and Ladi's chosen Freya reference sheet; each Freya shot is an edit of the shot before it, then resized | Used under the [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) | The visual-novel prologues (`js/ch1-story.js`) |
| The opening scene's painted stills: the lightning shots, the pavilion's two angles with Freya's eight faces, the close-ups and inserts, and the closing shot of Freya alone (`assets/img/opening/*.webp`) | Generated for this game with Google's Gemini image model (gemini-nano-banana-2.1) through the Gemini API on Ladi's account on 2026-10-21, from Ladi's chosen Freya reference sheet and the storyboard; faces swapped in with a masked edit, then resized | Used under the [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) | The opening, "the files" (`js/vec-open.js`) |
| The opening's and the backstory cutscenes' voice lines (`assets/audio/vo/*.mp3`) | Generated for this game with Google's Gemini text-to-speech through the Gemini API on Ladi's account on 2026-10-21: Freya and Kagemaru on gemini-3.8-flash-tts (Freya: Despina, Kagemaru: Algenib; `freya-*` and `man-op-*`), Mira and Seo-yeon on gemini-3.8-flash-lite-tts (Mira: Gacrux, Seo-yeon: Kore), Dutch and Kai on gemini-2.5-pro-preview-tts (Dutch: Charon, Kai: Alnilam), and the people they lost on gemini-2.5-pro-preview-tts (Bram: Sadachbia, Hana: Leda, Jin: Fenrir, Old Gu: Enceladus, the Alliance Leader: Iapetus, Lina: Zephyr), trimmed | Used under the [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) | The spoken lines in the visual-novel scenes (`js/vo.js`) |
| Kyu's portraits (`assets/img/portraits/kyu-*.webp`) and boss sprite (`assets/img/monsters/kyuboss.webp`), and Uptima's boss sprite (`assets/img/monsters/uptimaboss.webp`, the first idle frame of the first game's `assets/img/battle/champ-uptima.webp`) | Generated with [PixelLab](https://pixellab.ai) on Ladi's subscription for Isekai'd Into Prod (its `CREDITS-arc.md` and `CREDITS.md`) | Used under PixelLab's [Terms of Service](https://pixellab.ai/termsofservice) | Kyu and Uptima in chapter 1 |
| Chapter 1's leads' and Freya's expressions (`assets/img/portraits/mira-*`, `kai-*`, `seoyeon-*`, `dutch-*` and `freya-*` other than the three above: smile, sad, angry, surprised and tired, with `anger`, `shock`, `grief` and `warm` as copies of angry, surprised, sad and smile for the chapter code's face names; Freya also has laugh, and her old smiling neutral is now `freya-smile`/`freya-warm`) | Generated for this game with [PixelLab](https://pixellab.ai) on Ladi's subscription on 2026-10-21: text edits (`edit-image`, `edit-image-pro-flash`, `edit-images-v2`) of each character's own neutral portrait, at its 1x size, scaled up 3x with hard pixel edges | Used under PixelLab's [Terms of Service](https://pixellab.ai/termsofservice) | Faces in dialogue |
| Game-icons.net (137-icon subset in `assets/game-icons.js`) | https://game-icons.net, via the npm package `@iconify-json/game-icons` 1.2.4. Icons by Lorc, Delapouite and other contributors listed at https://game-icons.net/about.html | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Card art, map nodes, story props |

| The vector proof of concept's art (`vector.html`, or `index.html?vector`): the opening "the files" (Freya's pavilion, the hands and the ring, the folders and intro cards), the cast's figures and faces (`js/vec-cast.js`), chapter 1's prologue backgrounds and stills and the battle backdrops (`js/vec-scenes.js`), chapter 2's scenes: Bram's wagon, the edge of the Cloud, Freya's tower, the scrap field and Seymour's bunker, the Free Cloud's first fire, Thornwick's square and silent post box, the Sorting Floors and the camp post office (`js/vec-scenes2.js`), Kyu, Uptima and chapter 2's incidents, hit sparks and emotes (`js/vec-foes.js`) | Original, drawn in code for this game (SVG built in JavaScript; no generated or third-party images) | Same as the game's code | The vector demo, in place of every painted, generated or packed image |

Everything else is drawn in code: portraits for characters without a painted one and the System windows in `js/art.js` and `index.html`, chapter 1's whole overworld (the ground, river, buildings, props, the temple, and every character walking about) in `js/ch1-art.js`, and the Deny Mines' enemies in `js/ch1-mines-art.js`.

## Model

| Asset | Author and source | License | Used for |
| --- | --- | --- | --- |
| potion-base-8M (`assets/model`, quantized to int8) | [MinishLab](https://github.com/MinishLab/model2vec), https://huggingface.co/minishlab/potion-base-8M | MIT (`assets/model/LICENSE`) | Checking typed answers on your device (`js/embed.js`); see `assets/model/README.md` |

## Music

| File | Track | Author and source | License | Plays |
| --- | --- | --- | --- | --- |
| `m-c1-title` | "Oppressive Gloom" | Kevin MacLeod (incompetech.com), https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100885 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Title (`title`) |
| `m-c1-prologue` | "Death Is Just Another Path" | Otto Halmén, https://opengameart.org/content/death-is-just-another-path | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) (also OGA-BY 3.0) | The prologues and story moments (`story`) |
| `m-c1-freya` | "musicbox1_spooky_waltz", from "4 Music Box Tracks" | Aureolus_Omicron, https://opengameart.org/content/4-music-box-tracks | CC0 | Freya's scenes (`freya`) |
| `m-c1-camp` | "Vampire's Piano" | TAD, https://opengameart.org/content/vampires-piano | CC0 | Freya's camp (`camp`) |
| `m-c1-road` | "Darkness March" | Alexandr Zhelanov, https://opengameart.org/content/darkness-march | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | The road east (`road`) |
| `m-c1-brookfall` | "Heavy Heart" | Kevin MacLeod (incompetech.com), https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600002 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Brookfall (`brookfall`) |
| `m-c1-temple` | "Rites" | Kevin MacLeod (incompetech.com), https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100722 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | The Temple of Uptime and its dungeon (`temple`, `map1`) |
| `m-c1-battle` | "Black Vortex" | Kevin MacLeod (incompetech.com), https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300037 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Battles (`battle`) |
| `m-c1-boss` | "Final Count" | Kevin MacLeod (incompetech.com), https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100657 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Uptima's fight (`boss`) |
| `m-journey` | "Orchestral: Our Journey Awaits" | Techspired Minds (joschjava), https://opengameart.org/content/orchestral-our-journey-awaits | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Story moments (`journey`) |
| `m-goddess` | "Fluffing a Duck" | Kevin MacLeod (incompetech.com) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Uptima's scenes (`goddess`) |
| `m-village` | "Hot Springs Town" | Kistol, https://opengameart.org/content/hot-springs-town | CC0 | Town |
| `m-quest` | "Cozy Puzzle In-Game 1" | MintoDog, https://opengameart.org/content/cozy-puzzle-in-game-1 | CC0 | Quests and lessons |
| `m-guild` | "Enchanted Festival" (the author's looped version) | Matthew Pablo (http://www.matthewpablo.com), https://opengameart.org/content/enchanted-festival | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Guild (`guild`) |
| `m-explore` | "Kaze no Kioku" (3:15 loopable edit) | Paul Winter (kaazoom), https://pixabay.com/music/world-kaze-no-kioku-315-loopable-edit-439962/ | [Pixabay Content License](https://pixabay.com/service/license-summary/) | The dungeon map |
| `m-shop` | "Bossa" (shop theme, HD) | SpringySpringo, https://opengameart.org/content/bossa-shop-theme-in-low-fi-and-hd | CC0 (dual-licensed CC0 / CC BY 3.0; used under CC0) | Shops (`shop`) |
| `m-kyu` | "Shadow of the Ancient Forest (Full version)" | Paul Winter (kaazoom), via Pixabay | [Pixabay Content License](https://pixabay.com/service/license-summary/) | Kyu's scenes (`kyu`) |
| `m-kyusad` | "Under The Moon Sad Cinematic Loop" | Emmraan, via Pixabay | [Pixabay Content License](https://pixabay.com/service/license-summary/) | Chapter 1's last scene (`kyusad`) |
| `m-kyuboss` | "Final Battle Epic Orchestral Action Background Music" | Mohd Umar (mumarmds), via Pixabay | [Pixabay Content License](https://pixabay.com/service/license-summary/) | The Kyu fight (`kyuboss`) |
| `j-victory`, `j-defeat`, `j-gary` | Music Jingles (SAX set) | Kenney, via OpenGameArt | CC0 | Victory, defeat and rescue jingles |
| `j-after` | "Sneaky And Funny Strings - Plucked, Quirky Comedy - OPENER" | zec53, via Pixabay | [Pixabay Content License](https://pixabay.com/service/license-summary/) | A comic opener (`js/arc.js`) |

Kevin MacLeod credit line: "Fluffing a Duck" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/

Kevin MacLeod credit lines, one per track: "Oppressive Gloom", "Heavy Heart", "Rites", "Black Vortex" and "Final Count", each "<Title>" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/

Other credit lines: "Death Is Just Another Path" by Otto Halmén, licensed under CC BY 3.0, https://creativecommons.org/licenses/by/3.0/, via https://opengameart.org/content/death-is-just-another-path; "Darkness March" by Alexandr Zhelanov, licensed under CC BY 4.0, https://creativecommons.org/licenses/by/4.0/, via https://opengameart.org/content/darkness-march

Techspired Minds credit line: "Orchestral: Our Journey Awaits" by Techspired Minds (joschjava), licensed under CC BY 4.0, https://creativecommons.org/licenses/by/4.0/, via https://opengameart.org/content/orchestral-our-journey-awaits

Matthew Pablo credit line: "Enchanted Festival" by Matthew Pablo (http://www.matthewpablo.com), licensed under CC BY 3.0, https://creativecommons.org/licenses/by/3.0/, via https://opengameart.org/content/enchanted-festival

Pixabay credit lines: "Kaze no Kioku" and "Shadow of the Ancient Forest" by Paul Winter (kaazoom), "Under The Moon Sad Cinematic Loop" by Emmraan, "Final Battle Epic Orchestral Action Background Music" by Mohd Umar (mumarmds), and "Sneaky And Funny Strings" by zec53, via Pixabay (Pixabay Content License). Pixabay marks "Kaze no Kioku", "Shadow of the Ancient Forest" and "Final Battle" as AI-generated. The three Kyu tracks were first gathered for Isekai'd Into Prod (its `CREDITS-arc.md`). The license allows use inside the game but not standalone redistribution, so these files must not be offered as separate downloads or a soundtrack pack.

Music was re-encoded to MP3 and loudness-normalised; nothing else was changed.

## Sound effects

Interface Sounds and RPG Audio by Kenney (CC0), via OpenGameArt: clicks, confirms, errors, card flips, slashes, coins and doors. The typewriter voices and a few comic effects are synthesized at runtime in `js/audio.js`, which also stands in for any track that fails to load.

Weather (`assets/audio/a-*.mp3` except `a-sea`, `a-fire`, `a-crickets` and `a-clock`), via Pixabay under the [Pixabay Content License](https://pixabay.com/service/license-summary/), none AI-generated or registered with Content ID: "Birds Forest Nature" by Jurij (SoundReality), "Soft Wind Leaves" by storegraphic, "Gentle Rain 07", "Heavy rainstorm", "Dry Thunder" and "Harsh Wind" by DRAGON-STUDIO, "Thunder For Anime" by LordSonny, and "Thunder Strike" and "Loud Thunder" by Universfield. The rain and birdsong loops were cross-faded end to start so they loop without a seam; the same no-standalone-redistribution rule applies.

Places and the night (`assets/audio/a-sea`, `a-fire`, `a-crickets`, `a-clock` and the `s-gull`, `s-anvil`, `s-chime`, `s-clank`, `s-thud`, `s-shopbell`, `s-doorclose`, `s-page` and `s-steps` one-shots), via OpenGameArt: "Beach Ocean Waves" and "Doorbell Ring" by qubodup, "Solo Seagull Sound Effects" by Rango Mango, "Fire Crackling" by AntumDeluge, "Hammer on Anvil" by themightyglider, "Blacksmith's Hammer" by vishwajai, "Bell Dings/Chimes" by pwl, "Metal Impact Sounds" by bmaczero, "Crickets Ambient Noise (Loopable)" by wolfgang, all CC0; "Slow Clock Ticking (Seamless Looping)", Sound Effect By Nicole Marie T (medicinestorm), https://opengameart.org/content/slow-clock-ticking-seamless-looping-sfx-sound-effect, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); and Kenney's RPG Audio (CC0) for the closing door, the page turn and the footsteps. All re-encoded to MP3 and loudness-normalised.

`s-flush`, `s-pager`, `s-static`, `s-crash`, `s-slowmo`, `s-thunder` and `s-levelup` (loaded by `js/arc.js`): "Behind Doors Toilet Flush" by Alex_Jauk, "PagerBeeps" and "Light Metal Crash" by freesound_community, "Radio Static" by DRAGON-STUDIO, "Slow cinematic air rush #5" by Sdanezis, "Thunder For Anime" by LordSonny, "Level Up 06" by Universfield, all via Pixabay (Pixabay Content License).

## Code

| Code | Author and source | License | Used for |
| --- | --- | --- | --- |
| The Borderlands engine (`js/raid.js`), the party room (`js/party.js`), the networking (`js/net.js`, `js/cloud.js`) and the Cloudflare Worker (`cloudflare/`, with `_headers` and `.assetsignore`) | Written for the first game, [Isekai'd Into Prod](https://github.com/loyeleye/system-design-study) (branch `claude/pixellab-art-upgrade-68vl3t`: its Expedition Raid, party room, Guild Hall networking and Worker), ported on 2026-10-21 with the changes listed at the top of each file | Same as the game's code | Chapter 1's Deny Mines, solo with bots or in a party, and open lobbies on the Cloudflare build |

## Fonts

Loaded from Google Fonts under the SIL Open Font License: Fredoka (Milena Brandão, Hafontia) and Nunito (Vernon Adams, Jacques Le Bailly).

## Learning sources

AWS facts follow the current AWS documentation. Every explanation is written fresh; no practice-exam questions or course material are copied.
