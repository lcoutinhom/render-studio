import { Link, useForm } from "@inertiajs/react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { SimulationNotice, Status } from "./processing-status";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import type { Snapshot } from "../types/rendering";
export function SubmitSimulation({
  configurationId,
  blenderEnabled = false,
  snapshot,
  submissionKey,
  batches,
}: {
  blenderEnabled?: boolean;
  configurationId: number;
  snapshot: Snapshot;
  submissionKey: string;
  batches: {
    id: number;
    status: string;
    progress: number;
    created_at: string;
    adapter: string;
  }[];
}) {
  const ids = snapshot.environments.map(
    (environment) => environment.environment_id,
  );
  const form = useForm({
    submission: {
      idempotency_key: submissionKey,
      adapter: blenderEnabled ? "blender" : "simulation",
      environment_ids: ids,
      failure_environment_ids: [] as number[],
    },
  });
  const change = (
    selected: number[],
    failures: number[],
    adapter = form.data.submission.adapter,
  ) =>
    form.setData("submission", {
      idempotency_key: crypto.randomUUID(),
      adapter,
      environment_ids: selected,
      failure_environment_ids: adapter === "simulation" ? failures : [],
    });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar renderização</CardTitle>
        <span className="text-sm text-muted-foreground">
          {form.data.submission.environment_ids.length} de {ids.length}{" "}
          ambientes
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <Tabs
          value={form.data.submission.adapter}
          onValueChange={(adapter) =>
            change(form.data.submission.environment_ids, [], adapter)
          }
        >
          <div className="overflow-x-auto">
            <TabsList variant="line" className="min-w-max">
              {blenderEnabled && <TabsTrigger value="blender">
                Blender · arquivos reais
              </TabsTrigger>}
              <TabsTrigger value="simulation">
                Simulação · testar fluxo
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
        <SimulationNotice adapter={form.data.submission.adapter} />
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            form.post(`/renderings/${configurationId}/submissions`);
          }}
        >
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => change(ids, [])}
            >
              Selecionar todos
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => change([], [])}
            >
              Limpar seleção
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {snapshot.environments.map((environment) => {
              const selected = form.data.submission.environment_ids.includes(
                environment.environment_id,
              );
              return (
                <div
                  key={environment.environment_id}
                  className={`rounded-lg border p-4 ${selected ? "border-brand-500 bg-accent ring-1 ring-brand-500" : "bg-background"}`}
                >
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      aria-label={`Selecionar ${environment.name}`}
                      checked={selected}
                      onChange={(event) => {
                        const selectedIds = event.target.checked
                          ? [
                              ...form.data.submission.environment_ids,
                              environment.environment_id,
                            ]
                          : form.data.submission.environment_ids.filter(
                              (id) => id !== environment.environment_id,
                            );
                        change(
                          selectedIds,
                          form.data.submission.failure_environment_ids.filter(
                            (id) => selectedIds.includes(id),
                          ),
                        );
                      }}
                    />
                    {environment.name}
                  </label>
                  <p className="mt-2 pl-7 text-xs text-muted-foreground">
                    {environment.cameras.length || 1} câmera(s) · versão{" "}
                    {snapshot.version_number}
                  </p>
                  {form.data.submission.adapter === "simulation" && (
                    <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        aria-label={`Simular falha em ${environment.name}`}
                        disabled={!selected}
                        checked={form.data.submission.failure_environment_ids.includes(
                          environment.environment_id,
                        )}
                        onChange={(event) =>
                          change(
                            form.data.submission.environment_ids,
                            event.target.checked
                              ? [
                                  ...form.data.submission
                                    .failure_environment_ids,
                                  environment.environment_id,
                                ]
                              : form.data.submission.failure_environment_ids.filter(
                                  (id) => id !== environment.environment_id,
                                ),
                          )
                        }
                      />
                      Testar falha na primeira tentativa
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t pt-5">
            <Button
              type="submit"
              disabled={
                form.processing || !form.data.submission.environment_ids.length
              }
            >
              {form.processing
                ? "Enviando…"
                : form.data.submission.adapter === "blender"
                  ? "Renderizar com Blender"
                  : "Enfileirar simulação"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Os parâmetros salvos serão preservados nesta execução.
            </p>
          </div>
        </form>
        {batches.length > 0 && (
          <div className="space-y-3 border-t pt-5">
            <h3 className="text-sm font-semibold">Últimas execuções</h3>
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <Link
                  className="text-sm font-medium underline-offset-4 hover:underline"
                  href={`/render_batches/${batch.id}`}
                >
                  Lote #{batch.id} ·{" "}
                  {batch.adapter === "comfyui" ? "IA local" : batch.adapter === "gemini" ? "Gemini" : batch.adapter === "blender" ? "Blender" : "Simulação"} ·{" "}
                  {new Date(batch.created_at).toLocaleString("pt-BR")}
                </Link>
                <Status status={batch.status} progress={batch.progress} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
