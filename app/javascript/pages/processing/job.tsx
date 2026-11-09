import { Head, Link, router } from "@inertiajs/react";
import { AppLayout } from "../../layouts/app-layout";
import { ArrowUpRight, History, RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Alert } from "../../components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ConfirmAction } from "../../components/confirm-action";
import { ConfigurationSummary } from "../../components/configuration-summary";
import {
  SimulationNotice,
  WorkerActivity,
  Status,
  EventHistory,
  useProcessingPoll,
} from "../../components/processing-status";
import {
  isActive,
  outputLabels,
  type ProcessingJob,
  type ProcessingEvent,
} from "../../types/processing";
import type { Schema, Snapshot } from "../../types/rendering";
export default function Job({
  job,
  events,
  schema,
}: {
  job: ProcessingJob;
  events: ProcessingEvent[];
  schema: Schema;
}) {
  useProcessingPoll(isActive(job.status), ["job", "events", "batch"]);
  const payload = job.snapshot;
  const snapshot: Snapshot | undefined = payload
    ? {
        project_id: payload.project_id,
        project_version_id: payload.project_version_id,
        version_number: payload.version_number,
        model_checksum: payload.model_checksum,
        environments: [
          {
            ...payload.environment,
            cameras: payload.camera ? [payload.camera] : [],
          },
        ],
        preset: null,
      }
    : undefined;
  return (
    <AppLayout
      title={`Tarefa #${job.id}`}
      breadcrumbs={[
        { label: "Processamento", href: "/render_batches" },
        { label: `Lote #${job.render_batch_id}`, href: `/render_batches/${job.render_batch_id}` },
      ]}
      actions={
        <>
          {job.previous_job_id && (
            <Button asChild variant="outline">
              <Link href={`/render_jobs/${job.previous_job_id}`}>
                <History />
                Tentativa anterior
              </Link>
            </Button>
          )}
          {isActive(job.status) && (
            <ConfirmAction
              url={`/render_jobs/${job.id}/cancel`}
              method="post"
              label="Cancelar tarefa"
              description="O processamento desta tarefa será interrompido, sem afetar os outros ambientes."
            />
          )}
          {job.next_attempt_id ? (
            <Button asChild>
              <Link href={`/render_jobs/${job.next_attempt_id}`}>
                Ver próxima tentativa
                <ArrowUpRight />
              </Link>
            </Button>
          ) : (
            ["failed", "cancelled"].includes(job.status) && (
              <Button onClick={() => router.post(`/render_jobs/${job.id}/retry`)}>
                <RotateCcw />
                Tentar novamente
              </Button>
            )
          )}
        </>
      }
    >
      <Head title={`Tarefa #${job.id}`} />
      <SimulationNotice adapter={job.adapter} />
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 space-y-1">
            <h2 className="break-words text-[15px] font-semibold">
              {job.environment_name} · {outputLabels[job.output_type]} ·{" "}
              {job.camera_name}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Tentativa {job.attempt} · Versão {payload?.version_number}
            </p>
            <WorkerActivity job={job} />
          </div>
          <div className="w-full sm:w-72">
            <Status status={job.status} progress={job.progress} />
          </div>
        </CardContent>
        {(job.error_message || job.dispatch_error) && (
          <div className="space-y-2 border-t p-5">
            {job.error_message && (
              <Alert tone="danger">
                <p className="break-words">{job.error_message}</p>
              </Alert>
            )}
            {job.dispatch_error && (
              <Alert tone="warning" role="note">
                <p className="break-words">{job.dispatch_error}</p>
              </Alert>
            )}
          </div>
        )}
      </Card>
      <Card>
        <CardHeader
          description="Os arquivos preservam a versão, o ambiente e a tentativa desta execução. Consulte os resultados disponíveis na galeria."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href={`/outputs?job_id=${job.id}`}>
                Abrir resultados da tarefa
                <ArrowUpRight />
              </Link>
            </Button>
          }
        >
          <CardTitle>Resultados desta tentativa</CardTitle>
        </CardHeader>
      </Card>
      {job.adapter === "comfyui" && payload?.prompt ? (
        <Card>
          <CardHeader><CardTitle>Instruções da renderização por IA local</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>{payload.prompt.custom_prompt || "Prompt padrão aplicado, sem instruções adicionais."}</p>
            <details>
              <summary className="cursor-pointer text-muted-foreground">Ver prompt padrão utilizado</summary>
              <p className="mt-3 whitespace-pre-wrap">{payload.prompt.base_prompt}</p>
            </details>
          </CardContent>
        </Card>
      ) : snapshot && <ConfigurationSummary snapshot={snapshot} schema={schema} />}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de eventos desta tentativa</CardTitle>
        </CardHeader>
        <CardContent>
          <EventHistory events={events} />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
