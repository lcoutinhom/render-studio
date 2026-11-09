def sha256_file(path):
 import hashlib
 digest=hashlib.sha256()
 with path.open('rb') as stream:
  while chunk:=stream.read(8*1024*1024): digest.update(chunk)
 return digest.hexdigest()
import urllib.request,json,pathlib,hashlib
repo='depth-anything/Depth-Anything-V2-Small-hf'; rev='5426e4f0f36572d16453bbda7a8389317b1bef99'
import argparse
parser=argparse.ArgumentParser(description='Download the official Apache-2.0 depth estimator to an isolated directory.')
parser.add_argument('--data',type=pathlib.Path,default=pathlib.Path('/home/lcoutinho/ai/render-studio-local'))
args=parser.parse_args()
stats=json.load(urllib.request.urlopen('http://127.0.0.1:8188/system_stats',timeout=10))
assert '+rocm' in stats['system']['pytorch_version'] and 'RX 9060 XT' in stats['devices'][0]['name'], 'GPU validation required.'
root=args.data/'models/depth-anything-v2-small';root.mkdir(parents=True,exist_ok=True)
meta=json.load(urllib.request.urlopen('https://huggingface.co/api/models/'+repo+'/revision/'+rev+'?blobs=true'))
for name in ['config.json','preprocessor_config.json','model.safetensors','LICENSE']:
 info=next((x for x in meta['siblings'] if x['rfilename']==name),None)
 if not info:continue
 with urllib.request.urlopen('https://huggingface.co/'+repo+'/resolve/'+rev+'/'+name,timeout=60) as response, (root/name).open('wb') as out:
  while chunk:=response.read(4*1024*1024):out.write(chunk)
 if 'lfs' in info:assert sha256_file(root/name)==info['lfs']['sha256']
 print(name,'OK',flush=True)
(root/'source.json').write_text(json.dumps({'repo':repo,'revision':rev,'license':'apache-2.0'}))
