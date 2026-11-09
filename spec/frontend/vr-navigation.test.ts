import { expect, test } from "bun:test";
import * as THREE from "three";
import {
  teleportPosition,
  walkOffset,
} from "../../app/javascript/lib/vr-navigation";
test("teleport compensates room-scale head offset and uses target floor height", () => {
  const origin = new THREE.Vector3(2, 7, 3),
    head = new THREE.Vector3(4, 8.7, 9),
    target = new THREE.Vector3(10, 0, 20);
  const next = teleportPosition(origin, head, target);
  expect(next.toArray()).toEqual([8, 0, 14]);
  expect(head.clone().sub(origin).add(next).y).toBeCloseTo(1.7, 8);
  expect(origin.toArray()).toEqual([2, 7, 3]);
});
test("walking follows horizontal headset direction, honors dead zone and caps frame jumps", () => {
  const facing = new THREE.Vector3(0, 0.8, -1);
  expect(walkOffset(facing, 0, 0.1, 0.05).length()).toBe(0);
  const step = walkOffset(facing, 0, -1, 0.05);
  expect(step.z).toBeCloseTo(-0.075, 8);
  expect(step.y).toBe(0);
  const diagonal = walkOffset(facing, 1, -1, 10);
  expect(diagonal.length()).toBeCloseTo(0.075, 8);
  expect(diagonal.y).toBe(0);
  expect(walkOffset(facing, NaN, 0, 0.05).length()).toBe(0);
});
