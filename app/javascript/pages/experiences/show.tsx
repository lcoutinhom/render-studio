import { Head, Link } from "@inertiajs/react";
import { lazy, Suspense, useState } from "react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { Status, useProcessingPoll } from "../../components/processing-status";
import { isActive } from "../../types/processing";
import type { Project } from "../../types/projects";
import type { Camera } from "../../types/rendering";
import type { RenderOutput } from "../../types/outputs";
import type { ProjectExperience } from "../../types/experiences";
const VrViewer = lazy(() => import("../../components/vr-model-viewer"));
const Panorama = lazy(() => import("../../components/panorama-viewer"));
export default function Experience({
  project,
  experience,
  outputs,
  cameras,
}: {
  project: Project;
  experience: ProjectExperience;
  outputs: RenderOutput[];
  cameras: Camera[];
}) {
  useProcessingPoll(isActive(experience.status), [
    "experience",
    "outputs",
    "cameras",
  ]);
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const active = outputs.find((output) => output.id === selected) ?? outputs[0];
  const index = active
    ? outputs.findIndex((output) => output.id === active.id)
    : 0;
  return (
    <AppLayout
      title={
        experience.kind === "vr"
          ? "Passeio VR do projeto"
          : "Tour 360° do projeto"
      }
      breadcrumbs={[
        { label: "Projetos", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}?tab=experiences` },
      ]}
      actions={
        <Button variant="outline" asChild>
          <Link href={`/render_batches/${experience.batch_id}`}>
            Acompanhar processamento
          </Link>
        </Button>
      }
    >
      <Head title="Passeio do projeto" />
      <section className="ta-panel p-5 space-y-3">
        <h2 className="font-semibold">{project.name}</h2>
        <p className="text-sm text-muted-foreground">
          {experience.file_name} · revisão {experience.revision}
        </p>
        <Status status={experience.status} progress={experience.progress} />
        {experience.update_available && (
          <p
            role="status"
            className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-foreground"
          >
            Atualização disponível. Este passeio continua usando sua revisão
            original. Gere um novo no projeto para usar o arquivo principal
            atual.
          </p>
        )}
      </section>
      {active ? (
        <section className="ta-panel p-5 space-y-4">
          <Button onClick={() => setOpened((value) => !value)}>
            {opened ? "Fechar passeio" : "Abrir passeio"}
          </Button>
          {opened && (
            <Suspense fallback={<p role="status">Preparando passeio…</p>}>
              {experience.kind === "vr" ? (
                <VrViewer
                  url={active.download_url}
                  initialCamera={cameras[0]}
                  entryPoints={cameras}
                  navigation={
                    typeof active.metadata.navigation === "string"
                      ? active.metadata.navigation
                      : "teleport"
                  }
                />
              ) : (
                <>
                  <label className="block text-sm">
                    Ponto do tour
                    <select
                      className="mt-2 w-full rounded-lg border bg-background p-3"
                      value={active.id}
                      onChange={(event) =>
                        setSelected(Number(event.target.value))
                      }
                    >
                      {outputs.map((output) => (
                        <option key={output.id} value={output.id}>
                          {output.environment_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Panorama
                    key={active.id}
                    url={active.preview_url ?? active.download_url}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      disabled={index === 0}
                      onClick={() => setSelected(outputs[index - 1].id)}
                    >
                      Ponto anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {index + 1} / {outputs.length}
                    </span>
                    <Button
                      variant="outline"
                      disabled={index === outputs.length - 1}
                      onClick={() => setSelected(outputs[index + 1].id)}
                    >
                      Próximo ponto
                    </Button>
                  </div>
                </>
              )}
            </Suspense>
          )}
          <Button variant="outline" asChild>
            <a href={active.download_url}>
              Baixar{" "}
              {experience.kind === "vr"
                ? "modelo completo"
                : "panorama deste ponto"}
            </a>
          </Button>
        </section>
      ) : (
        <p className="ta-panel p-6 text-sm text-muted-foreground">
          Os arquivos aparecerão aqui após a conclusão das tarefas. Consulte o
          processamento para acompanhar ou repetir falhas.
        </p>
      )}
    </AppLayout>
  );
}
