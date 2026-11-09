import { SettingsEditor } from "../../components/settings-editor";
import type { Schema } from "../../types/rendering";
import { Head, Link, useForm } from "@inertiajs/react";
import { AppLayout } from "../../layouts/app-layout";
import { ChevronDown, Plus } from "lucide-react";
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Field, selectClass, textareaClass } from "../../components/project-fields";
import type { Project } from "../../types/projects";
export default function Form({
  project,
  schema,
  clients = [],
  selected_client_id,
}: {
  project: Project | null;
  schema: Schema;
  clients?: { id: number; name: string; deleted_at?: string | null }[];
  selected_client_id?: string | number | null;
}) {
  const form = useForm({
    project: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      client_name: project?.client_name ?? "",
      client_id: String(project?.client_id ?? selected_client_id ?? ""),
      settings: project?.settings ?? {},
    },
  });
  const set = (key: keyof typeof form.data.project, value: string) =>
    form.setData("project", { ...form.data.project, [key]: value });
  const error = (key: string) =>
    (form.errors as Record<string, string>)[`project.${key}`] ??
    (form.errors as Record<string, string>)[key];
  return (
    <AppLayout
      title={project ? "Editar projeto" : "Novo projeto"}
      description="Dê um nome ao projeto e associe o cliente. Os arquivos 3D são enviados em seguida."
      breadcrumbs={[
        { label: "Projetos", href: "/projects" },
        ...(project ? [{ label: project.name, href: `/projects/${project.id}` }] : []),
      ]}
    >
      <Head title="Projeto" />
      <Card className="max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (project) form.patch(`/projects/${project.id}`);
              else form.post("/projects");
            }}
          >
          <CardContent className="space-y-5">
            <Field
              id="name"
              label="Nome do projeto"
              value={form.data.project.name}
              maxLength={160}
              required
              error={error("name")}
              onChange={(e) => set("name", e.target.value)}
            />
            <Field id="client" label="Cliente" error={error("client_id")}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                id="client"
                className={selectClass}
                value={form.data.project.client_id}
                onChange={(e) => set("client_id", e.target.value)}
              >
                <option value="">Sem cliente associado</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {client.deleted_at ? " (arquivado)" : ""}
                  </option>
                ))}
              </select>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/clients/new">
                  <Plus />
                  Cadastrar cliente
                </Link>
              </Button>
              </div>
            </Field>
            <Field
              id="description"
              label="Descrição"
              hint="Opcional. Ajuda a identificar o projeto na listagem."
              error={error("description")}
            >
              <textarea
                id="description"
                aria-describedby="description-hint"
                rows={4}
                className={textareaClass}
                value={form.data.project.description}
                maxLength={10000}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <details className="group rounded-lg border">
              <summary className="flex list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <span>
                  Configurações gerais de renderização
                  <span className="block text-xs font-normal text-muted-foreground">
                    Opcional. Novos projetos herdam o padrão do estúdio.
                  </span>
                </span>
                <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t p-4">
                <SettingsEditor
                  schema={schema}
                  value={form.data.project.settings}
                  onChange={(settings) =>
                    form.setData("project", { ...form.data.project, settings })
                  }
                />
              </div>
            </details>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" asChild>
              <Link href={project ? `/projects/${project.id}` : "/projects"}>
                Cancelar
              </Link>
            </Button>
            <Button type="submit" loading={form.processing}>
              {form.processing ? "Salvando…" : "Salvar projeto"}
            </Button>
          </CardFooter>
          </form>
      </Card>
    </AppLayout>
  );
}
