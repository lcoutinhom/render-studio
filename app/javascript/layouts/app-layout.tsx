import { Link, router, usePage } from "@inertiajs/react";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Tooltip } from "../components/ui/tooltip";
import { Feedback } from "../components/feedback";
import { Brand } from "../components/brand";
import { ThemeSwitcher } from "../components/theme-switcher";
import { cn } from "../lib/utils";
import type { SharedProps } from "../types";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match?: string[];
};
const navigation: { group: string; items: NavItem[] }[] = [
  {
    group: "Estúdio",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
      { href: "/clients", label: "Clientes", icon: Users },
      { href: "/projects", label: "Projetos", icon: FolderKanban },
      { href: "/outputs", label: "Resultados", icon: Images },
      {
        href: "/render_batches",
        label: "Processamento",
        icon: Activity,
        match: ["/render_jobs"],
      },
    ],
  },
  {
    group: "Configuração",
    items: [
      {
        href: "/render_defaults",
        label: "Padrão de renderização",
        icon: SlidersHorizontal,
      },
      { href: "/presets", label: "Presets", icon: Sparkles },
    ],
  },
  {
    group: "Ajuda",
    items: [{ href: "/help", label: "Como começar", icon: BookOpen }],
  },
];

/* Section labels used to infer breadcrumbs from the URL when a page does not pass its own. */
const sections: Record<string, string> = {
  "/clients": "Clientes",
  "/projects": "Projetos",
  "/outputs": "Resultados",
  "/render_batches": "Processamento",
  "/render_jobs": "Processamento",
  "/presets": "Presets",
  "/materials": "Materiais",
  "/renderings": "Configurações",
};
const sectionHref: Record<string, string> = { "/render_jobs": "/render_batches" };

export type Crumb = { label: string; href?: string };

function inferCrumbs(url: string): Crumb[] {
  const path = url.split("?")[0];
  const root = "/" + (path.split("/")[1] ?? "");
  const label = sections[root];
  if (!label || path === root) return [];
  return [{ label, href: sectionHref[root] ?? root }];
}

const COMPACT_KEY = "render-studio-sidebar";

export function AppLayout({
  title,
  description,
  actions,
  breadcrumbs,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  children: ReactNode;
}) {
  const { auth } = usePage<SharedProps>().props;
  const { url } = usePage();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [compact, setCompact] = useState(() => {
    try {
      return localStorage.getItem(COMPACT_KEY) === "compact";
    } catch {
      return false;
    }
  });
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(COMPACT_KEY, compact ? "compact" : "full");
    } catch {
      /* Storage can be disabled. */
    }
  }, [compact]);
  useEffect(() => setOpen(false), [url]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
      triggerRef.current?.focus();
    };
  }, [open]);

  const path = url.split("?")[0];
  const active = (item: NavItem) =>
    [item.href, ...(item.match ?? [])].some(
      (href) =>
        path === href ||
        path.startsWith(href + "/") ||
        (href === "/dashboard" && path === "/"),
    );
  const crumbs = breadcrumbs ?? inferCrumbs(url);
  const initials = (auth.user?.name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className={cn("app-shell", compact && "sidebar-compact")}>
      <a href="#main" className="skip-link">
        Ir para o conteúdo
      </a>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Fechar navegação"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="navigation"
        className={cn("app-sidebar", open && "is-open")}
        aria-label="Navegação principal"
        onKeyDown={(event) => {
          if (!open || event.key !== "Tab") return;
          const items =
            event.currentTarget.querySelectorAll<HTMLElement>("a,button");
          const first = items[0],
            last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="sidebar-brand">
          <Link
            href="/dashboard"
            aria-label="Render Studio, visão geral"
            className="rounded-md"
          >
            <Brand compact={compact && !open} />
          </Link>
          <Button
            ref={closeRef}
            className="mobile-only"
            variant="ghost"
            mode="icon"
            size="sm"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
        </div>
        <div className="sidebar-content">
          {navigation.map((group) => (
            <section key={group.group} className="nav-group">
              <p className="nav-group-title">{group.group}</p>
              <nav className="nav-links" aria-label={group.group}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active(item);
                  const link = (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={compact ? item.label : undefined}
                      className={cn("nav-link", isActive && "active")}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                  return compact ? (
                    <Tooltip key={item.href} content={item.label} side="right">
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  );
                })}
              </nav>
            </section>
          ))}
        </div>
        <div className="sidebar-footer desktop-only">
          <button
            type="button"
            className="nav-link sidebar-collapse w-full"
            aria-label={compact ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-pressed={compact}
            onClick={() => setCompact(!compact)}
          >
            {compact ? (
              <PanelLeftOpen aria-hidden="true" />
            ) : (
              <PanelLeftClose aria-hidden="true" />
            )}
            <span>Recolher menu</span>
          </button>
        </div>
      </aside>

      <div className="app-wrapper" inert={open ? true : undefined}>
        <header className="app-header">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              ref={triggerRef}
              className="mobile-only"
              variant="ghost"
              mode="icon"
              aria-label="Abrir navegação"
              aria-controls="navigation"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
            <Link
              href="/dashboard"
              className="mobile-only rounded-md"
              aria-label="Render Studio, visão geral"
            >
              <Brand />
            </Link>
            <form
              className="header-search desktop-only"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                router.get("/projects", { q: query });
              }}
            >
              <Search aria-hidden="true" className="size-4 shrink-0" />
              <input
                ref={searchRef}
                type="search"
                aria-label="Pesquisar projetos"
                placeholder="Pesquisar projetos e clientes…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd aria-hidden="true">Ctrl K</kbd>
            </form>
          </div>
          <div className="header-actions">
            <ThemeSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="user-trigger" aria-label="Menu da conta">
                  <span className="avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <span className="user-name">{auth.user?.name}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-3.5 text-muted-foreground"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <span className="block truncate">{auth.user?.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {auth.user?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserRound />
                    Meu perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help">
                    <BookOpen />
                    Como começar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setLogoutOpen(true)}
                >
                  <LogOut />
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="main-content">
          <Feedback />
          <div className="page-header">
            <div className="page-header-text">
              <nav aria-label="Caminho da página" className="breadcrumbs">
                <ol>
                  <li>
                    <Link href="/dashboard">Início</Link>
                  </li>
                  {[...crumbs, { label: title }].map((crumb, index, all) => (
                    <Fragment key={`${crumb.label}-${index}`}>
                      <li aria-hidden="true" className="flex">
                        <ChevronRight />
                      </li>
                      <li>
                        {crumb.href && index < all.length - 1 ? (
                          <Link href={crumb.href}>{crumb.label}</Link>
                        ) : (
                          <span
                            aria-current={
                              index === all.length - 1 ? "page" : undefined
                            }
                          >
                            {crumb.label}
                          </span>
                        )}
                      </li>
                    </Fragment>
                  ))}
                </ol>
              </nav>
              <h1>{title}</h1>
              {description && (
                <p className="page-header-description">{description}</p>
              )}
            </div>
            {actions && <div className="page-header-actions">{actions}</div>}
          </div>
          {children}
        </main>
        <footer className="app-footer">
          <span>Render Studio</span>
          <span>Clientes, projetos, arquivos e resultados em um só lugar.</span>
        </footer>
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sair da conta?</DialogTitle>
            <DialogDescription>
              Seus projetos e resultados continuam salvos. Você pode voltar
              quando quiser.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Continuar aqui
            </Button>
            <Button
              variant="destructive"
              loading={loggingOut}
              onClick={() => {
                setLoggingOut(true);
                router.delete("/users/sign_out", {
                  onFinish: () => setLoggingOut(false),
                });
              }}
            >
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
