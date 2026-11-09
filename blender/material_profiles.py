"""Conservative, opt-in corrections; never recolor imported materials."""
import re
import unicodedata

def nonmetal_candidate(name):
    name = ''.join(c for c in unicodedata.normalize('NFKD', name.casefold()) if not unicodedata.combining(c))
    if re.search(r'alumin|metal|inox|steel|aco\b|chrome|crom|cobre|copper|brass|bronze|vidro|glass|agua|water|transluc|acril|espelho|mirror', name):
        return False
    # Generic colors (white/beige), appliances and unknown names are ambiguous.
    return bool(re.search(r'\b(mdf|madeira|wood|concreto|concrete|laca|pintura|tinta|porcelanato|ceramica|tecido|fabric)\b', name))

def apply_material_profile(materials, profile):
    if profile == 'original':
        return []
    if profile != 'conservative_nonmetal':
        raise ValueError('Unknown material profile')
    changes = []
    for material in materials:
        if not nonmetal_candidate(material.name) or not material.use_nodes:
            continue
        for shader in material.node_tree.nodes:
            if shader.type != 'BSDF_PRINCIPLED':
                continue
            metallic = shader.inputs.get('Metallic')
            # Only repair the suspicious exporter constant seen in this file;
            # authored metallic textures and different numeric values stay intact.
            if metallic is None or metallic.is_linked or abs(metallic.default_value - 0.5) > 0.0001:
                continue
            changes.append({'material': material.name, 'from': metallic.default_value, 'to': 0})
            metallic.default_value = 0
    return changes
