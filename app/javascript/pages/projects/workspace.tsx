import { Head, Link, router, useForm } from "@inertiajs/react";
import type { ProjectExperience } from "../../types/experiences";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { IndexList, IndexRow } from "../../components/index-list";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import { FileUpload } from "../../components/file-upload";
import { ProjectConfigEditor } from "../../components/project-config-editor";
import { ProjectOutputs } from "../../components/project-outputs";
import { useState } from "react";
import {
  Box,
  ChevronRight,
  FolderOpen,
  Glasses,
  History,
  Images,
  MoreHorizontal,
  Pencil,
  Settings2,
  Upload,
  Users,
} from "lucide-react";
import { Badge, StatusBadge } from "../../components/ui/badge";
import { Select } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Status } from "../../components/processing-status";
import { statusLabels } from "../../types/processing";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import type { Project } from "../../types/projects";
import type { Schema, Preset } from "../../types/rendering";
import type { RenderOutput } from "../../types/outputs";
type File = {
  id: number;
  name: string;
  primary: boolean;
  revisions: { id: number; revision: number; format: string }[];
};
export default function Workspace({
  project,
  files,
  schema,
  presets,
  outputs,
  gemini_enabled,
  blender_render_enabled = false,
  processing_history,
  outputs_total,
  outputs_page,
  experiences = [],
}: {
  project: Project;
  files: File[];
  schema: Schema;
  presets: Preset[];
  outputs: RenderOutput[];
  outputs_total: number;
  outputs_page: number;
  experiences?: ProjectExperience[];
  gemini_enabled: boolean;
  blender_render_enabled?: boolean;
  processing_history: { id: number; status: string; progress: number }[];
}) {
  const form = useForm({
    settings: { ...schema.defaults, ...project.settings },
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const active = project.status === "active";
  const tab = new URLSearchParams(window.location.search).get("tab") ?? "";
  const primary = files.find((file) => file.primary);
  return (
    <AppLayout
      title={project.name}
      description={
        <>
          {project.client_name || "Sem cliente associado"} · Envie um arquivo,
          escolha as cenas e renderize.
        </>
      }
      breadcrumbs={[
        { label: "Projetos", href: "/projects" },
        ...(project.client_id && !project.client_archived && project.client_name
          ? [{ label: project.client_name, href: `/clients/${project.client_id}` }]
          : []),
      ]}
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal />
                Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}/edit`}>
                  <Pencil />
                  Editar projeto
                </Link>
              </DropdownMenuItem>
              {project.client_id && !project.client_archived && (
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${project.client_id}`}>
                    <Users />
                    Voltar ao cliente
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}?advanced=1`}>
                  <History />
                  Dados do fluxo anterior
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setUploadOpen(true)} disabled={!active}>
            <Upload />
            Adicionar arquivo
          </Button>
        </>
      }
    >
      <Head title={project.name} />
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <StatusBadge
          status={active ? "active" : "archived"}
          label={active ? "Ativo" : "Arquivado"}
        />
        <Badge>
          <Box aria-hidden="true" className="size-3" />
          <span className="tabular-nums">{files.length}</span> arquivo(s)
        </Badge>
        <Badge>
          <Images aria-hidden="true" className="size-3" />
          <span className="tabular-nums">{outputs_total}</span> resultado(s)
        </Badge>
      </div>
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogTitle>Adicionar arquivo 3D</DialogTitle>
          <DialogDescription>
            Envie seu modelo para escolher as fotografias.
          </DialogDescription>
          <div className="mt-5">
            <FileUpload url={`/projects/${project.id}/files`} disabled={!active} />
          </div>
        </DialogContent>
      </Dialog>
      <Tabs defaultValue={["results", "experiences"].includes(tab) ? tab : "files"}>
        <TabsList variant="line">
          <TabsTrigger value="files">
            <FolderOpen aria-hidden="true" />
            Arquivos e cenas
          </TabsTrigger>
          {blender_render_enabled && <TabsTrigger value="settings">
            <Settings2 aria-hidden="true" />
            Configurações
          </TabsTrigger>}
          <TabsTrigger value="results">
            <Images aria-hidden="true" />
            Resultados do projeto
          </TabsTrigger>
          <TabsTrigger value="experiences">
            <Glasses aria-hidden="true" />
            VR e tour 360°
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader description="Cada arquivo guarda suas revisões. Abra um arquivo para escolher as cenas a renderizar.">
              <CardTitle>Modelos do projeto</CardTitle>
            </CardHeader>
            {files.length ? (
              <ul className="divide-y">
                {files.map((file) => {
                  const latest = file.revisions[0];
                  return (
                    <li
                      key={file.id}
                      className="group relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <span className="grid size-10 shrink-0 place-items-center rounded-md border bg-muted/50 text-muted-foreground">
                          <Box aria-hidden="true" className="size-[18px]" />
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2">
                            <Link
                              className="break-words font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                              href={`/projects/${project.id}/files/${file.id}`}
                            >
                              {file.name}
                            </Link>
                            {file.primary && <Badge tone="accent">Principal</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.revisions.length} revisão(ões) deste arquivo
                            {latest?.format && (
                              <span className="uppercase"> · {latest.format}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[13px] font-medium text-foreground">
                        Selecionar cenas
                        <ChevronRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={Upload}
                title="Envie o primeiro arquivo 3D para escolher suas cenas."
                description="GLB, ZIP com glTF/OBJ ou DAE."
                action={
                  <Button size="sm" onClick={() => setUploadOpen(true)} disabled={!active}>
                    <Upload />
                    Adicionar arquivo
                  </Button>
                }
              />
            )}
          </Card>
        </TabsContent>

        {blender_render_enabled && <TabsContent value="settings">
          <Card>
            <CardHeader description="Valores usados como ponto de partida em todas as renderizações deste projeto.">
              <CardTitle>Configurações do projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ProjectConfigEditor
                schema={schema}
                value={form.data.settings}
                onChange={(settings) => form.setData("settings", settings)}
                presets={presets}
                projectId={project.id}
                gemini={gemini_enabled}
              />
            </CardContent>
            <CardFooter className="sticky bottom-0 rounded-b-lg backdrop-blur">
              <Button
                loading={form.processing}
                onClick={() => form.put(`/projects/${project.id}/configuration`)}
              >
                Salvar configurações do projeto
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>}

        <TabsContent value="experiences" className="space-y-4">
          <Card>
            <CardHeader description="Um único VR para explorar o modelo completo e um tour 360° conectado pelos pontos escolhidos. Cada geração usa a última revisão do arquivo principal e preserva os passeios anteriores.">
              <CardTitle>Passeios do projeto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="w-full max-w-md space-y-1.5">
                <Label htmlFor="primary-file">Arquivo principal</Label>
                <Select
                  id="primary-file"
                  disabled={!active}
                  value={primary?.id ?? ""}
                  onChange={(event) =>
                    router.put(
                      `/projects/${project.id}/primary_file`,
                      { file_id: event.target.value },
                      { preserveScroll: true },
                    )
                  }
                >
                  <option value="" disabled>
                    Escolha o modelo principal…
                  </option>
                  {files.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name}
                    </option>
                  ))}
                </Select>
              </div>
              {primary ? (
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/projects/${project.id}/experiences/new?kind=vr`}>
                      Preparar VR do projeto
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/projects/${project.id}/experiences/new?kind=tour`}>
                      Preparar tour 360°
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="pb-2 text-[13px] text-muted-foreground">
                  Escolha o arquivo principal para preparar um passeio.
                </p>
              )}
            </CardContent>
          </Card>
          <IndexList
            emptyIcon={Glasses}
            empty={
              !experiences.length
                ? "Nenhum passeio gerado ainda. Os resultados antigos continuam na galeria."
                : undefined
            }
          >
            {experiences.map((experience) => (
              <IndexRow key={experience.id} className="group">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link
                      className="font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                      href={`/projects/${project.id}/experiences/${experience.id}`}
                    >
                      {experience.kind === "vr" ? "Passeio VR" : "Tour 360°"} ·
                      revisão {experience.revision}
                    </Link>
                    {experience.update_available && (
                      <Badge tone="warning" dot>
                        Atualização disponível
                      </Badge>
                    )}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {experience.file_name}
                  </p>
                </div>
                <div className="w-full sm:w-56">
                  <Status status={experience.status} progress={experience.progress} />
                </div>
              </IndexRow>
            ))}
          </IndexList>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <section className="space-y-3" aria-labelledby="project-processing">
            <h2 id="project-processing" className="text-[15px] font-semibold">
              Renderizações em processamento
            </h2>
            <IndexList
              emptyIcon={History}
              empty={
                !processing_history.length
                  ? "Nenhuma solicitação neste projeto."
                  : undefined
              }
            >
              {processing_history.map((batch) => (
                <IndexRow key={batch.id}>
                  <Link
                    className="font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                    href={`/render_batches/${batch.id}`}
                    aria-label={`Renderização #${batch.id}, ${statusLabels[batch.status] ?? batch.status}`}
                  >
                    Renderização #{batch.id}
                  </Link>
                  <div className="w-full sm:w-56">
                    <Status status={batch.status} progress={batch.progress} />
                  </div>
                </IndexRow>
              ))}
            </IndexList>
          </section>
          <section className="space-y-3" aria-labelledby="project-outputs">
            <h2 id="project-outputs" className="text-[15px] font-semibold">
              Arquivos gerados
            </h2>
            <ProjectOutputs
              outputs={outputs}
              total={outputs_total}
              page={outputs_page}
              href={`/projects/${project.id}?tab=results`}
            />
          </section>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
