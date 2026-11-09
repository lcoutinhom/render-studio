import { Head, Link, router } from "@inertiajs/react";
import { ArrowUpRight, ChevronDown, History, MoreHorizontal, RotateCcw, SlidersHorizontal } from "lucide-react";
import { StatusBadge as SharedStatusBadge } from "../../components/ui/badge";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { ConfirmAction } from "../../components/confirm-action";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import { cn } from "../../lib/utils";
import {
  SimulationNotice,
  EventHistory,
  useProcessingPoll,
} from "../../components/processing-status";
import {
  isActive,
  outputLabels,
  statusLabels,
  type Batch,
  type ProcessingJob,
  type ProcessingEvent,
} from "../../types/processing";

function StatusBadge({ status }: { status: string }) {
  return <SharedStatusBadge status={status} label={statusLabels[status] ?? status} />;
}
function ProgressBar({
  value,
  label,
  status,
}: {
  value: number;
  label: string;
  status: string;
}) {
  return (
    <div className="flex min-w-40 items-center gap-3">
      <progress
        max={100}
        value={value}
        aria-label={label}
        className={`h-2 w-full ${status === "completed" ? "[&::-webkit-progress-value]:bg-success [&::-moz-progress-bar]:bg-success" : status === "failed" ? "[&::-webkit-progress-value]:bg-destructive [&::-moz-progress-bar]:bg-destructive" : ""}`}
      />
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {value}%
      </span>
    </div>
  );
}
function JobTable({
  jobs,
  history = false,
}: {
  jobs: ProcessingJob[];
  history?: boolean;
}) {
  return (
    <div className="relative w-full min-w-0 max-w-full overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <caption className="sr-only">
          {history
            ? "Histórico de tentativas do lote"
            : "Tarefas atuais do lote"}
        </caption>
        <thead className="border-b bg-muted/50 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          <tr>
            {[
              "Cena / fotografia",
              "Formato",
              "Executor",
              "Status",
              "Progresso",
              "",
            ].map((label, index) => (
              <th key={index} scope="col" className="h-10 px-5 font-medium">
                {label || <span className="sr-only">Ações</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {!jobs.length && (
            <tr>
              <td
                colSpan={6}
                className="px-5 py-10 text-center text-muted-foreground"
              >
                Nenhuma tarefa registrada.
              </td>
            </tr>
          )}
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="align-top transition-colors hover:bg-muted/20"
            >
              <td className="max-w-80 px-5 py-4">
                <Link
                  href={`/render_jobs/${job.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {job.camera_name || job.environment_name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  #{job.id} · {job.environment_name} · tentativa {job.attempt}
                </p>
                {job.error_message && (
                  <p className="mt-2 text-xs text-destructive">
                    {job.error_message}
                  </p>
                )}
                {job.dispatch_error && (
                  <p className="mt-2 text-xs text-warning">
                    {job.dispatch_error}
                  </p>
                )}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                {outputLabels[job.output_type] ?? job.output_type}
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <span className="text-xs text-muted-foreground">
                  {job.adapter === "simulation"
                    ? "Simulação"
                    : job.adapter === "comfyui"
                      ? "IA local"
                    : job.adapter === "gemini"
                      ? "Gemini"
                    : job.cycles_device === "HIP"
                      ? "GPU · HIP"
                      : "CPU"}
                </span>
                {job.status === "processing" && (
                  <p
                    className={`mt-1 text-xs ${job.worker_responding ? "text-success " : "text-warning "}`}
                  >
                    {job.worker_responding
                      ? "Worker ativo"
                      : "Verificando worker"}
                  </p>
                )}
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={job.status} />
              </td>
              <td className="min-w-56 px-5 py-5">
                <ProgressBar
                  value={job.progress}
                  status={job.status}
                  label={`Progresso da tarefa ${job.id}`}
                />
              </td>
              <td className="px-5 py-3 text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={`/render_jobs/${job.id}`}
                    aria-label={`Ver tarefa ${job.id}`}
                  >
                    Detalhes <ArrowUpRight />
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function Show({
  batch,
  jobs,
  events,
  attempt_count,
}: {
  batch: Batch;
  jobs: ProcessingJob[];
  events: ProcessingEvent[];
  attempt_count: number;
}) {
  useProcessingPoll(isActive(batch.status), [
    "batch",
    "jobs",
    "events",
    "attempt_count",
  ]);
  const currentJobs = batch.environments.flatMap(
    (environment) => environment.jobs,
  );
  const retryable = currentJobs.some((job) =>
    ["failed", "cancelled"].includes(job.status),
  );
  return (
    <AppLayout
      title={`Lote #${batch.id}`}
      breadcrumbs={[
        { label: "Processamento", href: "/render_batches" },
        {
          label: batch.project_name,
          href: batch.project_file_id
            ? `/projects/${batch.project_id}/files/${batch.project_file_id}`
            : `/projects/${batch.project_id}`,
        },
      ]}
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal /> Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/render_batches">
                  <History />
                  Histórico de processamento
                </Link>
              </DropdownMenuItem>
              {!batch.project_deleted && (
                <DropdownMenuItem asChild>
                  <Link href={`/renderings/${batch.render_configuration_id}`}>
                    <SlidersHorizontal />
                    Configuração de origem
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {isActive(batch.status) && (
            <ConfirmAction
              url={`/render_batches/${batch.id}/cancel`}
              method="post"
              label="Cancelar lote"
              description="Tarefas pendentes e em andamento serão canceladas; resultados concluídos serão preservados."
            />
          )}
          {retryable && (
            <Button
              variant="outline"
              onClick={() => router.post(`/render_batches/${batch.id}/retry`)}
            >
              <RotateCcw />
              Reprocessar falhas e cancelamentos
            </Button>
          )}
          <Button asChild>
            <Link href={`/projects/${batch.project_id}?tab=results`}>
              Ver resultados <ArrowUpRight />
            </Link>
          </Button>
        </>
      }
    >
      <Head title={`Lote #${batch.id}`} />
      {batch.adapter === "simulation" && (
        <SimulationNotice adapter={batch.adapter} />
      )}
      <section className="ta-panel">
        <div className="flex flex-wrap items-center justify-between gap-6 p-5 sm:p-6">
          <div className="min-w-0 space-y-2">
            <h2 className="break-words text-lg font-semibold">{batch.name}</h2>
            <p className="text-sm text-muted-foreground">
              {batch.file_revision
                ? `Revisão ${batch.file_revision} do arquivo`
                : `Versão ${batch.version_number}`}{" "}
              · {batch.total_jobs} tarefa(s)
            </p>
          </div>
          <div className="w-full space-y-3 sm:w-72">
            <StatusBadge status={batch.status} />
            <ProgressBar
              value={batch.progress}
              status={batch.status}
              label="Progresso geral do lote"
            />
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t sm:grid-cols-5">
          {(
            [
              ["completed", "Concluídas", "text-success"],
              ["processing", "Em andamento", "text-info"],
              ["queued", "Na fila", ""],
              ["failed", "Com falha", "text-destructive"],
              ["cancelled", "Canceladas", ""],
            ] as const
          ).map(([key, label, tone]) => (
            <div key={key} className="border-b px-5 py-3 even:border-l sm:border-b-0 sm:border-l sm:first:border-l-0 sm:px-6">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className={cn("text-lg font-semibold tabular-nums", (batch.counts[key] ?? 0) > 0 && tone)}>
                {batch.counts[key] ?? 0}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="ta-panel overflow-hidden">
        <div className="ta-panel-heading flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold">Tarefas do lote</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            {isActive(batch.status) && (
              <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-info" />
            )}
            {isActive(batch.status)
              ? "Atualização automática"
              : "Processamento encerrado"}
          </span>
        </div>
        <JobTable jobs={currentJobs} />
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          O percentual indica etapas do processamento, não uma previsão de
          tempo. O progresso geral também considera falhas e cancelamentos
          encerrados.
        </p>
      </section>
      <details className="group ta-panel overflow-hidden">
        <summary className="flex list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
          <span>
            Histórico de tentativas{" "}
            <span className="font-normal tabular-nums text-muted-foreground">· {attempt_count}</span>
          </span>
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          As 100 tentativas mais recentes. Tentativas anteriores são
          preservadas.
        </p>
        <JobTable jobs={jobs} history />
      </details>
      <details className="group ta-panel overflow-hidden">
        <summary className="flex list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
          Eventos de processamento
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t p-5">
          <EventHistory events={events} />
        </div>
      </details>
    </AppLayout>
  );
}
