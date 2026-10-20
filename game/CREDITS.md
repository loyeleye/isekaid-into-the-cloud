# Credits and licenses

Everything here was first made for or gathered by the first game, [Isekai'd Into Prod](https://github.com/loyeleye/system-design-study) (branch `claude/pixellab-art-upgrade-68vl3t`, `game/CREDITS.md` and `game/CREDITS-arc.md`), and is reused with its credit line. Every new asset adds its line here in the same commit. The repo and the published game are public, so nothing copyrighted goes in.

## Art

| Asset | Author and source | License | Used for |
| --- | --- | --- | --- |
| "Character Portrait ~ Maid" (`assets/img/portraits/uptima-*.webp`) | Jupiter's Daughter, https://opengameart.org/content/character-portrait-maid | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Uptima's portraits (cropped to busts) |
| The hero's portraits (`assets/img/portraits/you-*.webp`), the dungeon map's floors, props and room icons (`assets/img/dungeon`), the battle backdrops and your fighter's animations (`assets/img/battle`) and the incident monsters (`assets/img/monsters`) | Generated for this game with [PixelLab](https://pixellab.ai) on Ladi's subscription (first made for Isekai'd Into Prod), processed by `tools/village_art.py`, `tools/battle_art.py` and `tools/pixel_portraits.py` | Used under PixelLab's [Terms of Service](https://pixellab.ai/termsofservice) | The dungeon map, fights and dialogue |
| Particle Pack (`assets/img/fx`), Emotes Pack (`assets/img/emotes.png`) | Kenney (www.kenney.nl), via OpenGameArt | CC0 | Hit sparks in combat, speech-bubble emotes |
| Game-icons.net (137-icon subset in `assets/game-icons.js`) | https://game-icons.net, via the npm package `@iconify-json/game-icons` 1.2.4. Icons by Lorc, Delapouite and other contributors listed at https://game-icons.net/about.html | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Card art, map nodes, story props |

Everything else (code-drawn portraits for characters without a painted one, System windows) is drawn in code in `js/art.js` and `index.html`.

## Model

| Asset | Author and source | License | Used for |
| --- | --- | --- | --- |
| potion-base-8M (`assets/model`, quantized to int8) | [MinishLab](https://github.com/MinishLab/model2vec), https://huggingface.co/minishlab/potion-base-8M | MIT (`assets/model/LICENSE`) | Checking typed answers on your device (`js/embed.js`); see `assets/model/README.md` |

## Music

| File | Track | Author and source | License | Plays |
| --- | --- | --- | --- | --- |
| `m-opening` | "Kokoro no Yume" (2 min edit) | Paul Winter (kaazoom), https://pixabay.com/music/main-title-kokoro-no-yume-2-min-edit-440922/ | [Pixabay Content License](https://pixabay.com/service/license-summary/) | Title |
| `m-journey` | "Orchestral: Our Journey Awaits" | Techspired Minds (joschjava), https://opengameart.org/content/orchestral-our-journey-awaits | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Story moments (`journey`) |
| `m-goddess` | "Fluffing a Duck" | Kevin MacLeod (incompetech.com) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Uptima's scenes (`goddess`) |
| `m-village` | "Hot Springs Town" | Kistol, https://opengameart.org/content/hot-springs-town | CC0 | Town |
| `m-quest` | "Cozy Puzzle In-Game 1" | MintoDog, https://opengameart.org/content/cozy-puzzle-in-game-1 | CC0 | Quests and lessons |
| `m-story` | "Emotional Piano" | Centurion_of_war, https://opengameart.org/content/emotional-piano-0 | CC0 | Story moments |
| `m-guild` | "Enchanted Festival" (the author's looped version) | Matthew Pablo (http://www.matthewpablo.com), https://opengameart.org/content/enchanted-festival | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Guild (`guild`) |
| `m-explore` | "Kaze no Kioku" (3:15 loopable edit) | Paul Winter (kaazoom), https://pixabay.com/music/world-kaze-no-kioku-315-loopable-edit-439962/ | [Pixabay Content License](https://pixabay.com/service/license-summary/) | The dungeon map |
| `m-battle` | "JRPG Epic Rock Battle Theme #1" | HydroGene, https://opengameart.org/content/jrpg-epic-rock-battle-theme-1 | CC0 | Battles |
| `m-boss` | "Epic Boss Battle [Seamlessly Looping]" | Juhani Junkala (SubspaceAudio), https://opengameart.org/content/boss-battle-music | CC0 | Boss |
| `m-shop` | "Bossa" (shop theme, HD) | SpringySpringo, https://opengameart.org/content/bossa-shop-theme-in-low-fi-and-hd | CC0 (dual-licensed CC0 / CC BY 3.0; used under CC0) | Shops (`shop`) |
| `j-victory`, `j-defeat`, `j-gary` | Music Jingles (SAX set) | Kenney, via OpenGameArt | CC0 | Victory, defeat and rescue jingles |
| `j-after` | "Sneaky And Funny Strings - Plucked, Quirky Comedy - OPENER" | zec53, via Pixabay | [Pixabay Content License](https://pixabay.com/service/license-summary/) | A comic opener (`js/arc.js`) |

Kevin MacLeod credit line: "Fluffing a Duck" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/

Techspired Minds credit line: "Orchestral: Our Journey Awaits" by Techspired Minds (joschjava), licensed under CC BY 4.0, https://creativecommons.org/licenses/by/4.0/, via https://opengameart.org/content/orchestral-our-journey-awaits

Matthew Pablo credit line: "Enchanted Festival" by Matthew Pablo (http://www.matthewpablo.com), licensed under CC BY 3.0, https://creativecommons.org/licenses/by/3.0/, via https://opengameart.org/content/enchanted-festival

Pixabay credit lines: "Kokoro no Yume" and "Kaze no Kioku" by Paul Winter (kaazoom), and "Sneaky And Funny Strings" by zec53, via Pixabay (Pixabay Content License). Pixabay marks "Kokoro no Yume" and "Kaze no Kioku" as AI-generated. The license allows use inside the game but not standalone redistribution, so these files must not be offered as separate downloads or a soundtrack pack.

Music was re-encoded to MP3 and loudness-normalised; nothing else was changed.

## Sound effects

Interface Sounds and RPG Audio by Kenney (CC0), via OpenGameArt: clicks, confirms, errors, card flips, slashes, coins and doors. The typewriter voices and a few comic effects are synthesized at runtime in `js/audio.js`, which also stands in for any track that fails to load.

Weather (`assets/audio/a-*.mp3` except `a-sea`, `a-fire`, `a-crickets` and `a-clock`), via Pixabay under the [Pixabay Content License](https://pixabay.com/service/license-summary/), none AI-generated or registered with Content ID: "Birds Forest Nature" by Jurij (SoundReality), "Soft Wind Leaves" by storegraphic, "Gentle Rain 07", "Heavy rainstorm", "Dry Thunder" and "Harsh Wind" by DRAGON-STUDIO, "Thunder For Anime" by LordSonny, and "Thunder Strike" and "Loud Thunder" by Universfield. The rain and birdsong loops were cross-faded end to start so they loop without a seam; the same no-standalone-redistribution rule applies.

Places and the night (`assets/audio/a-sea`, `a-fire`, `a-crickets`, `a-clock` and the `s-gull`, `s-anvil`, `s-chime`, `s-clank`, `s-thud`, `s-shopbell`, `s-doorclose`, `s-page` and `s-steps` one-shots), via OpenGameArt: "Beach Ocean Waves" and "Doorbell Ring" by qubodup, "Solo Seagull Sound Effects" by Rango Mango, "Fire Crackling" by AntumDeluge, "Hammer on Anvil" by themightyglider, "Blacksmith's Hammer" by vishwajai, "Bell Dings/Chimes" by pwl, "Metal Impact Sounds" by bmaczero, "Crickets Ambient Noise (Loopable)" by wolfgang, all CC0; "Slow Clock Ticking (Seamless Looping)", Sound Effect By Nicole Marie T (medicinestorm), https://opengameart.org/content/slow-clock-ticking-seamless-looping-sfx-sound-effect, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); and Kenney's RPG Audio (CC0) for the closing door, the page turn and the footsteps. All re-encoded to MP3 and loudness-normalised.

`s-flush`, `s-pager`, `s-static`, `s-crash`, `s-slowmo`, `s-thunder` and `s-levelup` (loaded by `js/arc.js`): "Behind Doors Toilet Flush" by Alex_Jauk, "PagerBeeps" and "Light Metal Crash" by freesound_community, "Radio Static" by DRAGON-STUDIO, "Slow cinematic air rush #5" by Sdanezis, "Thunder For Anime" by LordSonny, "Level Up 06" by Universfield, all via Pixabay (Pixabay Content License).

## Fonts

Loaded from Google Fonts under the SIL Open Font License: Fredoka (Milena Brandão, Hafontia) and Nunito (Vernon Adams, Jacques Le Bailly).

## Learning sources

AWS facts follow the current AWS documentation. Every explanation is written fresh; no practice-exam questions or course material are copied.
