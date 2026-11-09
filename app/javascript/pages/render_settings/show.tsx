import { Head, useForm } from "@inertiajs/react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { ProjectConfigEditor } from "../../components/project-config-editor";
import type { Schema, Settings, Preset } from "../../types/rendering";
export default function Defaults({
  settings,
  schema,
  presets,
}: {
  settings: Settings;
  schema: Schema;
  presets: Preset[];
}) {
  const form = useForm({ settings });
  return (
    <AppLayout
      title="Padrão de renderização"
      description="Novos projetos recebem uma cópia deste padrão. Alterar o padrão não modifica projetos existentes nem resultados anteriores."
    >
      <Head title="Padrão geral" />
      <Card>
        <CardContent>
          <ProjectConfigEditor
            schema={schema}
            value={form.data.settings}
            onChange={(settings) => form.setData("settings", settings)}
            presets={presets}
          />
        </CardContent>
        <CardFooter className="sticky bottom-0 rounded-b-lg backdrop-blur">
          {form.isDirty && (
            <p className="mr-auto text-[13px] text-muted-foreground" role="status">
              Alterações não salvas
            </p>
          )}
          <Button loading={form.processing} onClick={() => form.put("/render_defaults")}>
            Salvar padrão geral
          </Button>
        </CardFooter>
      </Card>
    </AppLayout>
  );
}
