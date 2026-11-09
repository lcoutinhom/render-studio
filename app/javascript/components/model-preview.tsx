import { lazy, Suspense, useState } from "react";
import type {
  Association,
  ModelVersion,
  ViewerReference,
  CameraView,
  RecoveredCamera,
} from "../types/projects";
import { Button } from "./ui/button";
const ModelViewer = lazy(() =>
  import("./model-viewer").then((module) => ({ default: module.ModelViewer })),
);
export function ModelPreview({
  version,
  association,
  onReferenceSelect,
  onCameraCapture,
  onCamerasCreate,
  onScenesChange,
  selectedSceneKeys,
}: {
  version: ModelVersion | null;
  association?: Association | null;
  onReferenceSelect?: (reference: ViewerReference) => void;
  onCameraCapture?: (view: CameraView) => void;
  onCamerasCreate?: (cameras: RecoveredCamera[]) => Promise<boolean>;
  onScenesChange?: (cameras: RecoveredCamera[]) => void;
  selectedSceneKeys?: string[];
}) {
  const [opened, setOpened] = useState<string | null>(null);
  const [detailed, setDetailed] = useState(false);
  const identity = `${version?.id}:${version?.file?.url}`;
  if (!version)
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Envie uma versão para visualizar o modelo.
      </p>
    );
  if (version.format !== "glb")
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        O visualizador aceita GLB. Este arquivo {version.format} está preservado
        e disponível para download.
      </p>
    );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Prévia 3D{" "}
            {version.file
              ? `· ${(version.file.size / 1024 / 1024).toFixed(1)} MiB`
              : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            O modo leve mantém a geometria e as cores, sem carregar texturas. O
            original e a renderização permanecem completos.
          </p>
        </div>
        {opened === identity ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpened(null)}
          >
            Fechar visualizador
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => {
              setDetailed(false);
              setOpened(identity);
            }}
          >
            Abrir visualizador
          </Button>
        )}
      </div>
      {opened === identity && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={detailed}
              onChange={(event) => setDetailed(event.target.checked)}
            />
            Carregar texturas e materiais completos (mais pesado; recarrega a
            prévia)
          </label>
          <Suspense fallback={<p role="status">Preparando visualizador…</p>}>
            <ModelViewer
              version={version}
              association={association}
              onReferenceSelect={onReferenceSelect}
              onCameraCapture={onCameraCapture}
              onCamerasCreate={onCamerasCreate}
              onScenesChange={onScenesChange}
              selectedSceneKeys={selectedSceneKeys}
              detailed={detailed}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
