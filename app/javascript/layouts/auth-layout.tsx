import { Link } from "@inertiajs/react";
import type { ReactNode } from "react";
import { Feedback } from "../components/feedback";
import { Brand } from "../components/brand";
import { ThemeSwitcher } from "../components/theme-switcher";

/* The real workflow, as documented in the README: no invented claims or numbers. */
const steps = [
  ["01", "Projeto", "Organize por cliente e envie os arquivos 3D."],
  ["02", "Cenas", "Marque as cenas e fotografias que deseja renderizar."],
  ["03", "Configuração", "Use presets, o padrão do estúdio ou ajustes próprios."],
  ["04", "Resultados", "Imagens, vídeos, panoramas e VR ligados ao projeto."],
];

export function AuthLayout({
  title,
  subtitle = "Entre na sua conta para continuar criando.",
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-form-panel">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Render Studio, início" className="rounded-md">
            <Brand subtitle />
          </Link>
          <ThemeSwitcher />
        </div>
        <div className="auth-form-content">
          <h1>{title}</h1>
          <p className="mb-8 mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
          <div className="mb-4 space-y-3 empty:hidden">
            <Feedback />
          </div>
          {children}
        </div>
        <footer className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Render Studio</span>
          <span>Acesso exclusivo da equipe. Precisa de acesso? Fale com o administrador.</span>
        </footer>
      </section>
      <section className="auth-story-panel" aria-label="Sobre o Render Studio">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Estúdio de renderização arquitetônica
        </p>
        <div className="max-w-md">
          <h2 className="text-[32px] font-semibold leading-[40px] tracking-[-0.02em] text-white">
            Do modelo à apresentação, em um só lugar.
          </h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2">
            {steps.map(([number, label, text]) => (
              <li key={number} className="bg-gray-900/80 p-4 dark:bg-gray-800/80">
                <span className="font-mono text-xs text-brand-300">{number}</span>
                <p className="mt-2 text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-[13px] leading-5 text-gray-400">{text}</p>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-gray-500">Clientes, projetos, arquivos e resultados.</p>
      </section>
    </main>
  );
}
