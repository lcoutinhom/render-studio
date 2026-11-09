# Página: Visão geral (`pages/dashboard.tsx`)

> Sobrescreve o MASTER apenas nos pontos abaixo.

- **Objetivo:** responder "o que está acontecendo no estúdio agora?" em um olhar.
- **Hierarquia:** cabeçalho (ação primária *Novo projeto*, secundária *Resultados*) → faixa de 6 métricas → grade 3/5 + 2/5 com *Últimos lotes* (mais importante, à esquerda) e *Projetos recentes*.
- **Métricas:** somente os totais enviados pelo backend (`totals`). Sem tendências, deltas ou gráficos inventados. Cartões com `href` levam à listagem correspondente; ícone de falhas fica vermelho apenas quando o valor > 0.
- **Grade:** `sm:2 · lg:3 · 2xl:6` colunas para as métricas (bento discreto, mesmo tamanho).
- **Vazios:** cada painel tem `EmptyState` compacto com a próxima ação real.
- **Movimento:** nenhum além de hover; o progresso dos lotes usa a barra padrão.
