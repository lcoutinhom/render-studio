#!/usr/bin/env python3
"""Estimate a local depth map on AMD GPU using predownloaded safetensors only."""
import argparse
import pathlib
import time
import json
import torch
import numpy as np
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=pathlib.Path)
    parser.add_argument('output', type=pathlib.Path)
    parser.add_argument('--model', default='/home/lcoutinho/ai/render-studio-local/models/depth-anything-v2-small')
    args = parser.parse_args()
    if not torch.version.hip or not torch.cuda.is_available():
        raise RuntimeError('AMD GPU unavailable; refusing CPU inference')
    image = Image.open(args.reference).convert('RGB')
    processor = AutoImageProcessor.from_pretrained(args.model, local_files_only=True)
    model = AutoModelForDepthEstimation.from_pretrained(args.model, local_files_only=True, use_safetensors=True).to('cuda').eval()
    inputs = processor(images=image, return_tensors='pt').to('cuda')
    torch.cuda.reset_peak_memory_stats()
    start = time.monotonic()
    with torch.inference_mode():
        depth = model(**inputs).predicted_depth
        depth = torch.nn.functional.interpolate(depth.unsqueeze(1), size=image.size[::-1], mode='bicubic', align_corners=False)
        depth = (depth-depth.min())/(depth.max()-depth.min()).clamp_min(1e-8)
        torch.cuda.synchronize()
        output = (depth[0,0].cpu().numpy()*255).clip(0,255).astype(np.uint8)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(output).convert('RGB').save(args.output)
    print(json.dumps({'gpu':torch.cuda.get_device_name(), 'seconds':time.monotonic()-start, 'peak_torch_bytes':torch.cuda.max_memory_allocated(), 'output':str(args.output)},indent=2))
