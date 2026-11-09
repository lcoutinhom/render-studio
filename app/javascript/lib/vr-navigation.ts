import * as THREE from "three";
export function teleportPosition(
  origin: THREE.Vector3,
  head: THREE.Vector3,
  target: THREE.Vector3,
) {
  return new THREE.Vector3(
    origin.x + target.x - head.x,
    target.y,
    origin.z + target.z - head.z,
  );
}
export function walkOffset(
  direction: THREE.Vector3,
  x: number,
  y: number,
  seconds: number,
) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < 0.2)
    return new THREE.Vector3();
  const stick = new THREE.Vector2(x, y).clampLength(0, 1);
  const forward = direction.clone().setY(0).normalize();
  const right = new THREE.Vector3().crossVectors(
    forward,
    new THREE.Vector3(0, 1, 0),
  );
  return forward
    .multiplyScalar(-stick.y)
    .addScaledVector(right, stick.x)
    .multiplyScalar(Math.max(0, Math.min(seconds, 0.05)) * 1.5);
}
