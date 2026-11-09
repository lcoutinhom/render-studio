import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { Link } from "@inertiajs/react";
import { Field, selectClass } from "./project-fields";
import { Button } from "./ui/button";
import { ConfirmAction } from "./confirm-action";
import type { Material, Mapping } from "../types/rendering";
import type { Environment } from "../types/projects";
export function MaterialMappingManager({
  base,
  mappings,
  materials,
  environments,
  sourceNames = [],
}: {
  base: string;
  mappings: Mapping[];
  materials: Material[];
  environments: Environment[];
  sourceNames?: string[];
}) {
  const [editing, setEditing] = useState<Mapping | null>(null);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Mapeamentos gerais valem para a versão inteira. Um mapeamento específico
        do ambiente prevalece sobre o geral de mesmo nome. A aplicação visual do
        material será realizada na futura integração de renderização.
      </p>
      {mappings.map((mapping) => (
        <div
          key={mapping.id}
          className="flex flex-wrap justify-between gap-3 rounded border p-3"
        >
          <div>
            <p className="text-sm">
              {mapping.source_material_name} → {mapping.material_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {mapping.environment_id
                ? environments.find((env) => env.id === mapping.environment_id)
                    ?.name
                : "Todos os ambientes da versão"}
              {!mapping.available ? " · Material removido; substitua-o" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(mapping)}
            >
              Editar mapeamento
            </Button>
            <ConfirmAction
              url={`${base}/${mapping.id}`}
              label="Remover mapeamento"
              description="As configurações já salvas mantêm os valores anteriores."
            />
          </div>
        </div>
      ))}
      {!materials.length ? (
        <p className="text-sm">
          Cadastre um material na{" "}
          <Link className="underline" href="/materials">
            biblioteca
          </Link>{" "}
          para associá-lo ao modelo.
        </p>
      ) : (
        <MappingForm
          key={editing?.id ?? "new"}
          base={base}
          mapping={editing}
          materials={materials}
          environments={environments}
          sourceNames={sourceNames}
          onDone={() => setEditing(null)}
        />
      )}
    </div>
  );
}
function MappingForm({
  base,
  mapping,
  materials,
  environments,
  sourceNames,
  onDone,
}: {
  base: string;
  mapping: Mapping | null;
  materials: Material[];
  environments: Environment[];
  sourceNames: string[];
  onDone: () => void;
}) {
  const form = useForm({
    mapping: {
      source_material_name: mapping?.source_material_name ?? "",
      environment_id: mapping?.environment_id?.toString() ?? "",
      material_id:
        mapping?.material_id?.toString() ?? materials[0]?.id.toString() ?? "",
    },
  });
  return (
    <form
      className="space-y-4 border-t pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const options = {
          preserveScroll: true,
          onSuccess: () => {
            form.reset();
            onDone();
          },
        };
        if (mapping) form.patch(`${base}/${mapping.id}`, options);
        else form.post(base, options);
      }}
    >
      <Field
        id="source-material"
        label="Nome do material no modelo"
        required
        list="source-materials"
        value={form.data.mapping.source_material_name}
        onChange={(e) =>
          form.setData("mapping", {
            ...form.data.mapping,
            source_material_name: e.target.value,
          })
        }
      />
      <datalist id="source-materials">
        {sourceNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <Field id="mapping-environment" label="Aplicar em">
        <select
          id="mapping-environment"
          className={selectClass}
          value={form.data.mapping.environment_id}
          onChange={(e) =>
            form.setData("mapping", {
              ...form.data.mapping,
              environment_id: e.target.value,
            })
          }
        >
          <option value="">Todos os ambientes desta versão</option>
          {environments.map((env) => (
            <option value={env.id} key={env.id}>
              {env.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="mapping-material" label="Material da biblioteca">
        <select
          id="mapping-material"
          className={selectClass}
          value={form.data.mapping.material_id}
          onChange={(e) =>
            form.setData("mapping", {
              ...form.data.mapping,
              material_id: e.target.value,
            })
          }
        >
          {materials.map((material) => (
            <option value={material.id} key={material.id}>
              {material.name}
            </option>
          ))}
        </select>
      </Field>
      <Button disabled={form.processing}>Salvar mapeamento</Button>
      {mapping && (
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar edição
        </Button>
      )}
    </form>
  );
}
