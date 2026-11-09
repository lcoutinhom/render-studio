# Composição visual

O visual ativo é o design system próprio do Render Studio, documentado em `design-system/MASTER.md` (gerado com a skill UI UX Pro Max e ajustado ao produto):

- `tokens.css`: tokens semânticos (claro/escuro), escalas `brand` (latão) e `gray` (pedra quente), raios, sombras e movimento.
- `studio.css`: shell (sidebar, header, cabeçalho de página, breadcrumbs), padrões compartilhados e autenticação.
- Fonte Inter Variable servida localmente por `@fontsource-variable/inter` (SIL OFL).

Os diretórios `tailadmin/` e `metronic/`, `shell.css`, `assets/outfit.ttf` e os fundos `bg-10*.png` são históricos e não são mais importados. Podem ser removidos quando o projeto estiver sob controle de versão.

Nenhum módulo financeiro ou signup foi adicionado. Veja `../components/ui/PROVENANCE.md` para a origem dos componentes.
