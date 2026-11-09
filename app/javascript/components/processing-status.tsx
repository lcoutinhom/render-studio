import { useEffect } from "react";
import { FlaskConical } from "lucide-react";
import { Alert } from "./ui/alert";
import { StatusBadge } from "./ui/badge";
import { router } from "@inertiajs/react";
import {
  statusLabels,
  type ProcessingEvent,
  type ProcessingJob,
} from "../types/processing";
export function SimulationNotice({ adapter = "mixed" }: { adapter?: string }) {
  if (adapter === "comfyui")
    return (
      <Alert tone="info" role="note">
        <strong>Renderização por IA local.</strong> As fotografias usam as referências do projeto e as instruções registradas. Os resultados aparecerão na galeria ao concluir.
      </Alert>
    );
  if (adapter === "gemini")
    return (
      <Alert tone="info" role="note">
        <strong>Renderização com Gemini.</strong> Os resultados aparecerão na galeria ao concluir.
      </Alert>
    );
  if (adapter !== "simulation")
    return (
      <Alert tone="info" role="note">
        <strong>
          {adapter === "blender"
            ? "Renderização com Blender."
            : "Processamento de renderizações."}
        </strong>
        {adapter === "blender"
          ? " O modelo completo será preservado. Imagens, vídeos e panoramas aparecerão em Resultados ao concluir. Câmeras automáticas usam o enquadramento do ambiente; para interiores, cadastre uma câmera."
          : " Acompanhe as execuções por ambiente. Lotes Blender produzem arquivos reais; simulações apenas validam o fluxo."}
      </Alert>
    );
  return (
    <Alert tone="warning" role="note" icon={false}>
      <p className="flex gap-3">
        <FlaskConical aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
        <span>
          <strong>Modo de simulação.</strong> Status e progresso demonstram o
          processamento. Nenhuma imagem, vídeo, panorama ou arquivo VR será gerado.
        </span>
      </p>
    </Alert>
  );
}
export function Status({
  status,
  progress,
}: {
  status: string;
  progress: number;
}) {
  return (
    <div className="min-w-36 space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={status} label={statusLabels[status] ?? status} />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {progress}%
        </span>
      </div>
      <progress
        className="block h-1.5 w-full"
        aria-label="Progresso do processamento"
        max={100}
        value={progress}
      />
    </div>
  );
}
export function useProcessingPoll(active: boolean, only: string[]) {
  const key = only.join(",");
  useEffect(() => {
    if (!active) return;
    let pending = false;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible" || pending) return;
      pending = true;
      router.reload({
        only: key.split(","),
        onFinish: () => {
          pending = false;
        },
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [active, key]);
}
export function EventHistory({ events }: { events: ProcessingEvent[] }) {
  return (
    <ol className="max-h-96 space-y-3 overflow-auto">
      {events.length === 0 && (
        <li className="text-sm text-muted-foreground">
          Nenhum evento registrado.
        </li>
      )}
      {events.map((event) => (
        <li className="border-b pb-3 text-sm last:border-0" key={event.id}>
          <p>{event.message}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(event.created_at).toLocaleString("pt-BR")}
            {event.render_job_id ? ` · Tarefa #${event.render_job_id}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function WorkerActivity({ job }: { job: ProcessingJob }) {
  if (job.status !== "processing") return null;
  return (
    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
      <p>
        {job.worker_responding
          ? "Worker respondendo"
          : "Sem sinal recente do worker"}
        {job.last_signal_at
          ? ` · último sinal ${new Date(job.last_signal_at).toLocaleTimeString("pt-BR")}`
          : ""}
      </p>
      {job.adapter === "blender" && (
        <p>
          Dispositivo: {job.cycles_device === "HIP" ? "GPU AMD (HIP)" : "CPU"}
        </p>
      )}
      {job.render_workload && <p>{job.render_workload}</p>}
    </div>
  );
}
