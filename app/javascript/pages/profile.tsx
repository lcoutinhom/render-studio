import { Head, useForm, usePage } from "@inertiajs/react";
import { MailWarning } from "lucide-react";
import { AppLayout } from "../layouts/app-layout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Field } from "../components/project-fields";
import type { SharedProps } from "../types";

type Key = "name" | "email" | "current_password" | "password" | "password_confirmation";
type FieldSpec = { key: Key; title: string; type: string; auto: string; required?: boolean; hint?: string };

const account: FieldSpec[] = [
  { key: "name", title: "Nome", type: "text", auto: "name", required: true },
  { key: "email", title: "E-mail", type: "email", auto: "email", required: true },
];
const security: FieldSpec[] = [
  { key: "password", title: "Nova senha (opcional)", type: "password", auto: "new-password", hint: "Pelo menos 12 caracteres. Deixe em branco para manter a atual." },
  { key: "password_confirmation", title: "Confirmar nova senha", type: "password", auto: "new-password" },
  { key: "current_password", title: "Senha atual", type: "password", auto: "current-password", required: true, hint: "Obrigatória para salvar qualquer alteração." },
];

export default function Profile() {
  const { auth } = usePage<SharedProps>().props;
  const form = useForm({
    user: {
      name: auth.user?.name ?? "",
      email: auth.user?.email ?? "",
      current_password: "",
      password: "",
      password_confirmation: "",
    },
  });
  const render = (field: FieldSpec) => (
    <Field
      key={field.key}
      id={field.key}
      label={field.title}
      type={field.type}
      autoComplete={field.auto}
      required={field.required}
      hint={field.hint}
      error={(form.errors as Record<string, string>)[field.key]}
      maxLength={field.key === "name" ? 120 : field.type === "password" ? 128 : 254}
      minLength={field.key === "password" ? 12 : undefined}
      value={form.data.user[field.key]}
      onChange={(e) => form.setData("user", { ...form.data.user, [field.key]: e.target.value })}
    />
  );
  return (
    <AppLayout title="Meu perfil" description="Seus dados de acesso ao Render Studio.">
      <Head title="Meu perfil" />
      <form
        className="max-w-3xl space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          form.put("/users", {
            preserveScroll: true,
            onFinish: () =>
              form.setData("user", { ...form.data.user, current_password: "", password: "", password_confirmation: "" }),
          });
        }}
      >
        {auth.user?.unconfirmed_email && (
          <Alert tone="warning" icon={false}>
            <p className="flex gap-3">
              <MailWarning aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                Confirmação pendente para <strong>{auth.user.unconfirmed_email}</strong>. Seu e-mail atual permanece válido.
              </span>
            </p>
          </Alert>
        )}
        <Card>
          <CardHeader description="Nome exibido no menu e e-mail usado para entrar.">
            <CardTitle>Dados da conta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">{account.map(render)}</CardContent>
        </Card>
        <Card>
          <CardHeader description="Confirme sua senha atual para salvar. Novas senhas devem ter pelo menos 12 caracteres.">
            <CardTitle>Senha e segurança</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            {security.slice(0, 2).map(render)}
            <div className="border-t pt-5 sm:col-span-2 sm:max-w-[calc(50%-10px)]">{render(security[2])}</div>
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={form.processing}>
              {form.processing ? "Salvando…" : "Salvar alterações"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </AppLayout>
  );
}
