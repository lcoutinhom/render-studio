import type {
  Project,
  Environment,
  ModelVersion,
  Association,
} from "../types/projects";
import type { Mapping } from "../types/rendering";
export type RenderIssue = { message: string; action: string; href: string };
export function renderIssues(
  project: Project,
  environment: Environment,
  version: ModelVersion | null,
  association: Association | null | undefined,
  mappings: Mapping[] = [],
): RenderIssue[] {
  const issues: RenderIssue[] = [];
  const base = `/projects/${project.id}/environments/${environment.id}`;
  const context = `${base}?${version ? `version_id=${version.id}&` : ""}`;
  if (project.status !== "active")
    issues.push({
      message: "O projeto está arquivado.",
      action: "Ativar projeto",
      href: `/projects/${project.id}/edit`,
    });
  if (environment.status !== "active")
    issues.push({
      message: "O ambiente está arquivado.",
      action: "Ativar ambiente",
      href: `${base}/edit`,
    });
  if (!version)
    issues.push({
      message: "Falta enviar uma versão do modelo 3D.",
      action: "Enviar modelo",
      href: `/projects/${project.id}#versions`,
    });
  else {
    if (!version.file)
      issues.push({
        message: "Esta versão não possui arquivo 3D original.",
        action: "Enviar nova versão",
        href: `/projects/${project.id}#versions`,
      });
    if (!association || association.project_version_id !== version.id)
      issues.push({
        message: "O ambiente ainda não foi associado a esta versão do modelo.",
        action: "Associar ambiente",
        href: `${context}tab=associacao`,
      });
    else if (association.status !== "validated")
      issues.push({
        message:
          association.status === "invalid"
            ? "A associação está inválida. Revise quais objetos ou cena pertencem ao ambiente."
            : "Falta revisar e confirmar a associação do ambiente ao modelo.",
        action: "Revisar associação",
        href: `${context}tab=associacao`,
      });
    const effective = new Map<string, Mapping>();
    for (const mapping of mappings.filter(
      (m) => m.project_version_id === version.id && m.environment_id === null,
    ))
      effective.set(mapping.source_material_name, mapping);
    for (const mapping of mappings.filter(
      (m) =>
        m.project_version_id === version.id &&
        m.environment_id === environment.id,
    ))
      effective.set(mapping.source_material_name, mapping);
    for (const mapping of effective.values())
      if (!mapping.available)
        issues.push({
          message: `O material “${mapping.material_name}” foi excluído e ainda substitui “${mapping.source_material_name}”.`,
          action: "Corrigir material",
          href: `${context}tab=materiais`,
        });
  }
  return issues;
}
