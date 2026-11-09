import { useId } from "react";
import { Field, selectClass } from "./project-fields";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import type { Schema, Settings, SettingValue } from "../types/rendering";
export function SettingsEditor({
  schema,
  value,
  base,
  onChange,
  section,
  keys,
  inheritance = true,
}: {
  schema: Schema;
  value: Settings;
  base?: Settings;
  onChange: (value: Settings) => void;
  section?: string;
  keys?: string[];
  inheritance?: boolean;
}) {
  const prefix = useId();
  const fields = schema.definitions.filter(
    (field) =>
      (!section || field.section === section) &&
      (!keys || keys.includes(field.key)),
  );
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((field) => {
        const own = Object.hasOwn(value, field.key);
        const effective =
          value[field.key] ?? base?.[field.key] ?? schema.defaults[field.key];
        const id = `${prefix}-${field.key}`;
        const update = (next: SettingValue) =>
          onChange({ ...value, [field.key]: next });
        return (
          <div key={field.key} className="space-y-2">
            <Field id={id} label={field.label}>
              {field.type === "boolean" ? (
                <label className="flex min-h-9 items-center gap-2 text-sm">
                  <input
                    id={id}
                    type="checkbox"
                    disabled={inheritance && !own}
                    checked={!!effective}
                    onChange={(e) => update(e.target.checked)}
                  />
                  {effective ? "Ativado" : "Desativado"}
                </label>
              ) : field.type === "select" ? (
                <select
                  id={id}
                  className={selectClass}
                  value={String(effective ?? "")}
                  disabled={inheritance && !own}
                  onChange={(e) => update(e.target.value)}
                >
                  {Object.entries(field.options ?? {}).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={id}
                  type="number"
                  value={Number(effective ?? 0)}
                  min={field.min}
                  max={field.max}
                  step={field.type === "integer" ? 1 : 0.1}
                  disabled={inheritance && !own}
                  onChange={(e) => update(Number(e.target.value))}
                />
              )}
            </Field>
            {inheritance ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={own}
                  aria-label={`Personalizar ${field.label}`}
                  onChange={(e) => {
                    if (e.target.checked) update(effective);
                    else {
                      const next = { ...value };
                      delete next[field.key];
                      onChange(next);
                    }
                  }}
                />
                Personalizar · {own ? "Valor próprio" : "Herdado"}
              </label>
            ) : own ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const next = { ...value };
                  delete next[field.key];
                  onChange(next);
                }}
              >
                Usar herdado
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Herdado; altere para personalizar.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function VideoPathEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (points: { position: number[]; rotation: number[] }[]) => void;
}) {
  const points = (Array.isArray(value) ? value : []) as {
    position: number[];
    rotation: number[];
  }[];
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Trajetória do vídeo ·{" "}
        {points.length ? `${points.length} pontos` : "Automática"}
      </p>
      <p className="text-xs text-muted-foreground">
        Posição nas unidades do modelo; rotação em graus. Use dois ou mais
        pontos para uma trajetória própria.
      </p>
      {points.map((point, index) => (
        <div className="space-y-2 rounded border p-3" key={index}>
          <p className="text-sm">Ponto {index + 1}</p>
          {(["position", "rotation"] as const).map((kind) => (
            <div className="grid grid-cols-3 gap-2" key={kind}>
              {["X", "Y", "Z"].map((axis, i) => (
                <Input
                  key={axis}
                  type="number"
                  step="0.1"
                  aria-label={`Ponto ${index + 1} ${kind === "position" ? "posição" : "rotação"} ${axis}`}
                  value={point[kind][i]}
                  onChange={(e) => {
                    const next = structuredClone(points);
                    next[index][kind][i] = Number(e.target.value);
                    onChange(next);
                  }}
                />
              ))}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(points.filter((_, i) => i !== index))}
          >
            Remover ponto
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={points.length >= 200}
          onClick={() =>
            onChange([
              ...points,
              { position: [0, 1.6, 3], rotation: [0, 0, 0] },
            ])
          }
        >
          Adicionar ponto
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
        >
          Trajetória automática
        </Button>
      </div>
    </div>
  );
}
