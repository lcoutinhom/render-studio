import { useForm } from "@inertiajs/react";
import { useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field } from "./project-fields";
export function VersionUpload({
  projectId,
  archived,
}: {
  projectId: number;
  archived: boolean;
}) {
  const form = useForm<{ version: { file: File | null; description: string } }>(
    { version: { file: null, description: "" } },
  );
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.post(`/projects/${projectId}/versions`, {
          forceFormData: true,
          onSuccess: () => {
            form.reset();
            if (input.current) input.current.value = "";
          },
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        Um arquivo por versão, compartilhado por todos os ambientes. GLB, ZIP
        contendo glTF/OBJ e dependências, ou DAE sem texturas externas. Até 1
        GiB (1024 MB). SKP ainda não é suportado.
      </p>
      <Field
        id="version-description"
        label="Descrição da nova versão"
        value={form.data.version.description}
        onChange={(e) =>
          form.setData("version", {
            ...form.data.version,
            description: e.target.value,
          })
        }
      />
      <Input
        ref={input}
        aria-label="Arquivo do modelo"
        type="file"
        required
        accept=".glb,.zip,.dae"
        disabled={archived}
        onChange={(e) =>
          form.setData("version", {
            ...form.data.version,
            file: e.target.files?.[0] ?? null,
          })
        }
      />
      {form.progress && (
        <progress
          aria-label="Progresso de upload"
          max="100"
          value={form.progress.percentage}
          className="w-full"
        />
      )}
      <Button
        type="submit"
        disabled={form.processing || archived || !form.data.version.file}
      >
        {form.processing ? "Enviando…" : "Enviar nova versão"}
      </Button>
      {archived && (
        <p className="text-sm">
          Projetos arquivados não recebem novas versões.
        </p>
      )}
    </form>
  );
}
