"""The Fire Drill's night map, painted with Gemini (see CREDITS.md): the war room's chalkboard the night's incident
cards are pinned to, and the props on it. Writes raw PNGs; drill_map_pack.py cuts and packs them for the game.

usage: drill_map_art.py OUT_DIR [board-wide board-tall cards icons chalk ...]   (needs GEMINI_API_KEY)

Ladi, 2026-11-17: the map should be a painted scene edge to edge, not tan boxes: each drill an incident card pinned
to the war room's board, no frames or text-and-box UI.
"""
import base64, json, os, sys, urllib.request
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = 'gemini-3-pro-image-preview'
STYLE = ('Same hand-painted anime background style, brushwork, line weight and warm palette as the reference image '
         '(the castle war room). No people, no text, no letters, no numbers, no writing anywhere.')
BOARD = ('Paint a straight-on close-up of the war room\'s big slate chalkboard from the reference, so close that the '
         'dark green-black slate fills the entire frame edge to edge: no wooden frame, no wall, no ceiling visible. '
         'The slate shows soft swirls of chalk dust, faint half-erased ghost lines of old diagrams and arrows, and a '
         'few small faint chalk doodles hugging the very edges only (a tiny castle gate, a little bell, a coffee cup, '
         'tally marks). The middle is a large calm empty area of slate. Warm lantern light falls from the upper right '
         'and a soft red glow from the alarm lamp tints one top corner; the edges fall gently into shadow. ')
JOBS = {
    'board-wide': ('room-empty', BOARD + STYLE, '16:9'),
    'board-tall': ('room-empty', BOARD + STYLE, '9:16'),
    'cards': ('room-empty', 'Paint a sheet of separate game props for this war room, laid out in a 2 by 2 grid with '
              'wide gaps, each fully inside its cell and not touching, front view, on a perfectly flat pure green '
              '(#00FF00) background with no shadows cast on the background. Top left: a blank incident card, an '
              'aged cream parchment index card, portrait 3:4, slightly dog-eared corners, faint ruled lines, a thin '
              'red rule near the top, the middle empty. Top right: a blank alarm notice, a wider landscape parchment '
              'sheet 2:1 with scorched dark edges and a hand-painted red border band, the middle empty. Bottom left: '
              'a single round brass thumbtack seen from the front with a highlight. Bottom right: a single red wax '
              'seal with a bell pressed into it. ' + STYLE, '1:1'),
    'icons': ('room-empty', 'Paint a sheet of four small painted emblems, like little painted illustrations, laid out '
              'in a 2 by 2 grid with wide gaps, not touching, front view, on a perfectly flat pure green (#00FF00) '
              'background with no shadows on the background. Top left: a stone castle gate with an open portcullis. '
              'Top right: a wooden mail sorting rack with letters waiting in a neat line of slots (a queue). Bottom '
              'left: a small stream of blue water flowing in a wooden channel with ripples. Bottom right: a brass fire '
              'alarm bell with a little flame. Each about the same size, bold readable shapes with dark ink outlines. '
              + STYLE, '1:1'),
    'icons2': ('room-empty', 'Paint a sheet of two small painted emblems side by side with a wide gap, not touching, '
               'front view, on a perfectly flat pure green (#00FF00) background with no shadows on the background. Left: a '
               'brass town crier\'s horn on a short wooden post with three white message pigeons flying out of it in '
               'different directions (one message fanned out to many listeners). Right: a wooden signpost on a little '
               'stone base with three painted arrow boards pointing different ways and a small hanging lantern (a '
               'workflow choosing its next step). Same size as each other, bold readable shapes with dark ink outlines. '
               + STYLE, '16:9'),
    'chalk': ('room-empty', 'Draw a sheet of hand-drawn chalk marks, like chalk on a blackboard, on a perfectly flat '
              'pure black (#000000) background, laid out in a 3 by 2 grid with wide gaps, not touching. Top row: a '
              'short upward chalk arrow in white, a rough hand-drawn chalk oval loop in warm yellow chalk (like circling '
              'something important), a big chalk tick mark in green chalk. Bottom row: a scribbled chalk X in red '
              'chalk, a wavy upward chalk arrow in white, a small chalk star burst in yellow. Real chalk texture with '
              'grainy broken strokes and dust. No text, no letters.', '3:2'),
}


def ask(parts, out, aspect=None):
    cfg = {'responseModalities': ['IMAGE']}
    if aspect: cfg['imageConfig'] = {'aspectRatio': aspect}
    body = {'contents': [{'parts': parts}], 'generationConfig': cfg}
    r = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent' % MODEL,
                               data=json.dumps(body).encode(), headers={'x-goog-api-key': os.environ['GEMINI_API_KEY'], 'Content-Type': 'application/json'})
    res = json.load(urllib.request.urlopen(r, timeout=300))
    for p in res['candidates'][0]['content']['parts']:
        d = p.get('inlineData') or p.get('inline_data')
        if d:
            open(out, 'wb').write(base64.b64decode(d['data'])); print('wrote', out); return out
    sys.exit('no image: ' + json.dumps(res)[:400])


def main(a):
    out = a[0]; os.makedirs(out, exist_ok=True)
    for name in a[1:] or list(JOBS):
        ref, prompt, aspect = JOBS[name]
        data = base64.b64encode(open(os.path.join(GAME, 'assets/img/drill', ref + '.webp'), 'rb').read()).decode()
        ask([{'inline_data': {'mime_type': 'image/webp', 'data': data}}, {'text': prompt}], os.path.join(out, name + '.png'), aspect)


if __name__ == '__main__':
    main(sys.argv[1:])
