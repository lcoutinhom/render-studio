# Padrão: Listagens (projetos, clientes, materiais, presets, configurações, processamento)

- **Cabeçalho:** título + descrição de uma linha + **uma** ação primária (`Novo …`) em `actions`.
- **Barra de ferramentas:** contagem (`tabular-nums`) à esquerda; botão *Filtros* com contador de filtros ativos à direita. Filtros continuam em diálogo (preserva o contrato `FilterDialog`) e os parâmetros na URL.
- **Linhas:** `IndexList`/`IndexRow`; a linha inteira é clicável via link esticado (`after:absolute after:inset-0`) com foco visível; status como `StatusBadge` (ponto + texto); chevron indica navegação.
- **Dados tabulares** (processamento): `Table` semântico em ≥ 768px; abaixo disso, pilha de cartões com os mesmos dados.
- **Presets:** grade de cartões (2–3 colunas) porque cada item tem descrição e ações próprias.
- **Paginação:** `Pagination` com "X–Y de N" e "Página X de Y"; mantém o mesmo `per_page` do backend (20 ou 24).
- **Vazio:** `EmptyState` com ícone do recurso e a ação de criar.
