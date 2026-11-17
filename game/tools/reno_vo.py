"""The Renovation's spoken lines during and after Seymour's runs, and Sir Seymour's Architect's Draft quiz lines
(see CREDITS.md): assets/audio/vo/<who>-mg-reno-<key>.mp3 and seymour-mg-draft-<key>.mp3.

usage: reno_vo.py [KEY ...]     record the lines (all, or the keys named, e.g. seymour-mg-reno-permit or
                                seymour-mg-draft-clean) with Gemini TTS (needs GEMINI_API_KEY)

The text is read from js/vo-modes.js (every line mapped to a *-mg-reno-* file, and Seymour's seymour-mg-draft-* lines
from js/draft.js; the Draft's other speakers are not recorded here), so the recording always matches the screen. Each speaker keeps the voice he has everywhere else in the game (Seymour read as a strict hall monitor, see STYLE): Sir Seymour (Orus on
gemini-2.5-flash-preview-tts) and Kai (Alnilam on gemini-2.5-pro-preview-tts). Each take is transcribed with Gemini and
retaken if it says more than the line, then trimmed and loudness-matched like tools/ic_live_vo.py.
"""
import base64, io, json, os, re, subprocess, sys, tempfile, urllib.request, wave
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = {'seymour': ('gemini-2.5-flash-preview-tts', 'Orus'), 'kai': ('gemini-2.5-pro-preview-tts', 'Alnilam')}
# How each speaker delivers his lines (the TTS models take a spoken-style direction ahead of the text).
STYLE = {'seymour': 'Read this aloud as a fussy, uptight hall monitor or a by-the-book night security guard: clipped, stern and officious, at a brisk pace, '
                    'barking the exclamations. Where the line trails off with an ellipsis, pause, then say the rest more quietly, '
                    'a little embarrassed, reining himself in. Say only these words: ',
         # Kai is the straight man to Seymour's jokes (his three replies, kai-mg-reno-hinges, -ledger, -frame).
         'kai': 'Say this dryly and deadpan, as a tired aside to a friend. Say only these words: '}
# The stern delivery sometimes leaves seconds of dead air mid-line: shorten any pause to 0.6s.
PAUSES = 'silenceremove=stop_periods=-1:stop_duration=0.6:stop_silence=0.6:stop_threshold=-40dB'
# The lines heard on every job are read gently and encouragingly, in his own way: still proper, never nagging.
SOFT = {'seymour-mg-reno-' + k for k in ('again-beam', 'again-test', 'again-crowd', 'again-twice', 'notyet', 'nosign', 'permit', 'clean', 'scaf', 'whatif', 'whatif-right', 'whatif-wrong')}
# Seymour's Architect's Draft quiz lines repeat across many questions, so they are read the same soft way.
SOFT |= {'seymour-mg-draft-' + k for k in ('clean', 'scaf', 'retry', 'half')}
SOFT_STYLE = ('Read this aloud as a kind, slightly formal inspector who is encouraging in his own stiff, by-the-book way: calm and warm, '
             'with a dry little lift on the last few words, at a brisk natural pace. Say only these words: ')
API = 'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent'


def lines():
    src = open(os.path.join(GAME, 'js/vo-modes.js')).read()
    out = {}
    for who, text, f in re.findall(r'\n\s*"(\w+)\|((?:[^"\\]|\\.)*)": \'(\w+-mg-reno-[\w-]+|seymour-mg-draft-[\w-]+)\'', src):
        out[f] = (who, text.replace('\\"', '"'))
    return out


def post(model, body):
    r = urllib.request.Request(API % model, data=json.dumps(body).encode(), headers={'x-goog-api-key': os.environ['GEMINI_API_KEY'], 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=300))


def words(t): return re.findall(r"[a-z]+", t.lower())


def heard(pcm, text):
    """Transcribe the take and check it says the line and nothing more (allowing two stray words)."""
    wav = io.BytesIO()
    with wave.open(wav, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    got = post('gemini-3.8-flash', {'contents': [{'parts': [{'inline_data': {'mime_type': 'audio/wav', 'data': base64.b64encode(wav.getvalue()).decode()}},
        {'text': 'Transcribe every word spoken in this audio, from the very first word to the last, including any instructions read aloud. Reply with the words only.'}]}]})['candidates'][0]['content']['parts'][0]['text']
    extra = [w for w in words(got) if w not in set(words(text))]
    missing = [w for w in set(words(text)) if w not in set(words(got))]
    return len(extra) <= 2 and len(missing) <= 2, got


def encode(pcm, dst):
    with tempfile.NamedTemporaryFile(suffix='.pcm', delete=False) as f: f.write(pcm)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', f.name,
                    '-af', PAUSES + ',' + 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-1.5',
                    '-ar', '24000', '-ac', '1', '-b:a', '40k', dst], check=True)
    os.unlink(f.name)
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout)


def say(who, text, dst):
    """Record until a take says the line (and only the line) at a fair pace: about two words a second, plus room for
    a pause. If no take is quick enough, keep the quickest one that said the line."""
    model, voice = VOICES[who]
    style = SOFT_STYLE if os.path.basename(dst)[:-4] in SOFT else STYLE.get(who, '')
    body = {'contents': [{'parts': [{'text': style + text}]}],
            'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}}}}
    limit, best = len(words(text)) / 2.0 + 2.5, None
    for tries in range(6):
        try: pcm = base64.b64decode(post(model, body)['candidates'][0]['content']['parts'][0]['inlineData']['data'])
        except (KeyError, IndexError): print('  retake: no audio came back', flush=True); continue
        ok, got = heard(pcm, text)
        if not ok: print('  retake: heard ' + got[:160], flush=True); continue
        tmp = dst + '.take.mp3'; secs = encode(pcm, tmp)
        if best is None or secs < best[0]:
            if best: os.unlink(best[1])
            os.replace(tmp, dst + '.best.mp3'); best = (secs, dst + '.best.mp3')
        else: os.unlink(tmp)
        if secs <= limit: break
        print('  retake: too slow, %.1fs for %d words' % (secs, len(words(text))), flush=True)
    if not best: sys.exit('could not get a clean take of: ' + text)
    os.replace(best[1], dst)

if __name__ == '__main__':
    want = sys.argv[1:]
    for f, (who, text) in lines().items():
        if want and f not in want: continue
        say(who, text, os.path.join(GAME, 'assets/audio/vo/%s.mp3' % f)); print(f, '|', text, flush=True)
