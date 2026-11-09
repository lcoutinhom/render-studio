import { ModelPreview } from "./model-preview";
import type { ModelVersion, Association } from "../types/projects";
import { CameraTips } from "./camera-tips";
import { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import { Button } from "./ui/button";
import { Field, selectClass } from "./project-fields";
import { Input } from "./ui/input";
import { ConfirmAction } from "./confirm-action";
import type { Camera } from "../types/rendering";
export function CameraManager({
  base,
  cameras,
  version,
  association,
}: {
  base: string;
  cameras: Camera[];
  version: ModelVersion;
  association: Association;
}) {
  const [editing, setEditing] = useState<Camera | null>(null);
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Câmeras pertencem a este ambiente e a esta versão. Posições usam as
        unidades do modelo e rotações são em graus; versões novas não reutilizam
        referências automaticamente.
      </p>
      <CameraTips compact />
      {cameras.length === 0 && (
        <p className="text-sm">Nenhuma câmera cadastrada nesta versão.</p>
      )}
      {cameras.map((camera) => (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
          key={camera.id}
        >
          <div>
            <p className="font-medium">{camera.name}</p>
            <p className="text-xs text-muted-foreground">
              {camera.projection_type} · {camera.focal_length} mm ·{" "}
              {camera.available
                ? "Disponível"
                : "Associação ou referência inválida"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(camera)}
            >
              Editar câmera
            </Button>
            <ConfirmAction
              url={`${base}/${camera.id}`}
              label="Excluir câmera"
              description="Configurações já salvas manterão a revisão desta câmera."
            />
          </div>
        </div>
      ))}
      <CameraForm
        key={editing?.id ?? "new"}
        base={base}
        camera={editing}
        version={version}
        association={association}
        onDone={() => setEditing(null)}
      />
    </div>
  );
}
function CameraForm({
  base,
  camera,
  onDone,
  version,
  association,
}: {
  base: string;
  camera: Camera | null;
  version: ModelVersion;
  association: Association;
  onDone: () => void;
}) {
  const [captured, setCaptured] = useState(false);
  const [batchError, setBatchError] = useState("");
  const form = useForm({
    camera: {
      name: camera?.name ?? "",
      position: camera?.position ?? [0, 1.6, 3],
      rotation: camera?.rotation ?? [0, 0, 0],
      focal_length: camera?.focal_length ?? 35,
      field_of_view: camera?.field_of_view ?? 54.43,
      projection_type: camera?.projection_type ?? "perspective",
      source_node_id: camera?.metadata.source_node_id ?? "",
    },
  });
  return (
    <form
      className="space-y-4 border-t pt-5"
      onSubmit={(e) => {
        e.preventDefault();
        const options = {
          preserveScroll: true,
          onSuccess: () => {
            form.reset();
            setCaptured(false);
            onDone();
          },
        };
        if (camera) form.patch(`${base}/${camera.id}`, options);
        else form.post(base, options);
      }}
    >
      <h3 className="font-medium">
        {camera ? "Editar câmera" : "Nova câmera"}
      </h3>
      <p className="text-sm text-muted-foreground">
        Abra o visualizador e marque as caixas das cenas desejadas na galeria.
        Clique em Criar câmeras selecionadas para cadastrá-las de uma vez. Se
        preferir uma câmera individual, use Preparar câmera desta cena ou ajuste
        a visão manualmente e clique em Usar esta visão como câmera; depois
        confirme em Salvar câmera.
      </p>
      <ModelPreview
        version={version}
        association={association}
        onCamerasCreate={(cameras) =>
          new Promise<boolean>((resolve) => {
            setBatchError("");
            router.post(
              `${base}/bulk_create`,
              { cameras },
              {
                preserveScroll: true,
                onSuccess: () => resolve(true),
                onError: (errors) => {
                  setBatchError(
                    Object.values(errors).flat().join(" · ") ||
                      "Não foi possível criar as câmeras.",
                  );
                  resolve(false);
                },
                onCancel: () => resolve(false),
              },
            );
          })
        }
        onCameraCapture={(view) => {
          form.setData("camera", {
            ...form.data.camera,
            ...view,
            name: view.name ?? form.data.camera.name,
            source_node_id: "",
          });
          setCaptured(true);
          requestAnimationFrame(() =>
            document.getElementById("camera-name")?.focus(),
          );
        }}
      />
      {batchError && (
        <p role="alert" className="text-sm text-destructive">
          {batchError}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Prévia em 4:3. Use uma resolução de renderização com a mesma proporção
        para manter o enquadramento.
      </p>
      {captured && (
        <p role="status" className="text-sm text-primary">
          Enquadramento capturado. Clique em Salvar câmera para confirmar. Girar
          novamente não altera a câmera capturada até clicar em Usar esta visão
          como câmera.
        </p>
      )}
      <Field
        id="camera-name"
        label="Nome da câmera"
        required
        value={form.data.camera.name}
        onChange={(e) =>
          form.setData("camera", { ...form.data.camera, name: e.target.value })
        }
      />
      <details className="space-y-4 rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Configurações avançadas da câmera
        </summary>
        {(["position", "rotation"] as const).map((kind) => (
          <fieldset key={kind}>
            <legend className="mb-2 text-sm">
              {kind === "position" ? "Posição" : "Rotação (graus)"}
            </legend>
            <div className="grid grid-cols-3 gap-3">
              {["X", "Y", "Z"].map((axis, i) => (
                <Field
                  key={axis}
                  id={`camera-${kind}-${axis}`}
                  label={axis}
                  type="number"
                  step="0.1"
                  value={form.data.camera[kind][i]}
                  onChange={(e) => {
                    const vector = [...form.data.camera[kind]];
                    vector[i] = Number(e.target.value);
                    form.setData("camera", {
                      ...form.data.camera,
                      [kind]: vector,
                    });
                  }}
                />
              ))}
            </div>
          </fieldset>
        ))}
        <p className="text-xs text-muted-foreground">
          Distância focal e campo de visão são vinculados para um sensor de 36
          mm. A distância focal é usada pelo Blender.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="focal-length"
            step="any"
            label="Distância focal (mm)"
            type="number"
            min={1}
            max={500}
            value={form.data.camera.focal_length}
            onChange={(e) =>
              form.setData("camera", {
                ...form.data.camera,
                focal_length: Number(e.target.value),
                field_of_view:
                  Math.round(
                    ((2 *
                      Math.atan(
                        36 / (2 * Math.max(1, Number(e.target.value))),
                      ) *
                      180) /
                      Math.PI) *
                      100,
                  ) / 100,
              })
            }
          />
          <Field
            id="field-of-view"
            step="any"
            label="Campo de visão (graus)"
            type="number"
            min={1}
            max={179}
            value={form.data.camera.field_of_view}
            onChange={(e) =>
              form.setData("camera", {
                ...form.data.camera,
                field_of_view: Number(e.target.value),
                focal_length:
                  Math.round(
                    (36 /
                      (2 *
                        Math.tan(
                          (Math.max(1, Number(e.target.value)) * Math.PI) / 360,
                        ))) *
                      100,
                  ) / 100,
              })
            }
          />
        </div>
        <Field id="projection" label="Projeção da câmera">
          <select
            id="projection"
            className={selectClass}
            value={form.data.camera.projection_type}
            onChange={(e) =>
              form.setData("camera", {
                ...form.data.camera,
                projection_type: e.target.value,
              })
            }
          >
            <option value="perspective">Perspectiva</option>
            <option value="orthographic">Ortográfica</option>
          </select>
        </Field>
        <Field
          id="source-node"
          label="ID do nó de origem (opcional)"
          value={form.data.camera.source_node_id}
          onChange={(e) =>
            form.setData("camera", {
              ...form.data.camera,
              source_node_id: e.target.value,
            })
          }
        />
      </details>
      <Button disabled={form.processing}>Salvar câmera</Button>
      {camera && (
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar edição
        </Button>
      )}
    </form>
  );
}
