export type RenderOutput = {
  id: number;
  kind: "image" | "video" | "panorama" | "vr";
  filename: string;
  content_type: string;
  byte_size: number;
  checksum: string;
  created_at: string;
  metadata: Record<string, unknown>;
  job_id: number;
  batch_id: number;
  attempt: number;
  status: string;
  project_id: number;
  project_name: string;
  environment_id: number;
  environment_name: string;
  file_id?: number | null;
  file_revision?: number | null;
  file_name?: string | null;
  version_id: number;
  version_number: number;
  preview_url: string | null;
  download_url: string;
};
export const kindLabels: Record<string, string> = {
  image: "Imagem",
  video: "Vídeo",
  panorama: "Panorama 360°",
  vr: "Modelo VR / WebXR",
};
export const fileSize = (bytes: number) =>
  `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} MiB`;
