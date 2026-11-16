"""Uptima's Live shift lines, spoken (see CREDITS.md): assets/audio/vo/uptima-mg-icl-<key>.mp3, mapped in js/vo-modes.js.

usage: ic_live_vo.py [KEY ...]     record the lines (all, or the keys named) with Gemini TTS (needs GEMINI_API_KEY)

Her story voice (Achernar on gemini-3.8-flash-tts), in her prequel manner: grand, vain, a little flustered. The text
is read from js/ic-live.js (SAY) and js/ic-live-core.js (the pages), so the recording always matches the screen.
"""
import base64, json, os, re, subprocess, sys, tempfile, urllib.request
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL, VOICE = 'gemini-3.8-flash-tts', 'Achernar'
DIRECTION = ('Read this as Uptima, a vain, theatrical young goddess covering an on-call shift she is not qualified for: '
             'grand and self-important, a little flustered underneath, comic timing, quick and natural, not shouting. ')
PAGE_DIRECTION = 'Read this pager alert as Uptima, briskly and a little worried, like reading it off the pager: '


def lines():
    src = open(os.path.join(GAME, 'js/ic-live.js')).read()
    block = src[src.index('const SAY = {'):src.index('};', src.index('const SAY = {'))]
    out = {}
    for k, v in re.findall(r"\n\s*(\w+): '((?:[^'\\]|\\.)*)'", block):
        out[k] = (v.replace("\\'", "'"), DIRECTION)
    core = open(os.path.join(GAME, 'js/ic-live-core.js')).read()
    for iid, page in re.findall(r"id: '(\w+)', name: [^\n]*\n\s*page: '((?:[^'\\]|\\.)*)'", core):
        out['page-' + iid] = (page.replace("\\'", "'"), PAGE_DIRECTION)
    return out


def say(text, direction, dst):
    body = {'contents': [{'parts': [{'text': direction + text}]}],
            'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': VOICE}}}}}
    r = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent' % MODEL,
                               data=json.dumps(body).encode(), headers={'x-goog-api-key': os.environ['GEMINI_API_KEY'], 'Content-Type': 'application/json'})
    res = json.load(urllib.request.urlopen(r, timeout=300))
    pcm = base64.b64decode(res['candidates'][0]['content']['parts'][0]['inlineData']['data'])
    with tempfile.NamedTemporaryFile(suffix='.pcm', delete=False) as f: f.write(pcm)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', f.name,
                    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-1.5',
                    '-ar', '24000', '-ac', '1', '-b:a', '64k', dst], check=True)
    os.unlink(f.name)


if __name__ == '__main__':
    want = sys.argv[1:]
    for k, (text, d) in lines().items():
        if want and k not in want: continue
        dst = os.path.join(GAME, 'assets/audio/vo/uptima-mg-icl-%s.mp3' % k)
        say(text, d, dst); print(k, '|', text)
