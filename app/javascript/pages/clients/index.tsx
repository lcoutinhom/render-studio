import { Head, Link } from "@inertiajs/react";
import { ChevronRight, Mail, Phone, Plus, Users } from "lucide-react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { IndexList, IndexRow } from "../../components/index-list";
import { FilterDialog } from "../../components/filter-dialog";
import { Field } from "../../components/project-fields";
export default function Clients({
  clients,
  filters,
}: {
  clients: { id: number; name: string; email: string; phone: string }[];
  filters: { q: string };
}) {
  return (
    <AppLayout
      title="Clientes"
      description="Contatos dos seus clientes e os projetos de cada um."
      actions={
        <Button asChild>
          <Link href="/clients/new">
            <Plus />
            Novo cliente
          </Link>
        </Button>
      }
    >
      <Head title="Clientes" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] tabular-nums text-muted-foreground">
          {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
        </p>
        <FilterDialog href="/clients" filters={filters} defaults={{ q: "" }}>
          {(values, set) => (
            <Field
              id="client-search"
              label="Pesquisar clientes"
              value={values.q}
              onChange={(e) => set({ ...values, q: e.target.value })}
            />
          )}
        </FilterDialog>
      </div>
      <IndexList
        emptyIcon={Users}
        empty={!clients.length ? "Nenhum cliente cadastrado." : undefined}
        emptyAction={
          <Button asChild size="sm">
            <Link href="/clients/new">
              <Plus />
              Novo cliente
            </Link>
          </Button>
        }
      >
        {clients.map((c) => (
          <IndexRow key={c.id} className="group">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-200"
              >
                {c.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <Link
                  className="break-words font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                  href={`/clients/${c.id}`}
                >
                  {c.name}
                </Link>
                <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-muted-foreground">
                  {c.email && (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Mail aria-hidden="true" className="size-3.5" />
                      <span className="break-all">{c.email}</span>
                    </span>
                  )}
                  {c.phone && (
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Phone aria-hidden="true" className="size-3.5" />
                      {c.phone}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground group-hover:text-foreground">
              Ver projetos
              <ChevronRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </IndexRow>
        ))}
      </IndexList>
    </AppLayout>
  );
}
