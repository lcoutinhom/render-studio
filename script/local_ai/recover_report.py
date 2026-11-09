#!/usr/bin/env python3
"""Recover an already submitted execution without resubmitting or generating again."""
import argparse
import json
import pathlib
import urllib.parse
import urllib.request
from test_workflow import api, BASE

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('report', type=pathlib.Path)
args = parser.parse_args()
report = json.loads(args.report.read_text())
prompt_id = report['prompt_id']
history = api('/history/' + prompt_id).get(prompt_id)
if not history:
    raise SystemExit('No history yet. Inspect /queue; do not blindly repeat POST /prompt.')
report.update(status=history['status'], outputs=history.get('outputs'), history=history, recovered_from_history=True)
messages = history['status'].get('messages', [])
starts = [x[1]['timestamp'] for x in messages if x[0]=='execution_start']
ends = [x[1]['timestamp'] for x in messages if x[0]=='execution_success']
if starts and ends:
    report['server_execution_seconds'] = (ends[-1]-starts[0])/1000
if not report.get('peak_vram_used_bytes_sampled'):
    report['peak_vram_used_bytes_sampled'] = None
    report['vram_measurement_note'] = 'Client stopped before persisting samples; peak unavailable, not inferred.'
args.report.write_text(json.dumps(report,indent=2))
if not history['status'].get('completed') or history['status'].get('status_str') != 'success':
    raise SystemExit('Execution failed; see recovered report.')
for node, output in history.get('outputs', {}).items():
    for image in output.get('images', []):
        params = urllib.parse.urlencode({k:image[k] for k in ['filename','subfolder','type']})
        path = args.report.parent / f'recovered-{node}-{image["filename"]}'
        with urllib.request.urlopen(BASE+'/view?'+params,timeout=60) as response:
            path.write_bytes(response.read())
        print(path)
print('Server execution seconds:', report.get('server_execution_seconds'))
