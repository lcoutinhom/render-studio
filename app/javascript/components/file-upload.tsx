import { useForm } from "@inertiajs/react";
import { useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field } from "./project-fields";
export function FileUpload({
  url,
  revision = false,
  disabled = false,
}: {
  url: string;
  revision?: boolean;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const form = useForm<{ upload: { file: File | null; description: string } }>({
    upload: { file: null, description: "" },
  });
  return (
    <form
      className="space-y-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.post(url, {
          forceFormData: true,
          onSuccess: () => {
            form.reset();
            if (input.current) input.current.value = "";
          },
        });
      }}
    >
      <h3 className="font-medium">
        {revision
          ? "Enviar revisão deste arquivo"
          : "Adicionar arquivo ao projeto"}
      </h3>
      <p className="text-xs text-muted-foreground">
        GLB, ZIP glTF/OBJ ou DAE. Até 1 GiB por upload. Cada arquivo tem suas
        próprias revisões; os resultados anteriores são preservados.
      </p>
      <Field
        id="upload-description"
        label="Descrição do upload"
        value={form.data.upload.description}
        onChange={(e) =>
          form.setData("upload", {
            ...form.data.upload,
            description: e.target.value,
          })
        }
      />
      <Input
        ref={input}
        aria-label="Arquivo 3D"
        type="file"
        accept=".glb,.zip,.dae"
        disabled={disabled || form.processing}
        onChange={(e) =>
          form.setData("upload", {
            ...form.data.upload,
            file: e.target.files?.[0] ?? null,
          })
        }
      />
      {form.progress && (
        <progress
          className="w-full"
          max={100}
          value={form.progress.percentage}
        />
      )}
      <Button disabled={disabled || form.processing || !form.data.upload.file}>
        {form.processing
          ? "Enviando…"
          : revision
            ? "Enviar nova revisão"
            : "Enviar arquivo"}
      </Button>
    </form>
  );
}
