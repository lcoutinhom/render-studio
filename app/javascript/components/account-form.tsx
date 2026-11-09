import { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import { Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "../layouts/auth-layout";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
type Mode =
  | "login"
  | "forgot-password"
  | "reset-password"
  | "confirmation";
const subtitles: Record<Mode, string> = {
  login: "Entre na sua conta para continuar criando.",
  "forgot-password": "Informe seu e-mail e enviaremos um link para redefinir a senha.",
  "reset-password": "Escolha uma nova senha para acessar sua conta.",
  confirmation: "Confira sua caixa de entrada. Você também pode solicitar um novo link.",
};
const submitLabels: Record<Mode, string> = {
  login: "Entrar",
  "forgot-password": "Enviar link de recuperação",
  "reset-password": "Redefinir senha",
  confirmation: "Reenviar confirmação",
};
const titles: Record<Mode, string> = {
  login: "Entrar",
  "forgot-password": "Recuperar senha",
  "reset-password": "Redefinir senha",
  confirmation: "Confirmar e-mail",
};
export function AccountForm({
  mode,
  token = "",
}: {
  mode: Mode;
  token?: string;
}) {
  const form = useForm({
    user: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
      reset_password_token: token,
    },
  });
  const password = ["login", "reset-password"].includes(mode);
  const [reveal, setReveal] = useState(false);
  const fields: {
    key: "name" | "email" | "password" | "password_confirmation";
    label: string;
    type: string;
    auto: string;
  }[] = [];
  if (mode !== "reset-password")
    fields.push({
      key: "email",
      label: "E-mail",
      type: "email",
      auto: "email",
    });
  if (password)
    fields.push({
      key: "password",
      label: mode === "reset-password" ? "Nova senha" : "Senha",
      type: "password",
      auto: mode === "login" ? "current-password" : "new-password",
    });
  if (mode === "reset-password")
    fields.push({
      key: "password_confirmation",
      label: "Confirmar senha",
      type: "password",
      auto: "new-password",
    });
  const url =
    mode === "login"
      ? "/users/sign_in"
      : mode === "confirmation"
          ? "/users/confirmation"
          : "/users/password";
  return (
    <AuthLayout title={titles[mode]} subtitle={subtitles[mode]}>
      <Head title={titles[mode]} />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const options = { onFinish: () => form.reset("user") };
          if (mode === "reset-password") form.put(url, options);
          else form.post(url, options);
        }}
      >
        {fields.map((field) => {
          const error =
            (form.errors as Record<string, string>)[field.key] ||
            (form.errors as Record<string, string>)[`user.${field.key}`];
          return (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={field.key}>{field.label}</Label>
                {mode === "login" && field.key === "password" && (
                  <Link
                    href="/users/password/new"
                    className="text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                )}
              </div>
              <div className="relative">
              <Input
                id={field.key}
                className="h-11 pr-11"
                name={`user[${field.key}]`}
                type={field.type === "password" && reveal ? "text" : field.type}
                autoComplete={field.auto}
                required
                maxLength={
                  field.key === "name"
                    ? 120
                    : field.key.includes("password")
                      ? 128
                      : 254
                }
                minLength={
                  field.key.includes("password") && mode !== "login"
                    ? 12
                    : undefined
                }
                value={form.data.user[field.key]}
                onChange={(e) =>
                  form.setData("user", {
                    ...form.data.user,
                    [field.key]: e.target.value,
                  })
                }
                aria-invalid={!!error}
                aria-describedby={error ? `${field.key}-error` : undefined}
              />
              {field.type === "password" && (
                <button
                  type="button"
                  onClick={() => setReveal(!reveal)}
                  aria-label={reveal ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={reveal}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground hover:text-foreground"
                >
                  {reveal ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              )}
              </div>
              {error && (
                <p
                  id={`${field.key}-error`}
                  className="text-xs font-medium text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
          );
        })}
        {password && mode !== "login" && (
          <p className="text-xs text-muted-foreground">
            Use pelo menos 12 caracteres.
          </p>
        )}
        <Button type="submit" size="lg" className="mt-2 w-full" loading={form.processing}>
          {form.processing ? "Enviando…" : submitLabels[mode]}
        </Button>
      </form>
      <nav
        aria-label="Acesso à conta"
        className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 text-[13px] text-muted-foreground"
      >
        {mode !== "login" && (
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/users/sign_in">
            Voltar para entrar
          </Link>
        )}
        {mode === "login" && (
          <span>
            Não recebeu a confirmação?{" "}
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/users/confirmation/new">
              Reenviar e-mail
            </Link>
          </span>
        )}
      </nav>
    </AuthLayout>
  );
}
