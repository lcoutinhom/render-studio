# Padrão: Detalhes e resultados

- **Breadcrumb** explícito até o pai real (ex.: Processamento › Lote #12 › Tarefa #40). Links "Voltar ao …" foram substituídos pelo breadcrumb.
- **Ações:** primária à direita do cabeçalho; secundárias em `outline`; ações raras em menu *Ações*; destrutivas (`ConfirmAction` com `method="delete"`) em vermelho e separadas.
- **Resultados (`outputs/show`):** palco de mídia em 2/3 (fundo `gray-950` para imagens/vídeo) + painel *Informações* em 1/3 com `dl` (rótulo/valor). Checksums em `font-mono`.
- **Galeria (`OutputGallery`):** grade 4:3, selo do tipo sobre a miniatura, download como ação secundária no cartão.
- **Lote (`processing/show`):** cartão-resumo com status, progresso e faixa de contagens por estado (dados de `batch.counts`); tabelas de tarefas; histórico e eventos em `details` estilizados.
- **Projeto (`projects/workspace`):** abas `line` com ícones; arquivos como linhas clicáveis com selo *Principal*; configurações com rodapé fixo de salvar.
