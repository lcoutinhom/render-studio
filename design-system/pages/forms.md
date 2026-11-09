# Padrão: Formulários

- Envolver em `Card` > `form` > `CardContent` (campos) + `CardFooter` (Cancelar `ghost` à esquerda, Salvar `primary` com `loading`).
- Grade de 2 colunas a partir de `sm` para campos curtos; campos longos (`textarea`, descrição) ocupam a linha inteira.
- `Field` sempre com label visível; `hint` persistente para campos complexos; `error` inline ligado por `aria-describedby`; obrigatório marcado com asterisco.
- Resumo de erros focável no topo (`Feedback`) quando há mais de um erro.
- Configurações avançadas em `details` estilizado (título + subtítulo "Opcional…" + chevron).
- Zona de perigo: cartão separado com borda `destructive/25`.
- Autenticação: campos `h-11`, alternância mostrar/ocultar senha, link "Esqueci minha senha" junto ao rótulo.
