import { Head, Link, useForm } from "@inertiajs/react";
import { useRef } from "react";
import { AppLayout } from "../../layouts/app-layout";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Field,
  selectClass,
  textareaClass,
} from "../../components/project-fields";
import { ConfirmAction } from "../../components/confirm-action";
import {
  materialCategories,
  textureSlots,
  type Material,
} from "../../types/rendering";
type Texture = {
  id: number;
  slot: string;
  url: string;
  filename: string;
  metadata: { width: number; height: number };
};
export default function Form({
  material,
  textures,
  categories,
  slots,
}: {
  material: Material | null;
  textures: Texture[];
  categories: string[];
  slots: string[];
}) {
  const form = useForm({
    material: {
      name: material?.name ?? "",
      description: material?.description ?? "",
      category: material?.category ?? "wood",
      base_color: material?.base_color ?? "#cccccc",
      roughness: material?.roughness ?? 0.5,
      metallic: material?.metallic ?? 0,
      transmission: material?.transmission ?? 0,
      ior: material?.ior ?? 1.45,
    },
  });
  return (
    <AppLayout
      title={material ? "Editar material" : "Novo material"}
      description="Propriedades físicas do material e texturas por canal."
      breadcrumbs={[{ label: "Materiais", href: "/materials" }]}
    >
      <Head title="Material" />
      <Card className="max-w-3xl">
        <CardHeader description="Valores usados pelo motor de renderização.">
          <CardTitle>Propriedades PBR</CardTitle>
        </CardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (material) form.patch(`/materials/${material.id}`);
              else form.post("/materials");
            }}
          >
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="material-name"
              label="Nome do material"
              required
              maxLength={120}
              value={form.data.material.name}
              onChange={(e) =>
                form.setData("material", {
                  ...form.data.material,
                  name: e.target.value,
                })
              }
            />
            <Field id="material-category" label="Categoria">
              <select
                id="material-category"
                className={selectClass}
                value={form.data.material.category}
                onChange={(e) =>
                  form.setData("material", {
                    ...form.data.material,
                    category: e.target.value,
                  })
                }
              >
                {categories.map((key) => (
                  <option value={key} key={key}>
                    {materialCategories[key]}
                  </option>
                ))}
              </select>
            </Field>
            </div>
            <Field id="material-description" label="Descrição">
              <textarea
                id="material-description"
                className={textareaClass}
                value={form.data.material.description}
                onChange={(e) =>
                  form.setData("material", {
                    ...form.data.material,
                    description: e.target.value,
                  })
                }
              />
            </Field>
            <Field
              id="base-color"
              label="Cor base"
              className="h-10 w-24 cursor-pointer p-1"
              type="color"
              value={form.data.material.base_color}
              onChange={(e) =>
                form.setData("material", {
                  ...form.data.material,
                  base_color: e.target.value,
                })
              }
            />
            <div className="grid gap-5 border-t pt-5 sm:grid-cols-2">
              {(
                [
                  { key: "roughness", label: "Rugosidade", min: 0, max: 1 },
                  { key: "metallic", label: "Metallic", min: 0, max: 1 },
                  { key: "transmission", label: "Transmissão", min: 0, max: 1 },
                  {
                    key: "ior",
                    label: "Índice de refração (IOR)",
                    min: 1,
                    max: 3,
                  },
                ] as const
              ).map((field) => (
                <Field
                  key={field.key}
                  id={field.key}
                  label={field.label}
                  type="number"
                  min={field.min}
                  max={field.max}
                  step="0.01"
                  value={form.data.material[field.key]}
                  onChange={(e) =>
                    form.setData("material", {
                      ...form.data.material,
                      [field.key]: Number(e.target.value),
                    })
                  }
                />
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" asChild>
              <Link href="/materials">Voltar à biblioteca</Link>
            </Button>
            <Button type="submit" loading={form.processing}>Salvar material</Button>
          </CardFooter>
          </form>
      </Card>
      {material && (
        <Card className="max-w-3xl">
          <CardHeader description="PNG ou JPEG até 20 MiB e 16384 px por dimensão. Substituir ou remover uma textura preserva as revisões usadas nas configurações anteriores.">
            <CardTitle>Texturas privadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {textures.map((texture) => (
                <div className="overflow-hidden rounded-lg border" key={texture.id}>
                  <img
                    src={texture.url}
                    alt={textureSlots[texture.slot]}
                    loading="lazy"
                    className="aspect-[4/3] w-full bg-muted object-contain"
                  />
                  <div className="space-y-2 border-t p-3">
                  <p className="text-sm font-medium">
                    {textureSlots[texture.slot]}{" "}
                    <span className="font-normal tabular-nums text-muted-foreground">
                      · {texture.metadata.width} × {texture.metadata.height}
                    </span>
                  </p>
                  <a className="block break-all text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" href={texture.url}>
                    {texture.filename}
                  </a>
                  <ConfirmAction
                    url={`/materials/${material.id}/textures/${texture.id}`}
                    label="Remover textura"
                    description="A revisão continua preservada para as configurações anteriores."
                  />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-5">
              <h3 className="mb-4 text-sm font-semibold">Adicionar textura</h3>
              <TextureForm materialId={material.id} slots={slots} />
            </div>
          </CardContent>
        </Card>
      )}
      {material && (
        <Card className="max-w-3xl border-destructive/25">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Excluir material</h2>
              <p className="text-[13px] text-muted-foreground">
                Mapeamentos atuais precisarão ser revisados. As configurações já salvas não mudam.
              </p>
            </div>
            <ConfirmAction
              url={`/materials/${material.id}`}
              label="Excluir material"
              description="Mapeamentos atuais precisarão ser revisados. As configurações já salvas não mudam."
            />
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
function TextureForm({
  materialId,
  slots,
}: {
  materialId: number;
  slots: string[];
}) {
  const form = useForm<{ texture: { slot: string; file: File | null } }>({
    texture: { slot: slots[0], file: null },
  });
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.post(`/materials/${materialId}/textures`, {
          forceFormData: true,
          preserveScroll: true,
          onSuccess: () => {
            form.reset();
            if (input.current) input.current.value = "";
          },
        });
      }}
    >
      <Field id="texture-slot" label="Canal da textura">
        <select
          id="texture-slot"
          className={selectClass}
          value={form.data.texture.slot}
          onChange={(e) =>
            form.setData("texture", {
              ...form.data.texture,
              slot: e.target.value,
            })
          }
        >
          {slots.map((key) => (
            <option value={key} key={key}>
              {textureSlots[key]}
            </option>
          ))}
        </select>
      </Field>
      <Input
        ref={input}
        aria-label="Arquivo de textura"
        type="file"
        accept="image/png,image/jpeg"
        required
        onChange={(e) =>
          form.setData("texture", {
            ...form.data.texture,
            file: e.target.files?.[0] ?? null,
          })
        }
      />
      {form.progress && (
        <progress
          max={100}
          value={form.progress.percentage}
          aria-label="Progresso da textura"
        />
      )}
      <Button type="submit" variant="outline" loading={form.processing} disabled={!form.data.texture.file}>
        Enviar textura
      </Button>
    </form>
  );
}
