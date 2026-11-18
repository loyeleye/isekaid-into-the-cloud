# Night Watch art pipeline

How `assets/img/watch/` and `js/watch-art.js` were made (Nov 18, 2026). Renders come from Sogni on Ladi's Unlimited plan; the
key is read from `SOGNI_API_KEY` in the environment and never stored.

1. `render.py jobs/<file>.json [concurrency]` renders each job (prompt, model, reference) with `sogni-agent`. Raw renders are not
   committed; the job files are the record of every prompt.
2. `build_people.py` and `build_animals.py` cut each render out of its white background (`cutout.py`), scale it, put the feet
   on one line with a soft shadow and pack the frames into strips.
3. `compose.py <path to js/watch-world.js>` places the buildings, rooms and props at the engine's spot positions and writes the
   parallax layers. `proc.py` draws the hills, road surfaces, weather tiles, sparkle and tiny insects in code.
4. `make_js.py` writes `js/watch-art.js`; `preview.py` renders a camera view of a level or floor for checking.

Rules (Ladi, Nov 17): strict 2D side view, everyone stands on the ground with a shadow, doors fit a person, sun from the
upper left by day and moon from the upper right by night.
