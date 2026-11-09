import { teleportPosition, walkOffset } from "../lib/vr-navigation";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Button } from "./ui/button";
import type { Camera } from "../types/rendering";
type Mode = "teleport" | "walk";
export default function VrModelViewer({
  url,
  initialCamera,
  navigation = "teleport",
  entryPoints = [],
}: {
  url: string;
  initialCamera?: Camera | null;
  navigation?: string;
  entryPoints?: Camera[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const action = useRef<() => Promise<void>>(async () => {});
  const reset = useRef<() => void>(() => {});
  const toggleWalk = useRef<() => void>(() => {});
  const jump = useRef<(point: Camera) => void>(() => {});
  const [entry, setEntry] = useState("");
  const [desktopWalking, setDesktopWalking] = useState(false);
  const mode = useRef<Mode>(navigation === "walk" ? "walk" : "teleport");
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [pending, setPending] = useState(false);
  const [movement, setMovement] = useState<Mode>(mode.current);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let alive = true,
      dirty = true;
    let roots: THREE.Group[] = [];
    let session: XRSession | undefined;
    let renderer!: THREE.WebGLRenderer;
    let controls!: OrbitControls;
    let observer!: ResizeObserver;
    let environmentTarget: THREE.WebGLRenderTarget | undefined;
    let walking = false;
    const keys = new Set<string>();
    const abort = new AbortController();
    const world = new THREE.Scene();
    const rig = new THREE.Group();
    world.add(rig);
    const camera = new THREE.PerspectiveCamera(60, 4 / 3, 0.01, 10000);
    rig.add(camera);
    const meshes: THREE.Object3D[] = [];
    const controllers: THREE.XRTargetRaySpace[] = [];
    const lines: THREE.Line[] = [];
    const ray = new THREE.Raycaster();
    ray.far = 30;
    const rotation = new THREE.Matrix4();
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x465fff, side: THREE.DoubleSide }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    world.add(marker);
    let destination: THREE.Vector3 | undefined;
    let desktop:
      { position: THREE.Vector3; quaternion: THREE.Quaternion } | undefined;
    let home: { position: THREE.Vector3; target: THREE.Vector3 } | undefined;
    const dispose = () => {
      const seen = new Set<unknown>();
      for (const root of roots)
        root.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.geometry && !seen.has(mesh.geometry)) {
            seen.add(mesh.geometry);
            mesh.geometry.dispose();
          }
          for (const material of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]) {
            if (!material || seen.has(material)) continue;
            seen.add(material);
            for (const value of Object.values(material))
              if (value instanceof THREE.Texture && !seen.has(value)) {
                seen.add(value);
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
        });
    };
    const checkSupport = () => {
      if (!window.isSecureContext || !navigator.xr) {
        if (alive) setSupported(false);
        return;
      }
      void navigator.xr
        .isSessionSupported("immersive-vr")
        .then((value) => {
          if (alive) setSupported(value);
        })
        .catch(() => {
          if (alive) setSupported(false);
        });
    };
    const restoreDesktop = () => {
      rig.position.set(0, 0, 0);
      rig.rotation.set(0, 0, 0);
      if (desktop) {
        camera.position.copy(desktop.position);
        camera.quaternion.copy(desktop.quaternion);
      }
      controls.enabled = true;
      controls.update();
      destination = undefined;
      marker.visible = false;
      session = undefined;
      dirty = true;
      if (alive) {
        setImmersive(false);
        setPending(false);
      }
    };
    const aim = (controller: THREE.XRTargetRaySpace) => {
      if (mode.current !== "teleport") return undefined;
      rotation.identity().extractRotation(controller.matrixWorld);
      ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      ray.ray.direction.set(0, 0, -1).applyMatrix4(rotation);
      const hit = ray.intersectObjects(meshes, false).find((item) => {
        let object: THREE.Object3D | null = item.object;
        while (object) {
          if (!object.visible) return false;
          object = object.parent;
        }
        return true;
      });
      if (!hit?.face) return undefined;
      const normal = hit.face.normal
        .clone()
        .applyNormalMatrix(
          new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld),
        );
      return normal.y > 0.7 ? hit.point.clone() : undefined;
    };
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0xe9edf0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      environmentTarget = pmrem.fromScene(room, 0.04);
      world.environment = environmentTarget.texture;
      room.dispose();
      pmrem.dispose();
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType("local-floor");
      renderer.domElement.setAttribute(
        "aria-label",
        "Modelo 3D para VR: arraste para girar e use a rodinha para aproximar",
      );
      element.appendChild(renderer.domElement);
      renderer.domElement.tabIndex = 0;
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.addEventListener("change", () => {
        dirty = true;
      });
      world.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1));
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(10, 20, 15);
      world.add(light);
      const clearKeys = () => keys.clear();
      const finishWalk = () => {
        walking = false;
        keys.clear();
        controls.target
          .copy(camera.position)
          .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));
        controls.enabled = !renderer.xr.isPresenting;
        controls.update();
        setDesktopWalking(false);
      };
      toggleWalk.current = () => {
        if (renderer.xr.isPresenting || !home) return;
        if (walking) {
          finishWalk();
          return;
        }
        walking = true;
        controls.enabled = false;
        camera.rotation.reorder("YXZ");
        renderer.domElement.focus();
        setDesktopWalking(true);
      };
      jump.current = (point) => {
        if (!home || renderer.xr.isPresenting) return;
        if (walking) finishWalk();
        camera.position.fromArray(point.position);
        camera.quaternion.setFromEuler(
          new THREE.Euler(
            ...(point.rotation.map(THREE.MathUtils.degToRad) as [
              number,
              number,
              number,
            ]),
            "XYZ",
          ),
        );
        camera.fov = point.field_of_view;
        camera.updateProjectionMatrix();
        controls.target
          .copy(camera.position)
          .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));
        controls.update();
        dirty = true;
      };
      renderer.domElement.addEventListener(
        "keydown",
        (event) => {
          if (!walking) return;
          if (event.code === "Escape") {
            finishWalk();
            return;
          }
          if (
            [
              "KeyW",
              "KeyA",
              "KeyS",
              "KeyD",
              "ArrowUp",
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
            ].includes(event.code)
          ) {
            event.preventDefault();
            keys.add(event.code);
          }
        },
        { signal: abort.signal },
      );
      window.addEventListener("keyup", (event) => keys.delete(event.code), {
        signal: abort.signal,
      });
      window.addEventListener("blur", clearKeys, { signal: abort.signal });
      renderer.domElement.addEventListener("blur", clearKeys, {
        signal: abort.signal,
      });
      document.addEventListener("visibilitychange", clearKeys, {
        signal: abort.signal,
      });
      renderer.domElement.addEventListener(
        "pointerdown",
        (event) => {
          if (!walking || event.button !== 0) return;
          renderer.domElement.focus();
          renderer.domElement.setPointerCapture(event.pointerId);
        },
        { signal: abort.signal },
      );
      renderer.domElement.addEventListener(
        "pointermove",
        (event) => {
          if (!walking || !(event.buttons & 1) || renderer.xr.isPresenting)
            return;
          camera.rotation.y -= event.movementX * 0.003;
          camera.rotation.x = THREE.MathUtils.clamp(
            camera.rotation.x - event.movementY * 0.003,
            -Math.PI / 2 + 0.02,
            Math.PI / 2 - 0.02,
          );
          dirty = true;
        },
        { signal: abort.signal },
      );
      for (let index = 0; index < 2; index++) {
        const controller = renderer.xr.getController(index);
        rig.add(controller);
        controllers.push(controller);
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(),
            new THREE.Vector3(0, 0, -1),
          ]),
          new THREE.LineBasicMaterial({ color: 0x465fff }),
        );
        line.scale.z = 5;
        line.visible = false;
        controller.add(line);
        lines.push(line);
        controller.addEventListener("connected", () => {
          controller.userData.connected = true;
          line.visible = true;
        });
        controller.addEventListener("disconnected", () => {
          controller.userData.connected = false;
          line.visible = false;
        });
        controller.addEventListener("select", () => {
          const point = aim(controller);
          if (!point) return;
          const head = renderer.xr
            .getCamera()
            .getWorldPosition(new THREE.Vector3());
          rig.position.copy(teleportPosition(rig.position, head, point));
        });
      }
      action.current = async () => {
        if (!alive) return;
        setPending(true);
        setError("");
        try {
          if (session) {
            await session.end();
            return;
          }
          if (walking) finishWalk();
          const requested = await navigator.xr!.requestSession("immersive-vr", {
            requiredFeatures: ["local-floor"],
          });
          if (!alive) {
            await requested.end();
            return;
          }
          session = requested;
          session.addEventListener("end", restoreDesktop, { once: true });
          desktop = {
            position: camera.position.clone(),
            quaternion: camera.quaternion.clone(),
          };
          const forward = camera.getWorldDirection(new THREE.Vector3());
          rig.position.set(
            camera.position.x,
            camera.position.y - 1.6,
            camera.position.z,
          );
          rig.rotation.y = Math.atan2(-forward.x, -forward.z);
          camera.position.set(0, 1.6, 0);
          camera.rotation.set(0, 0, 0);
          controls.enabled = false;
          await renderer.xr.setSession(requested);
          if (alive) setImmersive(true);
        } catch {
          if (session) {
            const failed = session;
            session = undefined;
            void failed.end().catch(() => {});
          }
          restoreDesktop();
          if (alive)
            setError(
              "Não foi possível entrar em VR. Confira a permissão, a conexão dos óculos e o suporte ao modo de pé (local-floor).",
            );
        } finally {
          if (alive) setPending(false);
        }
      };
      reset.current = () => {
        if (!home || renderer.xr.isPresenting) return;
        if (walking) finishWalk();
        camera.position.copy(home.position);
        controls.target.copy(home.target);
        controls.update();
        dirty = true;
      };
      observer = new ResizeObserver(() => {
        if (renderer.xr.isPresenting) return;
        const width = element.clientWidth,
          height = element.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        dirty = true;
      });
      observer.observe(element);
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((resource) => {
        if (
          resource.startsWith("blob:") ||
          /^data:(?:image\/(?:png|jpeg|webp)|application\/(?:octet-stream|gltf-buffer));base64,/.test(
            resource,
          )
        )
          return resource;
        throw Error("Dependência externa bloqueada");
      });
      void fetch(url, { credentials: "same-origin", signal: abort.signal })
        .then(async (response) => {
          if (!response.ok) throw Error("Arquivo privado indisponível");
          const bytes = await response.arrayBuffer();
          if (!alive) return;
          const gltf = await new GLTFLoader(manager).parseAsync(bytes, "");
          roots = gltf.scenes;
          if (!alive) {
            dispose();
            return;
          }
          const root = gltf.scene;
          root.updateMatrixWorld(true);
          world.add(root);
          root.traverse((object) => {
            if ((object as THREE.Mesh).isMesh) meshes.push(object);
          });
          const bounds = new THREE.Box3().setFromObject(root);
          if (bounds.isEmpty()) throw Error("Modelo sem geometria");
          const center = bounds.getCenter(new THREE.Vector3()),
            size = Math.max(bounds.getSize(new THREE.Vector3()).length(), 1);
          camera.near = Math.min(0.01, size / 10000);
          camera.far = Math.max(1000, size * 100);
          camera.updateProjectionMatrix();
          if (
            initialCamera?.position.length === 3 &&
            initialCamera.rotation.length === 3
          ) {
            camera.position.fromArray(initialCamera.position);
            camera.quaternion.setFromEuler(
              new THREE.Euler(
                ...(initialCamera.rotation.map(THREE.MathUtils.degToRad) as [
                  number,
                  number,
                  number,
                ]),
                "XYZ",
              ),
            );
            const target = camera
              .getWorldDirection(new THREE.Vector3())
              .multiplyScalar(Math.max(size / 4, 1))
              .add(camera.position);
            controls.target.copy(target);
          } else {
            camera.position
              .copy(center)
              .add(new THREE.Vector3(size * 0.8, size * 0.5, size * 0.8));
            controls.target.copy(center);
          }
          controls.update();
          home = {
            position: camera.position.clone(),
            target: controls.target.clone(),
          };
          dirty = true;
          setState("ready");
        })
        .catch((error) => {
          if (alive && error.name !== "AbortError") {
            setState("error");
            setError(
              "Não foi possível abrir este GLB. Confira a sessão ou baixe o arquivo para abrir em um aplicativo 3D.",
            );
          }
        });
      let previous = 0,
        lastAim = 0;
      renderer.setAnimationLoop((time) => {
        if (!alive) return;
        const delta = Math.min((time - previous) / 1000, 0.05);
        previous = time;
        if (renderer.xr.isPresenting) {
          if (mode.current === "walk") {
            marker.visible = false;
            for (const source of renderer.xr.getSession()?.inputSources ?? []) {
              const axes = source.gamepad?.axes;
              if (!axes || axes.length < 2) continue;
              const x = axes[axes.length - 2],
                y = axes[axes.length - 1];
              if (Math.hypot(x, y) < 0.2) continue;
              const forward = renderer.xr
                .getCamera()
                .getWorldDirection(new THREE.Vector3());
              rig.position.add(walkOffset(forward, x, y, delta));
              break;
            }
          } else if (time - lastAim > 100) {
            lastAim = time;
            destination = undefined;
            for (const controller of controllers) {
              if (controller.userData.connected) {
                destination = aim(controller);
                if (destination) break;
              }
            }
            marker.visible = !!destination;
            if (destination)
              marker.position
                .copy(destination)
                .add(new THREE.Vector3(0, 0.01, 0));
          }
          renderer.render(world, camera);
        } else if (!document.hidden) {
          if (
            walking &&
            document.activeElement === renderer.domElement &&
            keys.size
          ) {
            const x =
              Number(keys.has("KeyD") || keys.has("ArrowRight")) -
              Number(keys.has("KeyA") || keys.has("ArrowLeft"));
            const y =
              Number(keys.has("KeyS") || keys.has("ArrowDown")) -
              Number(keys.has("KeyW") || keys.has("ArrowUp"));
            camera.position.add(
              walkOffset(
                camera.getWorldDirection(new THREE.Vector3()),
                x,
                y,
                delta,
              ),
            );
            dirty = true;
          }
          const changed = !walking && controls.update();
          if (dirty || changed) {
            renderer.render(world, camera);
            dirty = false;
          }
        }
      });
      checkSupport();
      navigator.xr?.addEventListener("devicechange", checkSupport);
      return () => {
        alive = false;
        abort.abort();
        action.current = async () => {};
        reset.current = () => {};
        toggleWalk.current = () => {};
        jump.current = () => {};
        navigator.xr?.removeEventListener("devicechange", checkSupport);
        session?.removeEventListener("end", restoreDesktop);
        if (session) void session.end().catch(() => {});
        renderer.setAnimationLoop(null);
        observer.disconnect();
        controls.dispose();
        environmentTarget?.dispose();
        dispose();
        marker.geometry.dispose();
        marker.material.dispose();
        for (const line of lines) {
          line.geometry.dispose();
          (line.material as THREE.Material).dispose();
        }
        renderer.dispose();
        renderer.domElement.remove();
      };
    } catch {
      renderer?.setAnimationLoop(null);
      observer?.disconnect();
      controls?.dispose();
      environmentTarget?.dispose();
      dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      for (const line of lines) {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      action.current = async () => {};
      reset.current = () => {};
      toggleWalk.current = () => {};
      jump.current = () => {};
      setState("error");
      setError(
        "WebGL indisponível neste dispositivo. O download do modelo continua disponível.",
      );
      marker.geometry.dispose();
      marker.material.dispose();
      return () => {
        alive = false;
        abort.abort();
      };
    }
  }, [url]);
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg border">
        <div ref={host} className="aspect-[4/3] w-full" />
        {state === "loading" && (
          <p
            role="status"
            className="absolute inset-0 grid place-items-center bg-background/90"
          >
            Carregando modelo VR…
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {entryPoints.length > 0 && (
          <label className="text-sm">
            Ponto de entrada{" "}
            <select
              aria-label="Ponto de entrada"
              disabled={state !== "ready" || immersive}
              value={entry}
              className="rounded-lg border bg-background p-2"
              onChange={(event) => {
                setEntry(event.target.value);
                const point = entryPoints.find(
                  (point) => String(point.id) === event.target.value,
                );
                if (point) jump.current(point);
              }}
            >
              <option value="" disabled>
                Escolha uma cena…
              </option>
              {entryPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button
          type="button"
          variant={desktopWalking ? "primary" : "outline"}
          disabled={state !== "ready" || immersive}
          aria-pressed={desktopWalking}
          onClick={() => toggleWalk.current()}
        >
          {desktopWalking ? "Sair da caminhada" : "Caminhar no computador"}
        </Button>
        <Button
          type="button"
          disabled={state !== "ready" || !supported || pending}
          onClick={() => void action.current()}
        >
          {pending ? "Conectando…" : immersive ? "Sair do VR" : "Entrar em VR"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={state !== "ready" || immersive}
          onClick={() => reset.current()}
        >
          Restaurar visão
        </Button>
        <label className="text-sm">
          Navegação{" "}
          <select
            aria-label="Navegação VR"
            className="rounded-lg border bg-background p-2"
            value={movement}
            onChange={(event) => {
              const value = event.target.value as Mode;
              mode.current = value;
              setMovement(value);
            }}
          >
            <option value="teleport">Teletransporte</option>
            <option value="walk">Movimento livre</option>
          </select>
        </label>
      </div>
      {!supported && (
        <p role="status" className="text-sm text-muted-foreground">
          Explore o modelo com o mouse. Para entrar em VR, use um navegador e
          óculos compatíveis com WebXR em HTTPS (ou localhost no próprio
          computador).
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Para caminhar no computador, ative Caminhar no computador e use WASD ou
        as setas. Arraste com o botão esquerdo para olhar; Esc encerra a
        caminhada. Clique no modelo para devolver o foco ao teclado.
      </p>
      <p className="text-xs text-muted-foreground">
        No computador: arraste para girar, rodinha para aproximar e botão
        direito para mover. Nos óculos: olhe ao redor; no teletransporte, aponte
        para uma superfície horizontal e aperte o gatilho. No movimento livre,
        use o analógico. A navegação não tem colisões ou identificação
        automática do piso. A escala usa as unidades exportadas do modelo.
      </p>
    </div>
  );
}
