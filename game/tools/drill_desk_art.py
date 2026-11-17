"""The Fire Drill's in-drill screens, painted with Sogni (see CREDITS.md): the lead's desk the station console slides
up as, its brass switches and lever rail, the paper slips the metrics are pinned on, the counter's brass plaques,
the dock's counter edge, and the night report the end screen pins to the chalkboard. Writes raw PNGs;
drill_desk_pack.py cuts and packs them for the game.

usage: drill_desk_art.py OUT_DIR [desk-wide desk-tall brass slips rail dock sheet ...]
Needs sogni-agent and SOGNI_API_KEY. Renders with --billing-mode subscription (Ladi's Unlimited plan: the server
refuses rather than spend Spark). Model: FLUX 3 Image Klein, with the empty war room plate as the style reference.

Ladi, 2026-11-17 (night map, PR #224): a painted scene edge to edge, not text-and-box UI. This pass carries that
into the drill itself: the station console as a painted desk with brass switches, the trace map's plaques as brass
on the counter, the dock as the counter's edge, the end of the night as a report pinned to the chalkboard.
"""
import os, subprocess, sys
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = 'flux3_image_klein_sd_int8_convrot'
STYLE = ('Same hand-painted anime background style, brushwork, line weight and warm lantern-lit palette as the first '
         'image (the castle war room). No people, no text, no letters, no numbers, no writing anywhere.')
GREEN = ('on a perfectly flat pure green (#00FF00) background with no shadows cast on the background, front view, '
         'each piece fully inside its cell with wide gaps, nothing touching. ')
DESK = ('A hand-painted anime background illustration. Straight top-down view looking down onto the surface of a large '
        'old oak writing desk, the worn wooden planks fill the entire frame edge to edge, with visible grain, knots, '
        'scratches, faint coffee-cup rings and a few old ink stains. Near the very edges only: the warm glow of a brass '
        'oil lamp at one top corner, a quill and inkwell at the far edge, a couple of wax-sealed envelopes peeking in at '
        'the bottom edge. The large centre is open, calm wood with no objects. Warm amber light from the upper right, '
        'the edges falling into soft shadow. ')
JOBS = {
    'desk-wide': (DESK + 'The planks run left to right. ' + STYLE, 1536, 864),
    'desk-tall': (DESK + 'The planks run top to bottom. ' + STYLE, 864, 1536),
    'brass': ('A sheet of four separate painted brass game props for a medieval war room control desk, laid out in a 2 by 2 '
              'grid, ' + GREEN + 'Top left: a long blank engraved brass nameplate, landscape about 5 to 1, polished with '
              'a bevelled edge and a small rivet at each end, the middle plain and empty. Top right: a round brass coin '
              'token stamped with a little bell, seen face on. Bottom left: a brass toggle switch on a small rectangular '
              'brass mounting plate with two screws, its black-tipped lever flipped DOWN, a small unlit dark red glass '
              'jewel lamp above it. Bottom right: the identical brass toggle switch and plate with its lever flipped UP '
              'and the jewel lamp above it glowing bright green. Bold readable shapes with dark ink outlines. ' + STYLE, 1024, 1024),
    'slips': ('A sheet of three separate painted paper props for a war room desk, laid out in a row, ' + GREEN +
              'Left: a small landscape slip of aged cream notepaper, about 3 to 2, slightly curled corners, pinned at the top '
              'centre with a round red pushpin, blank. Middle: a landscape ruled index card, about 5 to 3, cream with thin '
              'pale blue ruled lines and one thin red line near the top, blank, a small brass paperclip on its top edge. '
              'Right: a narrow cream parchment tag, landscape about 4 to 1, with a punched hole and a short loop of red '
              'string at its left end, blank. ' + STYLE, 1536, 864),
    'rail': ('A sheet of two separate painted brass props, ' + GREEN + 'Top, spanning most of the width: one long empty '
             'brass lever rail, a flat polished brass plate about 8 to 1 with rounded ends, a rivet at each end, and a '
             'dark recessed slot running along its whole length, nothing in the slot. Bottom centre, small: a single '
             'brass sliding lever handle seen from the front, a short brass stem with a round black lacquered grip on top, '
             'like the handle of a ship\'s telegraph. ' + STYLE, 1536, 864),
    'dock': ('A hand-painted anime illustration, straight-on front view of the front edge of the war room\'s long wooden '
             'counter, filling the entire frame edge to edge: a thick dark oak plank with visible grain and worn corners '
             'along the bottom, and a polished brass rail with small brackets running the full width along its top edge, '
             'warm lantern light glinting on the brass. No objects on it. ' + STYLE, 1536, 384),
    'sheet': ('A single large painted prop, ' + GREEN + 'A tall sheet of aged cream parchment, portrait about 3 to 4, '
              'slightly dog-eared and torn at the corners, faint ruled lines, a thin red double rule across the top, a '
              'small red wax seal stamped with a bell in the lower right corner, the rest blank. ' + STYLE, 768, 1024),
}


def main(a):
    out = os.path.abspath(a[0]); os.makedirs(out, exist_ok=True)
    ref = os.path.join(out, 'room-empty.png')
    if not os.path.exists(ref):
        from PIL import Image
        Image.open(os.path.join(GAME, 'assets/img/drill/room-empty.webp')).convert('RGB').save(ref)
    env = dict(os.environ, NODE_USE_ENV_PROXY='1')
    for name in a[1:] or list(JOBS):
        prompt, w, h = JOBS[name]
        for i in range(int(os.environ.get('TAKES', '2'))):
            dst = os.path.join(out, '%s-%d.png' % (name, i + 1))
            if os.path.exists(dst): continue
            subprocess.run(['sogni-agent-claude-code', '--billing-mode', 'subscription', '--json', '-m', MODEL, '-c', ref,
                            '-w', str(w), '-h', str(h), '-o', dst, prompt], env=env, check=False, stdout=subprocess.DEVNULL)
            print('wrote' if os.path.exists(dst) else 'FAILED', dst, flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])
