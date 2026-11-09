import sys
from pathlib import Path
from types import SimpleNamespace as S
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from devices import configure_cycles
class DeviceTest(unittest.TestCase):
    def setup_devices(self, types):
        devices=[S(type=kind,name=kind+' device',use=True) for kind in types]
        prefs=S(devices=devices,refresh_devices=lambda:None)
        return S(cycles=S(device=None)), S(context=S(preferences=S(addons={'cycles':S(preferences=prefs)}))),devices
    def test_hip_selects_gpu_and_excludes_cpu(self):
        scene,bpy,devices=self.setup_devices(['CPU','HIP'])
        self.assertEqual(configure_cycles(scene,bpy,'HIP'),['HIP device'])
        self.assertEqual(scene.cycles.device,'GPU')
        self.assertFalse(devices[0].use)
        self.assertTrue(devices[1].use)
    def test_missing_gpu_fails_instead_of_using_cpu(self):
        scene,bpy,_=self.setup_devices(['CPU'])
        with self.assertRaises(RuntimeError):configure_cycles(scene,bpy,'HIP')
        self.assertNotEqual(scene.cycles.device,'CPU')
    def test_cpu_and_invalid_requests(self):
        scene,bpy,_=self.setup_devices(['CPU'])
        self.assertEqual(configure_cycles(scene,bpy,'CPU'),['CPU'])
        with self.assertRaises(ValueError):configure_cycles(scene,bpy,'AUTO')
