import type { Settings } from "./rendering";
export type Project = {
  id: number;
  name: string;
  description: string | null;
  client_name: string | null;
  client_id?: number | null;
  client_archived?: boolean;
  status: string;
  settings: Settings;
};
export type Environment = {
  id: number;
  stable_id: string;
  project_id: number;
  name: string;
  description: string | null;
  environment_type: string;
  custom_type: string | null;
  status: string;
  position: number;
  settings: Settings;
};
export type ModelVersion = {
  id: number;
  version_number: number;
  project_file_id?: number;
  file_revision?: number;
  description: string | null;
  format: string;
  checksum: string;
  created_at: string;
  metadata?: {
    materials?: { id: string; name: string }[];
    nodes?: {
      id: string;
      name: string;
      has_geometry?: boolean;
      is_camera?: boolean;
    }[];
    reference_types_available?: boolean;
    camera_count?: number;
    scene_count?: number;
    view_markers?: { id: string; name: string }[];
    view_marker_count?: number;
    scenes?: { id: string; name: string }[];
    reference_catalog_truncated?: boolean;
  };
  file?: { name: string; size: number; url: string };
};
export type Association = {
  id: number;
  environment_id: number;
  project_version_id: number;
  status: string;
  settings?: Settings;
  source_reference: {
    kind?: string;
    references?: string[];
    coordinate_system?: string;
    scene_id?: string;
  };
  bounding_box: { min: number[]; max: number[] } | null;
};
export const environmentTypes: Record<string, string> = {
  living_room: "Sala de estar",
  kitchen: "Cozinha",
  bedroom: "Quarto",
  bathroom: "Banheiro",
  office: "Escritório",
  dining_room: "Sala de jantar",
  laundry: "Lavanderia",
  outdoor: "Área externa",
  custom: "Personalizado",
};

export type ViewerReference = {
  kind: "scene" | "objects";
  references: string[];
  scene_id?: string;
};

export type CameraView = {
  scene_id?: string;
  name?: string;
  position: number[];
  rotation: number[];
  focal_length: number;
  field_of_view: number;
  projection_type: "perspective";
};

export type RecoveredCamera = CameraView & {
  name: string;
  recovered_view_key: string;
};
