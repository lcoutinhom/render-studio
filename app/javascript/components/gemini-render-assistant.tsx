import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import type { Schema, Settings } from "../types/rendering";
type Suggestion = {
  summary: string;
  settings: Settings;
  limitations: string[];
  model: string;
};
export function GeminiRenderAssistant({
  enabled,
  endpoint = "/renderings/suggest",
  configuration,
  csrf,
  schema,
  onApply,
}: {
  enabled: boolean;
  endpoint?: string;
  configuration: unknown;
  csrf: string;
  schema: Schema;
  onApply: (settings: Settings) => void;
}) {
  const [description, setDescription] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const suggest = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setSuggestion(null);
    setApplied(false);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ configuration, description }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Não foi possível obter a sugestão.");
      setSuggestion(result);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Não foi possível obter a sugestão.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return (
    <section className="space-y-3" aria-label="Assistente de aparência">
      <h3 className="font-medium">Descreva como você quer a imagem</h3>
      <p className="text-sm text-muted-foreground">
        Descreva a luz, as cores e a qualidade desejada. Gere uma sugestão e
        aplique antes de renderizar.
      </p>
      <label htmlFor="render-description" className="block text-sm">
        Resultado desejado
      </label>
      <textarea
        id="render-description"
        className="min-h-28 w-full rounded-lg border bg-background p-3 text-sm"
        maxLength={2000}
        value={description}
        disabled={busy}
        placeholder="Quero uma apresentação realista, com luz suave de fim de tarde e aparência aconchegante. Preserve os materiais e a câmera."
        onChange={(event) => {
          setDescription(event.target.value);
          setSuggestion(null);
          setApplied(false);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Somente sua descrição e as configurações são enviadas ao Google. O
        modelo e as imagens ficam no sistema.
      </p>
      {!enabled && (
        <p className="text-sm text-muted-foreground">
          A chave Gemini precisa ser configurada no servidor para usar esta
          opção.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={!enabled || busy || description.trim().length < 3}
        onClick={suggest}
      >
        {busy ? "Preparando sugestão…" : "Sugerir configurações com Gemini"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {suggestion && (
        <div className="space-y-3 rounded-lg bg-muted/30 p-3">
          <p className="text-sm">{suggestion.summary}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {Object.entries(suggestion.settings).map(([key, value]) => {
              const field = schema.definitions.find((f) => f.key === key);
              return (
                <li key={key}>
                  {field?.label ?? key}:{" "}
                  {typeof value === "boolean"
                    ? value
                      ? "Sim"
                      : "Não"
                    : (field?.options?.[String(value)] ?? String(value))}
                </li>
              );
            })}
          </ul>
          {suggestion.limitations.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {suggestion.limitations.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Resolução e samples maiores aumentam o tempo de renderização.
            Câmera, geometria e materiais permanecem como você escolheu.
          </p>
          <Button
            type="button"
            disabled={applied}
            onClick={() => {
              onApply(suggestion.settings);
              setApplied(true);
            }}
          >
            Aplicar sugestão
          </Button>
          {applied && (
            <p role="status" className="text-sm">
              Sugestão aplicada ao formulário. Confira antes de renderizar.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
