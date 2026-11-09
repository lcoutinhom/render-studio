import { Head, Link } from "@inertiajs/react";
import { Lock, Pencil, Plus, Sparkles } from "lucide-react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { EmptyState } from "../../components/ui/empty-state";
import { ConfirmAction } from "../../components/confirm-action";
import type { Preset } from "../../types/rendering";
export default function Index({ presets }: { presets: Preset[] }) {
  return (
    <AppLayout
      title="Presets"
      description="Presets globais são somente leitura. Crie seus próprios padrões reutilizáveis."
      actions={
        <Button asChild>
          <Link href="/presets/new">
            <Plus />
            Novo preset
          </Link>
        </Button>
      }
    >
      <Head title="Presets" />
      {presets.length ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {presets.map((preset) => (
            <li
              key={preset.id}
              className="flex flex-col rounded-lg border bg-card p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-md border bg-muted/50 text-muted-foreground">
                  <Sparkles aria-hidden="true" className="size-4" />
                </span>
                {preset.system ? (
                  <Badge>
                    <Lock aria-hidden="true" className="size-3" />
                    Global
                  </Badge>
                ) : (
                  <Badge tone="accent">Pessoal</Badge>
                )}
              </div>
              <h2 className="mt-4 break-words text-[15px] font-semibold">{preset.name}</h2>
              <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
                {preset.category}
              </p>
              {preset.description && (
                <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                  {preset.description}
                </p>
              )}
              {!preset.system && (
                <div className="mt-auto pt-5">
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/presets/${preset.id}/edit`}>
                        <Pencil />
                        Editar preset
                      </Link>
                    </Button>
                    <ConfirmAction
                      url={`/presets/${preset.id}`}
                      label="Excluir preset"
                      description="Configurações já salvas manterão os valores anteriores."
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border bg-card shadow-card">
          <EmptyState
            icon={Sparkles}
            title="Nenhum estilo salvo."
            action={
              <Button asChild size="sm">
                <Link href="/presets/new">
                  <Plus />
                  Novo preset
                </Link>
              </Button>
            }
          />
        </div>
      )}
    </AppLayout>
  );
}
