import { Head, Link } from "@inertiajs/react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Files,
  FolderKanban,
  Images,
  Plus,
} from "lucide-react";
import { AppLayout } from "../layouts/app-layout";
import { Card, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { StatCard } from "../components/ui/stat";
import { StatusBadge } from "../components/ui/badge";
import { EmptyState } from "../components/ui/empty-state";
import { Status } from "../components/processing-status";

type Totals = {
  projects: number;
  files: number;
  environments: number;
  active_batches: number;
  completed_batches: number;
  failed_batches: number;
  outputs: number;
};

export default function Dashboard({
  totals,
  projects,
  batches,
}: {
  totals: Totals;
  projects: { id: number; name: string; status: string }[];
  batches: {
    id: number;
    project_name: string;
    status: string;
    progress: number;
  }[];
}) {
  return (
    <AppLayout
      title="Visão geral"
      description="Acompanhe seus projetos e as últimas renderizações."
      actions={
        <>
          <Button variant="outline" asChild>
            <Link href="/outputs">
              <Images />
              Resultados
            </Link>
          </Button>
          <Button asChild>
            <Link href="/projects/new">
              <Plus />
              Novo projeto
            </Link>
          </Button>
        </>
      }
    >
      <Head title="Visão geral" />

      <section aria-labelledby="studio-totals" className="space-y-3">
        <h2 id="studio-totals" className="sr-only">
          Totais do estúdio
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <StatCard label="Projetos" value={totals.projects} icon={FolderKanban} href="/projects" />
          <StatCard label="Arquivos de projeto" value={totals.files} icon={Files} />
          <StatCard
            label="Lotes em andamento"
            value={totals.active_batches}
            icon={Activity}
            tone="info"
            href="/render_batches"
          />
          <StatCard
            label="Lotes concluídos"
            value={totals.completed_batches}
            icon={CheckCircle2}
            href="/render_batches"
          />
          <StatCard
            label="Lotes com falhas"
            value={totals.failed_batches}
            icon={CircleAlert}
            tone="danger"
            href="/render_batches"
          />
          <StatCard label="Arquivos de resultado" value={totals.outputs} icon={Images} href="/outputs" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            description="Lotes enviados mais recentemente e seu progresso."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/render_batches">
                  Ver histórico
                  <ArrowRight />
                </Link>
              </Button>
            }
          >
            <CardTitle>Últimos lotes</CardTitle>
          </CardHeader>
          {batches.length ? (
            <ul className="divide-y">
              {batches.map((batch) => (
                <li key={batch.id}>
                  <Link
                    href={`/render_batches/${batch.id}`}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-medium">
                        {batch.project_name}
                      </span>
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        Lote #{batch.id}
                      </span>
                    </span>
                    <span className="w-full sm:w-56">
                      <Status status={batch.status} progress={batch.progress} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={Activity}
              title="Nenhum processamento solicitado"
              description="Abra um projeto, marque as cenas e envie para renderizar."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/projects">Abrir projetos</Link>
                </Button>
              }
            />
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            description="Atualizados recentemente."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects">
                  Todos
                  <ArrowRight />
                </Link>
              </Button>
            }
          >
            <CardTitle>Projetos recentes</CardTitle>
          </CardHeader>
          {projects.length ? (
            <ul className="divide-y">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-muted/50 text-muted-foreground">
                        <FolderKanban aria-hidden="true" className="size-4" />
                      </span>
                      <span className="min-w-0 break-words text-sm font-medium">
                        {project.name}
                      </span>
                    </span>
                    <StatusBadge
                      status={project.status === "active" ? "active" : "archived"}
                      label={project.status === "active" ? "Ativo" : "Arquivado"}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={FolderKanban}
              title="Nenhum projeto cadastrado"
              action={
                <Button asChild size="sm">
                  <Link href="/projects/new">
                    <Plus />
                    Criar projeto
                  </Link>
                </Button>
              }
            />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
