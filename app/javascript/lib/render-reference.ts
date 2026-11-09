import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { CameraView } from "../types/projects";

// Recovered markers use "scene:node"; other choices include an explicit kind.
export function referenceSceneIndex(key: string): number | "model" {
  const parts = key.split(":");
  const sceneId = ["scene", "camera", "manual", "marker"].includes(parts[0])
    ? parts[1]
    : parts[0];
  if (sceneId === "model" && key === "scene:model") return "model";
  if (!sceneId || !/^\d+$/.test(sceneId)) {
    throw new Error("Identificador de cena inválido para gerar referência.");
  }
  return Number(sceneId);
}

// Load full materials from the original GLB, independently of the lightweight preview.
export async function renderReferences(url: string, choices: { key: string; camera?: CameraView }[]) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(1024, 768);
  renderer.setClearColor("#e9edf0");
  const result: Record<string, string> = {};
  try {
    for (const choice of choices) {
      const sceneId = referenceSceneIndex(choice.key);
      const model = sceneId === "model" ? gltf.scene : gltf.scenes[sceneId];
      if (!model) throw new Error("Cena indisponível para gerar referência.");
      const scene = new THREE.Scene();
      scene.add(model);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 3));
      const bounds = new THREE.Box3().setFromObject(model);
      const size = Math.max(bounds.getSize(new THREE.Vector3()).length(), 0.1);
      const center = bounds.getCenter(new THREE.Vector3());
      const camera = new THREE.PerspectiveCamera(45, 4 / 3, size / 10000, size * 1000);
      if (choice.camera) {
        camera.position.fromArray(choice.camera.position);
        camera.rotation.set(...(choice.camera.rotation.map(THREE.MathUtils.degToRad) as [number, number, number]), "ZYX");
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(choice.camera.field_of_view) / 2) / camera.aspect));
      } else {
        camera.position.copy(center).add(new THREE.Vector3(size, size * 0.7, size));
        camera.lookAt(center);
      }
      camera.updateProjectionMatrix();
      await renderer.compileAsync(scene, camera);
      renderer.render(scene, camera);
      result[choice.key] = renderer.domElement.toDataURL("image/png");
      scene.remove(model);
    }
    return result;
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
    for (const scene of gltf.scenes) scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      }
    });
  }
}
