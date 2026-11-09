"""Render Studio trusted entrypoint. Reads data only; never opens user .blend scripts."""
import json
import math
import time
import os
import struct
import shutil
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from process_guard import terminate_with_parent
from devices import configure_cycles
from lighting import add_interior_fill
from material_profiles import apply_material_profile
terminate_with_parent()
import bpy
from mathutils import Vector, Euler, Quaternion

request = json.loads(Path(sys.argv[sys.argv.index('--') + 1]).read_text())
environment = request['environment']
settings = environment['effective_settings']
out = Path(request['output_directory'])
model = Path(request['model_path'])
artifacts = []
execution_started = time.monotonic()
progress_state = {}

def progress(value, **details):
    print('RS_PROGRESS ' + str(value), flush=True)
    progress_state.update({'percent': value, 'elapsed_seconds': round(time.monotonic() - execution_started, 2)})
    progress_state.update(details)
    try:
        temporary = out / 'progress.tmp'
        temporary.write_text(json.dumps(progress_state))
        temporary.replace(out / 'progress.json')
    except OSError:
        pass

def converted(v):
    return Vector((v[0], -v[2], v[1]))

def annotate(document):
    for index, node in enumerate(document.get('nodes', [])):
        node.setdefault('extras', {})['render_studio_node_id'] = str(index)
    reference = environment['source_reference']
    scene_definitions = document.get('scenes', [])
    def members(index):
        found = set()
        pending = list(scene_definitions[index].get('nodes', []))
        while pending:
            node = pending.pop()
            if node in found:
                continue
            if not isinstance(node, int) or not 0 <= node < len(document.get('nodes', [])):
                raise ValueError('Invalid scene node')
            found.add(node)
            pending.extend(document['nodes'][node].get('children', []))
        return found
    def checked_scene(value):
        if not str(value).isdigit() or not 0 <= int(value) < len(scene_definitions):
            raise ValueError('Invalid scene scope')
        return int(value)
    chosen = []
    if reference['kind'] == 'scene':
        chosen = [checked_scene(value) for value in reference.get('references', [])]
    elif reference['kind'] == 'objects':
        refs = reference.get('references', [])
        if 'scene_id' in reference:
            index = checked_scene(reference['scene_id'])
            if not all(str(value).isdigit() for value in refs) or not {int(value) for value in refs}.issubset(members(index)):
                raise ValueError('Selected objects do not belong to the chosen scene')
            chosen = [index]
        elif refs and all(str(value).isdigit() for value in refs):
            ids = {int(value) for value in refs}
            containing = [index for index in range(len(scene_definitions)) if ids.issubset(members(index))]
            if containing:
                chosen = [document.get('scene', 0) if document.get('scene', 0) in containing else containing[0]]
            else:
                chosen = [index for index in range(len(scene_definitions)) if ids.intersection(members(index))]
    chosen = list(dict.fromkeys(chosen))
    if len(chosen) == 1:
        document['scene'] = chosen[0]
    elif chosen:
        # Compose only the explicitly involved scenes in the temporary import copy.
        # Original collections/geometry remain imported; unrelated scenes stay excluded.
        roots = list(dict.fromkeys(node for index in chosen for node in scene_definitions[index].get('nodes', [])))
        document['scenes'].append({'name':'Render Studio Selection', 'nodes':roots})
        document['scene'] = len(document['scenes']) - 1
    return document

# Annotate a temporary import copy, preserving the stored original and all geometry.
source = None
if model.suffix.lower() == '.glb':
    destination = out / 'import.glb'
    with model.open('rb') as original, destination.open('wb') as staged:
        header = original.read(12)
        staged.write(header)
        while original.tell() < struct.unpack('<III', header)[2]:
            chunk_header = original.read(8)
            length, chunk_type = struct.unpack('<II', chunk_header)
            if chunk_type == 0x4e4f534a:
                if length > 64 * 1024 * 1024:
                    raise ValueError('Model JSON exceeds import limit')
                source = annotate(json.loads(original.read(length)))
                data = json.dumps(source, separators=(',', ':')).encode()
                data += b' ' * ((-len(data)) % 4)
                staged.write(struct.pack('<II', len(data), chunk_type))
                staged.write(data)
            else:
                staged.write(chunk_header)
                remaining = length
                while remaining:
                    chunk = original.read(min(remaining, 1024 * 1024))
                    if not chunk:
                        raise ValueError('Truncated GLB')
                    staged.write(chunk)
                    remaining -= len(chunk)
        total = staged.tell()
        staged.seek(8)
        staged.write(struct.pack('<I', total))
    model = destination
elif model.suffix.lower() == '.gltf':
    source = annotate(json.loads(model.read_text()))
    model.write_text(json.dumps(source))
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
if model.suffix.lower() in ('.gltf', '.glb'):
    bpy.ops.import_scene.gltf(filepath=str(model), import_scene_as_collection=True, import_scene_extras=True)
elif model.suffix.lower() == '.obj':
    bpy.ops.wm.obj_import(filepath=str(model))
else:
    raise ValueError('Unsupported source format')
imported = list(scene.objects)
meshes = [obj for obj in imported if obj.type == 'MESH']
if not meshes:
    raise ValueError('Model has no mesh geometry')
progress(15)
reference = environment['source_reference']
kind = reference['kind']
references = set(str(value) for value in reference.get('references', []))
selected = []
if kind == 'scene' and source:
    roots = set()
    def walk(index):
        roots.add(str(index))
        for child in source['nodes'][index].get('children', []):
            walk(child)
    for ref in references:
        if ref.isdigit() and int(ref) < len(source.get('scenes', [])):
            for node in source['scenes'][int(ref)].get('nodes', []):
                walk(node)
    references = roots
    kind = 'objects'
for obj in meshes:
    ancestors = [obj]
    parent = obj.parent
    while parent:
        ancestors.append(parent)
        parent = parent.parent
    if kind == 'model':
        selected.append(obj)
    elif kind == 'objects' and any(str(item.get('render_studio_node_id', '')) in references or item.name in references for item in ancestors):
        selected.append(obj)
    elif kind in ('tag', 'group', 'component', 'model_part', 'scene'):
        # Only explicit manual references, never infer an environment from tag names.
        names = {item.name for item in ancestors} | {collection.name for collection in obj.users_collection}
        names |= {str(item.get(kind, '')) for item in ancestors}
        if references & names:
            selected.append(obj)
    elif kind == 'region':
        bbox = environment.get('bounding_box') or {}
        if reference.get('coordinate_system') != 'model':
            raise ValueError('Only model-coordinate regions are supported')
        minimum, maximum = bbox['min'], bbox['max']
        world_corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        model_corners = [(point.x, point.z, -point.y) for point in world_corners]
        if all(min(point[i] for point in model_corners) <= maximum[i] and max(point[i] for point in model_corners) >= minimum[i] for i in range(3)):
            selected.append(obj)
if selected and not any(obj.name in bpy.context.view_layer.objects for obj in selected):
    raise ValueError('Selected environment is excluded from the active scene')
if not selected:
    raise ValueError('Environment reference did not resolve to mesh objects; revise the manual association')
# Preserve every imported object in the scene; environment selection drives framing/material overrides.
points = [obj.matrix_world @ Vector(corner) for obj in selected for corner in obj.bound_box]
minimum = Vector(tuple(min(point[i] for point in points) for i in range(3)))
maximum = Vector(tuple(max(point[i] for point in points) for i in range(3)))
if reference['kind'] == 'region':
    region = environment['bounding_box']
    corners = [converted((x,y,z)) for x in (region['min'][0], region['max'][0]) for y in (region['min'][1], region['max'][1]) for z in (region['min'][2], region['max'][2])]
    minimum = Vector(tuple(min(point[i] for point in corners) for i in range(3)))
    maximum = Vector(tuple(max(point[i] for point in corners) for i in range(3)))
center = (minimum + maximum) / 2
radius = max((maximum - minimum).length / 2, 0.1)
geometry_before = {obj.name: [list(row) for row in obj.matrix_world] for obj in meshes}
material_profile = settings.get('material_profile', 'original')
material_changes = apply_material_profile(bpy.data.materials, material_profile)
for mapping in environment.get('materials', []):
    properties = mapping['material']
    material = bpy.data.materials.new('RenderStudio-' + str(mapping['mapping_id']))
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    color = properties['base_color'].lstrip('#')
    rgb = [int(color[i:i+2], 16) / 255 for i in (0, 2, 4)]
    rgb = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in rgb]
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    for key, socket in [('roughness','Roughness'), ('metallic','Metallic'), ('transmission','Transmission Weight'), ('ior','IOR')]:
        shader.inputs[socket].default_value = properties[key]
    texture_nodes = {}
    for texture in mapping.get('textures', []):
        node = material.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = bpy.data.images.load(texture['path'], check_existing=False)
        slot = texture['slot']
        if slot != 'base_color':
            node.image.colorspace_settings.name = 'Non-Color'
        texture_nodes[slot] = node
    links = material.node_tree.links
    sockets = {'base_color':'Base Color','roughness':'Roughness','metallic':'Metallic','transmission':'Transmission Weight'}
    for slot, socket in sockets.items():
        if slot in texture_nodes:
            links.new(texture_nodes[slot].outputs['Color'], shader.inputs[socket])
    if 'ambient_occlusion' in texture_nodes:
        multiply = material.node_tree.nodes.new('ShaderNodeMixRGB')
        multiply.blend_type = 'MULTIPLY'
        multiply.inputs[0].default_value = 1
        multiply.inputs[1].default_value = (*rgb,1)
        if 'base_color' in texture_nodes:
            links.new(texture_nodes['base_color'].outputs['Color'], multiply.inputs[1])
        links.new(texture_nodes['ambient_occlusion'].outputs['Color'], multiply.inputs[2])
        links.new(multiply.outputs['Color'], shader.inputs['Base Color'])
    normal_output = None
    if 'normal' in texture_nodes:
        normal = material.node_tree.nodes.new('ShaderNodeNormalMap')
        links.new(texture_nodes['normal'].outputs['Color'], normal.inputs['Color'])
        normal_output = normal.outputs['Normal']
    if 'displacement' in texture_nodes:
        # Height affects surface shading, never moves architectural mesh vertices.
        bump = material.node_tree.nodes.new('ShaderNodeBump')
        links.new(texture_nodes['displacement'].outputs['Color'], bump.inputs['Height'])
        if normal_output:
            links.new(normal_output, bump.inputs['Normal'])
        normal_output = bump.outputs['Normal']
    if normal_output:
        links.new(normal_output, shader.inputs['Normal'])
    for obj in selected:
        for slot in obj.material_slots:
            if slot.material and slot.material.name == mapping['source_material_name']:
                slot.link = 'OBJECT'
                slot.material = material
progress(25)
scene.render.engine = 'CYCLES'
cycles_device = request.get('cycles_device', 'CPU')
cycles_devices = configure_cycles(scene, bpy, cycles_device)
print('RS_DEVICE ' + cycles_device + ' ' + ', '.join(cycles_devices), flush=True)
scene.cycles.samples = settings['samples']
scene.cycles.use_denoising = settings['denoising']
scene.render.resolution_percentage = 100
scene.render.resolution_x = settings['resolution_width']
scene.render.resolution_y = settings['resolution_height']
scene.view_settings.exposure = settings['exposure']
world = bpy.data.worlds.new('Render Studio World')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = {'sunset':(0.8,0.35,0.15,1), 'night':(0.03,0.05,0.12,1), 'studio':(0.5,0.5,0.5,1)}.get(settings['lighting'],(0.5,0.6,0.8,1))
world.node_tree.nodes['Background'].inputs['Strength'].default_value = settings['intensity'] * (0.08 if settings['lighting'] == 'night' else 0.3)
light_data = bpy.data.lights.new('Render Studio Sun', 'SUN')
light_data.energy = settings['intensity'] * (0.1 if settings['lighting'] == 'night' else 1)
# Kelvin approximation, normalized, without changing source geometry.
temperature = settings['temperature'] / 100
red = 255 if temperature <= 66 else 329.698727446 * ((temperature - 60) ** -0.1332047592)
green = 99.4708025861 * math.log(temperature) - 161.1195681661 if temperature <= 66 else 288.1221695283 * ((temperature - 60) ** -0.0755148492)
blue = 255 if temperature >= 66 else 0 if temperature <= 19 else 138.5177312231 * math.log(temperature - 10) - 305.0447927307
light_data.color = tuple(max(0,min(255,value))/255 for value in (red, green, blue))
light = bpy.data.objects.new('Render Studio Sun', light_data)
scene.collection.objects.link(light)
light.rotation_euler = (math.radians(90 - settings['sun_elevation']), 0, math.radians(settings['sun_rotation']))
if settings['lighting'] == 'studio':
    for index, offset in enumerate(((1,-1,2),(-1,-0.5,1))):
        studio_data = bpy.data.lights.new(f'Render Studio Softbox {index}', 'AREA')
        studio_data.energy = settings['intensity'] * radius * radius * 250
        studio_data.shape = 'DISK'
        studio_data.size = radius * 2
        studio_light = bpy.data.objects.new(studio_data.name,studio_data)
        scene.collection.objects.link(studio_light)
        studio_light.location = center + Vector(offset) * radius * 2
        studio_light.rotation_euler = (center - studio_light.location).to_track_quat('-Z','Y').to_euler()
camera_data = bpy.data.cameras.new('Render Studio Camera')
camera = bpy.data.objects.new('Render Studio Camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.clip_end = max(1000, radius * 100)
camera_data.clip_start = min(0.01, radius / 100)
saved_camera = request.get('camera')
axis_rotation = Quaternion((1,0,0), math.pi / 2)
if saved_camera:
    camera.location = converted(saved_camera['position'])
    camera.rotation_euler = (axis_rotation @ Euler(tuple(math.radians(value) for value in saved_camera['rotation']), 'XYZ').to_quaternion()).to_euler()
    camera_data.type = 'ORTHO' if saved_camera['projection_type'] == 'orthographic' else 'PERSP'
    camera_data.lens = saved_camera['focal_length']
    camera_data.ortho_scale = radius * 2.4
else:
    camera.location = center + Vector((radius * 1.8, -radius * 1.8, radius * 1.3))
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()

interior_fill = float(settings.get('interior_fill', 0))
interior_fill_side = float(settings.get('interior_fill_side', 0))
add_interior_fill(scene, camera, bpy, interior_fill, interior_fill_side)
if (interior_fill > 0 or settings.get('neutral_daylight', False)) and settings['lighting'] == 'day':
    # Neutral daylight instead of a blue cast when balancing an interior.
    # Preserve the original sky's approximate luminance; change its tint only.
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.593, 0.593, 0.593, 1) if interior_fill == 0 else (0.8, 0.8, 0.8, 1)

def save_artifact(name, content_type, **metadata):
    metadata.update(engine='CYCLES', blender_version=bpy.app.version_string, selected_objects=len(selected), source_objects=len(meshes), geometry_preserved=True)
    metadata.update({'cycles_device':cycles_device, 'cycles_devices':cycles_devices, 'execution_seconds':round(time.monotonic() - execution_started, 2)})
    metadata.update(interior_fill=interior_fill, interior_fill_side=interior_fill_side, lighting_revision='interior-fill-v2')
    metadata.update(neutral_daylight=bool(settings.get('neutral_daylight', False)))
    metadata.update(material_profile=material_profile, material_profile_revision='nonmetal-v1', corrected_material_count=len(material_changes), corrected_materials=material_changes[:40])
    artifacts.append({'filename':name, 'content_type':content_type, 'metadata':metadata})

def image(name, image_format):
    scene.render.image_settings.file_format = image_format
    scene.render.filepath = str(out / name)
    bpy.ops.render.render(write_still=True)

output_type = request['output_type']
if output_type == 'image':
    formats = {'png':('PNG','png','image/png'), 'jpeg':('JPEG','jpg','image/jpeg'), 'exr':('OPEN_EXR','exr','image/x-exr')}
    image_format, extension, content_type = formats[settings['image_format']]
    for index in range(settings['image_count']):
        if not saved_camera and index:
            angle = 2 * math.pi * index / settings['image_count']
            camera.location = center + Vector((radius * 2.5 * math.cos(angle), radius * 2.5 * math.sin(angle), radius * 1.3))
            camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
        name = f'image-{index+1:03d}.{extension}'
        image(name, image_format)
        save_artifact(name, content_type, width=scene.render.resolution_x, height=scene.render.resolution_y)
        progress(30 + int(60 * (index+1) / settings['image_count']))
elif output_type == 'panorama':
    camera_data.type = 'PANO'
    camera_data.panorama_type = 'EQUIRECTANGULAR'
    if not saved_camera:
        camera.location = center
    scene.render.resolution_x = settings['panorama_width']
    scene.render.resolution_y = settings['panorama_height']
    image('panorama.png', 'PNG')
    save_artifact('panorama.png', 'image/png', projection='equirectangular', width=scene.render.resolution_x, height=scene.render.resolution_y)
elif output_type == 'video':
    scene.render.resolution_x = settings['video_width']
    scene.render.resolution_y = settings['video_height']
    scene.render.fps = settings['video_fps']
    frames = round(settings['video_duration'] * settings['video_fps'])
    path = settings.get('video_path', [])
    if path:
        for index, point in enumerate(path):
            frame = 1 + round(index * (frames-1) / (len(path)-1))
            camera.location = converted(point['position'])
            camera.rotation_euler = (axis_rotation @ Euler(tuple(math.radians(value) for value in point['rotation']), 'XYZ').to_quaternion()).to_euler()
            camera.keyframe_insert(data_path='location', frame=frame)
            camera.keyframe_insert(data_path='rotation_euler', frame=frame)
    else:
        # Automatic orbit of the selected environment, keeping source geometry intact.
        for frame in range(1, frames+1):
            angle = 2 * math.pi * (frame-1) / max(1,frames-1)
            camera.location = center + Vector((radius*2.5*math.cos(angle),radius*2.5*math.sin(angle),radius*1.3))
            camera.rotation_euler = (center-camera.location).to_track_quat('-Z','Y').to_euler()
            camera.keyframe_insert(data_path='location',frame=frame)
            camera.keyframe_insert(data_path='rotation_euler',frame=frame)
    scene.frame_start, scene.frame_end = 1, frames
    if hasattr(scene.render.image_settings, 'media_type'):
        scene.render.image_settings.media_type = 'VIDEO'
    else:
        scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.filepath = str(out / 'video.mp4')
    def video_frame_written(rendered_scene, *_args):
        completed = max(0, min(frames, rendered_scene.frame_current - rendered_scene.frame_start + 1))
        progress(25 + int(65 * completed / max(frames, 1)), frame=completed, frames=frames)
    bpy.app.handlers.render_write.append(video_frame_written)
    try:
        bpy.ops.render.render(animation=True)
    finally:
        bpy.app.handlers.render_write.remove(video_frame_written)
    save_artifact('video.mp4','video/mp4',fps=scene.render.fps,frames=frames)
elif output_type == 'vr':
    # Keep the full imported project in the downloadable model, including other scenes.
    def include_collection(layer):
        layer.exclude = False
        for child in layer.children:
            include_collection(child)
    include_collection(bpy.context.view_layer.layer_collection)
    bpy.context.view_layer.update()
    # Texture optimization only. Mesh positions, dimensions and topology stay intact.
    texture_limit = min(settings['vr_texture_size'], 1024 if settings['vr_optimization'] == 'light' else 2048 if settings['vr_optimization'] == 'balanced' else 8192)
    for image_data in bpy.data.images:
        if image_data.size[0] and max(image_data.size) > texture_limit:
            ratio = texture_limit / max(image_data.size)
            image_data.scale(max(1,round(image_data.size[0]*ratio)),max(1,round(image_data.size[1]*ratio)))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in imported:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out / 'model.glb'), export_format='GLB', use_selection=True)
    save_artifact('model.glb','model/gltf-binary',navigation=settings['vr_navigation'],optimization=settings['vr_optimization'],geometry_preserved=True)
else:
    raise ValueError('Unsupported output type')
assert all(geometry_before[obj.name] == [list(row) for row in obj.matrix_world] for obj in meshes)
(out / 'artifacts.json').write_text(json.dumps(artifacts))
progress(95)
