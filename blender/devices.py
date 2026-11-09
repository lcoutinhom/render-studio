"""Explicit Cycles device selection; a requested GPU never falls back to CPU."""
def configure_cycles(scene, bpy_module, requested='CPU'):
    if requested == 'CPU':
        scene.cycles.device = 'CPU'
        return ['CPU']
    if requested != 'HIP':
        raise ValueError('Unsupported Cycles device')
    preferences = bpy_module.context.preferences.addons['cycles'].preferences
    preferences.compute_device_type = 'HIP'
    preferences.refresh_devices()
    devices = [device for device in preferences.devices if device.type == 'HIP']
    if not devices:
        raise RuntimeError('HIP GPU requested, but no HIP device is available')
    for device in preferences.devices:
        device.use = device.type == 'HIP'
    scene.cycles.device = 'GPU'
    return [device.name for device in devices]
