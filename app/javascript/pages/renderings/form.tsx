import { GeminiRenderAssistant } from "../../components/gemini-render-assistant";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Camera as CameraIcon,
  Image,
  Sun,
  Sparkles,
  SlidersHorizontal,
  Play,
  Monitor,
  Info,
} from "lucide-react";
import { CameraTips } from "../../components/camera-tips";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import { Field, selectClass } from "../../components/project-fields";
import {
  SettingsEditor,
  VideoPathEditor,
} from "../../components/settings-editor";
import { ConfigurationSummary } from "../../components/configuration-summary";
import type { Project, Environment, ModelVersion } from "../../types/projects";
import type {
  Schema,
  Settings,
  Preset,
  Camera,
  Mapping,
  Snapshot,
} from "../../types/rendering";
import type { SharedProps } from "../../types";
type Initial = {
  id: number;
  name: string;
  mode: string;
  settings: Settings;
  camera_ids: number[];
  environment_ids: number[];
  render_preset_id: number | null;
};
type Profile = {
  id: string;
  name: string;
  description: string;
  effort: string;
  settings: Settings;
};
type Props = {
  projects: Project[];
  project: Project | null;
  versions: ModelVersion[];
  selected_version: ModelVersion | null;
  environments: (Environment & {
    eligible: boolean;
    association_settings?: Settings;
  })[];
  presets: Preset[];
  cameras: Camera[];
  materials: Mapping[];
  schema: Schema;
  initial: Initial | null;
  selected_environment_ids: number[];
  initial_warning?: string | null;
  guided_profiles: Profile[];
  submission_key: string;
  gemini_enabled: boolean;
  blender_render_enabled: boolean;
};
const steps = [
  {
    title: "Escolha o ambiente",
    hint: "Projeto, modelo e espaços",
    icon: Image,
  },
  {
    title: "Encontre o melhor ângulo",
    hint: "De onde vamos olhar?",
    icon: CameraIcon,
  },
  { title: "Dê o seu toque", hint: "Qualidade e iluminação", icon: Sparkles },
  {
    title: "Confira e renderize",
    hint: "Tudo pronto para começar",
    icon: Check,
  },
];
const lights = [
  {
    id: "day",
    name: "Luz do dia",
    description: "Uma aparência clara e natural.",
    temperature: 6500,
  },
  {
    id: "sunset",
    name: "Fim de tarde",
    description: "Luz quente e acolhedora.",
    temperature: 3500,
  },
  {
    id: "night",
    name: "Noturna",
    description: "Um clima mais intimista.",
    temperature: 4500,
  },
  {
    id: "studio",
    name: "Estúdio",
    description: "Luz neutra para destacar o projeto.",
    temperature: 5500,
  },
];
export default function Form({
  projects,
  project,
  versions,
  selected_version,
  environments,
  presets,
  cameras,
  materials,
  schema,
  initial,
  selected_environment_ids,
  initial_warning,
  guided_profiles,
  submission_key,
  gemini_enabled,
  blender_render_enabled,
}: Props) {
  const { csrf_token } = usePage<SharedProps>().props;
  const [step, setStep] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [tab, setTab] = useState("general");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (step > 0)
      document
        .getElementById("wizard-panel")
        ?.scrollIntoView({ block: "start" });
  }, [step]);
  const eligible = environments.filter((env) => env.eligible);
  const chosen = (
    initial?.environment_ids ??
    (selected_environment_ids.length
      ? selected_environment_ids
      : eligible.length === 1
        ? [eligible[0].id]
        : [])
  ).filter((id) => eligible.some((env) => env.id === id));
  const firstCameras = (ids: number[]) =>
    ids.flatMap((id) => {
      const camera = cameras.find(
        (item) => item.environment_id === id && item.available,
      );
      return camera ? [camera.id] : [];
    });
  const form = useForm({
    configuration: {
      project_id: project?.id ?? null,
      project_version_id: selected_version?.id ?? null,
      name:
        initial?.name ??
        (project ? `${project.name.slice(0, 120)} — imagem` : ""),
      mode: initial?.mode ?? "simple",
      environment_ids: chosen,
      render_preset_id: initial?.render_preset_id?.toString() ?? "",
      settings: initial?.settings ?? {
        ...guided_profiles[0].settings,
        image_count: 1,
        image_format: "png",
        video_enabled: false,
        panorama_enabled: false,
        vr_enabled: false,
      },
      camera_ids: initial?.camera_ids ?? firstCameras(chosen),
      previous_configuration_id: initial?.id ?? null,
      submission_key,
      adapter: blender_render_enabled ? "blender" : "simulation",
      start_rendering: false,
    },
  });
  const data = form.data.configuration;
  const selected = environments.filter((env) =>
    data.environment_ids.includes(env.id),
  );
  const base = {
    ...schema.defaults,
    ...presets.find((preset) => String(preset.id) === data.render_preset_id)
      ?.settings,
    ...project?.settings,
    ...selected[0]?.settings,
    ...selected[0]?.association_settings,
  };
  const effective = { ...base, ...data.settings };
  const profile = guided_profiles.find((item) =>
    Object.entries(item.settings).every(
      ([key, value]) => effective[key] === value,
    ),
  );
  const change = (patch: Partial<typeof data>) => {
    if (Object.keys(patch).some((key) => !["name", "adapter"].includes(key)))
      setSnapshot(null);
    setError("");
    form.setData("configuration", {
      ...data,
      ...patch,
      submission_key: crypto.randomUUID(),
    });
  };
  const updateSettings = (patch: Settings) =>
    change({ settings: { ...data.settings, ...patch } });
  const context = (projectId: string, versionId?: string) =>
    router.get(
      initial ? `/renderings/${initial.id}/edit` : "/renderings/new",
      {
        project_id: projectId,
        ...(versionId ? { version_id: versionId } : {}),
      },
      { preserveState: false },
    );
  const review = async () => {
    const count = Number(effective.image_count);
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      setError("Escolha uma quantidade entre 1 e 100 imagens por câmera.");
      return false;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/renderings/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-Token": csrf_token,
        },
        body: JSON.stringify({ configuration: data }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          result.error ??
            "Não conseguimos conferir suas escolhas. Revise os ambientes e tente de novo.",
        );
      setSnapshot(result.snapshot);
      return true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível revisar agora.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  };
  const submit = (start: boolean) => {
    if (!snapshot || form.processing) return;
    form.transform((values) => ({
      configuration: { ...values.configuration, start_rendering: start },
    }));
    form.post("/renderings");
  };
  if (!project)
    return (
      <AppLayout title="Vamos criar seu primeiro render">
        <Head title="Novo render" />
        <Card>
          <CardContent className="space-y-3 py-14 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-lg border bg-muted/50 text-muted-foreground">
              <Image className="size-5" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold">
              Tudo começa com um projeto
            </h2>
            <p className="text-sm text-muted-foreground">
              Cadastre seu projeto e envie o modelo 3D. Depois vamos preparar as
              imagens juntos.
            </p>
            <Button asChild>
              <Link href="/projects/new">Criar meu primeiro projeto</Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  const canContinue = !!selected_version && data.environment_ids.length > 0;
  return (
    <AppLayout
      title={
        initial
          ? "Preparar uma nova versão do render"
          : "Vamos criar seu próximo render"
      }
      description="Você escolhe o espaço, o ângulo e o resultado que quer. Nós cuidamos de preparar o render."
      breadcrumbs={[{ label: "Configurações", href: "/renderings" }]}
    >
      <Head title="Novo render" />
      {initial_warning && (
        <p
          role="status"
          className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm text-warning"
        >
          {initial_warning}
        </p>
      )}
      {error && (
        <p
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive-soft p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="space-y-5 xl:sticky xl:top-20">
          <Card>
            <CardContent className="p-3 sm:p-3">
              <ol
                aria-label="Etapas da configuração"
                className="grid grid-cols-2 gap-1 xl:grid-cols-1"
              >
                {steps.map((item, index) => (
                  <li key={item.title}>
                    <button
                      type="button"
                      className="wizard-step"
                      aria-current={step === index ? "step" : undefined}
                      disabled={index > step}
                      onClick={() => setStep(index)}
                    >
                      <span className="wizard-number">
                        {index < step ? (
                          <Check className="size-4" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span>
                        <strong className="block text-xs font-medium sm:text-sm">
                          {item.title}
                        </strong>
                        <span className="mt-1 hidden text-xs text-muted-foreground xl:block">
                          {item.hint}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <div className="hidden rounded-lg border border-dashed p-5 text-xs leading-relaxed text-muted-foreground xl:block">
            <p className="mb-2 font-semibold text-foreground">
              Sua escolha até aqui
            </p>
            <p>{project.name}</p>
            <p>
              Modelo: versão {selected_version?.version_number ?? "não enviada"}
            </p>
            <p className="mt-2">
              {selected.length} ambiente(s) ·{" "}
              {profile?.name ?? "Qualidade personalizada"}
            </p>
            <p>
              {Number(effective.resolution_width)} ×{" "}
              {Number(effective.resolution_height)} px
            </p>
          </div>
        </aside>
        <Card id="wizard-panel" className="min-w-0 scroll-mt-24">
          <CardHeader>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.06em] text-accent-foreground">
                ETAPA {step + 1} DE 4
              </p>
              <CardTitle>{steps[step].title}</CardTitle>
            </div>
            {step === 2 && <Sparkles className="size-5 text-accent-foreground" />}
          </CardHeader>
          <CardContent className="space-y-7">
            {step === 0 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="render-project"
                    label="Em qual projeto vamos trabalhar?"
                  >
                    <select
                      id="render-project"
                      className={selectClass}
                      value={project.id}
                      onChange={(event) => context(event.target.value)}
                    >
                      {projects.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    id="render-version"
                    label="Qual modelo você quer usar?"
                  >
                    <select
                      id="render-version"
                      className={selectClass}
                      value={selected_version?.id ?? ""}
                      onChange={(event) =>
                        context(String(project.id), event.target.value)
                      }
                    >
                      {!versions.length && (
                        <option value="">Envie um modelo para começar</option>
                      )}
                      {versions.map((item) => (
                        <option key={item.id} value={item.id}>
                          Versão {item.version_number} ·{" "}
                          {item.description || item.file?.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {!versions.length && (
                  <p className="text-sm text-muted-foreground">
                    Ainda não há modelos neste projeto.{" "}
                    <Link
                      className="text-primary underline"
                      href={`/projects/${project.id}`}
                    >
                      Enviar o primeiro modelo
                    </Link>
                  </p>
                )}
                <div>
                  <h3 className="font-medium">
                    Quais espaços você quer mostrar?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Escolha um ou vários ambientes. Cada um terá seus próprios
                    resultados.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!eligible.length}
                    onClick={() =>
                      change({
                        environment_ids: eligible.map((env) => env.id),
                        camera_ids: firstCameras(eligible.map((env) => env.id)),
                      })
                    }
                  >
                    Selecionar todos
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      change({ environment_ids: [], camera_ids: [] })
                    }
                  >
                    Limpar seleção
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {environments.map((env) => (
                    <div
                      key={env.id}
                      className={`choice-card ${data.environment_ids.includes(env.id) ? "is-selected" : ""}`}
                    >
                      <label
                        className={`flex items-start gap-3 ${env.eligible ? "cursor-pointer" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4"
                          aria-label={`Configurar ${env.name}`}
                          disabled={!env.eligible}
                          checked={data.environment_ids.includes(env.id)}
                          onChange={(event) => {
                            const ids = event.target.checked
                              ? [...data.environment_ids, env.id]
                              : data.environment_ids.filter(
                                  (id) => id !== env.id,
                                );
                            change({
                              environment_ids: ids,
                              camera_ids: event.target.checked
                                ? [
                                    ...data.camera_ids,
                                    ...firstCameras([env.id]),
                                  ]
                                : data.camera_ids.filter((id) =>
                                    cameras.some(
                                      (camera) =>
                                        camera.id === id &&
                                        ids.includes(camera.environment_id),
                                    ),
                                  ),
                            });
                          }}
                        />
                        <span>
                          <strong className="block text-sm font-medium">
                            {env.name}
                          </strong>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {env.eligible
                              ? "Pronto para renderizar"
                              : "Precisa ser preparado para este modelo"}
                          </span>
                        </span>
                      </label>
                      {!env.eligible && (
                        <Link
                          href={`/projects/${project.id}/environments/${env.id}?version_id=${selected_version?.id ?? ""}&tab=associacao`}
                          className="mt-3 inline-block text-xs font-medium text-primary underline"
                        >
                          Preparar ambiente
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
                {!environments.length && (
                  <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    Crie os ambientes do projeto para organizar suas imagens.{" "}
                    <Link
                      className="text-primary underline"
                      href={`/projects/${project.id}/environments/new`}
                    >
                      Adicionar ambiente
                    </Link>
                  </p>
                )}
              </>
            )}
            {step === 1 && (
              <>
                <CameraTips compact />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A câmera define de onde vamos olhar para o ambiente. Para uma
                  imagem interna, prefira uma câmera dentro do espaço.
                </p>
                {selected.map((env) => {
                  const available = cameras.filter(
                    (camera) =>
                      camera.environment_id === env.id && camera.available,
                  );
                  const ids = data.camera_ids.filter((id) =>
                    available.some((camera) => camera.id === id),
                  );
                  return (
                    <section
                      key={env.id}
                      className="space-y-4 rounded-lg border p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-medium">{env.name}</h3>
                        <Link
                          className="text-xs font-medium text-primary underline"
                          href={`/projects/${project.id}/environments/${env.id}?version_id=${selected_version?.id}&tab=cameras`}
                        >
                          Gerenciar câmeras
                        </Link>
                      </div>
                      <label
                        className={`choice-card flex cursor-pointer items-start gap-3 ${!ids.length ? "is-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`camera-mode-${env.id}`}
                          className="mt-1 size-4"
                          checked={!ids.length}
                          aria-label={`Enquadramento automático de ${env.name}`}
                          onChange={() =>
                            change({
                              camera_ids: data.camera_ids.filter(
                                (id) =>
                                  !available.some((camera) => camera.id === id),
                              ),
                            })
                          }
                        />
                        <span>
                          <strong className="text-sm font-medium">
                            Vista geral automática
                          </strong>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Enquadra o ambiente por fora. Pode não mostrar o
                            interior de uma sala fechada.
                          </span>
                        </span>
                      </label>
                      {available.map((camera) => (
                        <label
                          key={camera.id}
                          className={`choice-card flex cursor-pointer items-center gap-3 ${ids.includes(camera.id) ? "is-selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="size-4"
                            aria-label={camera.name}
                            checked={ids.includes(camera.id)}
                            onChange={(event) =>
                              change({
                                camera_ids: event.target.checked
                                  ? [...data.camera_ids, camera.id]
                                  : data.camera_ids.filter(
                                      (id) => id !== camera.id,
                                    ),
                              })
                            }
                          />
                          <CameraIcon className="size-5 text-accent-foreground" />
                          <span className="text-sm font-medium">
                            {camera.name}
                          </span>
                        </label>
                      ))}
                      {!available.length && (
                        <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                          <Info className="size-4 shrink-0" />
                          Este ambiente ainda não tem câmeras. Você pode usar a
                          vista geral ou cadastrar um ângulo antes de continuar.
                        </p>
                      )}
                    </section>
                  );
                })}
              </>
            )}
            {step === 2 && (
              <>
                <GeminiRenderAssistant
                  enabled={gemini_enabled}
                  configuration={data}
                  csrf={csrf_token}
                  schema={schema}
                  onApply={(settings) => {
                    form.setData("configuration", {
                      ...data,
                      settings: { ...data.settings, ...settings },
                    });
                    setSnapshot(null);
                  }}
                />
                <div>
                  <h3 className="font-medium">
                    Para que você vai usar esta imagem?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Comece com um teste para conferir o ângulo. Depois refine
                    para apresentar.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {guided_profiles.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={profile?.id === item.id}
                      className={`choice-card ${profile?.id === item.id ? "is-selected" : ""}`}
                      onClick={() => updateSettings(item.settings)}
                    >
                      <span className="mb-4 inline-flex rounded-lg border bg-muted/50 p-3 text-accent-foreground">
                        {item.id === "preview" ? (
                          <Play className="size-5" />
                        ) : item.id === "balanced" ? (
                          <Image className="size-5" />
                        ) : (
                          <Sparkles className="size-5" />
                        )}
                      </span>
                      <strong className="block text-sm">{item.name}</strong>
                      <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </span>
                      <span className="mt-4 block text-xs font-medium">
                        {Number(item.settings.resolution_width)} ×{" "}
                        {Number(item.settings.resolution_height)} px
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.effort}
                      </span>
                    </button>
                  ))}
                </div>
                <div>
                  <h3 className="font-medium">
                    Qual clima combina com o projeto?
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {lights.map((light) => (
                      <button
                        key={light.id}
                        type="button"
                        aria-pressed={effective.lighting === light.id}
                        className={`choice-card flex gap-3 ${effective.lighting === light.id ? "is-selected" : ""}`}
                        onClick={() =>
                          updateSettings({
                            lighting: light.id,
                            temperature: light.temperature,
                          })
                        }
                      >
                        <Sun className="mt-0.5 size-5 shrink-0 text-accent-foreground" />
                        <span>
                          <strong className="text-sm">{light.name}</strong>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {light.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="image-count"
                    label="Quantas imagens por câmera?"
                    type="number"
                    min={1}
                    max={100}
                    value={Number(effective.image_count)}
                    onChange={(event) =>
                      updateSettings({
                        image_count: Number(event.target.value),
                      })
                    }
                  />
                  <Field id="image-format" label="Formato da imagem">
                    <select
                      id="image-format"
                      className={selectClass}
                      value={String(effective.image_format)}
                      onChange={(event) =>
                        updateSettings({ image_format: event.target.value })
                      }
                    >
                      <option value="png">
                        PNG — para apresentar com nitidez
                      </option>
                      <option value="jpeg">JPEG — arquivo mais leve</option>
                      <option value="exr">EXR — para pós-produção</option>
                    </select>
                  </Field>
                </div>
                <details className="rounded-lg border p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Também quero vídeo, panorama ou modelo 3D
                  </summary>
                  <div className="mt-4 space-y-4">
                    {[
                      [
                        "video_enabled",
                        "Vídeo do ambiente",
                        "Gera vários quadros; pode exigir bastante tempo.",
                      ],
                      [
                        "panorama_enabled",
                        "Panorama 360°",
                        "Uma imagem para olhar ao redor do ambiente.",
                      ],
                      [
                        "vr_enabled",
                        "Modelo 3D para download",
                        "Exporta GLB; não cria uma experiência de realidade virtual navegável.",
                      ],
                    ].map(([key, title, hint]) => (
                      <label
                        key={key}
                        className="flex items-start gap-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4"
                          checked={Boolean(effective[key])}
                          onChange={(event) =>
                            updateSettings({ [key]: event.target.checked })
                          }
                        />
                        <span>
                          <strong className="font-medium">{title}</strong>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {hint}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </details>
                <details
                  open={advanced}
                  onToggle={(event) => setAdvanced(event.currentTarget.open)}
                  className="rounded-lg border bg-muted/20 p-4"
                >
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <SlidersHorizontal className="size-4" />
                    Ajustes avançados (opcional)
                  </summary>
                  <p className="mb-4 mt-3 text-xs text-muted-foreground">
                    Você não precisa alterar estes campos para criar um render.
                    Mudanças aqui podem personalizar a qualidade escolhida
                    acima.
                  </p>
                  <Field id="preset" label="Usar um estilo salvo">
                    <select
                      id="preset"
                      className={selectClass}
                      value={data.render_preset_id}
                      onChange={(event) =>
                        change({ render_preset_id: event.target.value })
                      }
                    >
                      <option value="">Sem estilo adicional</option>
                      {presets.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Tabs value={tab} onValueChange={setTab} className="mt-5">
                    <div className="overflow-x-auto">
                      <TabsList className="min-w-max">
                        {Object.entries({
                          general: "Imagem",
                          lighting: "Luz",
                          images: "Saídas",
                          video: "Vídeo",
                          panorama: "Panorama",
                          vr: "Modelo VR / WebXR",
                        }).map(([key, label]) => (
                          <TabsTrigger key={key} value={key}>
                            {label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                    <TabsContent value={tab}>
                      <SettingsEditor
                        schema={schema}
                        value={data.settings}
                        base={base}
                        section={tab}
                        onChange={(settings) => change({ settings })}
                      />
                      {tab === "video" && (
                        <VideoPathEditor
                          value={data.settings.video_path ?? base.video_path}
                          onChange={(points) =>
                            updateSettings({ video_path: points })
                          }
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                  <p className="mt-5 text-xs text-muted-foreground">
                    {materials.length
                      ? `${materials.length} mapeamento(s) de material disponível(is) para esta versão.`
                      : "Os materiais originais serão preservados."}{" "}
                    <Link
                      className="text-primary underline"
                      href={`/projects/${project.id}?version_id=${selected_version?.id}&tab=materiais`}
                    >
                      Gerenciar materiais
                    </Link>
                  </p>
                </details>
              </>
            )}
            {step === 3 && snapshot && (
              <>
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-5 text-sm dark:border-brand-900 dark:bg-brand-950">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Check className="size-5 text-accent-foreground" />
                    Suas escolhas estão prontas
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    Confira o resumo. Você pode voltar e ajustar antes de
                    enviar.
                  </p>
                </div>
                <Field
                  id="configuration-name"
                  label="Dê um nome para encontrar depois"
                  value={data.name}
                  maxLength={160}
                  required
                  onChange={(event) => change({ name: event.target.value })}
                />
                {snapshot.environments.map((env) => (
                  <div
                    key={env.environment_id}
                    className="rounded-lg border p-5"
                  >
                    <h3 className="font-medium">{env.name}</h3>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Modelo
                        </dt>
                        <dd className="mt-1">
                          Versão {snapshot.version_number}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Câmeras
                        </dt>
                        <dd className="mt-1">
                          {env.cameras
                            .map((camera) => camera.name)
                            .join(", ") || "Vista geral automática"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Imagem
                        </dt>
                        <dd className="mt-1">
                          {Number(env.effective_settings.resolution_width)} ×{" "}
                          {Number(env.effective_settings.resolution_height)} px
                          ·{" "}
                          {String(
                            env.effective_settings.image_format,
                          ).toUpperCase()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Quantidade
                        </dt>
                        <dd className="mt-1">
                          {Number(env.effective_settings.image_count)} por
                          câmera
                          {env.effective_settings.video_enabled
                            ? ` · vídeo com ${Math.round(Number(env.effective_settings.video_duration) * Number(env.effective_settings.video_fps))} quadros`
                            : ""}
                          {env.effective_settings.panorama_enabled
                            ? " · panorama 360°"
                            : ""}
                          {env.effective_settings.vr_enabled ? " · GLB" : ""}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
                <div className="rounded-lg bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Sobre o tempo de espera
                  </p>
                  <p className="mt-1">
                    O Blender calcula luz, reflexos e materiais. Imagens
                    grandes, várias câmeras e vídeos levam mais tempo. A
                    qualidade de apresentação pode exigir dezenas de minutos em
                    CPU.
                  </p>
                </div>
                <Field id="executor" label="Como você quer executar?">
                  <select
                    id="executor"
                    className={selectClass}
                    value={data.adapter}
                    onChange={(event) =>
                      form.setData("configuration", {
                        ...data,
                        adapter: event.target.value,
                        submission_key: crypto.randomUUID(),
                      })
                    }
                  >
                    {blender_render_enabled && <option value="blender">
                      Blender — gerar arquivos reais
                    </option>}
                    <option value="simulation">
                      Simulação — testar o fluxo, sem arquivos
                    </option>
                  </select>
                </Field>
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    Conferir todos os parâmetros técnicos
                  </summary>
                  <div className="mt-4">
                    <ConfigurationSummary snapshot={snapshot} schema={schema} />
                  </div>
                </details>
              </>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
              <Button
                variant="outline"
                disabled={step === 0 || loading || form.processing}
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft />
                Voltar
              </Button>
              <div className="flex flex-wrap gap-3">
                {step < 3 ? (
                  <Button
                    disabled={loading || !canContinue}
                    onClick={async () => {
                      if (step === 2) {
                        if (await review()) setStep(3);
                      } else setStep(step + 1);
                    }}
                  >
                    {loading ? "Conferindo suas escolhas…" : "Continuar"}
                    <ChevronRight />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      disabled={loading || form.processing || !data.name.trim()}
                      onClick={async () => {
                        if (!snapshot) {
                          await review();
                          return;
                        }
                        submit(false);
                      }}
                    >
                      Salvar para depois
                    </Button>
                    <Button
                      disabled={loading || form.processing || !data.name.trim()}
                      onClick={async () => {
                        if (!snapshot) {
                          await review();
                          return;
                        }
                        submit(true);
                      }}
                    >
                      <Monitor className="size-4" />
                      {form.processing
                        ? "Enviando…"
                        : !snapshot
                          ? "Conferir alterações"
                          : data.adapter === "blender"
                            ? "Gerar meu render"
                            : "Iniciar simulação"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
