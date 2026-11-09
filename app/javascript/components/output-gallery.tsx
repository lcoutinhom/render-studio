import { Link } from "@inertiajs/react";
import { useState } from "react";
import { Box, Download, Film, Image, Orbit } from "lucide-react";
import { EmptyState } from "./ui/empty-state";
import { Badge } from "./ui/badge";
import { fileSize, kindLabels, type RenderOutput } from "../types/outputs";

const kindIcons = { image: Image, video: Film, panorama: Orbit, vr: Box };

/* Rendered media are the protagonists: a visual grid with the essentials beneath each frame. */
export function OutputGallery({ outputs }: { outputs: RenderOutput[] }) {
  if (!outputs.length)
    return (
      <div className="rounded-lg border bg-card shadow-card">
        <EmptyState
          icon={Image}
          title="Nenhum arquivo de resultado para esta seleção."
          description="Simulações não produzem arquivos."
        />
      </div>
    );
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {outputs.map((output) => (
        <li
          key={output.id}
          className="group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-colors hover:border-gray-300 dark:hover:border-gray-700"
        >
          <OutputThumbnail output={output} />
          <div className="flex flex-1 flex-col gap-1 p-3.5">
            <Link
              href={`/outputs/${output.id}`}
              aria-label={`Visualizar ${output.filename}`}
              className="break-all text-sm font-medium leading-5 after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring focus-visible:after:rounded-lg"
            >
              {output.filename}
            </Link>
            <p className="break-words text-[13px] text-muted-foreground">
              {output.project_name} · {output.environment_name}
            </p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              <p className="text-xs tabular-nums text-muted-foreground">
                v{output.version_number} · tentativa {output.attempt} ·{" "}
                {fileSize(output.byte_size)}
              </p>
              <a
                href={output.download_url}
                aria-label={`Baixar arquivo ${output.filename}`}
                title="Baixar arquivo"
                className="relative z-10 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Download className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function OutputThumbnail({ output }: { output: RenderOutput }) {
  const [failed, setFailed] = useState(false);
  const Icon = kindIcons[output.kind] ?? Image;
  return (
    <div className="relative aspect-[4/3] overflow-hidden border-b bg-muted">
      {output.preview_url && output.content_type.startsWith("image/") && !failed ? (
        <img
          loading="lazy"
          src={output.preview_url}
          alt=""
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-[var(--dur-slow)] group-hover:scale-[1.02]"
        />
      ) : (
        <span
          className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground"
          title={failed ? "Prévia indisponível" : kindLabels[output.kind]}
        >
          <Icon className="size-6" aria-hidden="true" />
          {failed && <span className="text-xs">Prévia indisponível</span>}
        </span>
      )}
      <Badge className="absolute left-2.5 top-2.5 border-transparent bg-card/90 text-foreground shadow-xs backdrop-blur">
        <Icon aria-hidden="true" className="size-3" />
        {kindLabels[output.kind]}
      </Badge>
    </div>
  );
}
