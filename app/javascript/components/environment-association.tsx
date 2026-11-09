import { ModelPreview } from "./model-preview";
import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { Field, selectClass } from "./project-fields";
import { Button } from "./ui/button";
import type { Association, ModelVersion } from "../types/projects";
export function EnvironmentAssociation({
  projectId,
  environmentId,
  version,
  association,
}: {
  projectId: number;
  environmentId: number;
  version: ModelVersion;
  association: Association | null;
}) {
  const form = useForm({
    kind:
      association?.source_reference.kind ??
      (version.metadata?.scenes?.length ? "scene" : "objects"),
    references: association?.source_reference.references?.join(", ") ?? "",
    coordinate_system:
      association?.source_reference.coordinate_system ?? "model",
    bbox: JSON.stringify(
      association?.bounding_box ?? { min: [0, 0, 0], max: [1, 1, 1] },
    ),
    status: association?.status ?? "pending",
    scene_id: association?.source_reference.scene_id ?? "",
  });
  const [query, setQuery] = useState("");
  const [visualDraft, setVisualDraft] = useState(false);
  const catalog =
    form.data.kind === "objects"
      ? (version.metadata?.nodes ?? []).filter(
          (node) => node.has_geometry !== false,
        )
      : form.data.kind === "scene"
        ? (version.metadata?.scenes ?? [])
        : [];
  const selected = form.data.references
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const bounds = JSON.parse(form.data.bbox) as { min: number[]; max: number[] };
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.transform((data) => ({
          association: {
            source_reference: JSON.stringify(
              data.kind === "region"
                ? { kind: data.kind, coordinate_system: data.coordinate_system }
                : {
                    kind: data.kind,
                    ...(data.kind === "objects" && data.scene_id
                      ? { scene_id: data.scene_id }
                      : {}),
                    references: data.references
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
            ),
            bounding_box: data.kind === "region" ? data.bbox : "",
            status: data.status,
          },
        }));
        form.put(
          `/projects/${projectId}/environments/${environmentId}/versions/${version.id}`,
        );
      }}
    >
      <p className="text-sm text-muted-foreground">
        Esta associação pertence apenas à versão {version.version_number}. Nomes
        e tags não são associados automaticamente. Confirme manualmente os
        identificadores do modelo.
      </p>
      {version.format === "glb" && (
        <section className="space-y-4 rounded-lg border p-4">
          <div>
            <h3 className="font-medium">
              Escolha visualmente o que pertence ao ambiente
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Abra uma cena pela aba ou selecione objetos no modelo. Depois use
              a seleção no formulário e confirme para salvar.
            </p>
          </div>
          <ModelPreview
            version={version}
            association={association}
            onReferenceSelect={(reference) => {
              form.setData((previous) => ({
                ...previous,
                kind: reference.kind,
                references: reference.references.join(", "),
                scene_id:
                  reference.kind === "objects"
                    ? (reference.scene_id ?? "")
                    : "",
                status: "pending",
              }));
              setVisualDraft(true);
              setQuery("");
            }}
          />
        </section>
      )}
      {visualDraft && (
        <p
          role="status"
          className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-900 dark:bg-brand-950"
        >
          A seleção foi preenchida abaixo, mas ainda não foi salva. Revise as
          referências, escolha Confirmada manualmente e clique em Salvar
          associação.
        </p>
      )}
      {version.metadata?.reference_types_available && (
        <section
          aria-label="Conteúdo exportado do GLB"
          className="space-y-2 rounded-lg border p-4 text-sm"
        >
          <p className="font-medium">O que veio neste arquivo</p>
          <p>
            {version.metadata.scene_count ?? 0} cena(s) 3D ·{" "}
            {version.metadata.camera_count ?? 0} câmera(s) exportada(s) ·{" "}
            {version.metadata.view_marker_count ?? 0} marcador(es) sem
            geometria.
          </p>
          <p className="text-muted-foreground">
            A opção “Conjunto de objetos” abaixo é o tipo de associação do
            formulário, não uma classificação das cenas do arquivo. Para
            associar uma cena inteira, escolha “Cena (ID da cena GLB)”.
          </p>
          {(version.metadata.view_marker_count ?? 0) > 0 && (
            <details>
              <summary className="cursor-pointer font-medium">
                Pontos nomeados sem geometria (não são objetos do ambiente)
              </summary>
              <p className="mt-2 text-muted-foreground">
                Esses pontos podem representar vistas do programa de origem, mas
                não contêm lente ou câmera formal. Não são usados para recortar
                o ambiente. Na aba Câmeras, você pode usar um ponto como vista
                aproximada e conferir o enquadramento.
              </p>
              <ul className="mt-2 max-h-36 overflow-auto">
                {version.metadata.view_markers?.map((marker) => (
                  <li key={marker.id}>
                    {marker.name} · #{marker.id}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
      <Field id="selector-kind" label="Referência do ambiente">
        <select
          id="selector-kind"
          className={selectClass}
          value={form.data.kind}
          onChange={(e) =>
            form.setData((previous) => ({
              ...previous,
              kind: e.target.value,
              references: "",
              status: "pending",
              scene_id: "",
            }))
          }
        >
          {Object.entries({
            objects: "Conjunto de objetos (IDs dos nós GLB)",
            scene: "Cena (ID da cena GLB)",
            region: "Região espacial",
            tag: "Tag",
            group: "Grupo",
            component: "Componente",
            model_part: "Parte do modelo",
          }).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {form.data.kind === "region" ? (
        <>
          <Field
            id="coordinates"
            label="Sistema de coordenadas"
            value={form.data.coordinate_system}
            onChange={(e) => form.setData("coordinate_system", e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {(["min", "max"] as const).map((side) => (
              <fieldset className="space-y-3 rounded-lg border p-4" key={side}>
                <legend className="px-1 text-sm font-medium">
                  {side === "min" ? "Limite mínimo" : "Limite máximo"}
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {["X", "Y", "Z"].map((axis, index) => (
                    <Field
                      id={`region-${side}-${axis}`}
                      key={axis}
                      label={axis}
                      type="number"
                      step="any"
                      value={bounds[side][index]}
                      onChange={(event) => {
                        const next = { ...bounds, [side]: [...bounds[side]] };
                        next[side][index] = Number(event.target.value);
                        form.setData("bbox", JSON.stringify(next));
                      }}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </>
      ) : catalog.length ? (
        <div className="space-y-3">
          <Field
            id="catalog-search"
            label="Escolha os objetos ou cenas deste ambiente"
            placeholder="Pesquisar pelo nome…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="max-h-64 divide-y overflow-auto rounded-lg border">
            {catalog
              .filter((item) =>
                `${item.name} ${item.id}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 p-3 text-sm hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selected.includes(item.id)}
                    onChange={(event) =>
                      form.setData((previous) => ({
                        ...previous,
                        scene_id: "",
                        references: (event.target.checked
                          ? [...selected, item.id]
                          : selected.filter((id) => id !== item.id)
                        ).join(", "),
                      }))
                    }
                  />
                  <span>{item.name || `Objeto ${item.id}`}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    #{item.id}
                  </span>
                </label>
              ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {selected.length} referência(s) selecionada(s). A associação é
            confirmada por você.
          </p>
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Inserir identificadores manualmente
            </summary>
            <Field
              id="references"
              label="Identificadores separados por vírgula"
              value={form.data.references}
              onChange={(event) =>
                form.setData((previous) => ({
                  ...previous,
                  references: event.target.value,
                  scene_id: "",
                }))
              }
            />
          </details>
        </div>
      ) : (
        <Field
          id="references"
          label="Identificadores separados por vírgula"
          placeholder="Nome do grupo, componente ou tag"
          value={form.data.references}
          onChange={(event) =>
            form.setData((previous) => ({
              ...previous,
              references: event.target.value,
              scene_id: "",
            }))
          }
        />
      )}

      <Field id="association-status" label="Situação da associação">
        <select
          id="association-status"
          className={selectClass}
          value={form.data.status}
          onChange={(e) => form.setData("status", e.target.value)}
        >
          <option value="pending">Pendente de revisão</option>
          <option value="validated">Confirmada manualmente</option>
          <option value="invalid">Inválida</option>
        </select>
      </Field>
      <Button disabled={form.processing}>
        {form.processing ? "Salvando…" : "Salvar associação"}
      </Button>
      {version.metadata?.nodes?.length || version.metadata?.scenes?.length ? (
        <details>
          <summary className="cursor-pointer text-sm">
            Referências encontradas no GLB (não são ambientes)
          </summary>
          <div className="mt-3 max-h-56 overflow-auto rounded-lg border p-3 text-xs">
            <p>
              Cenas:{" "}
              {version.metadata?.scenes
                ?.map((item) => `${item.id}: ${item.name}`)
                .join(" · ") || "Nenhuma"}
            </p>
            <ul>
              {version.metadata?.nodes?.map((item) => (
                <li key={item.id}>
                  {item.id}: {item.name}
                </li>
              ))}
            </ul>
            {version.metadata?.reference_catalog_truncated && (
              <p>Catálogo abreviado aos primeiros 2000 itens.</p>
            )}
          </div>
        </details>
      ) : null}
    </form>
  );
}
