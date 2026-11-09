import type { ResolvedEnvironment, Camera } from "./rendering";
export type JobStatus =
  "draft" | "queued" | "processing" | "completed" | "failed" | "cancelled";
export type BatchStatus =
  | "queued"
  | "processing"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled";
export type JobPayload = {
  project_id: number;
  project_version_id: number;
  version_number: number;
  model_checksum: string;
  environment: ResolvedEnvironment;
  camera: Camera | null;
  output_type: string;
  prompt?: { version: string; base_prompt: string; custom_prompt: string | null };
};
export type ProcessingJob = {
  cycles_device?: "CPU" | "HIP";
  worker_responding?: boolean;
  last_signal_at?: string;
  render_workload?: string;
  adapter: string;
  id: number;
  render_batch_id: number;
  environment_id: number;
  environment_name: string;
  camera_name: string;
  status: JobStatus;
  progress: number;
  output_type: string;
  attempt: number;
  previous_job_id: number | null;
  next_attempt_id: number | null;
  error_message: string | null;
  dispatch_error: string | null;
  dispatched_at: string | null;
  snapshot?: JobPayload;
};
export type Batch = {
  project_file_id?: number | null;
  file_revision?: number | null;
  id: number;
  render_configuration_id: number;
  project_id: number;
  project_version_id: number;
  version_number: number;
  adapter: string;
  name: string;
  project_name: string;
  project_deleted: boolean;
  status: BatchStatus;
  progress: number;
  total_jobs: number;
  counts: Record<string, number>;
  environments: {
    id: number;
    name: string;
    status: BatchStatus;
    progress: number;
    jobs: ProcessingJob[];
  }[];
};
export type ProcessingEvent = {
  id: number;
  render_job_id: number | null;
  kind: string;
  message: string;
  created_at: string;
};
export const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  queued: "Na fila",
  processing: "Em andamento",
  completed: "Concluído",
  partially_completed: "Concluído parcialmente",
  failed: "Falhou",
  cancelled: "Cancelado",
};
export const outputLabels: Record<string, string> = {
  image: "Imagens",
  video: "Vídeo",
  panorama: "Panorama 360°",
  vr: "Modelo VR / WebXR",
};
export const isActive = (status: string) =>
  ["draft", "queued", "processing"].includes(status);
