import { Head, Link } from "@inertiajs/react";
import { ChevronRight, Plus, SlidersHorizontal } from "lucide-react";
import { AppLayout } from "../../layouts/app-layout";
import { IndexList, IndexRow } from "../../components/index-list";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
export default function Index({
  configurations,
}: {
  configurations: {
    id: number;
    name: string;
    mode: string;
    project_name: string;
    version_number: number;
    environment_count: number;
  }[];
}) {
  return (
    <AppLayout
      title="Configurações de renderização"
      description="Escolha uma configuração salva para iniciar uma renderização e acompanhar o processamento."
      actions={
        <Button asChild>
          <Link href="/renderings/new">
            <Plus />
            Nova configuração
          </Link>
        </Button>
      }
    >
      <Head title="Configurações de renderização" />
      <IndexList
        emptyIcon={SlidersHorizontal}
        empty={
          !configurations.length
            ? "Nenhuma configuração salva. Escolha um projeto e seus ambientes para começar."
            : undefined
        }
      >
        {configurations.map((item) => (
          <IndexRow key={item.id} className="group">
            <div className="min-w-0 flex-1">
              <Link
                href={`/renderings/${item.id}`}
                aria-label={`Ver configuração salva: ${item.name}`}
                className="break-words font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
              >
                {item.name}
              </Link>
              <p className="text-[13px] text-muted-foreground">
                {item.project_name} · Versão {item.version_number} ·{" "}
                {item.environment_count} ambiente(s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge>{item.mode === "simple" ? "Simples" : "Personalizado"}</Badge>
              <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </IndexRow>
        ))}
      </IndexList>
    </AppLayout>
  );
}
