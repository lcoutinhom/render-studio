import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { SettingsEditor, VideoPathEditor } from "./settings-editor";
import { Button } from "./ui/button";
import { sections, type Schema, type Settings } from "../types/rendering";
export function RenderPreferences({
  url,
  values,
  base,
  schema,
  label,
}: {
  url: string;
  values: Settings;
  base: Settings;
  schema: Schema;
  label: string;
}) {
  const form = useForm({ settings: values });
  const [tab, setTab] = useState("general");
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        form.put(url, { preserveScroll: true });
      }}
    >
      <p className="text-sm text-muted-foreground">
        {label}. Campos herdados acompanham os valores anteriores da hierarquia;
        personalize apenas o que precisar.
      </p>
      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList
          aria-label={label}
          className="flex h-auto w-full flex-wrap gap-2"
        >
          {Object.entries(sections)
            .filter(([key]) => !["materials", "cameras"].includes(key))
            .map(([key, title]) => (
              <TabsTrigger key={key} value={key}>
                {title}
              </TabsTrigger>
            ))}
        </TabsList>
        <TabsContent value={tab}>
          <SettingsEditor
            schema={schema}
            value={form.data.settings}
            base={base}
            section={tab}
            onChange={(settings) => form.setData("settings", settings)}
          />
          {tab === "video" && (
            <div className="mt-5">
              <VideoPathEditor
                value={form.data.settings.video_path ?? base.video_path}
                onChange={(points) =>
                  form.setData("settings", {
                    ...form.data.settings,
                    video_path: points,
                  })
                }
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
      <div className="flex flex-wrap gap-3">
        <Button disabled={form.processing}>Salvar configurações</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => form.setData("settings", {})}
        >
          Restaurar toda a herança
        </Button>
      </div>
    </form>
  );
}
