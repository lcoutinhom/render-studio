#!/usr/bin/env python3
"""Local ComfyUI validation, no third-party API, no dependency installation.
Run smoke first, then --reference path.png for img2img + Canny ControlNet.
"""
import argparse
import hashlib
import json
import pathlib
import re
import unicodedata
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE = 'http://127.0.0.1:8188'
ROOT = pathlib.Path(__file__).resolve().parents[2]

def api(path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(BASE + path, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'ComfyUI HTTP {error.code}: {error.read(8000).decode()}') from error

def upload(path):
    boundary = uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{path.name}"\r\nContent-Type: image/png\r\n\r\n'.encode()
            + path.read_bytes() + f'\r\n--{boundary}--\r\n'.encode())
    request = urllib.request.Request(BASE + '/upload/image', data=body,
        headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
    with urllib.request.urlopen(request, timeout=60) as response:
        image = json.load(response)
    return '/'.join(filter(None, [image.get('subfolder'), image['name']]))

def validate_custom_prompt(text):
    if not isinstance(text, str) or len(text) > 2000 or any(ord(char) < 32 and char not in '\n\r\t' for char in text):
        raise ValueError('Custom prompt must be text with at most 2000 characters')
    normalized = ''.join(char for char in unicodedata.normalize('NFKD', text.lower()) if not unicodedata.combining(char))
    conflicts = (
        r'(ignore|disregard|override|forget|desconsidere|sobrescreva).*(rule|instruction|prompt|regra|instruc)',
        r'(add|remove|replace|move|resize|change|redesign|adicione|remova|troque|mova|redimensione|altere|mude|redesenhe).*(object|furniture|wall|door|window|camera|material|texture|layout|geometr|objeto|movel|moveis|parede|porta|janela|piso|teto|materia[li]|textura)',
    )
    if any(re.search(pattern, normalized, re.DOTALL) for pattern in conflicts):
        raise ValueError('Custom prompt conflicts with project preservation rules')
    return text.strip()

def workflow(reference=None, custom_prompt='', steps=8, denoise=0.25, depth_image=None):
    custom_prompt = validate_custom_prompt(custom_prompt)
    prompt = (ROOT / 'config/local_ai/base_prompt.txt').read_text()
    if custom_prompt:
        prompt += '\nAdditional preferences, subordinate to preservation rules:\n' + custom_prompt
    graph = {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': 'sd_xl_base_1.0.safetensors'}},
        '2': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['1', 1]}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': 'redesign, changed geometry, added furniture, missing objects, altered materials, cartoon, clay render, distorted perspective', 'clip': ['1', 1]}},
        '4': {'class_type': 'EmptyLatentImage', 'inputs': {'width': 512, 'height': 512, 'batch_size': 1}},
        '5': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['2', 0], 'negative': ['3', 0], 'latent_image': ['4', 0], 'seed': 626, 'steps': steps, 'cfg': 5.0, 'sampler_name': 'euler', 'scheduler': 'normal', 'denoise': 1.0}},
        '6': {'class_type': 'VAEDecode', 'inputs': {'samples': ['5', 0], 'vae': ['1', 2]}},
        '7': {'class_type': 'SaveImage', 'inputs': {'images': ['6', 0], 'filename_prefix': 'validation/smoke' if reference is None else 'validation/architecture-canny'}}}
    if reference:
        graph.update({
            '8': {'class_type': 'LoadImage', 'inputs': {'image': reference}},
            '9': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['8', 0], 'vae': ['1', 2]}},
            '10': {'class_type': 'Canny', 'inputs': {'image': ['8', 0], 'low_threshold': 0.3, 'high_threshold': 0.6}},
            '11': {'class_type': 'ControlNetLoader', 'inputs': {'control_net_name': 'sdxl-canny-fp16.safetensors'}},
            '12': {'class_type': 'ControlNetApplyAdvanced', 'inputs': {'positive': ['2', 0], 'negative': ['3', 0], 'control_net': ['11', 0], 'image': ['10', 0], 'strength': 0.85, 'start_percent': 0.0, 'end_percent': 1.0}},
            '13': {'class_type': 'SaveImage', 'inputs': {'images': ['10', 0], 'filename_prefix': 'validation/canny-reference'}}})
        graph['5']['inputs'].update(positive=['12', 0], negative=['12', 1], latent_image=['9', 0], denoise=denoise)
    if depth_image:
        if not reference:
            raise ValueError('Depth requires an architectural reference image')
        graph['10'] = {'class_type': 'LoadImage', 'inputs': {'image': depth_image}}
        graph['11']['inputs']['control_net_name'] = 'sdxl-depth-fp16.safetensors'
        graph['7']['inputs']['filename_prefix'] = 'validation/architecture-depth'
        graph['13']['inputs']['filename_prefix'] = 'validation/depth-reference'
    return graph

def run(args):
    stats = api('/system_stats')
    device = stats['devices'][0]
    if 'RX 9060 XT' not in device['name'] or '+rocm' not in stats['system']['pytorch_version']:
        raise RuntimeError('Expected Radeon RX 9060 XT + ROCm; refusing CPU fallback')
    if not 0 < args.denoise <= 0.4 or not 1 <= args.steps <= 60:
        raise ValueError('Use denoise (0, 0.4] and steps 1..60')
    validate_custom_prompt(args.custom_prompt)
    if args.depth_map and args.reference is None:
        raise ValueError('--depth-map requires --reference')
    image = upload(args.reference) if args.reference else None
    depth_image = upload(args.depth_map) if args.depth_map else None
    graph = workflow(image, args.custom_prompt, args.steps, args.denoise, depth_image)
    args.results.mkdir(parents=True, exist_ok=True)
    label = 'img2img-depth' if depth_image else 'img2img-canny' if image else 'smoke'
    (args.results / f'{label}-workflow.json').write_text(json.dumps(graph, indent=2))
    started = time.monotonic()
    submitted = api('/prompt', {'prompt': graph, 'client_id': str(uuid.uuid4())})
    prompt_id = submitted['prompt_id']
    # Persist the ID before polling: an uncertain POST must never be silently repeated.
    report = {'engine': 'comfyui', 'comfyui_version': stats['system']['comfyui_version'], 'base_prompt_version': 'architectural-local-v1', 'workflow_sha256': hashlib.sha256(json.dumps(graph, sort_keys=True).encode()).hexdigest(), 'reference_sha256': hashlib.sha256(args.reference.read_bytes()).hexdigest() if args.reference else None, 'prompt_id': prompt_id, 'device': device['name'], 'torch': stats['system']['pytorch_version'], 'status': 'submitted', 'peak_vram_used_bytes_sampled': 0}
    report_path = args.results / f'{label}-report.json'
    report_path.write_text(json.dumps(report, indent=2))
    print(f'Queued {prompt_id}', flush=True)
    while time.monotonic() - started < args.timeout:
        vram_path = pathlib.Path('/sys/class/drm/card1/device/mem_info_vram_used')
        if vram_path.exists():
            report['peak_vram_used_bytes_sampled'] = max(report['peak_vram_used_bytes_sampled'], int(vram_path.read_text()))
        if int(time.monotonic() - started) % 5 == 0:
            report_path.write_text(json.dumps(report, indent=2))
        history = api('/history/' + prompt_id).get(prompt_id)
        if history:
            report.update(elapsed_seconds=time.monotonic()-started, status=history.get('status'), outputs=history.get('outputs'), history=history)
            report_path.write_text(json.dumps(report, indent=2))
            if not history.get('status', {}).get('completed') or history['status'].get('status_str') != 'success':
                raise RuntimeError(f'Generation failed. See {report_path}')
            saved = []
            for node, output in history.get('outputs', {}).items():
                for item in output.get('images', []):
                    params = urllib.parse.urlencode({k: item[k] for k in ('filename', 'subfolder', 'type')})
                    destination = args.results / f'{label}-{node}-{item["filename"]}'
                    with urllib.request.urlopen(BASE+'/view?'+params, timeout=60) as response:
                        destination.write_bytes(response.read())
                    saved.append(str(destination))
            if not saved: raise RuntimeError('No generated image returned')
            print(json.dumps({'seconds': report['elapsed_seconds'], 'peak_vram_sampled_bytes': report['peak_vram_used_bytes_sampled'], 'images': saved}, indent=2), flush=True)
            return
        time.sleep(1)
    raise TimeoutError(f'Local timeout; prompt {prompt_id} may still be running. Inspect /history/{prompt_id} before resubmitting.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=pathlib.Path)
    parser.add_argument('--depth-map', type=pathlib.Path)
    parser.add_argument('--custom-prompt', default='')
    parser.add_argument('--steps', type=int, default=8)
    parser.add_argument('--denoise', type=float, default=0.25)
    parser.add_argument('--timeout', type=int, default=900)
    parser.add_argument('--results', type=pathlib.Path, default=pathlib.Path('/home/lcoutinho/ai/render-studio-local/validation'))
    run(parser.parse_args())
