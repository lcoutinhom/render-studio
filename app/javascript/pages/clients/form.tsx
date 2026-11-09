import { Head, Link, useForm } from "@inertiajs/react";
import { AppLayout } from "../../layouts/app-layout";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Field, textareaClass } from "../../components/project-fields";
type Client = {
  id: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
};
export default function Form({ client }: { client: Client | null }) {
  const form = useForm({
    client: {
      name: client?.name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      notes: client?.notes ?? "",
    },
  });
  const set = (key: keyof Client & keyof typeof form.data.client, value: string) =>
    form.setData("client", { ...form.data.client, [key]: value });
  const error = (key: string) =>
    (form.errors as Record<string, string>)[`client.${key}`] ??
    (form.errors as Record<string, string>)[key];
  const back = client ? `/clients/${client.id}` : "/clients";
  return (
    <AppLayout
      title={client ? "Editar cliente" : "Novo cliente"}
      description="Dados de contato usados para organizar os projetos deste cliente."
      breadcrumbs={[
        { label: "Clientes", href: "/clients" },
        ...(client ? [{ label: client.name, href: `/clients/${client.id}` }] : []),
      ]}
    >
      <Head title="Cliente" />
      <Card className="max-w-3xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            client ? form.patch(`/clients/${client.id}`) : form.post("/clients");
          }}
        >
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
            <Field
              id="client-name"
              label="Nome do cliente"
              required
              maxLength={160}
              autoComplete="organization"
              value={form.data.client.name}
              error={error("name")}
              onChange={(e) => set("name", e.target.value)}
            />
            </div>
            <Field
              id="client-email"
              label="E-mail"
              type="email"
              maxLength={254}
              autoComplete="email"
              value={form.data.client.email}
              error={error("email")}
              onChange={(e) => set("email", e.target.value)}
            />
            <Field
              id="client-phone"
              label="Telefone"
              type="tel"
              maxLength={80}
              autoComplete="tel"
              value={form.data.client.phone}
              error={error("phone")}
              onChange={(e) => set("phone", e.target.value)}
            />
            <div className="sm:col-span-2">
              <Field
                id="client-notes"
                label="Observações"
                hint="Preferências, contatos adicionais ou combinados com o cliente."
                error={error("notes")}
              >
                <textarea
                  id="client-notes"
                  className={textareaClass}
                  maxLength={10000}
                  rows={4}
                  value={form.data.client.notes}
                  aria-describedby="client-notes-hint"
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost">
              <Link href={back}>Cancelar</Link>
            </Button>
            <Button type="submit" loading={form.processing}>
              {form.processing ? "Salvando…" : "Salvar cliente"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AppLayout>
  );
}
