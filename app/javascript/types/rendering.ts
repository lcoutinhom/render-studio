export type SettingValue =
  string | number | boolean | { position: number[]; rotation: number[] }[];
export type Settings = Record<string, SettingValue>;
export type Definition = {
  key: string;
  label: string;
  section: string;
  type: "integer" | "number" | "boolean" | "select";
  default: SettingValue;
  options?: Record<string, string>;
  min?: number;
  max?: number;
};
export type Schema = { definitions: Definition[]; defaults: Settings };
export type Preset = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  system: boolean;
  settings: Settings;
};
export type Material = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  base_color: string;
  roughness: number;
  metallic: number;
  transmission: number;
  ior: number;
};
export type Camera = {
  id: number;
  environment_id: number;
  project_version_id: number;
  name: string;
  position: number[];
  rotation: number[];
  focal_length: number;
  field_of_view: number;
  projection_type: string;
  metadata: Record<string, string>;
  available: boolean;
};
export type Mapping = {
  id: number;
  environment_id: number | null;
  project_version_id: number;
  source_material_name: string;
  material_id: number;
  material_name: string;
  available: boolean;
};
export type ResolvedEnvironment = {
  environment_id: number;
  stable_id: string;
  name: string;
  environment_version_id: number;
  effective_settings: Settings;
  origins: Record<string, string>;
  cameras: Camera[];
  materials: {
    source_material_name: string;
    material: Material;
    textures: { id: number; slot: string; filename: string }[];
  }[];
};
export type Snapshot = {
  project_id: number;
  project_version_id: number;
  version_number: number;
  model_checksum: string;
  environments: ResolvedEnvironment[];
  preset: Preset | null;
};
export const sections: Record<string, string> = {
  general: "Geral",
  materials: "Materiais",
  lighting: "Iluminação",
  cameras: "Câmeras",
  images: "Imagens",
  video: "Vídeo",
  panorama: "Panorama",
  vr: "VR",
};
export const materialCategories: Record<string, string> = {
  wood: "Madeira",
  glass: "Vidro",
  mirror: "Espelho",
  metal: "Metal",
  stone: "Pedra",
  porcelain: "Porcelanato",
  fabric: "Tecido",
  paint: "Pintura",
  plastic: "Plástico",
};
export const textureSlots: Record<string, string> = {
  base_color: "Cor base",
  roughness: "Rugosidade",
  metallic: "Metallic",
  normal: "Normal",
  displacement: "Deslocamento",
  ambient_occlusion: "Oclusão ambiente",
  transmission: "Transmissão",
};
