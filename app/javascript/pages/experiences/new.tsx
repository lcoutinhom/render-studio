import { Head, Link, useForm } from "@inertiajs/react";
import { useState } from "react";
import { AppLayout } from "../../layouts/app-layout";
import { ModelPreview } from "../../components/model-preview";
import { Button } from "../../components/ui/button";
import type {
  Project,
  ModelVersion,
  RecoveredCamera,
} from "../../types/projects";
export default function NewExperience({
  project,
  file,
  version,
  kind,
  submission_key,
}: {
  project: Project;
  file: { id: number; name: string };
  version: ModelVersion;
  kind: "vr" | "tour";
  submission_key: string;
}) {
  const [cameras, setCameras] = useState<RecoveredCamera[]>([]);
  const form = useForm({
    kind,
    revision_id: version.id,
    submission_key,
    choices: [] as { key: string; name: string; camera: RecoveredCamera }[],
  });
  return (
    <AppLayout
      title={kind === "vr" ? "Preparar passeio VR" : "Preparar tour 360°"}
      breadcrumbs={[
        { label: "Projetos", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}?tab=experiences` },
      ]}
    >
      <Head title="Novo passeio" />
      <section className="ta-panel p-5 space-y-3">
        <h2 className="font-semibold">
          {file.name} · revisão {version.file_revision}
        </h2>
        <p className="text-sm text-muted-foreground">
          {kind === "vr"
            ? "Será gerado um único modelo completo. Marque as fotografias que serão os pontos de entrada do passeio; a primeira será a posição inicial."
            : "Marque as fotografias que serão os pontos do tour. Cada uma gera um panorama 360°; o visitante navega entre eles pelos botões do passeio."}{" "}
          A última revisão do arquivo principal é conferida novamente no envio.
        </p>
      </section>
      <ModelPreview
        version={version}
        selectedSceneKeys={cameras.map((c) => c.recovered_view_key)}
        onScenesChange={(selected) =>
          setCameras((previous) => [
            ...previous.filter((camera) =>
              camera.recovered_view_key.startsWith("manual:"),
            ),
            ...selected,
          ])
        }
        onCameraCapture={(view) => {
          const name = `Ponto ${cameras.length + 1}`;
          setCameras((previous) => [
            ...previous,
            {
              ...view,
              name,
              recovered_view_key: `manual:${view.scene_id ?? "0"}:${crypto.randomUUID()}`,
            },
          ]);
        }}
      />
      <div className="ta-panel p-5 space-y-3">
        <p className="text-sm">{cameras.length} ponto(s) selecionado(s)</p>
        <ul className="flex flex-wrap gap-2">
          {cameras.map((camera) => (
            <li key={camera.recovered_view_key}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setCameras((previous) =>
                    previous.filter(
                      (c) => c.recovered_view_key !== camera.recovered_view_key,
                    ),
                  )
                }
              >
                {camera.name} ×
              </Button>
            </li>
          ))}
        </ul>
        {Object.values(form.errors).map((error, index) => (
          <p key={index} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ))}
        <Button
          disabled={
            !cameras.length ||
            cameras.length > 100 ||
            form.processing ||
            project.status !== "active"
          }
          onClick={() => {
            form.transform((data) => ({
              ...data,
              choices: cameras.map((camera) => ({
                key: camera.recovered_view_key,
                name: camera.name,
                camera,
              })),
            }));
            form.post(`/projects/${project.id}/experiences`);
          }}
        >
          {form.processing
            ? "Enviando…"
            : kind === "vr"
              ? "Gerar passeio VR do projeto"
              : "Gerar tour 360° do projeto"}
        </Button>
      </div>
    </AppLayout>
  );
}
