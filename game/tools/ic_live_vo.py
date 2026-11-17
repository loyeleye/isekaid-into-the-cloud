"""Uptima's Live shift lines, spoken (see CREDITS.md): assets/audio/vo/uptima-mg-icl-<key>.mp3, mapped in js/vo-modes.js.

usage: [VO_VOICE=Achernar] [VO_PITCH=1.029302] ic_live_vo.py [KEY ...]     record the lines (all, or the keys named) with Gemini TTS (needs GEMINI_API_KEY)

Her story voice (Achernar on gemini-3.8-flash-tts), in her prequel manner: grand, vain, a little flustered. The text
is read from js/ic-live.js (SAY and QUIP) and js/ic-live-core.js (the pages), so the recording always matches the screen.
"""
import base64, io, json, os, re, subprocess, sys, tempfile, urllib.request, wave
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL, VOICE = 'gemini-3.8-flash-tts', os.environ.get('VO_VOICE', 'Achernar')
# No acting notes: this model reads them aloud as part of the line (heard() rejects such a take). The punctuation directs her.
DIRECTION = PAGE_DIRECTION = ''
PITCH = float(os.environ.get('VO_PITCH', '1'))  # pitch ratio after recording, e.g. 1.029302 is half a semitone up


def lines():
    src = open(os.path.join(GAME, 'js/ic-live.js')).read()
    block = src[src.index('const SAY = {'):src.index('};', src.index('const SAY = {'))]
    out = {}
    for k, v in re.findall(r"\n\s*(\w+): '((?:[^'\\]|\\.)*)'", block):
        out[k] = (v.replace("\\'", "'"), DIRECTION)
    # Her reactions while the minute plays (QUIP): key q-<thing>.
    qb = src[src.index('const QUIP = {'):src.index('};', src.index('const QUIP = {'))]
    for k, v in re.findall(r"\n\s*(\w+): \['((?:[^'\\]|\\.)*)'", qb):
        out['q-' + k] = (v.replace("\\'", "'"), DIRECTION)
    core = open(os.path.join(GAME, 'js/ic-live-core.js')).read()
    for iid, page in re.findall(r"id: '(\w+)', name: [^\n]*\n\s*page: '((?:[^'\\]|\\.)*)'", core):
        out['page-' + iid] = (page.replace("\\'", "'"), PAGE_DIRECTION)
    return out


LAST = ['']


def words(t): return re.findall(r"[a-z]+", t.lower())


def heard(pcm, text):
    """Transcribe the take with Gemini and check she said the line and nothing more (allowing two stray words, e.g. a misheard name)."""
    wav = io.BytesIO()
    with wave.open(wav, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    body = {'contents': [{'parts': [{'inline_data': {'mime_type': 'audio/wav', 'data': base64.b64encode(wav.getvalue()).decode()}},
                                    {'text': 'Transcribe every word spoken in this audio, from the very first word to the last, including any instructions read aloud. Reply with the words only.'}]}]}
    r = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
                               data=json.dumps(body).encode(), headers={'x-goog-api-key': os.environ['GEMINI_API_KEY'], 'Content-Type': 'application/json'})
    got = json.load(urllib.request.urlopen(r, timeout=300))['candidates'][0]['content']['parts'][0]['text']
    LAST[0] = got
    extra = [w for w in words(got) if w not in set(words(text))]
    return len(extra) <= 2 and len(words(got)) <= len(words(text)) + 3


def say(text, direction, dst):
    body = {'contents': [{'parts': [{'text': direction + text}]}],
            'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': VOICE}}}}}
    r = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent' % MODEL,
                               data=json.dumps(body).encode(), headers={'x-goog-api-key': os.environ['GEMINI_API_KEY'], 'Content-Type': 'application/json'})
    for tries in range(3):
        res = json.load(urllib.request.urlopen(r, timeout=300))
        pcm = base64.b64decode(res['candidates'][0]['content']['parts'][0]['inlineData']['data'])
        if heard(pcm, text): break
        print('  retake: she read more than the line: ' + LAST[0][:160], flush=True)
    else: sys.exit('could not get a clean take of: ' + text)
    pitch = ',rubberband=pitch=%g:formant=preserved' % PITCH if PITCH != 1 else ''
    with tempfile.NamedTemporaryFile(suffix='.pcm', delete=False) as f: f.write(pcm)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', f.name,
                    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse' + pitch + ',loudnorm=I=-18:TP=-1.5',
                    '-ar', '24000', '-ac', '1', '-b:a', '40k', dst], check=True)
    os.unlink(f.name)


if __name__ == '__main__':
    want = sys.argv[1:]
    for k, (text, d) in lines().items():
        if want and k not in want: continue
        dst = os.path.join(GAME, 'assets/audio/vo/uptima-mg-icl-%s.mp3' % k.lower())
        say(text, d, dst); print(k, '|', text)
