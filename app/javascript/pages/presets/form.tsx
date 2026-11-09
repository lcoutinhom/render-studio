import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import { Head, Link, useForm } from "@inertiajs/react";
import { useState } from "react";
import { AppLayout } from "../../layouts/app-layout";
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Field, selectClass } from "../../components/project-fields";
import {
  SettingsEditor,
  VideoPathEditor,
} from "../../components/settings-editor";
import { sections, type Preset, type Schema } from "../../types/rendering";
export default function Form({
  preset,
  schema,
}: {
  preset: Preset | null;
  schema: Schema;
}) {
  const [tab, setTab] = useState("general");
  const form = useForm({
    preset: {
      name: preset?.name ?? "",
      description: preset?.description ?? "",
      category: preset?.category ?? "custom",
      settings: preset?.settings ?? {},
    },
  });
  return (
    <AppLayout
      title={preset ? "Editar preset" : "Novo preset"}
      description="Personalize apenas os campos que este preset deve definir. Valores de projeto, ambiente e solicitação poderão sobrescrevê-los."
      breadcrumbs={[{ label: "Presets", href: "/presets" }]}
    >
      <Head title="Preset" />
      <Card className="max-w-4xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (preset) form.patch(`/presets/${preset.id}`);
              else form.post("/presets");
            }}
          >
          <CardContent className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="preset-name"
              label="Nome do preset"
              required
              maxLength={120}
              value={form.data.preset.name}
              onChange={(e) =>
                form.setData("preset", {
                  ...form.data.preset,
                  name: e.target.value,
                })
              }
            />
            <Field id="preset-category" label="Categoria do preset">
              <select
                id="preset-category"
                className={selectClass}
                value={form.data.preset.category}
                onChange={(e) =>
                  form.setData("preset", {
                    ...form.data.preset,
                    category: e.target.value,
                  })
                }
              >
                <option value="custom">Personalizado</option>
                <option value="quality">Qualidade</option>
                <option value="lighting">Iluminação</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
            <Field
              id="preset-description"
              label="Descrição"
              value={form.data.preset.description}
              onChange={(e) =>
                form.setData("preset", {
                  ...form.data.preset,
                  description: e.target.value,
                })
              }
            />
            </div>
            </div>
            <section className="space-y-4 border-t pt-6" aria-labelledby="preset-settings">
            <h2 id="preset-settings" className="text-[15px] font-semibold">Valores do preset</h2>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList
                variant="line"
                aria-label="Configurações do preset"
              >
                {Object.entries(sections)
                  .filter(([key]) => !["materials", "cameras"].includes(key))
                  .map(([key, label]) => (
                    <TabsTrigger key={key} value={key}>
                      {label}
                    </TabsTrigger>
                  ))}
              </TabsList>
              <TabsContent value={tab}>
                <SettingsEditor
                  schema={schema}
                  value={form.data.preset.settings}
                  section={tab}
                  onChange={(settings) =>
                    form.setData("preset", { ...form.data.preset, settings })
                  }
                />
                {tab === "video" && (
                  <VideoPathEditor
                    value={form.data.preset.settings.video_path}
                    onChange={(points) =>
                      form.setData("preset", {
                        ...form.data.preset,
                        settings: {
                          ...form.data.preset.settings,
                          video_path: points,
                        },
                      })
                    }
                  />
                )}
              </TabsContent>
            </Tabs>
            </section>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost">
              <Link href="/presets">Cancelar</Link>
            </Button>
            <Button type="submit" loading={form.processing}>Salvar preset</Button>
          </CardFooter>
          </form>
      </Card>
    </AppLayout>
  );
}
