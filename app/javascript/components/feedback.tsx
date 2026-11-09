import { useEffect, useRef, useState } from "react";
import { usePage } from "@inertiajs/react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { Alert, AlertTitle } from "./ui/alert";
import type { SharedProps } from "../types";

/* Flash notices become a polite toast; alerts and validation errors stay inline at the top of the page. */
export function Feedback() {
  const { flash, errors } = usePage<SharedProps>().props;
  const [visible, setVisible] = useState(true);
  const summaryRef = useRef<HTMLDivElement>(null);
  const errorEntries = Object.entries(errors ?? {});
  useEffect(() => {
    setVisible(true);
    if (!flash.notice) return;
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [flash]);
  useEffect(() => {
    if (errorEntries.length > 1) summaryRef.current?.focus();
  }, [errors]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div aria-live="polite" className="toast-region pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-end md:left-auto">
        {flash.notice && visible && (
          <div
            role="status"
            className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-popover p-3.5 pr-2 text-sm text-popover-foreground shadow-pop animate-pop-in md:w-96"
          >
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <span className="min-w-0 flex-1 leading-5">{flash.notice}</span>
            <button
              type="button"
              aria-label="Fechar notificação"
              onClick={() => setVisible(false)}
              className="-my-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {flash.alert && (
        <Alert tone="danger">
          <p className="leading-5">{flash.alert}</p>
        </Alert>
      )}
      {errorEntries.length > 0 && (
        <Alert tone="danger" ref={summaryRef} tabIndex={-1} className="outline-none focus-visible:outline-2">
          <AlertTitle>Revise {errorEntries.length === 1 ? "o campo indicado" : `os ${errorEntries.length} campos indicados`}</AlertTitle>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-muted-foreground">
            {errorEntries.map(([key, value]) => (
              <li key={key}>
                <span className="font-medium text-foreground">{key}</span>: {String(value)}
              </li>
            ))}
          </ul>
        </Alert>
      )}
    </>
  );
}
