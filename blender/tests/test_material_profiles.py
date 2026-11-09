import sys
import unittest
from pathlib import Path
from types import SimpleNamespace as S
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from material_profiles import apply_material_profile, nonmetal_candidate

class MaterialProfileTest(unittest.TestCase):
    def test_conservative_names(self):
        for name in ['MDF CRU', 'Madeira Básica 001', 'concreto', 'Laca Névoa']:
            self.assertTrue(nonmetal_candidate(name), name)
        for name in ['Alumínio MDF', 'Madeira com metal', 'Vidro', 'Beige', 'Branco 1', 'Material_123', 'Aço escovado']:
            self.assertFalse(nonmetal_candidate(name), name)

    def test_only_suspicious_unlinked_metallic_changes(self):
        def material(name, value=0.5, linked=False):
            socket = S(default_value=value, is_linked=linked)
            shader = S(type='BSDF_PRINCIPLED', inputs={'Metallic':socket})
            return S(name=name, use_nodes=True, node_tree=S(nodes=[shader])), socket
        wood, socket = material('MDF CRU')
        textured, texture_socket = material('Madeira', linked=True)
        authored, authored_socket = material('Madeira', value=0.1)
        metal, metal_socket = material('Alumínio')
        self.assertEqual(apply_material_profile([wood], 'original'), [])
        self.assertEqual(socket.default_value, 0.5)
        changes = apply_material_profile([wood, textured, authored, metal], 'conservative_nonmetal')
        self.assertEqual(len(changes), 1)
        self.assertEqual(socket.default_value, 0)
        self.assertEqual(texture_socket.default_value, 0.5)
        self.assertEqual(authored_socket.default_value, 0.1)
        self.assertEqual(metal_socket.default_value, 0.5)
        with self.assertRaises(ValueError):
            apply_material_profile([], 'unknown')
