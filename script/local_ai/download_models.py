def sha256_file(path):
 import hashlib
 digest=hashlib.sha256()
 with path.open('rb') as stream:
  while chunk:=stream.read(8*1024*1024): digest.update(chunk)
 return digest.hexdigest()
import urllib.request, json, pathlib, concurrent.futures, hashlib
import argparse
parser=argparse.ArgumentParser(description='Download verified SDXL and ControlNet safetensors after local ROCm GPU validation.')
parser.add_argument('--data', type=pathlib.Path, default=pathlib.Path('/home/lcoutinho/ai/render-studio-local'))
args=parser.parse_args()
root=args.data
stats=json.load(urllib.request.urlopen('http://127.0.0.1:8188/system_stats',timeout=10))
assert '+rocm' in stats['system']['pytorch_version'] and 'RX 9060 XT' in stats['devices'][0]['name'], 'Validate the AMD GPU in ComfyUI before downloading models.'
(root/'models/checkpoints').mkdir(parents=True,exist_ok=True)
(root/'models/controlnet').mkdir(parents=True,exist_ok=True)
items=[('stabilityai/stable-diffusion-xl-base-1.0','462165984030d82259a11f4367a4eed129e94a7b','sd_xl_base_1.0.safetensors','checkpoints/sd_xl_base_1.0.safetensors'),('diffusers/controlnet-canny-sdxl-1.0','eb115a19a10d14909256db740ed109532ab1483c','diffusion_pytorch_model.fp16.safetensors','controlnet/sdxl-canny-fp16.safetensors'),('diffusers/controlnet-depth-sdxl-1.0','17bb97973f29801224cd66f192c5ffacf82648b4','diffusion_pytorch_model.fp16.safetensors','controlnet/sdxl-depth-fp16.safetensors')]
def download(item):
 repo,revision,name,dest=item
 meta=json.load(urllib.request.urlopen('https://huggingface.co/api/models/'+repo+'/revision/'+revision+'?blobs=true'))
 info=next(x for x in meta['siblings'] if x['rfilename']==name)
 expected=info['lfs']['sha256']; path=root/'models'/dest
 if not path.exists():
  partial=path.with_suffix('.partial')
  with urllib.request.urlopen('https://huggingface.co/'+repo+'/resolve/'+revision+'/'+name, timeout=60) as r, partial.open('wb') as out:
   while chunk:=r.read(8*1024*1024): out.write(chunk)
  if sha256_file(partial)!=expected: raise RuntimeError('Checksum mismatch: '+dest)
  partial.rename(path)
 digest=sha256_file(path)
 if digest!=expected: raise RuntimeError('Checksum mismatch: '+dest)
 print(dest, path.stat().st_size, 'SHA256 OK',flush=True)
 return {'repo':repo,'revision':revision,'file':name,'path':str(path),'sha256':digest,'license':meta.get('cardData',{}).get('license')}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: results=list(pool.map(download,items))
(root/'models-manifest.json').write_text(json.dumps(results,indent=2))
