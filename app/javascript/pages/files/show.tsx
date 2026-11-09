import { renderReferences } from "../../lib/render-reference";
import { Head, Link, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { ModelPreview } from "../../components/model-preview";
import { FileUpload } from "../../components/file-upload";
import { ProjectConfigEditor } from "../../components/project-config-editor";
import { ProjectOutputs } from "../../components/project-outputs";
import { ConfirmAction } from "../../components/confirm-action";
import { Download, History, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import type {
  Project,
  ModelVersion,
  RecoveredCamera,
} from "../../types/projects";
import type { Schema, Settings, Preset } from "../../types/rendering";
import type { RenderOutput } from "../../types/outputs";
type Choice = { key: string; name: string; camera?: RecoveredCamera };
type FilePageProps = {
  project: Project;
  file: { id: number; name: string };
  version: ModelVersion;
  revisions: ModelVersion[];
  schema: Schema;
  settings: Settings;
  presets: Preset[];
  gemini_enabled: boolean;
  gemini_render_enabled: boolean;
  local_ai_enabled: boolean;
  default_render_engine: string;
  render_engine_label: string;
  blender_render_enabled: boolean;
  submission_key: string;
  outputs: RenderOutput[];
  outputs_total: number;
  outputs_page: number;
};
export default function FilePage(props: FilePageProps) {
  return (
    <FileWorkspace key={`${props.file.id}:${props.version.id}`} {...props} />
  );
}
function FileWorkspace(props: FilePageProps) {
  const {
    project,
    file,
    version,
    revisions,
    schema,
    presets,
    gemini_enabled,
    outputs,
  } = props;
  const base = `/projects/${project.id}/files/${file.id}`;
  const [preparing, setPreparing] = useState(false);
  const [referenceError, setReferenceError] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [tab, setTab] = useState<"prepare" | "results">("prepare");
  const [manageOpen, setManageOpen] = useState(false);
  const form = useForm({
    revision_id: version.id,
    choices: [] as Choice[],
    settings: props.settings,
    submission_key: props.submission_key,
    adapter: props.default_render_engine,
    custom_prompt: "",
    reference_images: {} as Record<string, string>,
  });
  const isAiEngine = ["gemini", "comfyui"].includes(form.data.adapter);
  const engineEnabled = form.data.adapter === "comfyui" ? props.local_ai_enabled
    : form.data.adapter === "gemini" ? props.gemini_render_enabled
    : form.data.adapter === "blender" ? props.blender_render_enabled : true;
  const automatic = version.metadata?.scenes?.length
    ? version.metadata.scenes
    : [{ id: "model", name: "Modelo completo" }];
  return (
    <AppLayout
      title={file.name}
      description={`Revisão ${version.file_revision ?? 1} · Escolha as fotografias e descreva o resultado.`}
      breadcrumbs={[
        { label: "Projetos", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
      ]}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="size-4" /> Ações do arquivo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {version.file && (
              <DropdownMenuItem asChild>
                <a href={version.file.url}>
                  <Download />
                  Baixar original
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setManageOpen(true)}>
              <History />
              Revisões e novo upload
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <Head title={file.name} />
      <div
        role="tablist"
        aria-label="Arquivo e resultados"
        className="flex gap-5 border-b"
      >
        {(
          [
            ["prepare", "Preparar renderização"],
            ["results", `Galeria · ${props.outputs_total}`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`-mb-px h-10 border-b-2 px-0.5 text-[13px] font-medium transition-colors ${tab === value ? "border-brand-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="space-y-5">
          <DialogTitle>Gerenciar arquivo</DialogTitle>
          <DialogDescription>
            Selecione uma revisão ou envie uma atualização do modelo.
          </DialogDescription>
          <label className="block space-y-2 text-sm">
            Revisão do arquivo
            <select
              className="w-full rounded-lg border bg-background p-3"
              value={version.id}
              onChange={(e) =>
                router.get(
                  base,
                  { revision_id: e.target.value },
                  { preserveState: false },
                )
              }
            >
              {revisions.map((revision) => (
                <option key={revision.id} value={revision.id}>
                  Revisão {revision.file_revision} · {revision.file?.name}
                </option>
              ))}
            </select>
          </label>
          <FileUpload
            url={`${base}/revision`}
            revision
            disabled={project.status !== "active"}
          />
          <ConfirmAction
            url={base}
            label="Arquivar arquivo"
            description="Originais, cenas e resultados anteriores serão preservados."
          />
        </DialogContent>
      </Dialog>
      <div
        hidden={tab !== "prepare"}
        className={tab === "prepare" ? "ta-workspace" : undefined}
      >
        <section className="ta-panel">
          <div className="ta-panel-heading">
            <h2 className="font-semibold">Modelo e fotografias</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Marque os enquadramentos que deseja renderizar.
            </p>
          </div>
          <div className="ta-panel-body space-y-4">
            <ModelPreview
              key={version.id}
              version={version}
              onCameraCapture={(view) => {
                const key = `manual:${view.scene_id ?? "0"}:${crypto.randomUUID()}`;
                const name = `Vista manual ${choices.length + 1}`;
                setChoices((previous) => [
                  ...previous,
                  {
                    key,
                    name,
                    camera: { ...view, name, recovered_view_key: key },
                  },
                ]);
              }}
              selectedSceneKeys={choices
                .filter(
                  (choice) =>
                    choice.camera && !choice.key.startsWith("manual:"),
                )
                .map((choice) => choice.key)}
              onScenesChange={(cameras) =>
                setChoices((previous) => [
                  ...previous.filter(
                    (choice) =>
                      !choice.camera || choice.key.startsWith("manual:"),
                  ),
                  ...cameras.map((camera) => ({
                    key: camera.recovered_view_key,
                    name: camera.name,
                    camera,
                  })),
                ])
              }
            />
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Renderizar uma cena inteira com câmera automática
              </summary>
              <div className="mt-3 space-y-3">
                {automatic.map((scene) => (
                  <label
                    key={scene.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      aria-label={`Selecionar cena inteira ${scene.name}`}
                      checked={choices.some(
                        (choice) => choice.key === `scene:${scene.id}`,
                      )}
                      onChange={(e) =>
                        setChoices((previous) =>
                          e.target.checked
                            ? [
                                ...previous,
                                { key: `scene:${scene.id}`, name: scene.name },
                              ]
                            : previous.filter(
                                (choice) => choice.key !== `scene:${scene.id}`,
                              ),
                        )
                      }
                    />
                    {scene.name} · câmera automática
                  </label>
                ))}
              </div>
            </details>
            <p className="text-sm font-medium">
              {choices.length} cena(s)/fotografia(s) selecionada(s)
            </p>
            <ul className="space-y-2">
              {choices.map((choice) => (
                <li
                  className="flex flex-wrap items-center gap-3 text-sm"
                  key={choice.key}
                >
                  {choice.name}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setChoices((previous) =>
                        previous.filter((item) => item.key !== choice.key),
                      )
                    }
                  >
                    Remover {choice.name}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="ta-panel">
          <div className="ta-panel-heading">
            <h2 className="font-semibold">Sua renderização</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {form.data.adapter === "comfyui" ? "As fotografias serão geradas por IA local. " : ""}
              O prompt padrão já está incluído. Você pode renderizar sem escrever nada.
              {form.data.adapter === "comfyui" && <span className="mt-2 block">Revise os materiais e os detalhes do resultado: a IA pode apresentar variações em relação ao projeto original.</span>}
            </p>
          </div>
          <div className="ta-panel-body space-y-5">
            {isAiEngine && (
              <div className="space-y-2">
                <label htmlFor="custom-prompt" className="text-sm font-medium">Prompt personalizado (opcional)</label>
                <textarea id="custom-prompt" rows={5} maxLength={2000}
                  className="w-full rounded-lg border bg-background p-3"
                  value={form.data.custom_prompt}
                  onChange={(event) => form.setData("custom_prompt", event.target.value)}
                  placeholder="Ex.: Quero iluminação natural de fim de tarde, sombras suaves e um ambiente aconchegante, mantendo todos os materiais originais."
                  aria-describedby="custom-prompt-help" />
                <p id="custom-prompt-help" className="text-sm text-muted-foreground">Descreva como deseja a iluminação e o estilo fotográfico. A geometria, os materiais e o layout do projeto serão preservados.</p>
              </div>
            )}
            {props.blender_render_enabled && form.data.adapter === "blender" && <>
            <ProjectConfigEditor
              schema={schema}
              value={form.data.settings}
              onChange={(settings) => form.setData("settings", settings)}
              presets={presets}
              projectId={project.id}
              gemini={gemini_enabled}
              sceneOnly
            />
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Salvar estas preferências
              </summary>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.put(
                      `/projects/${project.id}/configuration`,
                      { settings: form.data.settings },
                      { preserveScroll: true },
                    )
                  }
                >
                  Salvar como padrão deste projeto
                </Button>
              </div>
            </details>
            </>}
          </div>
        </section>
        <section className="ta-render-footer ta-panel flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-sm">
            Somente as {choices.length} cenas/fotografias selecionadas serão
            enviadas. O projeto original será usado como referência, com prioridade
            para a geometria, os materiais e o enquadramento.
          </p>
          {props.blender_render_enabled && <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Opções de processamento
            </summary>
            <label className="mt-3 block text-sm">
              Executor
              <select
                aria-label="Executor da renderização"
                className="mt-2 block w-full min-w-0 max-w-full rounded-lg border bg-background p-2"
                value={form.data.adapter}
                onChange={(e) => form.setData((data) => ({ ...data, adapter: e.target.value, custom_prompt: "", submission_key: crypto.randomUUID() }))}
              >
                {props.local_ai_enabled && <option value="comfyui">IA local — gerar fotografias</option>}
                {props.gemini_render_enabled && <option value="gemini">Gemini — fotografia a partir do GLB</option>}
                {props.blender_render_enabled && <option value="blender">Blender — gerar arquivos reais</option>}
                <option value="simulation">
                  Simulação — testar fluxo sem gerar arquivos
                </option>
              </select>
            </label>
          </details>}
          {version.format === "dae" && (
            <p role="status">
              DAE é preservado para download. Converta para GLB para gerar
              fotografias do projeto.
            </p>
          )}
          {referenceError && <p role="alert">{referenceError}</p>}
          {!engineEnabled && <p role="status">A geração de imagens está desativada.</p>}
          <Button
            disabled={
              preparing ||
              !engineEnabled ||
              (isAiEngine && version.format !== "glb") ||
              form.processing ||
              !choices.length ||
              choices.length > 100 ||
              project.status !== "active" ||
              (form.data.adapter === "blender" && version.format === "dae")
            }
            onClick={async () => {
              setPreparing(true);
              setReferenceError("");
              try {
                const reference_images = isAiEngine ? await renderReferences(version.file!.url, choices) : {};
                form.transform((data) => ({ ...data, choices, reference_images }));
                form.post(`${base}/render_selected`);
              } catch (error) {
                setReferenceError(error instanceof Error ? error.message : "Não foi possível gerar a referência.");
              } finally { setPreparing(false); }
            }}
          >
            {preparing ? "Preparando referências…" : form.processing ? "Enviando…" : "Renderizar"}
          </Button>
        </section>
      </div>
      <section hidden={tab !== "results"} className="space-y-4">
        <h2 className="font-semibold">
          Resultados deste arquivo (todas as revisões)
        </h2>
        <ProjectOutputs
          outputs={outputs}
          total={props.outputs_total}
          page={props.outputs_page}
          href={`${base}?revision_id=${version.id}`}
        />
      </section>
    </AppLayout>
  );
}
