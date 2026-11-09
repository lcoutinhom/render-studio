import { describe, expect, test } from "bun:test";
import { renderIssues } from "../../app/javascript/lib/render-readiness";
const project = { id: 1, status: "active" } as any;
const environment = { id: 2, status: "active" } as any;
const version = { id: 3, file: { url: "/original" } } as any;
const association = { project_version_id: 3, status: "validated" } as any;
const check = (
  p = project,
  e = environment,
  v = version,
  a = association,
  mappings: any[] = [],
) => renderIssues(p, e, v, a, mappings);
describe("render readiness", () => {
  test("does not require custom cameras, materials or presets", () =>
    expect(check()).toEqual([]));
  test("identifies missing model version", () =>
    expect(check(project, environment, null).map((i) => i.action)).toEqual([
      "Enviar modelo",
    ]));
  test("identifies missing original and association separately", () =>
    expect(check(project, environment, { id: 3 }, null)).toHaveLength(2));
  test("distinguishes pending and invalid associations", () => {
    expect(
      check(project, environment, version, {
        ...association,
        status: "pending",
      })[0].message,
    ).toContain("confirmar");
    expect(
      check(project, environment, version, {
        ...association,
        status: "invalid",
      })[0].message,
    ).toContain("inválida");
  });
  test("never accepts an association from another version", () =>
    expect(
      check(project, environment, version, {
        ...association,
        project_version_id: 4,
      })[0].action,
    ).toBe("Associar ambiente"));
  test("reports both archived project and environment", () =>
    expect(
      check(
        { ...project, status: "archived" },
        { ...environment, status: "archived" },
      ),
    ).toHaveLength(2));
  test("reports deleted effective materials with version-specific repair link", () => {
    const issues = check(project, environment, version, association, [
      {
        project_version_id: 3,
        environment_id: null,
        source_material_name: "Wood",
        material_name: "Madeira",
        available: false,
      },
    ]);
    expect(issues[0].message).toContain("Madeira");
    expect(issues[0].href).toContain("version_id=3&tab=materiais");
  });
  test("environment overrides replace global materials and unrelated mappings do not block", () =>
    expect(
      check(project, environment, version, association, [
        {
          project_version_id: 3,
          environment_id: null,
          source_material_name: "Wood",
          available: false,
        },
        {
          project_version_id: 3,
          environment_id: 2,
          source_material_name: "Wood",
          available: true,
        },
        {
          project_version_id: 3,
          environment_id: 99,
          source_material_name: "Other",
          available: false,
        },
        {
          project_version_id: 4,
          environment_id: null,
          source_material_name: "Other",
          available: false,
        },
      ]),
    ).toEqual([]));
});
