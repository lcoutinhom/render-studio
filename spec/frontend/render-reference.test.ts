import { describe, expect, test } from "bun:test";
import { referenceSceneIndex } from "../../app/javascript/lib/render-reference";

describe("reference scene selection", () => {
  test("uses the scene, rather than the node, for recovered markers", () => {
    expect(referenceSceneIndex("0:157")).toBe(0);
    expect(referenceSceneIndex("2:531")).toBe(2);
  });
  test("resolves exported, manual, automatic and prefixed marker choices", () => {
    for (const key of ["camera:2:157", "manual:2:uuid", "scene:2", "marker:2:157"]) {
      expect(referenceSceneIndex(key)).toBe(2);
    }
    expect(referenceSceneIndex("scene:model")).toBe("model");
  });
  test("rejects invalid scenes instead of choosing a different view", () => {
    for (const key of ["", "camera:invalid:157", "scene:-1", "manual:"]) {
      expect(() => referenceSceneIndex(key)).toThrow();
    }
  });
});
