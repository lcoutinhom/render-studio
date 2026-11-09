#!/usr/bin/env python3
"""Download verified Apache-2.0 local image-editing models, never project data uploads."""
import argparse
import concurrent.futures
import hashlib
import json
import pathlib
import urllib.request

DISTILLED = ('black-forest-labs/FLUX.2-klein-4b-fp8', '5b4408e59397a4a37ccb46afe426d8ed86379441', 'flux-2-klein-4b-fp8.safetensors', 'diffusion_models/flux-2-klein-4b-fp8.safetensors')
COMPONENTS = [
    ('Comfy-Org/flux2-klein', '5b3abca5c0dc1ecd4eaf3340868d09063fc1c965', 'split_files/text_encoders/qwen_3_4b.safetensors', 'text_encoders/qwen_3_4b.safetensors'),
    ('Comfy-Org/flux2-klein', '5b3abca5c0dc1ecd4eaf3340868d09063fc1c965', 'split_files/vae/flux2-vae.safetensors', 'vae/flux2-vae.safetensors'),
]

def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()

def download(root, item):
    repo, revision, filename, destination = item
    with urllib.request.urlopen(f'https://huggingface.co/api/models/{repo}/revision/{revision}?blobs=true', timeout=30) as response:
        metadata = json.load(response)
    if metadata.get('cardData', {}).get('license') != 'apache-2.0':
        raise RuntimeError(f'Unexpected license for {repo}')
    source = next(item for item in metadata['siblings'] if item['rfilename'] == filename)
    expected = source['lfs']['sha256']
    path = root / 'models' / destination
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        partial = path.with_suffix('.partial')
        with urllib.request.urlopen(f'https://huggingface.co/{repo}/resolve/{revision}/{filename}', timeout=60) as response, partial.open('wb') as stream:
            while chunk := response.read(8 * 1024 * 1024):
                stream.write(chunk)
        if sha256(partial) != expected:
            raise RuntimeError(f'Checksum mismatch: {destination}')
        partial.rename(path)
    if sha256(path) != expected:
        raise RuntimeError(f'Checksum mismatch: {destination}')
    print('Verified:', destination, flush=True)
    return {'repo': repo, 'revision': revision, 'file': filename, 'path': str(path), 'sha256': expected, 'license': 'apache-2.0'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=pathlib.Path, default=pathlib.Path('/home/lcoutinho/ai/render-studio-local'))
    args = parser.parse_args()
    with urllib.request.urlopen('http://127.0.0.1:8188/system_stats', timeout=10) as response:
        stats = json.load(response)
    if '+rocm' not in stats['system']['pytorch_version'] or 'RX 9060 XT' not in stats['devices'][0]['name']:
        raise RuntimeError('Validate AMD ROCm GPU before downloading models')
    items = [DISTILLED] + COMPONENTS
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        rows = list(pool.map(lambda item: download(args.data, item), items))
    manifest_path = args.data / 'models-manifest.json'
    old = json.loads(manifest_path.read_text()) if manifest_path.exists() else []
    targets = {item['path'] for item in rows}
    manifest_path.write_text(json.dumps([item for item in old if item['path'] not in targets] + rows, indent=2))
