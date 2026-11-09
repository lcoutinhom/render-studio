import { Head, Link } from "@inertiajs/react";
import { ChevronRight, FolderKanban, Mail, Pencil, Phone, Plus } from "lucide-react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { StatusBadge } from "../../components/ui/badge";
import { IndexList, IndexRow } from "../../components/index-list";
import { ConfirmAction } from "../../components/confirm-action";
import type { Project } from "../../types/projects";
export default function Show({
  client,
  projects,
}: {
  client: {
    id: number;
    name: string;
    email: string;
    phone: string;
    notes: string;
  };
  projects: Project[];
}) {
  return (
    <AppLayout
      title={client.name}
      actions={
        <>
          <Button asChild variant="outline">
            <Link href={`/clients/${client.id}/edit`}>
              <Pencil />
              Editar cliente
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/projects/new?client_id=${client.id}`}>
              <Plus />
              Novo projeto deste cliente
            </Link>
          </Button>
        </>
      }
    >
      <Head title={client.name} />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">E-mail</dt>
                <dd className="mt-1 flex items-center gap-2 break-all">
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  {client.email ? (
                    <a className="underline-offset-4 hover:underline" href={`mailto:${client.email}`}>
                      {client.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Não informado</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Telefone</dt>
                <dd className="mt-1 flex items-center gap-2 tabular-nums">
                  <Phone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  {client.phone || <span className="text-muted-foreground">Não informado</span>}
                </dd>
              </div>
              {client.notes && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Observações</dt>
                  <dd className="mt-1 whitespace-pre-line break-words leading-6">{client.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
          <div className="border-t px-5 py-3">
            <ConfirmAction
              url={`/clients/${client.id}`}
              label="Arquivar cliente"
              description="Projetos, arquivos e resultados serão preservados."
            />
          </div>
        </Card>
        <section className="space-y-3 lg:col-span-2" aria-labelledby="client-projects">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="client-projects" className="text-[15px] font-semibold">
              Projetos do cliente
            </h2>
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
            </span>
          </div>
          <IndexList
            emptyIcon={FolderKanban}
            empty={!projects.length ? "Este cliente ainda não tem projetos." : undefined}
          >
            {projects.map((p) => (
              <IndexRow key={p.id} className="group">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FolderKanban aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <Link
                    className="break-words font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                    href={`/projects/${p.id}`}
                  >
                    {p.name}
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={p.status === "active" ? "active" : "archived"}
                    label={p.status === "active" ? "Ativo" : "Arquivado"}
                  />
                  <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </IndexRow>
            ))}
          </IndexList>
        </section>
      </div>
    </AppLayout>
  );
}
