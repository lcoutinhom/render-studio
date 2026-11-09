import { ChevronDown } from "lucide-react";
import { SubmitSimulation } from "../../components/submit-simulation";
import { Head, Link, useForm } from "@inertiajs/react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { Field, selectClass } from "../../components/project-fields";
import { ConfigurationSummary } from "../../components/configuration-summary";
import type { Schema, Snapshot } from "../../types/rendering";
export default function Show({
  configuration,
  schema,
  submission_key,
  batches,
  blender_render_enabled,
}: {
  configuration: {
    id: number;
    name: string;
    mode: string;
    snapshot: Snapshot;
    created_at: string;
  };
  blender_render_enabled: boolean;
  schema: Schema;
  submission_key: string;
  batches: {
    adapter: string;
    id: number;
    status: string;
    progress: number;
    created_at: string;
  }[];
}) {
  const form = useForm({
    name: "",
    environment_id: String(
      configuration.snapshot.environments[0].environment_id,
    ),
  });
  return (
    <AppLayout
      title={configuration.name}
      breadcrumbs={[{ label: "Configurações", href: "/renderings" }]}
      actions={
        <Button asChild>
          <Link href={`/renderings/${configuration.id}/edit`}>
            Criar revisão desta configuração
          </Link>
        </Button>
      }
    >
      <Head title={configuration.name} />
      <p className="text-sm text-muted-foreground">
        Salva em {new Date(configuration.created_at).toLocaleString("pt-BR")} ·{" "}
        {configuration.mode === "simple"
          ? "Modo simples"
          : "Modo personalizado"}
        . Este registro preserva os valores da versão e dos ambientes
        utilizados, mesmo que os cadastros sejam alterados.
      </p>
      <SubmitSimulation
        blenderEnabled={blender_render_enabled}
        configurationId={configuration.id}
        snapshot={configuration.snapshot}
        submissionKey={submission_key}
        batches={batches}
      />
      <details className="group rounded-lg border bg-card p-5 shadow-card">
        <summary className="flex list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          Ver os parâmetros desta configuração
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-5">
          <ConfigurationSummary
            snapshot={configuration.snapshot}
            schema={schema}
          />
        </div>
      </details>
      <details className="group rounded-lg border bg-card p-5 shadow-card">
        <summary className="flex list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          Guardar estas escolhas como um estilo reutilizável
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <form
          className="max-w-2xl space-y-4 rounded-lg border bg-background p-5"
          onSubmit={(e) => {
            e.preventDefault();
            form.post(`/renderings/${configuration.id}/preset`);
          }}
        >
          <h2 className="font-semibold">
            Salvar configurações como preset pessoal
          </h2>
          <Field id="snapshot-environment" label="Ambiente de referência">
            <select
              id="snapshot-environment"
              className={selectClass}
              value={form.data.environment_id}
              onChange={(e) => form.setData("environment_id", e.target.value)}
            >
              {configuration.snapshot.environments.map((env) => (
                <option value={env.environment_id} key={env.environment_id}>
                  {env.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="snapshot-preset-name"
            label="Nome do novo preset"
            maxLength={120}
            required
            value={form.data.name}
            onChange={(e) => form.setData("name", e.target.value)}
          />
          <Button disabled={form.processing}>Salvar como preset</Button>
        </form>
      </details>
    </AppLayout>
  );
}
