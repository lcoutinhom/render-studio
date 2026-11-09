import { renderIssues } from "../../lib/render-readiness";
import { RenderReadiness } from "../../components/render-readiness";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import { Status } from "../../components/processing-status";
import { RenderPreferences } from "../../components/render-preferences";
import { MaterialMappingManager } from "../../components/material-mapping-manager";
import type { Schema, Material, Mapping } from "../../types/rendering";
import { Head, Link, router } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Copy, FolderKanban, MoreHorizontal, Pencil } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { AppLayout } from "../../layouts/app-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ConfirmAction } from "../../components/confirm-action";
import { VersionUpload } from "../../components/version-upload";
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
  environments,
  versions,
  selected_version,
  associations,
  schema,
  materials,
  material_mappings,
  processing_history,
}: {
  project: Project;
  environments: Environment[];
  versions: ModelVersion[];
  selected_version: ModelVersion | null;
  associations: Association[];
  schema: Schema;
  materials: Material[];
  material_mappings: Mapping[];
  processing_history: {
    id: number;
    status: string;
    progress: number;
    version_number: number;
  }[];
}) {
  const [selection, setSelection] = useState<number[]>([]);
  useEffect(() => setSelection([]), [selected_version?.id]);
  const readiness = new Map(
    environments.map((env) => [
      env.id,
      renderIssues(
        project,
        env,
        selected_version,
        associations.find((a) => a.environment_id === env.id),
        material_mappings,
      ),
    ]),
  );
  const eligible = environments
    .filter((env) => readiness.get(env.id)?.length === 0)
    .map((env) => env.id);
  const selected = selection.filter((id) => eligible.includes(id));
  const reorder = (index: number, direction: number) => {
    const ids = environments.map((env) => env.id);
    [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    router.patch(
      `/projects/${project.id}/environments/reorder`,
      { ids, version_id: selected_version?.id },
      { preserveScroll: true },
    );
  };
  return (
    <AppLayout
      title={project.name}
      description="Dados do fluxo anterior: ambientes, versões do modelo e mapeamentos."
      breadcrumbs={[{ label: "Projetos", href: "/projects" }]}
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal />
                Gerenciar projeto
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}/edit`}>
                  <Pencil />
                  Editar projeto
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.post(`/projects/${project.id}/duplicate`)}>
                <Copy />
                Duplicar projeto
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/projects">
                  <FolderKanban />
                  Todos os projetos
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {project.status !== "archived" && (
            <ConfirmAction
              url={`/projects/${project.id}/archive`}
              label="Arquivar projeto"
              method="patch"
              description="O projeto continuará disponível no histórico e não receberá novos modelos."
            />
          )}
          <ConfirmAction
            url={`/projects/${project.id}`}
            label="Excluir projeto"
            description="O projeto sairá da listagem. Seus arquivos, versões e associações serão preservados."
          />
          <Button asChild>
            <Link
              href={`/outputs?project_id=${project.id}${selected_version ? `&version_id=${selected_version.id}` : ""}`}
            >
              Resultados do projeto
            </Link>
          </Button>
        </>
      }
    >
      <Head title={project.name} />
      <p className="break-words text-sm text-muted-foreground">
        {project.client_name || "Cliente não informado"} ·{" "}
        {project.status === "archived" ? "Arquivado" : "Ativo"}
        {project.description && ` · ${project.description}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>
          <span className="tabular-nums">{environments.length}</span> ambientes
        </Badge>
        <Badge>
          <span className="tabular-nums">{versions.length}</span> versões do modelo
        </Badge>
        <Badge tone={selected_version ? "accent" : "warning"}>
          {selected_version
            ? `Trabalhando na versão ${selected_version.version_number}`
            : "Envie a primeira versão para começar"}
        </Badge>
      </div>
      <Tabs
        defaultValue={
          typeof window !== "undefined" &&
          [
            "ambientes",
            "modelo",
            "materiais",
            "configuracoes",
            "historico",
          ].includes(
            new URLSearchParams(window.location.search).get("tab") ?? "",
          )
            ? new URLSearchParams(window.location.search).get("tab")!
            : versions.length
              ? "ambientes"
              : "modelo"
        }
        className="space-y-6"
      >
        <div>
          <TabsList variant="line">
            <TabsTrigger value="ambientes">Ambientes</TabsTrigger>
            <TabsTrigger value="modelo">Modelo e versões</TabsTrigger>
            <TabsTrigger value="materiais">Materiais</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="modelo" className="space-y-6">
          {" "}
          <Card>
            <CardHeader>
              <CardTitle>Modelo e versão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-3">
                <select
                  aria-label="Versão do modelo"
                  className={`${selectClass} max-w-md`}
                  value={selected_version?.id ?? ""}
                  onChange={(e) =>
                    router.get(`/projects/${project.id}`, {
                      version_id: e.target.value,
                    })
                  }
                >
                  {!versions.length && (
                    <option value="">Nenhuma versão enviada</option>
                  )}
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      Versão {v.version_number} ·{" "}
                      {v.description || v.file?.name}
                    </option>
                  ))}
                </select>
                {selected_version?.file && (
                  <Button asChild variant="outline">
                    <a href={selected_version.file.url}>Baixar original</a>
                  </Button>
                )}
              </div>
              <ModelPreview version={selected_version} />
            </CardContent>
          </Card>
          <Card id="versions">
            <CardHeader>
              <CardTitle>Versões do projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <VersionUpload
                projectId={project.id}
                archived={project.status === "archived"}
              />
              <ul className="divide-y">
                {versions.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap justify-between gap-3 py-3 text-sm"
                  >
                    <span>
                      Versão {v.version_number} ·{" "}
                      {v.description || "Sem descrição"} · {v.file?.name} (
                      {((v.file?.size ?? 0) / 1024 / 1024).toFixed(2)} MiB)
                    </span>
                    <a className="underline" href={v.file?.url}>
                      Baixar original
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ambientes" className="space-y-6">
          {" "}
          <Card>
            <CardHeader>
              <CardTitle>Ambientes</CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link href={`/projects/${project.id}/environments/new`}>
                  <Plus />
                  Novo ambiente
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!eligible.length}
                  onClick={() => setSelection(eligible)}
                >
                  Selecionar todos os elegíveis
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!selected.length}
                  onClick={() => setSelection([])}
                >
                  Limpar seleção
                </Button>
                <span className="text-sm" role="status">
                  {selected.length} ambiente(s) selecionado(s)
                </span>
              </div>
              {!environments.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Este projeto ainda não tem ambientes. Crie um ambiente e
                  associe-o à versão correspondente.
                </p>
              )}
              <div className="divide-y">
                {environments.map((env, index) => {
                  const association = associations.find(
                    (a) => a.environment_id === env.id,
                  );
                  const enabled = eligible.includes(env.id);
                  return (
                    <div
                      key={env.id}
                      className="flex flex-wrap items-center gap-3 py-4"
                    >
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${env.name}`}
                        disabled={!enabled}
                        checked={selected.includes(env.id)}
                        onChange={(e) =>
                          setSelection(
                            e.target.checked
                              ? [...selected, env.id]
                              : selected.filter((id) => id !== env.id),
                          )
                        }
                      />
                      <div className="min-w-40 flex-1">
                        <Link
                          className="font-medium hover:underline"
                          href={`/projects/${project.id}/environments/${env.id}${selected_version ? `?version_id=${selected_version.id}` : ""}`}
                        >
                          {env.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {environmentTypes[env.environment_type]} ·{" "}
                          {env.status === "archived"
                            ? "Arquivado"
                            : !association
                              ? "Ausente nesta versão"
                              : association.status === "validated"
                                ? "Associação confirmada"
                                : association.status === "invalid"
                                  ? "Associação inválida"
                                  : "Associação pendente"}
                        </p>
                        <RenderReadiness
                          issues={readiness.get(env.id) ?? []}
                          compact
                        />
                      </div>
                      <Button
                        aria-label={`Subir ${env.name}`}
                        size="sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => reorder(index, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        aria-label={`Descer ${env.name}`}
                        size="sm"
                        variant="ghost"
                        disabled={index === environments.length - 1}
                        onClick={() => reorder(index, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/projects/${project.id}/environments/${env.id}`}
                        >
                          Abrir ambiente
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione um ou vários ambientes com associação confirmada à
                versão atual. Continue para escolher qualidade, câmeras e
                saídas; depois envie para o Blender.
              </p>
              <Button
                disabled={!selected.length}
                onClick={() =>
                  router.get("/renderings/new", {
                    project_id: project.id,
                    version_id: selected_version?.id,
                    environment_ids: selected,
                  })
                }
              >
                Criar imagens ({selected.length})
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="configuracoes" className="space-y-6">
          {" "}
          <Card>
            <CardHeader>
              <CardTitle>Configurações gerais do projeto</CardTitle>
            </CardHeader>
            <CardContent>
              <RenderPreferences
                key={`project-${project.id}`}
                url={`/projects/${project.id}/render_settings`}
                values={project.settings}
                base={schema.defaults}
                schema={schema}
                label="Valores gerais compartilhados entre os ambientes"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="materiais" className="space-y-6">
          {" "}
          {selected_version && (
            <Card>
              <CardHeader>
                <CardTitle>Mapeamento de materiais da versão</CardTitle>
              </CardHeader>
              <CardContent>
                <MaterialMappingManager
                  key={selected_version.id}
                  base={`/projects/${project.id}/versions/${selected_version.id}/material_mappings`}
                  mappings={material_mappings}
                  materials={materials}
                  environments={environments.filter((env) =>
                    associations.some(
                      (association) => association.environment_id === env.id,
                    ),
                  )}
                  sourceNames={
                    selected_version.metadata?.materials?.map(
                      (item) => item.name,
                    ) ?? []
                  }
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="historico" className="space-y-6">
          {" "}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de processamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!processing_history.length && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma renderização solicitada neste projeto.
                </p>
              )}
              {processing_history.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"
                >
                  <Link
                    href={`/render_batches/${batch.id}`}
                    className="text-sm underline"
                  >
                    Lote #{batch.id} · Versão {batch.version_number}
                  </Link>
                  <Status status={batch.status} progress={batch.progress} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
