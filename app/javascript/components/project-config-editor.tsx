import { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { SettingsEditor } from "./settings-editor";
import { GeminiRenderAssistant } from "./gemini-render-assistant";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Schema, Settings, Preset } from "../types/rendering";
import type { SharedProps } from "../types";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
export function ProjectConfigEditor({
  schema,
  value,
  onChange,
  presets,
  projectId,
  gemini = false,
  sceneOnly = false,
}: {
  schema: Schema;
  value: Settings;
  onChange: (settings: Settings) => void;
  presets: Preset[];
  projectId?: number;
  gemini?: boolean;
  sceneOnly?: boolean;
}) {
  const { csrf_token } = usePage<SharedProps>().props;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [tab, setTab] = useState<"gemini" | "manual">(
    projectId ? "gemini" : "manual",
  );
  const [jsonOpen, setJsonOpen] = useState(false);
  const validate = async (document: unknown) => {
    const response = await fetch("/settings_document/validate", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-Token": csrf_token,
      },
      body: JSON.stringify({ document }),
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error ?? "JSON inválido");
    return result as { schema_version: number; settings: Settings };
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div
          role="tablist"
          aria-label="Como configurar"
          className="flex flex-wrap gap-2"
        >
          {projectId && (
            <Button
              type="button"
              role="tab"
              aria-selected={tab === "gemini"}
              variant={tab === "gemini" ? "secondary" : "ghost"}
              onClick={() => setTab("gemini")}
            >
              Com Gemini
            </Button>
          )}
          <Button
            type="button"
            role="tab"
            aria-selected={tab === "manual"}
            variant={tab === "manual" ? "secondary" : "ghost"}
            onClick={() => setTab("manual")}
          >
            Configurações manuais
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label="Ações das configurações"
            >
              <MoreHorizontal className="size-4" /> Ações
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setJsonOpen(true)}>
              Importar / exportar JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTab("manual")}>
              Presets e parâmetros
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div hidden={tab !== "manual"} className="space-y-5">
        {projectId && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setError("");
              setBusy(true);
              try {
                const response = await fetch("/render_defaults/export", {
                  credentials: "same-origin",
                });
                if (!response.ok)
                  throw Error("Não foi possível carregar o padrão geral.");
                const document = await response.json();
                onChange(document.settings);
                setMessage(
                  "Padrão geral aplicado ao formulário. Salve para usar neste projeto.",
                );
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Falha ao carregar padrão",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Usar padrão geral
          </Button>
        )}
        <label className="block space-y-2 text-sm">
          Usar preset salvo
          <select
            className="w-full rounded-lg border bg-background p-3"
            defaultValue=""
            onChange={(e) => {
              const preset = presets.find(
                (p) => String(p.id) === e.target.value,
              );
              if (preset) {
                onChange({ ...value, ...preset.settings });
                setMessage(`Preset ${preset.name} aplicado ao formulário.`);
              }
            }}
          >
            <option value="">Escolha um preset…</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div hidden={tab !== "gemini"}>
        {projectId && (
          <GeminiRenderAssistant
            enabled={gemini}
            endpoint={`/projects/${projectId}/configuration/suggest`}
            configuration={{ settings: value }}
            csrf={csrf_token}
            schema={schema}
            onApply={(settings) => onChange({ ...value, ...settings })}
          />
        )}
      </div>
      <div hidden={tab !== "manual"} className="space-y-5">
        <SettingsEditor
          schema={schema}
          value={value}
          onChange={onChange}
          inheritance={false}
          keys={[
            "quality",
            "material_profile",
            "resolution_width",
            "resolution_height",
            "samples",
            "denoising",
            "lighting",
            "interior_fill",
            "neutral_daylight",
            "temperature",
            "exposure",
            "image_count",
            "image_format",
          ]}
        />
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Todos os parâmetros
          </summary>
          <div className="mt-4">
            <SettingsEditor
              schema={schema}
              value={value}
              onChange={onChange}
              inheritance={false}
            />
          </div>
        </details>
      </div>
      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="space-y-4">
          <DialogTitle>Configurações JSON</DialogTitle>
          <DialogDescription>
            Importe um arquivo salvo ou exporte as configurações atuais.
          </DialogDescription>
          <p className="text-xs text-muted-foreground">
            A importação é validada pelo sistema antes de preencher o
            formulário. Ela não salva nem inicia renderizações.
          </p>
          <Input
            aria-label="Importar configurações JSON"
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                if (file.size > 65536) throw Error("JSON deve ter até 64 KiB.");
                const document = await validate(await file.text());
                onChange(document.settings);
                setMessage(
                  "JSON validado e aplicado ao formulário. Confira antes de salvar.",
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "JSON inválido");
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const document = await validate({
                  schema_version: 1,
                  settings: value,
                });
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(document, null, 2)], {
                    type: "application/json",
                  }),
                );
                const link = window.document.createElement("a");
                link.href = url;
                link.download = "render-settings.json";
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Não foi possível exportar",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Exportar JSON do formulário
          </Button>
        </DialogContent>
      </Dialog>
      {projectId && tab === "manual" && (
        <div className="flex flex-wrap gap-3">
          <Input
            aria-label="Nome do preset"
            placeholder="Nome para salvar como preset"
            maxLength={120}
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!presetName.trim()}
            onClick={() =>
              router.post(
                `/projects/${projectId}/configuration/preset`,
                { name: presetName, settings: value },
                { preserveScroll: true, onSuccess: () => setPresetName("") },
              )
            }
          >
            Salvar como preset
          </Button>
        </div>
      )}
      <div className="border-t pt-5">
        <h3 className="text-sm font-medium">O que você quer gerar?</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Imagens das cenas selecionadas estão incluídas. Ative os formatos
          adicionais que desejar.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["video_enabled", "Vídeo"],
              ["panorama_enabled", "Panorama 360°"],
              ["vr_enabled", "VR / WebXR"],
            ] as const
          )
            .filter(([key]) => !sceneOnly || key === "video_enabled")
            .map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3 text-sm"
              >
                {label}
                <button
                  type="button"
                  role="switch"
                  aria-label={label}
                  aria-checked={Boolean(value[key])}
                  onClick={() => onChange({ ...value, [key]: !value[key] })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${value[key] ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${value[key] ? "left-0.5 translate-x-5" : "left-0.5"}`}
                  />
                </button>
              </label>
            ))}
        </div>
        {sceneOnly && projectId && (
          <p className="mt-3 text-sm text-muted-foreground">
            VR e tour 360° agora são preparados no projeto, pela aba{" "}
            <a
              className="text-primary underline"
              href={`/projects/${projectId}?tab=experiences`}
            >
              VR e tour 360°
            </a>
            .
          </p>
        )}
      </div>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
