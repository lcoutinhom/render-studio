export type ProjectExperience = {
  id: number;
  kind: "vr" | "tour";
  file_name: string;
  revision: number;
  status: string;
  progress: number;
  batch_id: number;
  update_available: boolean;
  created_at: string;
};
