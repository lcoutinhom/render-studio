import { SettingsEditor } from "../../components/settings-editor";
import type { Schema } from "../../types/rendering";
import { Head, Link, useForm } from "@inertiajs/react";
import { AppLayout } from "../../layouts/app-layout";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Field,
  selectClass,
  textareaClass,
} from "../../components/project-fields";
import {
  environmentTypes,
  type Project,
  type Environment,
} from "../../types/projects";
export default function Form({
  project,
  environment,
  types,
  schema,
}: {
  project: Project;
  environment: Environment | null;
  types: string[];
  schema: Schema;
}) {
  const form = useForm({
    environment: {
      name: environment?.name ?? "",
      description: environment?.description ?? "",
      environment_type: environment?.environment_type ?? "custom",
      custom_type: environment?.custom_type ?? "",
      status: environment?.status ?? "active",
      settings: environment?.settings ?? {},
    },
  });
  const set = (key: keyof typeof form.data.environment, value: string) =>
    form.setData("environment", { ...form.data.environment, [key]: value });
  return (
    <AppLayout
      title={environment ? "Editar ambiente" : "Novo ambiente"}
      description={`Projeto: ${project.name}`}
      breadcrumbs={[
        { label: "Projetos", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
      ]}
    >
      <Head title="Ambiente" />
      <Card className="max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (environment)
                form.patch(
                  `/projects/${project.id}/environments/${environment.id}`,
                );
              else form.post(`/projects/${project.id}/environments`);
            }}
          >
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
            <Field
              id="name"
              label="Nome do ambiente"
              value={form.data.environment.name}
              maxLength={160}
              required
              onChange={(e) => set("name", e.target.value)}
            />
            </div>
            <div className="sm:col-span-2">
            <Field id="description" label="Descrição">
              <textarea
                id="description"
                className={textareaClass}
                value={form.data.environment.description}
                rows={3}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            </div>
            <Field id="type" label="Tipo">
              <select
                id="type"
                className={selectClass}
                value={form.data.environment.environment_type}
                onChange={(e) => set("environment_type", e.target.value)}
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {environmentTypes[type]}
                  </option>
                ))}
              </select>
            </Field>
            {form.data.environment.environment_type === "custom" && (
              <Field
                id="custom_type"
                label="Tipo personalizado (opcional)"
                value={form.data.environment.custom_type}
                maxLength={80}
                onChange={(e) => set("custom_type", e.target.value)}
              />
            )}
            <Field id="status" label="Status">
              <select
                id="status"
                className={selectClass}
                value={form.data.environment.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="active">Ativo</option>
                <option value="archived">Arquivado</option>
              </select>
            </Field>
            <details className="group rounded-lg border sm:col-span-2">
              <summary className="flex list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <span>
                  Configurações próprias de renderização
                  <span className="block text-xs font-normal text-muted-foreground">
                    Opcional. Sem ajustes, o ambiente herda as configurações do projeto.
                  </span>
                </span>
                <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t p-4">
                <SettingsEditor
                  schema={schema}
                  base={{ ...schema.defaults, ...project.settings }}
                  value={form.data.environment.settings}
                  onChange={(settings) =>
                    form.setData("environment", {
                      ...form.data.environment,
                      settings,
                    })
                  }
                />
              </div>
            </details>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" asChild>
              <Link href={`/projects/${project.id}`}>Cancelar</Link>
            </Button>
            <Button type="submit" loading={form.processing}>
              {form.processing ? "Salvando…" : "Salvar ambiente"}
            </Button>
          </CardFooter>
          </form>
      </Card>
    </AppLayout>
  );
}
