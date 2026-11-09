import { Head, Link, router } from "@inertiajs/react";
import { ChevronRight, FolderKanban, Plus } from "lucide-react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/ui/badge";
import { Pagination } from "../../components/ui/pagination";
import { Field, selectClass } from "../../components/project-fields";
import { FilterDialog } from "../../components/filter-dialog";
import { IndexList, IndexRow } from "../../components/index-list";
import type { Project } from "../../types/projects";
export default function Index({
  projects,
  total,
  page,
  filters,
}: {
  projects: Project[];
  total: number;
  page: number;
  filters: { q: string; status: string; sort: string };
}) {
  const paginate = (next: number) =>
    router.get("/projects", { ...filters, page: next });
  return (
    <AppLayout
      title="Projetos"
      description="Cada projeto reúne os arquivos 3D, as cenas escolhidas e os resultados renderizados."
      actions={
        <Button asChild>
          <Link href="/projects/new">
            <Plus />
            Novo projeto
          </Link>
        </Button>
      }
    >
      <Head title="Projetos" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] tabular-nums text-muted-foreground">
          {total} {total === 1 ? "projeto" : "projetos"}
          {filters.q && (
            <>
              {" "}para <span className="font-medium text-foreground">“{filters.q}”</span>
            </>
          )}
        </p>
        <FilterDialog
          href="/projects"
          filters={filters}
          defaults={{ q: "", status: "", sort: "updated" }}
        >
          {(values, setValues) => (
            <>
              <Field
                id="project-search"
                label="Pesquisar projetos"
                placeholder="Projeto ou cliente"
                value={values.q}
                onChange={(event) =>
                  setValues({ ...values, q: event.target.value })
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="project-status" label="Status">
                  <select
                    id="project-status"
                    className={selectClass}
                    value={values.status}
                    onChange={(event) =>
                      setValues({ ...values, status: event.target.value })
                    }
                  >
                    <option value="">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="archived">Arquivados</option>
                  </select>
                </Field>
                <Field id="project-sort" label="Ordenar por">
                  <select
                    id="project-sort"
                    className={selectClass}
                    value={values.sort}
                    onChange={(event) =>
                      setValues({ ...values, sort: event.target.value })
                    }
                  >
                    <option value="updated">Atualizados recentemente</option>
                    <option value="name">Nome</option>
                    <option value="oldest">Mais antigos</option>
                  </select>
                </Field>
              </div>
            </>
          )}
        </FilterDialog>
      </div>
      <IndexList
        emptyIcon={FolderKanban}
        empty={
          !projects.length
            ? "Nenhum projeto encontrado. Crie um projeto ou ajuste os filtros."
            : undefined
        }
        emptyAction={
          <Button asChild size="sm">
            <Link href="/projects/new">
              <Plus />
              Novo projeto
            </Link>
          </Button>
        }
      >
        {projects.map((project) => (
          <IndexRow key={project.id} className="group">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <span className="hidden size-10 shrink-0 place-items-center rounded-md border bg-muted/50 text-muted-foreground sm:grid">
                <FolderKanban aria-hidden="true" className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <Link
                  className="break-words font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                  href={`/projects/${project.id}`}
                >
                  {project.name}
                </Link>
                <p className="text-[13px] text-muted-foreground">
                  {project.client_name || "Sem cliente informado"}
                  {project.description && (
                    <span className="hidden md:inline">
                      {" · "}
                      <span className="line-clamp-1 inline">{project.description}</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge
                status={project.status === "archived" ? "archived" : "active"}
                label={project.status === "archived" ? "Arquivado" : "Ativo"}
              />
              <ChevronRight
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </IndexRow>
        ))}
      </IndexList>
      <Pagination page={page} perPage={20} total={total} onPage={paginate} label="projetos" />
    </AppLayout>
  );
}
