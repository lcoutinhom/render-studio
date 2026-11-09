import {
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { router } from "@inertiajs/react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Field, selectClass } from "./project-fields";
export type FilterValues = Record<string, string>;
export type FilterSetter = Dispatch<SetStateAction<FilterValues>>;
export function FilterDialog({
  href,
  filters,
  defaults = {},
  children,
}: {
  href: string;
  filters: FilterValues;
  defaults?: FilterValues;
  children: (values: FilterValues, setValues: FilterSetter) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ ...defaults, ...filters });
  const [busy, setBusy] = useState(false);
  const count = Object.entries(filters).filter(
    ([key, value]) => value && value !== (defaults[key] ?? ""),
  ).length;
  const visit = (next: FilterValues) =>
    router.get(href, next, {
      preserveState: false,
      onStart: () => setBusy(true),
      onSuccess: () => setOpen(false),
      onFinish: () => setBusy(false),
    });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (next) setValues({ ...defaults, ...filters });
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal />
          Filtros
          {count > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">
              <span className="sr-only">ativos: </span>
              {count}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filtrar listagem</DialogTitle>
          <DialogDescription>
            Escolha os critérios e aplique para atualizar os resultados.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            visit(values);
          }}
          className="space-y-4"
        >
          {children(values, setValues)}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => visit(defaults)}
            >
              Limpar filtros
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={busy}>
              {busy ? "Aplicando…" : "Aplicar filtros"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export type FilterOption = { id: number; name: string; project_id?: number };
export function ContextFilters({
  values,
  setValues,
  projects,
  environments,
  versions,
}: {
  values: FilterValues;
  setValues: FilterSetter;
  projects: FilterOption[];
  environments: FilterOption[];
  versions: FilterOption[];
}) {
  return (
    <>
      {(
        [
          ["project_id", "Projeto", projects],
          ["environment_id", "Ambiente", environments],
          ["version_id", "Versão", versions],
        ] as [string, string, FilterOption[]][]
      ).map(([key, label, options]) => (
        <Field key={key} id={`filter-${key}`} label={label}>
          <select
            id={`filter-${key}`}
            className={selectClass}
            value={values[key] || ""}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                ...(key === "project_id"
                  ? {
                      environment_id: "",
                      version_id: "",
                      ...("job_id" in previous ? { job_id: "" } : {}),
                      ...("batch_id" in previous ? { batch_id: "" } : {}),
                    }
                  : {}),
                [key]: event.target.value,
              }))
            }
          >
            <option value="">Todos</option>
            {options
              .filter(
                (option) =>
                  key === "project_id" ||
                  !values.project_id ||
                  String(option.project_id) === values.project_id,
              )
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
          </select>
        </Field>
      ))}
    </>
  );
}
