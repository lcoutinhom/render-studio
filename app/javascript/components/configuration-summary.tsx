import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { Snapshot, Schema } from "../types/rendering";
export function ConfigurationSummary({
  snapshot,
  schema,
}: {
  snapshot: Snapshot;
  schema: Schema;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Versão {snapshot.version_number} · {snapshot.environments.length}{" "}
        ambiente(s) · Preset: {snapshot.preset?.name ?? "Padrões do sistema"}.
        Campos omitidos herdam os valores anteriores; sobrescritas prevalecem.
        Câmeras e materiais abaixo são as revisões desta configuração.
      </p>
      {snapshot.environments.map((environment) => (
        <Card key={environment.environment_id}>
          <CardHeader>
            <CardTitle>{environment.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
              {schema.definitions.map((field) => {
                const value = environment.effective_settings[field.key];
                const label =
                  field.type === "boolean"
                    ? value
                      ? "Sim"
                      : "Não"
                    : (field.options?.[String(value)] ?? String(value));
                return (
                  <div key={field.key}>
                    <dt className="text-xs text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd className="text-sm font-medium">{label}</dd>
                    <dd className="text-xs text-muted-foreground">
                      Origem: {environment.origins[field.key]}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="text-sm">
              Trajetória:{" "}
              {Array.isArray(environment.effective_settings.video_path) &&
              environment.effective_settings.video_path.length
                ? `${environment.effective_settings.video_path.length} pontos`
                : "automática"}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold">Câmeras</h4>
                {environment.cameras.length ? (
                  <ul className="text-sm">
                    {environment.cameras.map((camera) => (
                      <li key={camera.id}>
                        {camera.name} · {camera.focal_length} mm · Posição{" "}
                        {camera.position.join(", ")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enquadramento automático do ambiente.
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold">Materiais</h4>
                {environment.materials.length ? (
                  <ul className="space-y-2 text-sm">
                    {environment.materials.map((mapping) => (
                      <li key={mapping.source_material_name}>
                        {mapping.source_material_name} → {mapping.material.name}
                        <span className="block text-xs text-muted-foreground">
                          {mapping.textures.length} textura(s) preservada(s) ·
                          Cor {mapping.material.base_color}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Materiais originais do modelo.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
