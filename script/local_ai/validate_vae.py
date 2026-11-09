#!/usr/bin/env python3
"""Check local GPU VAE reconstruction before trusting img2img results."""
import argparse
import json
import pathlib
import time
import urllib.parse
import urllib.request
import numpy as np
from PIL import Image
from test_workflow import api, upload, workflow

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('reference', type=pathlib.Path)
parser.add_argument('--results', type=pathlib.Path, default=pathlib.Path('/home/lcoutinho/ai/render-studio-local/validation'))
args = parser.parse_args()
args.results.mkdir(parents=True, exist_ok=True)
stats = api('/system_stats')
assert '+rocm' in stats['system']['pytorch_version'] and 'RX 9060 XT' in stats['devices'][0]['name'], 'AMD GPU required'
graph = {k:v for k,v in workflow(upload(args.reference)).items() if k in ['1','8','9','6','7']}
graph['6']['inputs']['samples'] = ['9',0]
graph['7']['inputs']['filename_prefix'] = 'validation/vae-roundtrip'
start = time.monotonic()
submitted = api('/prompt', {'prompt': graph})
report = {'prompt_id': submitted['prompt_id']}
(args.results/'vae-roundtrip-report.json').write_text(json.dumps(report))
for _ in range(300):
    history = api('/history/' + submitted['prompt_id']).get(submitted['prompt_id'])
    if history:
        assert history['status']['status_str'] == 'success', history['status']
        item = history['outputs']['7']['images'][0]
        params = urllib.parse.urlencode({k:item[k] for k in ['filename','subfolder','type']})
        destination = args.results/'vae-roundtrip.png'
        with urllib.request.urlopen('http://127.0.0.1:8188/view?'+params,timeout=60) as response:
            destination.write_bytes(response.read())
        before = np.asarray(Image.open(args.reference).convert('RGB'),dtype=np.float32)/255
        after = np.asarray(Image.open(destination).convert('RGB'),dtype=np.float32)/255
        assert before.shape == after.shape, 'Unexpected reconstructed dimensions'
        mae = float(np.abs(before-after).mean())
        variance_ratio = float(after.var()/max(before.var(),1e-8))
        report.update(mae=mae, variance_ratio=variance_ratio, seconds=time.monotonic()-start,
                      passed=mae<0.08 and 0.5<variance_ratio<2.0, output=str(destination))
        (args.results/'vae-roundtrip-report.json').write_text(json.dumps(report,indent=2))
        print(json.dumps(report,indent=2))
        if not report['passed']: raise SystemExit('VAE numerical reconstruction failed; do not proceed to img2img.')
        break
    time.sleep(1)
else:
    raise TimeoutError('VAE test still pending; inspect saved prompt_id before resubmitting.')
