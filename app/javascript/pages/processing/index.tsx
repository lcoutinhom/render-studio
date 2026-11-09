import { Head, Link, router } from "@inertiajs/react";
import { AppLayout } from "../../layouts/app-layout";
import { Activity, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Pagination } from "../../components/ui/pagination";
import { EmptyState } from "../../components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  FilterDialog,
  ContextFilters,
  type FilterOption,
} from "../../components/filter-dialog";
import { Field, selectClass } from "../../components/project-fields";
import {
  SimulationNotice,
  Status,
  useProcessingPoll,
} from "../../components/processing-status";
import { statusLabels, isActive } from "../../types/processing";
type Batch = {
  id: number;
  status: string;
  progress: number;
  name: string;
  project_name: string;
  version_number: number;
  environment_count: number;
  created_at: string;
};
export default function Index({
  batches,
  total,
  page,
  filters,
  projects,
  environments,
  versions,
}: {
  batches: Batch[];
  total: number;
  page: number;
  filters: Record<string, string>;
  projects: FilterOption[];
  environments: FilterOption[];
  versions: FilterOption[];
}) {
  useProcessingPoll(
    batches.some((batch) => isActive(batch.status)),
    ["batches", "total"],
  );
  const paginate = (next: number) =>
    router.get("/render_batches", { ...filters, page: next });
  const date = (value: string) =>
    new Date(value).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  return (
    <AppLayout
      title="Processamento e histórico"
      description="Acompanhe os lotes em andamento e consulte as solicitações anteriores."
      actions={
        <Button asChild>
          <Link href="/renderings/new">
            <Plus />
            Novo render
          </Link>
        </Button>
      }
    >
      <Head title="Processamento e histórico" />
      <SimulationNotice />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] tabular-nums text-muted-foreground" aria-live="polite">
          {total} solicitação(ões)
        </p>
        <FilterDialog href="/render_batches" filters={filters}>
          {(values, setValues) => (
            <>
              <Field id="processing-status" label="Status do processamento">
                <select
                  id="processing-status"
                  className={selectClass}
                  value={values.status || ""}
                  onChange={(event) =>
                    setValues({ ...values, status: event.target.value })
                  }
                >
                  <option value="">Todos</option>
                  {Object.entries(statusLabels)
                    .filter(([key]) => key !== "draft")
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </Field>
              <ContextFilters
                values={values}
                setValues={setValues}
                projects={projects}
                environments={environments}
                versions={versions}
              />
            </>
          )}
        </FilterDialog>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card shadow-card">
        {!batches.length ? (
          <EmptyState
            icon={Activity}
            title="Nenhuma solicitação encontrada."
            description="Crie um render ou ajuste os filtros."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Lote</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead className="w-60">Status</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id} className="relative">
                      <TableCell className="max-w-80">
                        <Link
                          href={`/render_batches/${batch.id}`}
                          aria-label={`Acompanhar lote: ${batch.name}`}
                          className="break-words font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                        >
                          {batch.name}
                        </Link>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          Lote #{batch.id}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="break-words">{batch.project_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Versão {batch.version_number} · {batch.environment_count} ambiente(s)
                        </p>
                      </TableCell>
                      <TableCell>
                        <Status status={batch.status} progress={batch.progress} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[13px] tabular-nums text-muted-foreground">
                        {date(batch.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y md:hidden">
              {batches.map((batch) => (
                <li key={batch.id}>
                  <Link
                    href={`/render_batches/${batch.id}`}
                    className="block space-y-3 px-4 py-3.5 hover:bg-muted/40"
                  >
                    <span className="block">
                      <span className="block break-words font-medium">{batch.name}</span>
                      <span className="block text-[13px] text-muted-foreground">
                        {batch.project_name} · Versão {batch.version_number} ·{" "}
                        {batch.environment_count} ambiente(s)
                      </span>
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        Lote #{batch.id} · {date(batch.created_at)}
                      </span>
                    </span>
                    <Status status={batch.status} progress={batch.progress} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <Pagination page={page} perPage={20} total={total} onPage={paginate} label="solicitações" />
    </AppLayout>
  );
}
