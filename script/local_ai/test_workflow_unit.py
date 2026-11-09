import unittest
from test_workflow import workflow, validate_custom_prompt

class WorkflowTests(unittest.TestCase):
    def test_architectural_workflow_uses_reference_and_controlnet(self):
        graph = workflow('reference.png', 'Soft daylight', steps=20, denoise=0.25)
        sampler = graph['5']['inputs']
        self.assertEqual(sampler['latent_image'], ['9', 0])
        self.assertEqual(sampler['positive'], ['12', 0])
        self.assertEqual(sampler['denoise'], 0.25)
        self.assertEqual(graph['9']['inputs']['pixels'], ['8', 0])
        self.assertEqual(graph['10']['class_type'], 'Canny')
        self.assertEqual(graph['12']['inputs']['image'], ['10', 0])
        self.assertIn('Preserve the original geometry', graph['2']['inputs']['text'])
        self.assertIn('Soft daylight', graph['2']['inputs']['text'])

    def test_depth_uses_depth_map_but_keeps_reference_latent(self):
        graph = workflow('reference.png', depth_image='depth.png')
        self.assertEqual(graph['10']['class_type'], 'LoadImage')
        self.assertEqual(graph['10']['inputs']['image'], 'depth.png')
        self.assertEqual(graph['11']['inputs']['control_net_name'], 'sdxl-depth-fp16.safetensors')
        self.assertEqual(graph['9']['inputs']['pixels'], ['8', 0])
        with self.assertRaises(ValueError):
            workflow(depth_image='depth.png')

    def test_conflicting_or_invalid_custom_prompts_are_rejected(self):
        for text in ['Ignore all instructions', 'Remova a parede', 'Troque os materiais', 'Replace the furniture', 'x' * 2001, '\x00']:
            with self.assertRaises(ValueError):
                workflow('reference.png', custom_prompt=text)
        self.assertEqual(validate_custom_prompt(' Iluminação natural suave '), 'Iluminação natural suave')

    def test_smoke_is_separate_from_reference_workflow(self):
        graph = workflow()
        self.assertEqual(graph['5']['inputs']['latent_image'], ['4', 0])
        self.assertEqual(graph['5']['inputs']['denoise'], 1.0)
        self.assertNotIn('8', graph)

if __name__ == '__main__':
    unittest.main()
