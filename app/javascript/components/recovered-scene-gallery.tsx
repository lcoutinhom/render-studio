import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
type View = { id: string; name: string; approximate?: boolean };
export function RecoveredSceneGallery({
  views,
  generate,
  onPreview,
  onCreate,
  onCreateMany,
  selectedKeys,
  onSelectionChange,
}: {
  views: View[];
  generate: (
    ids: string[],
    signal: AbortSignal,
    onImage?: (id: string, image: string) => void,
    width?: number,
  ) => Promise<Record<string, string>>;
  onPreview: (id: string) => void;
  onCreate?: (view: View) => void;
  onCreateMany?: (views: View[]) => Promise<boolean>;
  selectedKeys?: string[];
  onSelectionChange?: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [localSelection, setLocalSelection] = useState<string[]>([]);
  const selection = selectedKeys ?? localSelection;
  const setSelection = (
    update: string[] | ((previous: string[]) => string[]),
  ) => {
    const next = typeof update === "function" ? update(selection) : update;
    if (onSelectionChange) onSelectionChange(next);
    else setLocalSelection(next);
  };
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [page, setPage] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState<View | null>(null);
  const [expandedImage, setExpandedImage] = useState("");
  const [expanding, setExpanding] = useState(false);
  const [expandError, setExpandError] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    setExpanding(true);
    setExpandError(false);
    void generate([expanded.id], controller.signal, undefined, 960)
      .then((result) => {
        if (!controller.signal.aborted) {
          if (result[expanded.id]) setExpandedImage(result[expanded.id]);
          else setExpandError(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setExpandError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setExpanding(false);
      });
    return () => controller.abort();
  }, [expanded, generate]);
  const filtered = views.filter((view) =>
    view.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const shown = filtered.slice(page * 12, (page + 1) * 12);
  const ids = JSON.stringify(shown.map((view) => view.id));
  useEffect(() => {
    const controller = new AbortController();
    setImages({});
    setBusy(true);
    setFailed(false);
    const timeout = window.setTimeout(() => {
      void generate(
        JSON.parse(ids) as string[],
        controller.signal,
        (id, image) => {
          if (!controller.signal.aborted)
            setImages((previous) => ({ ...previous, [id]: image }));
        },
      )
        .then((result) => {
          if (!controller.signal.aborted) setImages(result);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [ids, generate]);
  return (
    <section
      className="space-y-4 rounded-lg border p-4"
      aria-label="Galeria de cenas recuperadas"
    >
      <div className="space-y-1">
        <h3 className="font-medium">
          {onSelectionChange
            ? "Cenas e fotografias do arquivo"
            : "Cenas recuperadas do SketchUp"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {onSelectionChange
            ? "Marque as cenas e fotografias que deseja renderizar. Câmeras exportadas preservam a lente; pontos recuperados usam uma lente estimada de 35 mm. Confira as prévias e o resumo antes de enviar."
            : "Escolha uma prévia para conferir o ângulo. Pontos nomeados são apresentados como vistas aproximadas, com lente estimada de 35 mm. Confira a imagem antes de criar a câmera."}
        </p>
      </div>
      <label className="block text-sm" htmlFor="recovered-scene-search">
        Pesquisar cenas recuperadas
      </label>
      <Input
        id="recovered-scene-search"
        placeholder="Ex.: COZINHA, JANTAR, SALA…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(0);
        }}
      />
      <p className="text-xs text-muted-foreground">
        {filtered.length} vista(s) encontrada(s). Prévias carregadas em grupos
        de até 12 para manter a página leve.
      </p>
      {(onCreateMany || onSelectionChange) && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <p className="text-sm font-medium">
            {selection.length} cena(s) selecionada(s){" "}
            {onSelectionChange ? "para renderizar" : "para criar câmeras"}
          </p>
          <p className="text-xs text-muted-foreground">
            {onSelectionChange
              ? "A seleção é mantida ao pesquisar, trocar de página ou abrir outra cena. As vistas recuperadas usam lente estimada; as câmeras exportadas preservam a lente. Confira o resumo antes de renderizar. Limite de 100 seleções."
              : "A seleção é mantida ao pesquisar e trocar de página. Cada cena selecionada cria uma câmera com lente estimada de 35 mm. Limite de 100 por vez."}
          </p>
          {selection.length > 0 && (
            <p className="break-words text-xs">
              {views
                .filter((view) => selection.includes(view.id))
                .map((view) => view.name)
                .join(" · ")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                saving ||
                selection.length >= 100 ||
                shown.every((view) => selection.includes(view.id))
              }
              onClick={() =>
                setSelection((previous) =>
                  [
                    ...new Set([...previous, ...shown.map((view) => view.id)]),
                  ].slice(0, 100),
                )
              }
            >
              Selecionar esta página
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving || !selection.length}
              onClick={() => setSelection([])}
            >
              Limpar seleção
            </Button>
            {!onSelectionChange && onCreateMany && (
              <Button
                type="button"
                disabled={saving || !selection.length}
                onClick={async () => {
                  setSaving(true);
                  setSaveError("");
                  try {
                    if (
                      await onCreateMany(
                        views.filter((view) => selection.includes(view.id)),
                      )
                    )
                      setSelection([]);
                    else
                      setSaveError(
                        "Não foi possível criar as câmeras. Confira a mensagem do formulário e tente novamente.",
                      );
                  } catch {
                    setSaveError(
                      "Não foi possível criar as câmeras. Tente novamente.",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving
                  ? "Criando câmeras…"
                  : `Criar ${selection.length} câmera(s) selecionada(s)`}
              </Button>
            )}
          </div>
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          )}
        </div>
      )}
      {!shown.length && (
        <p className="text-sm">Nenhuma cena encontrada com esse nome.</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((view) => (
          <article
            key={view.id}
            className={`space-y-3 overflow-hidden rounded-lg border p-3 ${chosen === view.id ? "border-brand-500 bg-accent ring-1 ring-brand-500" : ""}`}
            aria-label={`Cena recuperada ${view.name}`}
          >
            {(onCreateMany || onSelectionChange) && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  aria-label={`Selecionar cena ${view.name}`}
                  checked={selection.includes(view.id)}
                  disabled={
                    saving ||
                    (!selection.includes(view.id) && selection.length >= 100)
                  }
                  onChange={(event) =>
                    setSelection((previous) =>
                      event.target.checked
                        ? [...previous, view.id]
                        : previous.filter((id) => id !== view.id),
                    )
                  }
                />
                {onSelectionChange
                  ? "Renderizar esta fotografia"
                  : "Usar como câmera"}
              </label>
            )}
            <button
              type="button"
              className="group relative block w-full text-left"
              aria-label={`Ver prévia de ${view.name}`}
              aria-pressed={chosen === view.id}
              onClick={() => {
                setChosen(view.id);
                onPreview(view.id);
                if (images[view.id]) {
                  setExpandedImage(images[view.id]);
                  setExpanded(view);
                }
              }}
            >
              {images[view.id] ? (
                <>
                  <span className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white">
                    <Expand className="size-4" aria-hidden="true" />
                    <span className="sr-only">Ampliar miniatura</span>
                  </span>
                  <img
                    src={images[view.id]}
                    alt={`${view.approximate === false ? "Prévia de" : "Prévia aproximada de"} ${view.name}`}
                    className="aspect-[4/3] w-full rounded bg-muted object-contain"
                  />
                </>
              ) : (
                <span className="grid aspect-[4/3] place-items-center rounded bg-muted text-xs">
                  {busy
                    ? "Preparando prévia…"
                    : "Prévia indisponível; clique para conferir no modelo"}
                </span>
              )}
              <span className="mt-2 block break-words text-sm font-medium">
                {view.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {view.approximate === false
                  ? "Câmera exportada"
                  : "Lente estimada · 35 mm"}
              </span>
            </button>
            {onCreate && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setChosen(view.id);
                  onCreate(view);
                }}
              >
                Preparar câmera desta cena
              </Button>
            )}
          </article>
        ))}
      </div>
      <Dialog
        open={expanded !== null}
        onOpenChange={(open) => {
          if (!open) setExpanded(null);
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogTitle>{expanded?.name}</DialogTitle>
          <DialogDescription>
            Prévia do visualizador. Ampliar não altera as fotografias
            selecionadas para renderização.
          </DialogDescription>
          {expandedImage && (
            <img
              src={expandedImage}
              alt={`Prévia ampliada de ${expanded?.name}`}
              className="mt-5 max-h-[65dvh] w-full rounded-lg bg-muted object-contain"
            />
          )}
          {expanding && (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              Preparando prévia em maior resolução…
            </p>
          )}
          {expandError && (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              Não foi possível aumentar a resolução. Exibindo a miniatura
              disponível.
            </p>
          )}
        </DialogContent>
      </Dialog>
      {failed && (
        <p role="status" className="text-sm text-muted-foreground">
          Não foi possível gerar as miniaturas. Você ainda pode escolher uma
          cena para conferir no visualizador.
        </p>
      )}
      {filtered.length > 12 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((value) => value - 1)}
          >
            Cenas anteriores
          </Button>
          <span className="text-xs">
            Página {page + 1} de {Math.ceil(filtered.length / 12)}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={(page + 1) * 12 >= filtered.length}
            onClick={() => setPage((value) => value + 1)}
          >
            Próximas cenas
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {onSelectionChange
          ? "Marque as fotografias desejadas. A seleção será enviada somente ao clicar em Renderizar cenas selecionadas, abaixo das configurações."
          : onCreateMany
            ? "Marcar as caixas não salva nada. O botão Criar câmeras selecionadas confirma e cadastra todas de uma vez. Câmeras já importadas destas cenas não são duplicadas."
            : onCreate
              ? "Ver uma prévia não cria uma câmera. Preparar câmera preenche o formulário; dê um nome e confirme em Salvar câmera."
              : "Ver uma prévia não cria uma câmera nem altera a associação do ambiente. Para cadastrar o enquadramento, abra a aba Câmeras."}
      </p>
    </section>
  );
}
