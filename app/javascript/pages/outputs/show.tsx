import { Head, Link } from "@inertiajs/react";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { Box, Download, ImageOff, ListChecks, Orbit } from "lucide-react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Skeleton } from "../../components/ui/skeleton";
import type { JobPayload } from "../../types/processing";
import { fileSize, kindLabels, type RenderOutput } from "../../types/outputs";
const PanoramaViewer = lazy(() => import("../../components/panorama-viewer"));
const VrModelViewer = lazy(() => import("../../components/vr-model-viewer"));

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function Result({
  output,
  snapshot,
}: {
  output: RenderOutput;
  snapshot?: JobPayload;
}) {
  const [vr, setVr] = useState(false);
  const [failed, setFailed] = useState(false);
  const [panorama, setPanorama] = useState(false);
  const loading = (label: string) => (
    <div role="status" className="space-y-3">
      <Skeleton className="aspect-video w-full" />
      <p className="text-[13px] text-muted-foreground">{label}</p>
    </div>
  );
  return (
    <AppLayout
      title="Detalhes do resultado"
      description={<span className="break-all">{output.filename}</span>}
      breadcrumbs={[
        { label: "Resultados", href: "/outputs" },
        { label: output.project_name, href: `/projects/${output.project_id}?tab=results` },
      ]}
      actions={
        <>
          <Button asChild variant="outline">
            <Link href={`/render_jobs/${output.job_id}`}>
              <ListChecks />
              Tarefa e configurações utilizadas
            </Link>
          </Button>
          <Button asChild>
            <a href={output.download_url}>
              <Download />
              Baixar original
            </a>
          </Button>
        </>
      }
    >
      <Head title={output.filename} />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          {output.kind === "vr" && output.content_type === "model/gltf-binary" ? (
            <Card>
              <CardHeader
                description="O modelo pertence a este projeto e ao arquivo usado nesta renderização. Abra no navegador ou entre em VR usando óculos compatíveis. O download GLB continua disponível."
                actions={
                  <Button type="button" variant="outline" onClick={() => setVr((open) => !open)}>
                    <Box />
                    {vr ? "Fechar visualizador VR" : "Abrir visualizador VR"}
                  </Button>
                }
              >
                <CardTitle>Explorar modelo em 3D e WebXR</CardTitle>
              </CardHeader>
              {vr && (
                <CardContent>
                  <Suspense fallback={loading("Preparando visualizador VR…")}>
                    <VrModelViewer
                      key={output.id}
                      url={output.download_url}
                      initialCamera={snapshot?.camera}
                      navigation={
                        typeof output.metadata.navigation === "string"
                          ? output.metadata.navigation
                          : "teleport"
                      }
                    />
                  </Suspense>
                </CardContent>
              )}
            </Card>
          ) : output.preview_url && !failed ? (
            <Card className="overflow-hidden">
              <div className="grid place-items-center bg-gray-950">
                {output.content_type.startsWith("video/") ? (
                  <video
                    controls
                    preload="metadata"
                    src={output.preview_url}
                    onError={() => setFailed(true)}
                    className="max-h-[70vh] w-full"
                  />
                ) : panorama ? (
                  <div className="w-full bg-card p-4">
                    <Suspense fallback={loading("Carregando panorama…")}>
                      <PanoramaViewer url={output.preview_url} />
                    </Suspense>
                  </div>
                ) : (
                  <img
                    src={output.preview_url}
                    alt={output.filename}
                    onError={() => setFailed(true)}
                    className="max-h-[70vh] w-full object-contain"
                  />
                )}
              </div>
              {output.kind === "panorama" && (
                <div className="flex justify-end border-t px-4 py-3">
                  <Button variant="outline" size="sm" onClick={() => setPanorama(!panorama)}>
                    <Orbit />
                    {panorama ? "Ver imagem plana" : "Explorar panorama 360°"}
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={ImageOff}
                title={failed ? "Não foi possível carregar a prévia." : "Prévia indisponível"}
                description={
                  failed
                    ? "Tente baixar o arquivo original."
                    : "Este formato está disponível para download. O navegador não oferece prévia deste arquivo."
                }
                action={
                  <Button asChild variant="outline" size="sm">
                    <a href={output.download_url}>
                      <Download />
                      Baixar original
                    </a>
                  </Button>
                }
              />
            </Card>
          )}
        </div>

        <Card>
          <CardHeader actions={<Badge tone="accent">{kindLabels[output.kind]}</Badge>}>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <dl className="divide-y">
              <Meta label="Projeto">
                <Link className="underline-offset-4 hover:underline" href={`/projects/${output.project_id}?tab=results`}>
                  {output.project_name}
                </Link>
              </Meta>
              <Meta label={output.file_name ? "Arquivo" : "Ambiente"}>
                {output.file_name ?? output.environment_name}
              </Meta>
              <Meta label="Origem">
                {output.file_revision
                  ? `Revisão ${output.file_revision} do arquivo`
                  : `Versão ${output.version_number}`}
              </Meta>
              <Meta label="Tentativa">
                <span className="tabular-nums">{output.attempt}</span>
              </Meta>
              <Meta label="Tamanho">
                <span className="tabular-nums">{fileSize(output.byte_size)}</span>
              </Meta>
              <Meta label="Criado em">
                <span className="tabular-nums">
                  {new Date(output.created_at).toLocaleString("pt-BR")}
                </span>
              </Meta>
              {typeof output.metadata.cycles_device === "string" && (
                <Meta label="Gerado em">
                  {output.metadata.cycles_device === "HIP" ? "GPU AMD (HIP)" : "CPU"}
                  {typeof output.metadata.execution_seconds === "number"
                    ? ` · execução ${Math.round(output.metadata.execution_seconds)} segundos`
                    : ""}
                </Meta>
              )}
              <Meta label="SHA-256">
                <code className="break-all text-xs text-muted-foreground">{output.checksum}</code>
              </Meta>
            </dl>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
