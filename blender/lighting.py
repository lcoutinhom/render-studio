"""Optional interior fill; source materials and geometry stay untouched."""
def add_interior_fill(scene, camera, bpy_module, strength, side=0):
    if strength <= 0:
        return None
    light = bpy_module.data.lights.new('Render Studio Interior Fill', 'AREA')
    light.energy = 400 * strength
    light.color = (1.0, 1.0, 1.0)
    light.shape = 'DISK'
    light.size = 2.0
    obj = bpy_module.data.objects.new(light.name, light)
    scene.collection.objects.link(obj)
    # Keep the emitter at the known camera position rather than the model's
    # global center, which may lie outside the room or behind a wall.
    obj.parent = camera
    from mathutils import Vector
    offset = Vector((0.8 * side, 0, -0.05))
    # Shorten the offset if a wall lies between the camera and emitter.
    bpy_module.context.view_layer.update()
    world_offset = camera.matrix_world.to_3x3() @ offset
    hit, location, *_ = scene.ray_cast(bpy_module.context.evaluated_depsgraph_get(),
        camera.matrix_world.translation, world_offset.normalized(), distance=world_offset.length)
    if hit:
        available = max(0, (location - camera.matrix_world.translation).length - 0.1)
        offset *= min(1, available / world_offset.length)
    obj.location = offset
    obj.rotation_euler = (Vector((0, 0, -3)) - offset).to_track_quat('-Z', 'Y').to_euler()
    return obj
