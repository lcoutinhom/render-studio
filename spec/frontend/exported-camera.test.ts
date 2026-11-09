import { expect, test } from "bun:test";
import * as THREE from "three";
import {
  cameraView,
  worldCamera,
} from "../../app/javascript/lib/exported-camera";
test("exported camera includes parent translation and orientation", () => {
  const parent = new THREE.Group();
  parent.position.set(8, 2, 3);
  parent.rotation.set(0, Math.PI / 3, 0);
  const source = new THREE.PerspectiveCamera(45, 1);
  source.position.set(1, 2, 4);
  source.rotation.set(0.2, 0.3, 0.4);
  parent.add(source);
  const result = worldCamera(source, 4 / 3);
  expect(
    result.position.distanceTo(source.getWorldPosition(new THREE.Vector3())),
  ).toBeLessThan(1e-9);
  expect(
    result.quaternion.angleTo(
      source.getWorldQuaternion(new THREE.Quaternion()),
    ),
  ).toBeLessThan(1e-7);
  expect(result.parent).toBeNull();
  expect(result.aspect).toBe(4 / 3);
});
test("camera view preserves lens/FOV and orientation in portrait and landscape", () => {
  for (const aspect of [0.6, 4 / 3, 2]) {
    const source = new THREE.PerspectiveCamera(45, aspect);
    source.rotation.set(0.3, 0.7, 0.2);
    source.position.set(2, 3, 4);
    const result = cameraView(source);
    expect(result.position).toEqual([2, 3, 4]);
    expect(result.focal_length).toBeCloseTo(
      36 / (2 * Math.tan((result.field_of_view * Math.PI) / 360)),
      8,
    );
    const angles = result.rotation.map(THREE.MathUtils.degToRad);
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(angles[0], angles[1], angles[2], "ZYX"),
    );
    expect(q.angleTo(source.quaternion)).toBeLessThan(1e-7);
  }
});

test("empty marker pose is recovered only with an explicit approximate 35mm lens", async () => {
  const { markerCamera } =
    await import("../../app/javascript/lib/exported-camera");
  const parent = new THREE.Group();
  parent.position.set(4, 5, 6);
  parent.scale.setScalar(0.01);
  parent.rotation.set(0.3, 0.5, 0);
  const marker = new THREE.Object3D();
  marker.position.set(100, 200, 150);
  marker.rotation.set(0.4, 0.7, 0.1);
  parent.add(marker);
  const recovered = markerCamera(marker);
  expect(
    recovered.position.distanceTo(marker.getWorldPosition(new THREE.Vector3())),
  ).toBeLessThan(1e-9);
  expect(
    recovered.quaternion.angleTo(
      marker.getWorldQuaternion(new THREE.Quaternion()),
    ),
  ).toBeLessThan(1e-7);
  expect(cameraView(recovered).focal_length).toBeCloseTo(35, 8);
});
