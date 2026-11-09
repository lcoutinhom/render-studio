#!/usr/bin/env python3
"""Fetch the author's FP16 photo checkpoint at a fixed revision after GPU validation."""
import argparse
import hashlib
import json
import pathlib
import urllib.request

REPO = 'SG161222/RealVisXL_V5.0'
REVISION = 'ac93e0dda1f6d448cae19bbfab8c5e720a5e48bc'
FILENAME = 'RealVisXL_V5.0_fp16.safetensors'

def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=pathlib.Path, default=pathlib.Path('/home/lcoutinho/ai/render-studio-local'))
    args = parser.parse_args()
    stats = json.load(urllib.request.urlopen('http://127.0.0.1:8188/system_stats', timeout=10))
    assert '+rocm' in stats['system']['pytorch_version'] and 'RX 9060 XT' in stats['devices'][0]['name'], 'Validate AMD GPU first'
    meta = json.load(urllib.request.urlopen(f'https://huggingface.co/api/models/{REPO}/revision/{REVISION}?blobs=true', timeout=30))
    assert meta['cardData']['license'] == 'openrail++'
    item = next(item for item in meta['siblings'] if item['rfilename'] == FILENAME)
    expected = item['lfs']['sha256']
    path = args.data / 'models/checkpoints' / FILENAME
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        partial = path.with_suffix('.partial')
        received = 0
        last_report = 0
        with urllib.request.urlopen(f'https://huggingface.co/{REPO}/resolve/{REVISION}/{FILENAME}', timeout=60) as response, partial.open('wb') as stream:
            while chunk := response.read(8 * 1024 * 1024):
                stream.write(chunk)
                received += len(chunk)
                if received - last_report >= 512 * 1024 * 1024:
                    print(f'{received / 1024**3:.1f} GiB downloaded', flush=True)
                    last_report = received
        assert sha256(partial) == expected, 'Model checksum mismatch'
        partial.rename(path)
    assert sha256(path) == expected, 'Model checksum mismatch'
    manifest_path = args.data / 'models-manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else []
    manifest = [item for item in manifest if item.get('repo') != REPO]
    manifest.append({'repo': REPO, 'revision': REVISION, 'file': FILENAME, 'path': str(path), 'sha256': expected, 'license': 'openrail++'})
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print('Verified:', path, flush=True)
