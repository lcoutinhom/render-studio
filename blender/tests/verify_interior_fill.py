"""Run with Blender --background --python to verify real light contribution."""
import sys
import tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bpy
from lighting import add_interior_fill

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 4
scene.render.resolution_x = scene.render.resolution_y = 32
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Dark test room')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
bpy.ops.mesh.primitive_plane_add(size=10, location=(0, 0, -3))
surface = bpy.context.object
material = bpy.data.materials.new('Original beige')
material.use_nodes = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Base Color'].default_value = (0.5, 0.35, 0.2, 1)
surface.data.materials.append(material)
matrix = surface.matrix_world.copy()
color = tuple(shader.inputs['Base Color'].default_value)
camera = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera'))
scene.collection.objects.link(camera)
scene.camera = camera
assert add_interior_fill(scene, camera, bpy, 0) is None

def brightness(path):
    scene.render.filepath = str(path)
    scene.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(str(path))
    pixels = list(image.pixels)
    return sum(value for index, value in enumerate(pixels) if index % 4 != 3) / (len(pixels) * 0.75)

with tempfile.TemporaryDirectory() as directory:
    dark = brightness(Path(directory) / 'dark.png')
    fill = add_interior_fill(scene, camera, bpy, 1)
    bright = brightness(Path(directory) / 'fill.png')
    assert fill.parent == camera
    assert bright > dark + 0.1, (dark, bright)
    assert surface.matrix_world == matrix
    assert tuple(shader.inputs['Base Color'].default_value) == color
    lateral = add_interior_fill(scene, camera, bpy, 0.3, -1)
    assert lateral.location.x < -0.7
    from mathutils import Vector
    direction = lateral.rotation_euler.to_quaternion() @ Vector((0, 0, -1))
    target = (Vector((0, 0, -3)) - lateral.location).normalized()
    assert direction.dot(target) > 0.999
    # A wall between camera and desired emitter must shorten the offset.
    bpy.ops.mesh.primitive_cube_add(size=0.1, location=(-0.4, 0, -0.025))
    protected = add_interior_fill(scene, camera, bpy, 0.3, -1)
    assert -0.4 < protected.location.x <= 0
    print(f'RS_LIGHT_TEST_OK dark={dark:.3f} fill={bright:.3f} materials_and_geometry_preserved', flush=True)
