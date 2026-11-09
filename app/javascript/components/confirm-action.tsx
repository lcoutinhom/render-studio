import { useState } from "react";
import { router } from "@inertiajs/react";
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
export function ConfirmAction({
  url,
  label,
  description,
  method = "delete",
}: {
  url: string;
  label: string;
  description: string;
  method?: "delete" | "patch" | "post";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            method === "delete"
              ? "text-destructive hover:border-destructive/40 hover:bg-destructive-soft"
              : undefined
          }
        >
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant={method === "delete" ? "destructive" : "primary"}
            loading={busy}
            onClick={() => {
              setBusy(true);
              router.visit(url, {
                method,
                onFinish: () => {
                  setBusy(false);
                  setOpen(false);
                },
              });
            }}
          >
            {busy ? "Aguarde…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
