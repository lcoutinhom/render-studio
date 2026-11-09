# Render Studio — Design System (MASTER)

> **Como usar:** ao construir ou alterar uma página, leia este arquivo e depois
> `design-system/pages/<pagina>.md`. Se o arquivo da página existir, suas regras
> prevalecem sobre este documento; caso contrário, siga apenas este Master.
>
> **Implementação:** tokens em `app/javascript/styles/tokens.css`, shell em
> `app/javascript/styles/studio.css`, componentes em `app/javascript/components/ui/`.
> Nenhum componente deve usar hex cru: use os tokens semânticos abaixo.

---

## 1. Produto e direção

| Item | Decisão |
|------|---------|
| Produto | Plataforma interna de renderização arquitetônica (clientes → projetos → arquivos 3D → cenas → renderização → resultados). |
| Usuários | Equipe interna de arquitetura/visualização; uso diário, sessões longas, desktop primeiro, mobile para consulta. |
| Perfil da skill | `Architecture / Interior` + `Construction/Architecture` (`--domain product`). |
| Estilo | **Minimalism & Swiss Style** (recomendado pela skill para enterprise/dashboards; risco de acessibilidade baixo). |
| Dials | Variance 4 · Motion 3 · Density 7 (dashboard operacional, movimento discreto). |
| Personalidade | Ateliê de arquitetura: papel quente, tinta grafite, um único acento latão. Grid rígido, tipografia como estrutura, as imagens renderizadas são as protagonistas. |

### Fontes da decisão (UI UX Pro Max)

- `--design-system "architectural rendering 3D visualization internal SaaS dashboard"` → estilo Swiss; paleta "Interior warm grey + gold accent". Saída bruta em `generated/skill-output.md`.
- `--domain color "architecture interior professional tool"` → *Architecture / Interior*: primária `#171717`, acento ouro `#A16207`, "Minimal black + accent gold".
- `--domain typography "professional enterprise dashboard clean"` → *Minimal Swiss*: Inter única, pesos 400–700, indicada para dashboards e design systems.
- `--domain ux` / `--stack shadcn` → tabelas semânticas, adaptação mobile, filtros persistentes, ações em massa apenas onde já existem.

### Desvios conscientes da saída bruta

| Saída bruta | Adotado | Motivo |
|-------------|---------|--------|
| Padrão "Scroll-Triggered Storytelling" | Não usado | É padrão de landing page; o produto é uma ferramenta interna autenticada. |
| Fira Code (títulos) + Fira Sans | **Inter Variable** + `ui-monospace` para dados técnicos | Títulos monoespaçados prejudicam leitura em PT-BR com acentos; a skill lista Inter como par "Minimal Swiss" para dashboards. Fonte servida localmente (`@fontsource-variable/inter`, OFL), sem CDN. |
| Primária `#78716C` (stone) | Primária **tinta** `#1C1A17` | `#78716C` tem contraste fraco como cor de ação; a paleta *Architecture / Interior* usa preto + ouro. |
| Acento `#D97706` | Escala **latão** `brand-*` (500 `#B8862F`, texto `#7C541D`) | Âmbar saturado compete com o estado *warning*; latão mais sóbrio mantém o acento distinto e AA em texto. |
| Background `#FAF5F2` | Canvas `#F7F6F3`, superfícies brancas | Mesmo calor, menor saturação: imagens renderizadas não ganham dominante rosada. |

---

## 2. Cores (tokens semânticos)

Variáveis CSS em `:root` / `.dark`; utilitários Tailwind via `@theme inline` (`bg-card`, `text-muted-foreground`, `border-border`, `bg-success-soft`…).

| Token | Claro | Escuro | Uso |
|-------|-------|--------|-----|
| `--background` | `#F7F6F3` | `#0F0E0C` | Canvas da aplicação |
| `--card` | `#FFFFFF` | `#171614` | Superfícies, painéis, tabelas |
| `--popover` | `#FFFFFF` | `#1C1A17` | Menus, diálogos |
| `--foreground` | `#1C1A17` | `#F2EFEA` | Texto principal |
| `--muted` | `#F1EFEB` | `#1F1D1A` | Superfície secundária, hover de linha, trilhos |
| `--muted-foreground` | `#6B655D` | `#A39C92` | Texto secundário (≥ 4.5:1 em card e canvas) |
| `--border` | `#E6E3DE` | `#2A2724` | Divisórias, contorno de cards |
| `--input` | `#948E85` | `#6B655D` | Contorno de campos de formulário (≥ 3:1 não-texto, WCAG 1.4.11). Botões outline usam `gray-300`/`gray-700`, identificados pelo rótulo. |
| `--primary` | `#1C1A17` | `#F2EFEA` | Ação principal, item ativo, links fortes |
| `--primary-foreground` | `#FAF9F7` | `#171614` | Texto sobre primária |
| `--accent` | `#FBF7EE` | `#2A2114` | Seleção, item escolhido, destaque suave |
| `--accent-foreground` | `#7C541D` | `#E3C27E` | Texto/ícone sobre acento |
| `--ring` | `#9A6C22` | `#CFA04A` | Anel de foco (2px + offset) |
| `--success` / `-soft` | `#15803D` / `#ECF6EF` | `#4ADE80` / `#11261A` | Concluído, ativo |
| `--warning` / `-soft` | `#B45309` / `#FDF4E7` | `#FBBF24` / `#2A1F0B` | Simulação, atenção |
| `--destructive` / `-soft` | `#B42318` / `#FDF0EF` | `#F97066` / `#2D1412` | Falha, exclusão |
| `--info` / `-soft` | `#1D4ED8` / `#EEF3FD` | `#7AA2F7` / `#121B30` | Em processamento, informação |

**Escalas legadas remapeadas** (para que utilitários existentes herdem a nova identidade):
`brand-50…950` = latão; `gray-50…950` = pedra quente (mesma escala do canvas).

**Regras**
- Uma ação primária por tela (`Button variant="primary"`). Demais ações: `outline` ou `ghost`.
- Latão é acento, nunca fundo de botão. Usado em: indicador do item ativo, foco, contadores de filtros, ícones de destaque.
- Estados nunca só por cor: badges trazem rótulo e ponto/ícone.

## 3. Tipografia

- Família: `Inter Variable`, fallback `ui-sans-serif, system-ui`. `font-feature-settings: "cv11", "ss01"`; números tabulares (`tabular-nums`) em métricas, tabelas, progresso.
- Dados técnicos (IDs, checksums, JSON): `font-mono` (`ui-monospace, SF Mono, JetBrains Mono, Menlo`).

| Papel | Tamanho / altura | Peso | Tracking |
|-------|------------------|------|----------|
| Display (auth) | 32/40 | 600 | -0.02em |
| Page title (`h1`) | 24/32 (20/28 mobile) | 600 | -0.015em |
| Section title (`h2` em card) | 15/22 | 600 | -0.005em |
| Body | 14/22 | 400 | 0 |
| Small / meta | 13/20 | 400–500 | 0 |
| Eyebrow / label de grupo | 11/16, maiúsculas | 500 | 0.06em |
| Métrica | 28/34 | 600 | -0.02em, tabular |

Inputs usam 16px no mobile (evita zoom do iOS).

## 4. Espaçamento, raio, elevação

- Escala de 4px: `1 (4) · 2 (8) · 3 (12) · 4 (16) · 5 (20) · 6 (24) · 8 (32) · 10 (40) · 12 (48)`.
- Página: padding 32px desktop / 24px tablet / 16px mobile; largura máxima de conteúdo 1440px.
- Ritmo vertical: 24px entre blocos de página, 16px dentro de cards, 32px entre seções grandes.
- Raios: `--radius-sm 6px` (badges, kbd) · `--radius 8px` (botões, campos) · `--radius-lg 12px` (cards, diálogos) · pílula apenas em badges de status.
- Elevação (sombras quentes, discretas):
  - `shadow-xs` — campos e botões outline.
  - `shadow-card` — cards (`0 1px 2px rgb(28 26 23 / .04)`).
  - `shadow-pop` — dropdowns, popovers.
  - `shadow-dialog` — diálogos.
  Cards são definidos pela **borda**, não pela sombra.

## 5. Movimento

- Durações: `--dur-fast 120ms` (hover, cor) · `--dur-base 180ms` (abrir menu, colapsar sidebar) · `--dur-slow 240ms` (diálogo, drawer).
- Easing: `--ease-out cubic-bezier(.2,.7,.2,1)` para entrada; saída ~70% da entrada.
- Somente `transform`/`opacity`/cores. `prefers-reduced-motion` desativa animações (regra global).
- Nada de animação decorativa de scroll; skeletons apenas para conteúdo que de fato carrega.

## 6. Componentes (contratos)

| Componente | Arquivo | Notas |
|------------|---------|-------|
| Button | `ui/button.tsx` | `primary · outline · secondary · ghost · destructive · link`; `sm (32) · md (36) · lg (44)`; `mode="icon"`; prop `loading` com spinner e `aria-busy`. |
| Input / Select / Textarea | `ui/input.tsx` | Altura 36 (44 em `size="lg"`/mobile), borda `--input`, foco anel latão; `aria-invalid` pinta borda de erro. |
| Field | `project-fields.tsx` | Label visível, `hint`, `error` com `aria-describedby`; marcador de obrigatório. |
| Checkbox / Radio / Switch | `ui/switch.tsx` + nativo | Nativos com `accent-color: var(--primary)`; Switch Radix para preferências on/off. |
| Card | `ui/card.tsx` | `Card`, `CardHeader` (título + descrição + ações), `CardContent`, `CardFooter`. |
| StatCard | `ui/stat.tsx` | Rótulo, valor tabular, ícone discreto, link opcional. Nunca inventa tendência. |
| Badge / StatusBadge | `ui/badge.tsx` | Tons `neutral · success · warning · danger · info · accent`; ponto + rótulo. |
| Table | `ui/table.tsx` | `<table>` semântico, cabeçalho eyebrow, linhas 48px, hover `muted/50`, `overflow-x-auto`. |
| IndexList | `index-list.tsx` | Lista em card para coleções com ações; vira pilha no mobile. |
| Toolbar / Filters | `filter-dialog.tsx` | Botão "Filtros" com contador; diálogo com limpar/cancelar/aplicar. |
| Pagination | `ui/pagination.tsx` | Anterior / "Página X de Y" / Próxima. |
| Dialog | `ui/dialog.tsx` | Overlay `foreground/40` + blur leve, cartão 12px, fechar sempre visível. |
| DropdownMenu | `ui/dropdown-menu.tsx` | `Content`, `Item`, `Label`, `Separator`. |
| Tabs | `ui/tabs.tsx` | `default` (segmentado) e `line` (sublinhado latão). |
| Alert | `ui/alert.tsx` | Tons semânticos com ícone; `role` adequado (status vs alert). |
| Toast | `feedback.tsx` | Flash `notice` como toast `role=status`, fecha em 5s ou manualmente. |
| Tooltip | `ui/tooltip.tsx` | Radix; atrasos 300ms; nunca único portador de informação. |
| EmptyState | `ui/empty-state.tsx` | Ícone, título, texto curto e ação existente. |
| Skeleton | `ui/skeleton.tsx` | Bloco `muted` pulsante. |
| PageHeader / Breadcrumbs | `layouts/app-layout.tsx` | Breadcrumb → título → descrição → ações à direita. |
| Sidebar | `layouts/app-layout.tsx` | 256px / 72px compacta (persistida), grupos, ativo com barra latão, drawer no mobile. |

## 7. Layout global

```
┌────────────┬──────────────────────────────────────────────────────────┐
│ ▣ Render   │  ☰  Pesquisar projetos…  ⌘K              ◐   (LC) ▾     │ 56px header
│   Studio   ├──────────────────────────────────────────────────────────┤
│            │  Início / Projetos                                       │
│ ESTÚDIO    │  Título da página                       [Sec] [Primária] │
│ ▍Início    │  Descrição curta                                         │
│  Clientes  │                                                          │
│  Projetos  │  ┌ conteúdo em grid de 12 colunas, gap 16/24 ───────────┐ │
│  Resultados│  │                                                      │ │
│  Processam.│  └──────────────────────────────────────────────────────┘ │
│ CONFIGURAR │                                                          │
│  Padrão    │                                                          │
│  Presets   │                                                          │
│  Materiais │                                                          │
│ AJUDA      │                                                          │
│  Começar   │                                                          │
│ ─────────  │                                                          │
│ « Recolher │                                                          │
└────────────┴──────────────────────────────────────────────────────────┘
```

- Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280`. Sidebar fixa ≥ 1024px, drawer abaixo.
- Header sticky com fundo `background/85` + `backdrop-blur` (único uso de blur além do overlay de diálogo).

## 8. Acessibilidade (checklist obrigatório)

- Contraste texto ≥ 4.5:1 em ambos os temas (verificado: menor par = 4.54:1, *success* sobre *success-soft* no claro); bordas de campos ≥ 3:1 (3.25:1 claro, 3.14:1 escuro).
- Foco visível: `outline 2px var(--ring)` com offset 2px em todo elemento interativo.
- Skip link, `aria-current="page"` na navegação, `aria-label` em botões só-ícone, `aria-hidden` em ícones decorativos.
- Alvos ≥ 24×24 CSS px (WCAG 2.2 AA); controles primários 36–44px.
- Erros de formulário próximos ao campo + resumo focável em envios com vários erros.
- Toasts não roubam foco (`aria-live="polite"`).
- `prefers-reduced-motion` respeitado globalmente.

## 9. Anti-padrões (proibidos)

- Gradientes decorativos, glassmorphism em cards, sombras pesadas, cards "sem propósito".
- Emoji como ícone; misturar famílias de ícones (padrão: **lucide-react**, stroke 1.75).
- Hex cru em componentes; novas cores fora dos tokens.
- Métricas, tendências ou dados inventados para preencher layout.
- Mais de uma ação primária por tela.
- Texto de corpo < 13px; labels apenas como placeholder.
