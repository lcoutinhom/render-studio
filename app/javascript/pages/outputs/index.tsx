import { Head, Link, router } from "@inertiajs/react";
import { AppLayout } from "../../layouts/app-layout";
import { Activity } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Pagination } from "../../components/ui/pagination";
import { Field, selectClass } from "../../components/project-fields";
import {
  FilterDialog,
  ContextFilters,
  type FilterOption,
} from "../../components/filter-dialog";
import { OutputGallery } from "../../components/output-gallery";
import { kindLabels, type RenderOutput } from "../../types/outputs";
export default function Results({
  outputs,
  projects,
  environments,
  versions,
  filters,
  total,
  page,
}: {
  outputs: RenderOutput[];
  projects: FilterOption[];
  environments: FilterOption[];
  versions: FilterOption[];
  filters: Record<string, string>;
  total: number;
  page: number;
}) {
  return (
    <AppLayout
      title="Resultados"
      description="Imagens, vídeos, panoramas e modelos VR gerados pelos seus renders."
      actions={
        <Button asChild variant="outline">
          <Link href="/render_batches">
            <Activity />
            Processamento e histórico
          </Link>
        </Button>
      }
    >
      <Head title="Resultados" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] tabular-nums text-muted-foreground" aria-live="polite">
            {total} arquivo(s) encontrado(s)
          </p>
          {filters.job_id && <Badge tone="accent">Tarefa #{filters.job_id}</Badge>}
          {filters.batch_id && <Badge tone="accent">Lote #{filters.batch_id}</Badge>}
        </div>
        <FilterDialog href="/outputs" filters={filters}>
          {(values, setValues) => (
            <>
              <ContextFilters
                values={values}
                setValues={setValues}
                projects={projects}
                environments={environments}
                versions={versions}
              />
              <Field id="output-kind" label="Tipo de resultado">
                <select
                  id="output-kind"
                  className={selectClass}
                  value={values.kind || ""}
                  onChange={(event) =>
                    setValues({ ...values, kind: event.target.value })
                  }
                >
                  <option value="">Todos</option>
                  {Object.entries(kindLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="output-status" label="Status da tarefa">
                <select
                  id="output-status"
                  className={selectClass}
                  value={values.status || ""}
                  onChange={(event) =>
                    setValues({ ...values, status: event.target.value })
                  }
                >
                  <option value="">Todos</option>
                  <option value="completed">Concluída</option>
                  <option value="failed">Falhou</option>
                  <option value="cancelled">Cancelada</option>
                  <option value="processing">Processando</option>
                  <option value="queued">Na fila</option>
                </select>
              </Field>
            </>
          )}
        </FilterDialog>
      </div>
      <OutputGallery outputs={outputs} />
      <Pagination
        page={page}
        perPage={24}
        total={total}
        onPage={(next) => router.get("/outputs", { ...filters, page: next })}
        label="arquivos"
      />
    </AppLayout>
  );
}
