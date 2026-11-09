# Step 4 — Rendering Management (simulação)

Concluído em 28/10/2026. O usuário confirmou simular agora e deixar Blender para depois. Step 5 não iniciado.

## Implementação e arquivos

- Migração `db/migrate/20261029010000_create_render_processing.rb`: RenderBatch, RenderJob e RenderEvent, constraints de identidade, status/progresso e unicidade.
- Models/policies correspondentes; snapshots imutáveis, seleção por configuração, expansão ambiente/câmera/saída, idempotência e histórico de tentativas.
- Services `app/services/rendering/{submit,queue_kick,dispatch,lifecycle,aggregate}.rb` e `adapters/simulation.rb`.
- Jobs `ProcessRenderJob` (rendering), `DispatchRenderBatchJob` e `ReconcileRenderingJob` (maintenance); scheduler em `config/recurring.yml`.
- Controllers `render_batches` e `render_jobs`, `ProcessingPresenter`, rotas privadas e integração ao show da configuração e ao histórico do projeto/ambiente.
- Frontend `pages/processing`, `submit-simulation`, `processing-status`, tipos em `types/processing.ts`, navegação e controles da configuração.
- Specs de ciclo de vida, dispatch/infraestrutura e requests; documentação e `.env.example` atualizados.

## Verificações

- **RSpec: 108 exemplos, zero falhas**, com PostgreSQL real.
- **TypeScript e build Vite aprovados.**
- **RuboCop: 128 arquivos, nenhuma infração.**
- **Zeitwerk aprovado.**
- **Brakeman: zero erros, zero alertas.**
- Migração incremental aplicada sem alterar os registros do usuário ou a conta seed.

Cobertura: submissão individual/múltipla, seleção inválida ou estrangeira, associação não confirmada, projeto arquivado, fanout, limite de tarefas, deduplicação/conflito de chave, snapshots após edição de cadastros, estados/progresso válidos, claim duplicado, rejeição de tokens antigos, cancelamento antes/durante a execução, falha parcial isolada, retentativa idempotente por tentativa anterior, preservação de histórico, erro seguro, leases expirados, constraints compostas, recuperação periódica e acesso privado ao histórico. Publicação e deduplicação foram exercitadas nas tabelas reais do Solid Queue, sem depender de Blender.

## Worker real e navegador

Worker `bin/jobs` iniciado no ambiente local de desenvolvimento, usando os bancos separados já configurados. Chromium autenticado com a conta seed percorreu:

1. Configuração temporária com Sala/Cozinha, imagens e vídeo; falha controlada só na Sala.
2. Lote parcialmente concluído: Cozinha concluída e Sala com falhas, sem propagação entre ambientes.
3. Reprocessamento das falhas até completed, preservando as duas tentativas anteriores com failed.
4. Navegação entre tarefa anterior e sucessora.
5. Submissão individual da Cozinha, cancelamento em lote e novas tentativas até completed; tentativas canceladas preservadas.
6. **Quatro POSTs simultâneos** com o mesmo token CSRF e chave de idempotência: todos retornaram HTTP 303 para o mesmo lote, com exatamente quatro tarefas, sem duplicação.
7. Histórico e páginas de processamento em mobile 390 × 844, sem erros JavaScript nem overflow horizontal.

Verificação no banco: três lotes concluídos, cada tentativa iniciada no máximo uma vez, e nenhuma criação de blob de resultado. Capturas temporárias: `/tmp/render-step4-partial.png`, `/tmp/render-step4-completed.png`, `/tmp/render-step4-mobile.png`. A prova estruturada dos registros de teste é preservada em `/tmp/render-step4-processing-proof.json`; os registros de processamento criados somente para este smoke test foram limpos de forma direcionada ao terminar, sem expor exclusão de histórico na aplicação. O projeto temporário foi excluído logicamente. Conta seed preservada.

## Executar

Com PostgreSQL ativo: `bin/rails db:prepare`, `bun run build`, `bin/dev` e, em outro terminal, `bin/jobs`. Acesse uma configuração em `/renderings/:id` para enfileirar simulação e `/render_batches` para acompanhar. O worker ficou ativo localmente ao concluir esta entrega; reinicie `bin/jobs` se encerrar a sessão ou a máquina.

`SIMULATION_STEP_SECONDS` controla a pausa de 0–5 s entre checkpoints (padrão 0.75 s). Falhas de publicação permanecem na outbox e são retomadas pelo scheduler a cada minuto; tarefas sem heartbeat por dois minutos são marcadas como interrompidas, com nova tentativa manual disponível. Cancelamentos são cooperativos e preservam tarefas concluídas.

## Limites

Nenhum Blender, Python de renderização, extensão SketchUp, WebXR, galeria, dashboard de indicadores ou arquivo de saída real foi implementado. “Concluído” significa simulação encerrada. O modo está destacado nas páginas de solicitação, lote e tarefa.

Não há transação distribuída entre banco principal e Solid Queue: entrega pode ser repetida após falha de publicação, mas a mesma tentativa só é reivindicada uma vez. Leases/eventos e novas tentativas são persistidos no domínio. Fila cancelada pode ainda entregar a mensagem antiga; o worker a reconhece como terminal e não executa a simulação.

Até 2000 unidades de trabalho por lote e 500 ambientes selecionados. Histórico exibe as 100 tentativas/eventos mais recentes, com links entre tentativas; registros anteriores permanecem no banco. Listagem de lotes tem paginação e filtro de status. A interface atualiza por polling, sem canal Cable novo.

Deploy, S3, teste de queda forçada de todo o PostgreSQL e carga de produção não foram executados. O aviso de bundle Three.js já existente permanece no build, carregado somente no preview GLB.

**Próximo: Step 5 — Results & Dashboard, somente após autorização. Blender continua para a Fase 2.**
