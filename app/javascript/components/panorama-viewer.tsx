import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
export default function PanoramaViewer({ url }: { url: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setError(
        "Visualização 360° indisponível neste dispositivo. Use a imagem plana ou baixe o original.",
      );
      return;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
    camera.position.z = 0.01;
    const geometry = new THREE.SphereGeometry(10, 64, 32);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    scene.add(new THREE.Mesh(geometry, material));
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = -0.3;
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Panorama 360 graus: arraste para olhar ao redor",
    );
    renderer.domElement.tabIndex = 0;
    const keydown = (event: KeyboardEvent) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      camera.rotateY(
        event.key === "ArrowLeft"
          ? 0.05
          : event.key === "ArrowRight"
            ? -0.05
            : 0,
      );
      camera.rotateX(
        event.key === "ArrowUp" ? 0.05 : event.key === "ArrowDown" ? -0.05 : 0,
      );
    };
    renderer.domElement.addEventListener("keydown", keydown);
    let disposed = false;
    let texture: THREE.Texture | undefined;
    new THREE.TextureLoader().load(
      url,
      (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        texture = loaded;
        const image = loaded.image as HTMLImageElement;
        if (image.width !== 2 * image.height) {
          setError(
            "O panorama precisa ter projeção equiretangular na proporção 2:1. Use a imagem plana.",
          );
          return;
        }
        loaded.colorSpace = THREE.SRGBColorSpace;
        material.map = loaded;
        material.needsUpdate = true;
      },
      undefined,
      () => {
        if (!disposed)
          setError(
            "Não foi possível carregar o panorama. Tente baixar o original.",
          );
      },
    );
    const observer = new ResizeObserver(() => {
      camera.aspect = element.clientWidth / 400;
      camera.updateProjectionMatrix();
      renderer.setSize(element.clientWidth, 400);
    });
    observer.observe(element);
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });
    return () => {
      disposed = true;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("keydown", keydown);
      controls.dispose();
      texture?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url]);
  return (
    <div>
      <p className="mb-2 text-sm">
        Arraste para olhar ao redor ou use as setas com o visualizador
        selecionado.
      </p>
      {error && (
        <p role="alert" className="mb-2 text-sm">
          {error}
        </p>
      )}
      <div
        ref={host}
        className="h-[400px] w-full overflow-hidden rounded-md bg-black"
      />
    </div>
  );
}
