import * as THREE from "three";
import type { CameraView } from "../types/projects";
export function cameraView(camera: THREE.PerspectiveCamera): CameraView {
  const angles = new THREE.Euler().setFromQuaternion(camera.quaternion, "ZYX");
  const horizontalFov = THREE.MathUtils.radToDeg(
    2 *
      Math.atan(
        Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect,
      ),
  );
  return {
    position: camera.position.toArray(),
    rotation: [angles.x, angles.y, angles.z].map(THREE.MathUtils.radToDeg),
    focal_length:
      36 / (2 * Math.tan(THREE.MathUtils.degToRad(horizontalFov) / 2)),
    field_of_view: horizontalFov,
    projection_type: "perspective",
  };
}
export function worldCamera(
  source: THREE.PerspectiveCamera,
  aspect: number,
): THREE.PerspectiveCamera {
  source.updateWorldMatrix(true, false);
  const camera = source.clone();
  source.matrixWorld.decompose(
    camera.position,
    camera.quaternion,
    camera.scale,
  );
  camera.scale.set(1, 1, 1);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

// Empty source nodes have a pose but no lens. Only use them after a manual choice.
export function markerCamera(source: THREE.Object3D): THREE.PerspectiveCamera {
  source.updateWorldMatrix(true, false);
  const camera = new THREE.PerspectiveCamera(45, 4 / 3);
  source.matrixWorld.decompose(
    camera.position,
    camera.quaternion,
    camera.scale,
  );
  camera.scale.set(1, 1, 1);
  camera.filmGauge = 36;
  camera.setFocalLength(35);
  camera.updateMatrixWorld(true);
  return camera;
}
