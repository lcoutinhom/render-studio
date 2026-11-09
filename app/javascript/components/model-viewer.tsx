import { RecoveredSceneGallery } from "./recovered-scene-gallery";
import { cameraView, worldCamera, markerCamera } from "../lib/exported-camera";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import type {
  ModelVersion,
  Association,
  ViewerReference,
  CameraView,
  RecoveredCamera,
} from "../types/projects";
type ExportedView = {
  id: string;
  name: string;
  scene: string;
  supported: boolean;
};
type NodeOption = { id: string; name: string; scenes: string[] };
type ViewerApi = {
  view: (id: string) => void;
  thumbnails: (
    ids: string[],
    signal: AbortSignal,
    onImage?: (id: string, image: string) => void,
    width?: number,
  ) => Promise<Record<string, string>>;
  activate: (id: string) => void;
  selection: (ids: string[], isolate: boolean) => void;
  reset: () => void;
  capture: () => CameraView | null;
  recovered: (id: string) => CameraView | null;
  region: (box: NonNullable<Association["bounding_box"]>) => void;
};
const idle: ViewerApi = {
  view: () => {},
  thumbnails: async () => ({}),
  activate: () => {},
  selection: () => {},
  reset: () => {},
  capture: () => null,
  recovered: () => null,
  region: () => {},
};
export function ModelViewer({
  version,
  association,
  onReferenceSelect,
  onCameraCapture,
  onCamerasCreate,
  onScenesChange,
  selectedSceneKeys,
  detailed = false,
}: {
  detailed?: boolean;
  version: ModelVersion | null;
  association?: Association | null;
  onReferenceSelect?: (reference: ViewerReference) => void;
  onCameraCapture?: (view: CameraView) => void;
  onCamerasCreate?: (cameras: RecoveredCamera[]) => Promise<boolean>;
  onScenesChange?: (cameras: RecoveredCamera[]) => void;
  selectedSceneKeys?: string[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<ViewerApi>(idle);
  const saved = useRef(association);
  saved.current = association;
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [scenes, setScenes] = useState<{ id: string; name: string }[]>([]);
  const [nodes, setNodes] = useState<NodeOption[]>([]);
  const [activeScene, setActiveScene] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isolate, setIsolate] = useState(false);
  const [query, setQuery] = useState("");
  const [exportedViews, setExportedViews] = useState<ExportedView[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [viewPage, setViewPage] = useState(0);
  const [markers, setMarkers] = useState<
    { id: string; name: string; scene: string }[]
  >([]);
  const [markerId, setMarkerId] = useState("");
  const [approximate, setApproximate] = useState(false);
  const [chosenView, setChosenView] = useState<string | null>(null);
  useEffect(() => {
    setExportedViews([]);
    setMarkers([]);
    setMarkerId("");
    setApproximate(false);
    setThumbnails({});
    setChosenView(null);
    setViewPage(0);
    setState("loading");
    setMessage("");
    setNotice("");
    setScenes([]);
    setNodes([]);
    setSelected([]);
    setIsolate(false);
    setQuery("");
    setActiveScene("");
    api.current = idle;
    const element = host.current;
    if (!element || !version?.file || version.format !== "glb") return;
    let alive = true,
      frame = 0;
    let dirty = true;
    let requestRender = () => {};
    let renderer: THREE.WebGLRenderer | undefined,
      controls: OrbitControls | undefined,
      observer: ResizeObserver | undefined;
    let roots: THREE.Group[] = [];
    let current: THREE.Group | undefined;
    let currentSceneId = "0";
    const importedCameras = new Map<string, THREE.PerspectiveCamera>();
    let homeBounds: THREE.Box3 | undefined;
    const world = new THREE.Scene(),
      manager = new THREE.LoadingManager(),
      abort = new AbortController();
    const cachedBounds = new WeakMap<THREE.Object3D, THREE.Box3>();
    const boundsOf = (object: THREE.Object3D) => {
      let bounds = cachedBounds.get(object);
      if (!bounds) {
        bounds = new THREE.Box3().setFromObject(object);
        cachedBounds.set(object, bounds);
      }
      return bounds;
    };
    const originals = new Map<THREE.Object3D, boolean>();
    const byId = new Map<string, THREE.Object3D[]>();
    const nodeIds = new Map<THREE.Object3D, string>();
    const outline = new THREE.Box3Helper(
      new THREE.Box3(),
      new THREE.Color("#465fff"),
    );
    outline.visible = false;
    world.add(outline);
    const release = (items: THREE.Object3D[]) => {
      const disposed = new Set<unknown>();
      items.forEach((root) =>
        root.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.geometry && !disposed.has(mesh.geometry)) {
            disposed.add(mesh.geometry);
            mesh.geometry.dispose();
          }
          for (const material of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]) {
            if (!material || disposed.has(material)) continue;
            disposed.add(material);
            for (const value of Object.values(material))
              if (value instanceof THREE.Texture && !disposed.has(value)) {
                disposed.add(value);
                const bitmap = value.source?.data;
                if (
                  typeof ImageBitmap !== "undefined" &&
                  bitmap instanceof ImageBitmap
                )
                  bitmap.close();
                value.dispose();
              }
            material.dispose();
          }
        }),
      );
    };
    const fail = (text: string) => {
      if (alive) {
        setState("error");
        setMessage(text);
      }
    };
    const inside = (object: THREE.Object3D, root: THREE.Object3D) => {
      let cursor: THREE.Object3D | null = object;
      while (cursor) {
        if (cursor === root) return true;
        cursor = cursor.parent;
      }
      return false;
    };
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: detailed,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, detailed ? 1.5 : 1));
      renderer.setClearColor("#e9edf0");
      element.appendChild(renderer.domElement);
      renderer.domElement.setAttribute(
        "aria-label",
        "Visualização 3D do modelo",
      );
      const camera = new THREE.PerspectiveCamera(45, 1, 0.001, 1000000);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.addEventListener("change", () => {
        requestRender();
      });
      world.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(10, 20, 15);
      world.add(light);
      const fit = (bounds: THREE.Box3) => {
        requestRender();
        if (bounds.isEmpty()) {
          setNotice(
            "Esta seleção não contém geometria visível. Escolha outra cena ou objeto.",
          );
          return;
        }
        setNotice("");
        homeBounds = bounds.clone();
        const center = bounds.getCenter(new THREE.Vector3());
        const size = Math.max(
          bounds.getSize(new THREE.Vector3()).length(),
          0.1,
        );
        camera.position
          .copy(center)
          .add(new THREE.Vector3(size, size * 0.7, size));
        camera.near = size / 10000;
        camera.far = size * 1000;
        camera.updateProjectionMatrix();
        controls?.target.copy(center);
        controls?.update();
      };
      const restore = () =>
        originals.forEach((visible, object) => {
          object.visible = visible;
        });
      api.current = {
        capture: () => ({ ...cameraView(camera), scene_id: currentSceneId }),
        recovered: (id) => {
          const source = importedCameras.get(id);
          return source ? cameraView(source) : null;
        },
        view: (id) => {
          const source = importedCameras.get(id);
          if (!source) return;
          restore();
          outline.visible = false;
          const distance = current
            ? Math.max(
                boundsOf(current).getSize(new THREE.Vector3()).length() / 2,
                0.1,
              )
            : 1;
          camera.position.copy(source.position);
          camera.quaternion.copy(source.quaternion);
          // Preserve the source horizontal field of view for the current preview aspect.
          const horizontal =
            Math.tan(THREE.MathUtils.degToRad(source.fov) / 2) * source.aspect;
          camera.fov = THREE.MathUtils.radToDeg(
            2 * Math.atan(horizontal / camera.aspect),
          );
          camera.updateProjectionMatrix();
          controls?.target
            .copy(camera.position)
            .add(
              camera
                .getWorldDirection(new THREE.Vector3())
                .multiplyScalar(distance),
            );
          controls?.update();
          requestRender();
        },
        thumbnails: async (ids, signal, onImage, width = 240) => {
          const imageWidth = Math.max(240, Math.min(1024, Math.round(width)));
          const images: Record<string, string> = {};
          for (const id of ids) {
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
            if (!alive || signal.aborted || !renderer || !current) break;
            const source = importedCameras.get(id);
            if (!source) continue;
            const visible = new Map<THREE.Object3D, boolean>();
            current.traverse((object) => visible.set(object, object.visible));
            const previousOutline = outline.visible;
            const size = renderer.getSize(new THREE.Vector2());
            const ratio = renderer.getPixelRatio();
            try {
              restore();
              outline.visible = false;
              renderer.setPixelRatio(1);
              renderer.setSize(
                imageWidth,
                Math.max(
                  64,
                  Math.min(1536, Math.round(imageWidth / source.aspect)),
                ),
                false,
              );
              renderer.render(world, source);
              images[id] = renderer.domElement.toDataURL(
                "image/jpeg",
                imageWidth > 240 ? 0.9 : 0.75,
              );
              onImage?.(id, images[id]);
            } finally {
              visible.forEach((value, object) => {
                object.visible = value;
              });
              outline.visible = previousOutline;
              renderer.setPixelRatio(ratio);
              renderer.setSize(size.x, size.y, false);
              requestRender();
            }
          }
          return images;
        },
        activate: (id) => {
          currentSceneId = id;
          const root = roots[Number(id)];
          if (!root) return;
          restore();
          roots.forEach((item) => world.remove(item));
          current = root;
          world.add(root);
          root.updateMatrixWorld(true);
          outline.visible = false;
          fit(boundsOf(root));
        },
        selection: (ids, isolated) => {
          requestRender();
          if (!current) return;
          restore();
          const objects = ids
            .flatMap((id) => byId.get(id) ?? [])
            .filter((object) => inside(object, current!));
          const bounds = new THREE.Box3();
          objects.forEach((object) => bounds.union(boundsOf(object)));
          outline.box.copy(bounds);
          outline.visible = !bounds.isEmpty();
          if (isolated && objects.length) {
            current.traverse((object) => {
              const related = objects.some(
                (chosen) => inside(object, chosen) || inside(chosen, object),
              );
              object.visible = (originals.get(object) ?? true) && related;
            });
          }
          if (objects.length) fit(bounds);
        },
        reset: () => {
          if (homeBounds) fit(homeBounds);
          else if (current) fit(boundsOf(current));
        },
        region: (box) =>
          fit(
            new THREE.Box3(
              new THREE.Vector3(...(box.min as [number, number, number])),
              new THREE.Vector3(...(box.max as [number, number, number])),
            ),
          ),
      };
      const resize = () => {
        requestRender();
        if (!renderer) return;
        const width = element.clientWidth,
          height = element.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
      };
      observer = new ResizeObserver(resize);
      observer.observe(element);
      resize();
      const render = () => {
        frame = 0;
        if (!alive || document.hidden) return;
        const changed = controls?.update();
        if (dirty || changed) {
          renderer?.render(world, camera);
          dirty = false;
        }
      };
      requestRender = () => {
        dirty = true;
        if (alive && !document.hidden && !frame)
          frame = requestAnimationFrame(render);
      };
      document.addEventListener("visibilitychange", requestRender);
      requestRender();
      let down: { x: number; y: number } | undefined;
      const pointerDown = (event: PointerEvent) => {
        if (event.button === 0) down = { x: event.clientX, y: event.clientY };
      };
      const pointerUp = (event: PointerEvent) => {
        if (
          onCameraCapture ||
          onScenesChange ||
          !down ||
          !current ||
          !renderer ||
          event.button !== 0
        )
          return;
        const distance = Math.hypot(
          event.clientX - down.x,
          event.clientY - down.y,
        );
        down = undefined;
        if (distance > 5) return;
        const rect = renderer.domElement.getBoundingClientRect();
        const ray = new THREE.Raycaster();
        ray.setFromCamera(
          new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            (-(event.clientY - rect.top) / rect.height) * 2 + 1,
          ),
          camera,
        );
        const hit = ray.intersectObject(current, true).find((item) => {
          let cursor: THREE.Object3D | null = item.object;
          while (cursor) {
            if (!cursor.visible) return false;
            cursor = cursor.parent;
          }
          return true;
        });
        let object: THREE.Object3D | null = hit?.object ?? null;
        while (object && !nodeIds.has(object)) object = object.parent;
        if (!object) return;
        const id = nodeIds.get(object)!;
        setSelected((previous) =>
          event.shiftKey
            ? previous.includes(id)
              ? previous.filter((value) => value !== id)
              : previous.length < 500
                ? [...previous, id]
                : previous
            : [id],
        );
      };
      renderer.domElement.addEventListener("pointerdown", pointerDown);
      renderer.domElement.addEventListener("pointerup", pointerUp);
      manager.setURLModifier((url) => {
        if (
          url.startsWith("blob:") ||
          /^data:(?:image\/(?:png|jpeg|webp)|application\/(?:octet-stream|gltf-buffer));base64,/.test(
            url,
          )
        )
          return url;
        throw Error("Dependência externa bloqueada");
      });
      void fetch(version.file.url, {
        credentials: "same-origin",
        signal: abort.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw Error("Arquivo privado indisponível");
          const buffer = await response.arrayBuffer();
          if (!alive) return;
          // Yield before parsing so the loading state can paint.
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
          if (!alive) return;
          const loader = new GLTFLoader(manager);
          if (!detailed)
            loader.register((parser) => ({
              name: "RenderStudioLightPreview",
              loadMaterial: (index: number) => {
                const definition = parser.json.materials?.[index];
                const factor = definition?.pbrMetallicRoughness
                  ?.baseColorFactor ?? [1, 1, 1, 1];
                return Promise.resolve(
                  new THREE.MeshLambertMaterial({
                    color: new THREE.Color().setRGB(
                      factor[0],
                      factor[1],
                      factor[2],
                      THREE.LinearSRGBColorSpace,
                    ),
                    opacity: factor[3],
                    transparent: definition?.alphaMode === "BLEND",
                    side: definition?.doubleSided
                      ? THREE.DoubleSide
                      : THREE.FrontSide,
                  }),
                );
              },
            }));
          // Carry source IDs on each node before scenes clone shared hierarchies.
          // The loader's final associations map may omit nodes from other scenes.
          loader.register((parser) => ({
            name: "RenderStudioSourceNodes",
            loadNode: (index) =>
              parser.loadNode(index).then((node) => {
                node.userData.renderStudioSourceNode = String(index);
                return node;
              }),
          }));
          loader.parse(
            buffer,
            "",
            (gltf) => {
              if (!alive) {
                release(gltf.scenes);
                return;
              }
              roots = gltf.scenes;
              if (!roots.length)
                return fail(
                  "Este GLB não contém cenas para visualizar. Confira a exportação do modelo.",
                );
              roots.forEach((root) =>
                root.traverse((object) =>
                  originals.set(object, object.visible),
                ),
              );
              roots.forEach((root) =>
                root.traverse((object) => {
                  const id = object.userData.renderStudioSourceNode;
                  if (typeof id !== "string") return;
                  nodeIds.set(object, id);
                  byId.set(id, [...(byId.get(id) ?? []), object]);
                }),
              );
              const views: ExportedView[] = [];
              roots.forEach((root, sceneIndex) => {
                root.updateMatrixWorld(true);
                root.traverse((object) => {
                  if (!(object as THREE.Camera).isCamera) return;
                  const nodeId = object.userData.renderStudioSourceNode;
                  const id = `camera:${sceneIndex}:${nodeId}`;
                  const node = gltf.parser.json.nodes?.[Number(nodeId)];
                  const definition = gltf.parser.json.cameras?.[node?.camera];
                  const supported =
                    (object as THREE.PerspectiveCamera).isPerspectiveCamera ===
                    true;
                  views.push({
                    id,
                    name:
                      node?.name ||
                      definition?.name ||
                      `Câmera ${views.length + 1}`,
                    scene: String(sceneIndex),
                    supported,
                  });
                  if (supported)
                    importedCameras.set(
                      id,
                      worldCamera(
                        object as THREE.PerspectiveCamera,
                        definition?.perspective?.aspectRatio ?? 4 / 3,
                      ),
                    );
                });
              });
              setExportedViews(views);
              const geometric = new Set<THREE.Object3D>();
              roots.forEach((root) =>
                root.traverse((object) => {
                  if ((object as THREE.Mesh).isMesh) {
                    let cursor: THREE.Object3D | null = object;
                    while (cursor) {
                      geometric.add(cursor);
                      cursor = cursor.parent;
                    }
                  }
                }),
              );
              const sourceMarkers: {
                id: string;
                name: string;
                scene: string;
              }[] = [];
              roots.forEach((root, sceneIndex) =>
                root.traverse((object) => {
                  const sourceId = object.userData.renderStudioSourceNode;
                  if (typeof sourceId !== "string" || geometric.has(object))
                    return;
                  const node = gltf.parser.json.nodes?.[Number(sourceId)];
                  if (
                    !node?.name ||
                    node.camera !== undefined ||
                    node.children?.length ||
                    !["matrix", "translation", "rotation"].some(
                      (key) => key in node,
                    )
                  )
                    return;
                  const id = `marker:${sceneIndex}:${sourceId}`;
                  if (sourceMarkers.length >= 2000) return;
                  sourceMarkers.push({
                    id,
                    name: node.name,
                    scene: String(sceneIndex),
                  });
                  importedCameras.set(id, markerCamera(object));
                }),
              );
              setMarkers(sourceMarkers);
              const catalog = Array.from(byId, ([id, objects]) => ({
                id,
                name:
                  gltf.parser.json.nodes?.[Number(id)]?.name ||
                  version.metadata?.nodes?.find((item) => item.id === id)
                    ?.name ||
                  objects[0].name ||
                  `Objeto ${id}`,
                scenes: roots.flatMap((root, index) =>
                  objects.some(
                    (object) => inside(object, root) && geometric.has(object),
                  )
                    ? [String(index)]
                    : [],
                ),
              }))
                .filter((item) => item.scenes.length)
                .sort((a, b) => Number(a.id) - Number(b.id));
              setNodes(catalog);
              setScenes(
                roots.map((_, index) => ({
                  id: String(index),
                  name:
                    gltf.parser.json.scenes?.[index]?.name ||
                    `Cena ${index + 1}`,
                })),
              );
              const source =
                saved.current?.status === "validated"
                  ? saved.current.source_reference
                  : null;
              const preferredScene =
                source?.kind === "scene"
                  ? source.references?.[0]
                  : source?.kind === "objects"
                    ? source.scene_id
                    : undefined;
              let defaultIndex =
                preferredScene !== undefined && roots[Number(preferredScene)]
                  ? Number(preferredScene)
                  : Math.max(0, roots.indexOf(gltf.scene));
              if (
                source?.kind === "objects" &&
                preferredScene === undefined &&
                source.references?.length
              ) {
                const candidates = roots
                  .map((_, index) => index)
                  .filter((index) =>
                    source.references!.every((id) =>
                      catalog.some(
                        (item) =>
                          item.id === id && item.scenes.includes(String(index)),
                      ),
                    ),
                  );
                if (candidates.length && !candidates.includes(defaultIndex))
                  defaultIndex = candidates[0];
              }
              const sceneId = String(defaultIndex);
              api.current.activate(sceneId);
              setActiveScene(sceneId);
              setState("ready");
              if (source?.kind === "objects")
                setSelected(
                  (source.references ?? []).filter((id) =>
                    catalog.some(
                      (item) => item.id === id && item.scenes.includes(sceneId),
                    ),
                  ),
                );
              if (
                source?.kind === "region" &&
                source.coordinate_system === "model" &&
                saved.current?.bounding_box
              )
                api.current.region(saved.current.bounding_box);
            },
            () =>
              fail(
                "Modelo GLB inválido ou recurso não suportado pelo visualizador.",
              ),
          );
        })
        .catch((error) => {
          if (error.name !== "AbortError")
            fail(
              "Não foi possível carregar o modelo. Tente novamente ou baixe o original.",
            );
        });
      return () => {
        alive = false;
        abort.abort();
        cancelAnimationFrame(frame);
        document.removeEventListener("visibilitychange", requestRender);
        observer?.disconnect();
        controls?.dispose();
        renderer?.domElement.removeEventListener("pointerdown", pointerDown);
        renderer?.domElement.removeEventListener("pointerup", pointerUp);
        release(roots);
        outline.geometry.dispose();
        (outline.material as THREE.Material).dispose();
        renderer?.dispose();
        renderer?.domElement.remove();
        api.current = idle;
      };
    } catch {
      fail(
        "Visualização 3D indisponível. Verifique o suporte a WebGL no navegador.",
      );
      return () => {
        alive = false;
        abort.abort();
        cancelAnimationFrame(frame);
        document.removeEventListener("visibilitychange", requestRender);
        observer?.disconnect();
        controls?.dispose();
        release(roots);
        outline.geometry.dispose();
        (outline.material as THREE.Material).dispose();
        renderer?.dispose();
        renderer?.domElement.remove();
        api.current = idle;
      };
    }
  }, [version?.id, version?.file?.url, detailed]);
  useEffect(() => {
    if (state === "ready") api.current.selection(selected, isolate);
    if (!selected.length && isolate) setIsolate(false);
  }, [selected, isolate, state]);
  useEffect(() => {
    if (state !== "ready") return;
    const controller = new AbortController();
    const ids = exportedViews
      .filter((view) => view.scene === activeScene && view.supported)
      .slice(viewPage * 12, (viewPage + 1) * 12)
      .map((view) => view.id);
    setThumbnails({});
    void api.current
      .thumbnails(ids, controller.signal)
      .then((images) => {
        if (!controller.signal.aborted) setThumbnails(images);
      })
      .catch(() => {
        /* Thumbnails are optional; camera selection remains available. */
      });
    return () => controller.abort();
  }, [state, activeScene, exportedViews, viewPage]);
  const chooseScene = (id: string) => {
    api.current.activate(id);
    setActiveScene(id);
    setViewPage(0);
    setChosenView(null);
    setMarkerId("");
    setApproximate(false);
    setSelected([]);
    setIsolate(false);
    setQuery("");
  };
  const choices = nodes.filter(
    (item) =>
      item.scenes.includes(activeScene) &&
      `${item.name} ${item.id}`.toLowerCase().includes(query.toLowerCase()),
  );
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
    <div className="space-y-4">
      {scenes.length > 0 && (
        <>
          <Tabs value={activeScene} onValueChange={chooseScene}>
            <div className="overflow-x-auto">
              <TabsList aria-label="Cenas do arquivo" className="min-w-max">
                {scenes.map((scene) => (
                  <TabsTrigger key={scene.id} value={scene.id}>
                    {scene.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {scenes.length === 1
              ? "Este GLB contém apenas uma cena 3D. Os pontos nomeados do exportador aparecem como vistas aproximadas na galeria de cenas recuperadas, quando disponíveis. A escolha dos objetos do ambiente continua separada do enquadramento."
              : "As abas mostram as cenas exportadas no arquivo. Escolher uma aba não altera nem salva a associação do ambiente."}
          </p>
        </>
      )}
      {state === "ready" &&
        (markers.some((marker) => marker.scene === activeScene) ||
          (onScenesChange &&
            exportedViews.some(
              (view) => view.scene === activeScene && view.supported,
            ))) && (
          <RecoveredSceneGallery
            key={`${version.id}:${activeScene}:${detailed}`}
            views={[
              ...markers.filter((marker) => marker.scene === activeScene),
              ...(onScenesChange
                ? exportedViews
                    .filter(
                      (view) => view.scene === activeScene && view.supported,
                    )
                    .map((view) => ({ ...view, approximate: false }))
                : []),
            ]}
            selectedKeys={
              onScenesChange
                ? (selectedSceneKeys ?? []).map((key) =>
                    key.startsWith("camera:") ? key : `marker:${key}`,
                  )
                : undefined
            }
            onSelectionChange={
              onScenesChange
                ? (ids) => {
                    const sources = [...markers, ...exportedViews];
                    const selected: RecoveredCamera[] = [];
                    for (const id of ids) {
                      const snapshot = api.current.recovered(id);
                      const view = sources.find((view) => view.id === id);
                      if (snapshot && view)
                        selected.push({
                          ...snapshot,
                          name: view.name,
                          recovered_view_key: id.replace(/^marker:/, ""),
                        });
                    }
                    onScenesChange(selected);
                  }
                : undefined
            }
            generate={api.current.thumbnails}
            onCreateMany={
              onCamerasCreate
                ? (views) => {
                    const cameras: RecoveredCamera[] = [];
                    for (const view of views) {
                      const snapshot = api.current.recovered(view.id);
                      if (!snapshot) return Promise.resolve(false);
                      cameras.push({
                        ...snapshot,
                        name: view.name,
                        recovered_view_key: view.id.replace(/^marker:/, ""),
                      });
                    }
                    return onCamerasCreate(cameras);
                  }
                : undefined
            }
            onPreview={(id) => {
              setSelected([]);
              setIsolate(false);
              setChosenView(null);
              setMarkerId(id);
              setApproximate(true);
              api.current.view(id);
            }}
            onCreate={
              onCameraCapture
                ? (view) => {
                    setSelected([]);
                    setIsolate(false);
                    setChosenView(null);
                    setMarkerId(view.id);
                    setApproximate(true);
                    api.current.view(view.id);
                    const snapshot = api.current.capture();
                    if (snapshot)
                      onCameraCapture({ ...snapshot, name: view.name });
                  }
                : undefined
            }
          />
        )}
      <div className="relative overflow-hidden rounded-lg border">
        <div
          ref={host}
          className={
            onCameraCapture
              ? "aspect-[4/3] w-full max-w-3xl mx-auto"
              : "h-80 w-full md:h-[440px]"
          }
        />
        {state === "loading" && (
          <p
            role="status"
            className="absolute inset-0 grid place-items-center bg-background/80"
          >
            Carregando modelo…
          </p>
        )}
        {state === "error" && (
          <p
            role="alert"
            className="absolute inset-0 grid place-items-center bg-background/90 p-8 text-center text-sm"
          >
            {message}
          </p>
        )}
      </div>
      {state === "ready" && !onScenesChange && (
        <section
          className="space-y-3 rounded-lg border p-4"
          aria-label="Enquadramentos exportados"
        >
          <h3 className="text-sm font-medium">Enquadramentos desta cena</h3>
          {!exportedViews.some((view) => view.scene === activeScene) ? (
            <p className="text-sm text-muted-foreground">
              Esta cena não contém câmeras formais exportadas. Use a galeria de
              cenas recuperadas, quando disponível, ou escolha uma visão
              manualmente na aba Câmeras.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Prévias geradas no navegador a partir das câmeras do arquivo;
                não são fotografias prontas nem renders finais. Escolha um
                enquadramento e, na aba Câmeras, use esta visão para salvar.
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {exportedViews
                  .filter(
                    (view) => view.scene === activeScene && view.supported,
                  )
                  .slice(viewPage * 12, (viewPage + 1) * 12)
                  .map((view) => (
                    <button
                      key={view.id}
                      type="button"
                      aria-pressed={chosenView === view.id}
                      className="overflow-hidden rounded-lg border p-2 text-left text-sm hover:border-gray-400 dark:hover:border-gray-600"
                      onClick={() => {
                        setSelected([]);
                        setIsolate(false);
                        setChosenView(view.id);
                        setApproximate(false);
                        api.current.view(view.id);
                      }}
                    >
                      {thumbnails[view.id] ? (
                        <img
                          src={thumbnails[view.id]}
                          alt={`Prévia de ${view.name}`}
                          className="aspect-[4/3] w-full rounded object-contain bg-muted"
                        />
                      ) : (
                        <div className="grid aspect-[4/3] place-items-center rounded bg-muted text-xs">
                          Preparando prévia…
                        </div>
                      )}
                      <span className="mt-2 block break-words">
                        {view.name}
                      </span>
                    </button>
                  ))}
              </div>
              {exportedViews.some(
                (view) => view.scene === activeScene && !view.supported,
              ) && (
                <p className="text-xs text-muted-foreground">
                  Câmeras ortográficas exportadas não têm importação de
                  enquadramento disponível nesta etapa. Use uma câmera em
                  perspectiva ou ajuste a visão manualmente.
                </p>
              )}
              {exportedViews.filter(
                (view) => view.scene === activeScene && view.supported,
              ).length > 12 && (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={viewPage === 0}
                    onClick={() => setViewPage((page) => page - 1)}
                  >
                    Enquadramentos anteriores
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      (viewPage + 1) * 12 >=
                      exportedViews.filter(
                        (view) => view.scene === activeScene && view.supported,
                      ).length
                    }
                    onClick={() => setViewPage((page) => page + 1)}
                  >
                    Próximos enquadramentos
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      )}
      {state === "ready" &&
        onCameraCapture &&
        markers.some((marker) => marker.scene === activeScene) && (
          <details className="space-y-3 rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Escolher ponto manualmente (avançado)
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">
              O exportador trouxe estes pontos com posição e rotação, mas sem
              câmera ou lente. Eles não são objetos do ambiente. Escolha um
              ponto apenas se reconhecer uma vista do projeto; vamos usar uma
              lente inicial de 35 mm. Confira a direção e o enquadramento antes
              de salvar.
            </p>
            <label className="block text-sm" htmlFor="source-view-marker">
              Ponto de referência
            </label>
            <select
              id="source-view-marker"
              className="w-full rounded-lg border bg-background p-3 text-sm"
              value={markerId}
              onChange={(event) => setMarkerId(event.target.value)}
            >
              <option value="">Escolha um ponto…</option>
              {markers
                .filter((marker) => marker.scene === activeScene)
                .map((marker) => (
                  <option key={marker.id} value={marker.id}>
                    {marker.name}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={!markerId}
              onClick={() => {
                setSelected([]);
                setIsolate(false);
                setChosenView(null);
                setApproximate(true);
                api.current.view(markerId);
              }}
            >
              Usar ponto como vista aproximada
            </Button>
            {approximate && (
              <p role="status" className="text-sm">
                Vista aproximada com lente de 35 mm. A lente original não veio
                no arquivo. Ajuste a visão, clique em Usar esta visão como
                câmera e salve para confirmar.
              </p>
            )}
          </details>
        )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {onCameraCapture && (
        <Button
          type="button"
          disabled={state !== "ready"}
          onClick={() => {
            const view = api.current.capture();
            if (view) onCameraCapture(view);
          }}
        >
          Usar esta visão como câmera
        </Button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs text-muted-foreground">
          Arraste para girar · Scroll para zoom · Botão direito para mover.
          Clique em um objeto para selecionar; Shift + clique adiciona ou remove
          da seleção.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={state !== "ready"}
          onClick={() => api.current.reset()}
        >
          Resetar câmera
        </Button>
      </div>
      {state === "ready" && !onScenesChange && (
        <>
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Selecionar objetos e grupos ({selected.length} selecionado(s))
            </summary>
            <div className="mt-4 space-y-3">
              <Input
                aria-label="Pesquisar objetos no visualizador"
                placeholder="Procure o nome de um objeto ou grupo…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="max-h-64 divide-y overflow-auto rounded-lg border">
                {choices.slice(0, 200).map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 p-3 text-sm hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      className="size-4"
                      aria-label={`Selecionar objeto ${item.name} #${item.id}`}
                      checked={selected.includes(item.id)}
                      disabled={
                        selected.length >= 500 && !selected.includes(item.id)
                      }
                      onChange={(event) =>
                        setSelected((previous) =>
                          event.target.checked
                            ? [...previous, item.id]
                            : previous.filter((id) => id !== item.id),
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 break-words">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      #{item.id}
                    </span>
                  </label>
                ))}
                {!choices.length && (
                  <p className="p-4 text-sm text-muted-foreground">
                    Nenhum objeto encontrado nesta cena.
                  </p>
                )}
              </div>
              {choices.length > 200 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando os primeiros 200 itens. Pesquise pelo nome para
                  encontrar outros objetos.
                </p>
              )}
            </div>
          </details>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={isolate}
                disabled={!selected.length}
                onChange={(event) => setIsolate(event.target.checked)}
              />
              Ver só a seleção
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelected([]);
                setIsolate(false);
                api.current.activate(activeScene);
              }}
            >
              Ver cena completa
            </Button>
            <span className="text-xs text-muted-foreground">
              Isolar é só uma ajuda visual; o arquivo e a geometria não mudam.
            </span>
          </div>
          {onReferenceSelect && (
            <div className="flex flex-wrap gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={
                  !nodes.some((item) => item.scenes.includes(activeScene))
                }
                onClick={() =>
                  onReferenceSelect({
                    kind: "scene",
                    references: [activeScene],
                  })
                }
              >
                Usar esta cena na associação
              </Button>
              <Button
                type="button"
                disabled={!selected.length}
                onClick={() =>
                  onReferenceSelect({
                    kind: "objects",
                    references: [...selected],
                    scene_id: activeScene,
                  })
                }
              >
                Usar {selected.length} objeto(s) na associação
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
