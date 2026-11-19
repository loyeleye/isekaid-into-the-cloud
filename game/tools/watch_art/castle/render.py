# Usage: python3 render.py jobs.json [concurrency]
# jobs: [{out, prompt, model?, ref?, ref2?, w?, h?}] ; skips outs that exist; retries connection errors twice (free renders only).
import json, subprocess, sys, os, concurrent.futures as cf, time
jobs = json.load(open(sys.argv[1])); n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
env = dict(os.environ, NODE_USE_ENV_PROXY='1')
def run(j):
    if os.path.exists(j['out']): return j['out'] + ' (exists)'
    os.makedirs(os.path.dirname(j['out']) or '.', exist_ok=True)
    cmd = ['sogni-agent-claude-code', '--json', '-w', str(j.get('w', 768)), '-h', str(j.get('h', 1024)), '-o', j['out']]
    if j.get('ref'):
        cmd += ['-m', j.get('model', 'krea2_identity_edit_v1_2'), '-c', j['ref']]
        if j.get('ref2'): cmd += ['-c', j['ref2']]
    else:
        cmd += ['-m', j.get('model', 'krea2_turbo_fp8_scaled')]
    if j.get('seed'): cmd += ['--seed', str(j['seed'])]
    cmd.append(j['prompt'])
    for a in range(3):
        p = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=600)
        if os.path.exists(j['out']): return j['out']
        time.sleep(5 + 10 * a)
    return j['out'] + ' FAILED: ' + (p.stdout + p.stderr)[-300:]
with cf.ThreadPoolExecutor(n) as ex:
    for r in ex.map(run, jobs): print(r, flush=True)
