import { Head, Link, router } from "@inertiajs/react";
import { Palette, Plus } from "lucide-react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { Pagination } from "../../components/ui/pagination";
import { Field, selectClass } from "../../components/project-fields";
import { FilterDialog } from "../../components/filter-dialog";
import { IndexList, IndexRow } from "../../components/index-list";
import { materialCategories, type Material } from "../../types/rendering";
export default function Index({
  materials,
  categories,
  total,
  page,
  filters,
}: {
  materials: Material[];
  categories: string[];
  total: number;
  page: number;
  filters: { q: string; category: string };
}) {
  const paginate = (next: number) =>
    router.get("/materials", { ...filters, page: next });
  return (
    <AppLayout
      title="Materiais"
      description="Biblioteca de materiais PBR e texturas por canal."
      actions={
        <Button asChild>
          <Link href="/materials/new">
            <Plus />
            Novo material
          </Link>
        </Button>
      }
    >
      <Head title="Materiais" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] tabular-nums text-muted-foreground">
          {total} material(is) na biblioteca
        </p>
        <div className="flex gap-2">
          <FilterDialog
            href="/materials"
            filters={filters}
            defaults={{ q: "", category: "" }}
          >
            {(values, setValues) => (
              <>
                <Field
                  id="material-search"
                  label="Pesquisar materiais"
                  placeholder="Nome do material"
                  value={values.q}
                  onChange={(event) =>
                    setValues({ ...values, q: event.target.value })
                  }
                />
                <Field id="material-category" label="Categoria de materiais">
                  <select
                    id="material-category"
                    className={selectClass}
                    value={values.category}
                    onChange={(event) =>
                      setValues({ ...values, category: event.target.value })
                    }
                  >
                    <option value="">Todas</option>
                    {categories.map((key) => (
                      <option key={key} value={key}>
                        {materialCategories[key]}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </FilterDialog>
        </div>
      </div>
      <IndexList
        emptyIcon={Palette}
        empty={
          !materials.length
            ? "Nenhum material encontrado. Crie um material ou ajuste os filtros."
            : undefined
        }
      >
        {materials.map((material) => (
          <IndexRow key={material.id}>
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span
                aria-label={`Cor de ${material.name}`}
                role="img"
                className="size-10 shrink-0 rounded-md border shadow-xs"
                style={{ backgroundColor: material.base_color }}
              />
              <div className="min-w-0">
                <Link
                  href={`/materials/${material.id}`}
                  className="break-words font-medium hover:underline"
                >
                  {material.name}
                </Link>
                <p className="text-[13px] text-muted-foreground">
                  {materialCategories[material.category]}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/materials/${material.id}`}>
                Editar material e texturas
              </Link>
            </Button>
          </IndexRow>
        ))}
      </IndexList>
      <Pagination page={page} perPage={24} total={total} onPage={paginate} label="materiais" />
    </AppLayout>
  );
}
