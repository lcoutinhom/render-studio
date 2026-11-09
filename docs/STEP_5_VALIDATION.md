# Step 5 — Results & Dashboard

Implementação autorizada após a entrega do Step 4. Step 6, Blender, extensão SketchUp e WebXR permanecem fora desta entrega.

## Entregue

- Migração `20261029020000_create_render_outputs.rb`: RenderOutput com FK para a tentativa, tipo, arquivo privado Active Storage, SHA-256, tamanho, MIME e metadados. Identidades derivam do RenderJob; resultados e attachments não são substituíveis. Índice único para repetição do mesmo arquivo/nome na mesma tentativa.
- `Rendering::StoreOutput`: fronteira interna de gravação para arquivos fornecidos por executores confiáveis, com assinatura inicial, coerência de tipo/extensão, limite de 1 GiB, checksum calculado em blocos, idempotência sob lock e limpeza de blobs sem vínculo em falhas. Sem endpoint público de ingestão e sem integração com renderer.
- `RenderOutputPolicy`, controller e presenter: isolamento por proprietário, downloads e prévias privados, nosniff/no-store, streaming e byte ranges únicos em blocos de até 1 MiB. Range inválido/múltiplo recebe 416.
- Galeria com paginação e filtros por projeto, ambiente, versão, tipo e status. Links específicos por tarefa/lote e acesso por projeto/ambiente. Histórico preservado e acessível após exclusão lógica; opções dos filtros incluem identidades históricas da conta.
- Prévia PNG/JPEG, vídeo MP4/WebM com controles do navegador e exploração de panorama equiretangular PNG/JPEG 2:1 com Three.js carregado sob demanda. EXR e GLB disponíveis para download. Loading/fallback de erro e controles de mouse/toque/setas no panorama.
- Histórico de lotes com filtros por projeto, versão, ambiente e status; ambiente usa subconsulta para não duplicar lotes com retentativas. Paginação mantém filtros.
- Dashboard: projetos/ambientes existentes, lotes em andamento/concluídos/com falhas, arquivos disponíveis, seis projetos recentes e oito lotes recentes da conta. Solicitações e arquivos são métricas distintas; não soma tentativas como novos lotes.
- Navegação Resultados no menu; atalhos nas páginas de projeto, ambiente, lote e tentativa. Atualização do plano, README e arquitetura.

## Verificações

- Suíte completa: **115 exemplos RSpec, zero falhas**. Novos testes cobrem gravação idempotente, checksum, formatos inválidos/limpeza, arquivo imutável, proprietário e anonimato, byte ranges, filtros, snapshots/versão, preservação após atualização/exclusão lógica e dashboard sem resultados fictícios.
- `bun run build`: TypeScript e Vite aprovados. Permanece aviso de tamanho do chunk compartilhado de Three.js; os visualizadores são carregados sob demanda.
- RuboCop: **136 arquivos, nenhuma infração**.
- `bin/rails zeitwerk:check`: aprovado.
- Brakeman: **zero erros e zero alertas**. O scanner exibe diagnóstico de extensão opcional concurrent_ruby_ext ausente, mas conclui com exit 0.
- Migração aplicada aos bancos locais de desenvolvimento e teste.
- Chromium em desenvolvimento: dashboard com totais reais, galeria vazia, filtro de vídeo, histórico e layout mobile 390×844 sem overflow ou erros JavaScript. Nenhum dado/arquivo de resultado fictício criado nesta conta.
- Chromium no ambiente **test**, servidor isolado na porta 3101: galeria de três fixtures, imagem carregada, reprodução WebM, HTTP 206 de vídeo e panorama 360° com retorno à imagem plana, sem erros JavaScript. PNG e WebM gerados pelo próprio Chromium, não pelo adapter de simulação. Fixtures, conta e servidor temporários removidos ao concluir.
- Evidências temporárias: `/tmp/render-step5-dashboard.png`, `/tmp/render-step5-results.png`, `/tmp/render-step5-mobile.png`, `/tmp/render-step5-panorama.png`; scripts `/tmp/render-step5-smoke.cjs` e `/tmp/render-step5-previews.cjs`.

## Limites mantidos

O adapter Simulation continua produzindo zero RenderOutputs e zero blobs. A galeria de desenvolvimento fica vazia enquanto não houver resultados reais. StoreOutput apenas armazena artefatos de um chamador interno confiável: verificação de assinatura não equivale a decodificação completa de mídia. Ainda não há executor real, autenticação de worker ou API de ingestão. Reprodução depende dos codecs do navegador; panorama exige imagem equiretangular 2:1. Nenhum Blender, extensão SketchUp, geração de vídeo/VR ou deploy foi implementado. Step 6 aguarda autorização.
