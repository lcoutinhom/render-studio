import { Copy, CopyPlus, MoreHorizontal, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { renderIssues } from "../../lib/render-readiness";
import { RenderReadiness } from "../../components/render-readiness";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import { Status } from "../../components/processing-status";
import { outputLabels, type ProcessingJob } from "../../types/processing";
import { RenderPreferences } from "../../components/render-preferences";
import { CameraManager } from "../../components/camera-manager";
import type { Schema, Camera, Mapping } from "../../types/rendering";
import { Head, Link, router } from "@inertiajs/react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ConfirmAction } from "../../components/confirm-action";
import { EnvironmentAssociation } from "../../components/environment-association";
import { selectClass } from "../../components/project-fields";
import {
  environmentTypes,
  type Project,
  type Environment,
  type ModelVersion,
  type Association,
} from "../../types/projects";
import { ModelPreview } from "../../components/model-preview";
export default function Show({
  project,
  environment,
  versions,
  selected_version,
  association,
  schema,
  cameras,
  mappings,
  processing_history,
}: {
  project: Project;
  environment: Environment;
  versions: ModelVersion[];
  selected_version: ModelVersion | null;
  association: Association | null;
  schema: Schema;
  cameras: Camera[];
  mappings: Mapping[];
  processing_history: ProcessingJob[];
}) {
  const issues = renderIssues(
    project,
    environment,
    selected_version,
    association,
    mappings,
  );
  const base = `/projects/${project.id}/environments/${environment.id}`;
  return (
    <AppLayout
      title={environment.name}
      breadcrumbs={[
        { label: "Projetos", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
      ]}
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal />
                Mais ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => router.post(`${base}/duplicate`)}>
                <Copy />
                Duplicar ambiente
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  router.post(`${base}/duplicate`, { copy_associations: true })
                }
              >
                <CopyPlus />
                Duplicar com associações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ConfirmAction
            url={base}
            label="Excluir ambiente"
            description="O ambiente sairá da listagem. Sua identidade e associações anteriores serão preservadas."
          />
          <Button asChild variant="outline">
            <Link href={`${base}/edit`}>
              <Pencil />
              Editar ambiente
            </Link>
          </Button>
        </>
      }
    >
      <Head title={environment.name} />
      <p className="text-[13px] text-muted-foreground">
        {project.name} · {environmentTypes[environment.environment_type]}
        {environment.custom_type && ` (${environment.custom_type})`} ·{" "}
        {environment.status === "active" ? "Ativo" : "Arquivado"}
      </p>
      {environment.description && (
        <p className="break-words text-sm">{environment.description}</p>
      )}
      <RenderReadiness issues={issues} />
      <Tabs
        defaultValue={
          typeof window !== "undefined" &&
          [
            "associacao",
            "cameras",
            "materiais",
            "configuracoes",
            "resultados",
          ].includes(
            new URLSearchParams(window.location.search).get("tab") ?? "",
          )
            ? new URLSearchParams(window.location.search).get("tab")!
            : "visualizacao"
        }
        className="space-y-6"
      >
        <div className="overflow-x-auto">
          <TabsList variant="line" className="min-w-max">
            <TabsTrigger value="visualizacao">Visão geral</TabsTrigger>
            <TabsTrigger value="associacao">Associação</TabsTrigger>
            <TabsTrigger value="cameras">Câmeras</TabsTrigger>
            <TabsTrigger value="materiais">Materiais</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
            <TabsTrigger value="resultados">Histórico e resultados</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="visualizacao" className="space-y-6">
          {" "}
          <Card>
            <CardHeader>
              <CardTitle>Visualização 3D</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <select
                aria-label="Versão do ambiente"
                className={selectClass}
                value={selected_version?.id ?? ""}
                onChange={(e) =>
                  router.get(base, { version_id: e.target.value })
                }
              >
                {!versions.length && (
                  <option value="">Nenhuma versão enviada</option>
                )}
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    Versão {v.version_number} · {v.description || v.file?.name}
                  </option>
                ))}
              </select>
              <p className="text-sm">
                {!association
                  ? "Ambiente ausente nesta versão. Faça a associação manual abaixo."
                  : association.status === "validated"
                    ? "Associação confirmada manualmente."
                    : association.status === "invalid"
                      ? "Associação inválida. Revise os identificadores."
                      : "Associação pendente de revisão."}
              </p>
              <ModelPreview
                version={selected_version}
                association={association}
              />
              <Button asChild variant="outline" disabled={!selected_version}>
                <Link
                  href={`/projects/${project.id}${selected_version ? `?version_id=${selected_version.id}` : ""}`}
                >
                  Selecionar ambientes para renderização
                </Link>
              </Button>
            </CardContent>
          </Card>
          {selected_version &&
            association?.status === "validated" &&
            environment.status === "active" &&
            project.status === "active" &&
            issues.length === 0 && (
              <Button asChild>
                <Link
                  href={`/renderings/new?project_id=${project.id}&version_id=${selected_version.id}&environment_ids[]=${environment.id}`}
                >
                  Criar imagens deste ambiente
                </Link>
              </Button>
            )}
        </TabsContent>
        <TabsContent value="associacao" className="space-y-6">
          {" "}
          {selected_version && (
            <Card>
              <CardHeader>
                <CardTitle>Associação com esta versão</CardTitle>
              </CardHeader>
              <CardContent>
                <EnvironmentAssociation
                  key={`${selected_version.id}-${association?.id}`}
                  projectId={project.id}
                  environmentId={environment.id}
                  version={selected_version}
                  association={association}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="configuracoes" className="space-y-6">
          {" "}
          <Card>
            <CardHeader>
              <CardTitle>Configurações do ambiente</CardTitle>
            </CardHeader>
            <CardContent>
              <RenderPreferences
                key={environment.id}
                url={`${base}/render_settings`}
                values={environment.settings}
                base={{ ...schema.defaults, ...project.settings }}
                schema={schema}
                label="Sobrescritas deste ambiente sobre o projeto"
              />
            </CardContent>
          </Card>
          {selected_version && association && (
            <Card>
              <CardHeader>
                <CardTitle>Ajustes específicos desta versão</CardTitle>
              </CardHeader>
              <CardContent>
                <RenderPreferences
                  key={`${selected_version.id}-${association.id}`}
                  url={`${base}/versions/${selected_version.id}/render_settings`}
                  values={association.settings ?? {}}
                  base={{
                    ...schema.defaults,
                    ...project.settings,
                    ...environment.settings,
                  }}
                  schema={schema}
                  label={`Ajustes apenas para a versão ${selected_version.version_number}`}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="cameras" className="space-y-6">
          {" "}
          <Card>
            <CardHeader>
              <CardTitle>Câmeras</CardTitle>
            </CardHeader>
            <CardContent>
              {selected_version && association ? (
                <CameraManager
                  key={selected_version.id}
                  base={`${base}/versions/${selected_version.id}/cameras`}
                  cameras={cameras}
                  version={selected_version}
                  association={association}
                />
              ) : (
                <p className="text-sm">
                  Associe este ambiente à versão escolhida para cadastrar
                  câmeras.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="materiais" className="space-y-6">
          {" "}
          <Card>
            <CardHeader>
              <CardTitle>Materiais associados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mappings.length ? (
                mappings.map((mapping) => (
                  <p className="text-sm" key={mapping.id}>
                    {mapping.source_material_name} → {mapping.material_name} ·{" "}
                    {mapping.environment_id
                      ? "Específico deste ambiente"
                      : "Geral da versão"}
                    {!mapping.available ? " · Material removido" : ""}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum mapeamento. Os materiais originais do modelo serão
                  preservados.
                </p>
              )}
              <Button asChild variant="outline">
                <Link
                  href={`/projects/${project.id}?version_id=${selected_version?.id ?? ""}`}
                >
                  Gerenciar materiais da versão
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="resultados" className="space-y-6">
          {" "}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de processamento desta versão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!processing_history.length && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma renderização solicitada para este ambiente nesta
                  versão.
                </p>
              )}
              {processing_history.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"
                >
                  <Link
                    href={`/render_jobs/${job.id}`}
                    className="text-sm underline"
                  >
                    Tarefa #{job.id} · {outputLabels[job.output_type]} ·
                    tentativa {job.attempt}
                  </Link>
                  <Status status={job.status} progress={job.progress} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Consulte os arquivos deste ambiente na versão selecionada.
                Simulações não geram arquivos.
              </p>
              <Button asChild variant="outline">
                <Link
                  href={`/outputs?project_id=${project.id}&environment_id=${environment.id}${selected_version ? `&version_id=${selected_version.id}` : ""}`}
                >
                  Abrir galeria do ambiente
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
