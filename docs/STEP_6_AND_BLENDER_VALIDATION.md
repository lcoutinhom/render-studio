# Step 6, integração Blender e revisão Metronic

Autorização: concluir a Fase 1, seguir até integração real com Blender e melhorar UI/UX com padrão Metronic. A decisão anterior de adiar Blender foi substituída. Extensão SketchUp, GPU, deploy e WebXR permanecem fora desta entrega.

## Entregas

- API REST `/api/v1` com sessões Devise, CSRF, Pundit e isolamento por proprietário: projetos/associações/versões, configurações imutáveis, submissão/histórico/cancelamento/retentativas de lotes e consulta de tarefas/resultados privados. Contrato em [API_V1.md](API_V1.md).
- Limite de 20 submissões/minuto por conta em cada interface (web/API), além de idempotência, limites de ambientes e de tarefas. Sem bearer arbitrário, signup, Redis ou callbacks públicos para worker.
- Adapter blender selecionável por solicitação, preservado no snapshot, na idempotência e em cada retentativa. Adapter simulation mantido, sem criar resultados fictícios.
- Processo Blender real em background, Cycles/CPU, importação GLB/glTF ZIP/OBJ ZIP, referências explícitas, materiais PBR/texturas preservadas, câmeras, luz, imagens PNG/JPEG/EXR, MP4, panorama 360° e GLB com otimização de texturas.
- Heartbeat, timeout, término do grupo de processos no cancelamento e publicação de resultados sob transação/lease do lote. Falhas não sobrescrevem tentativas/resultados anteriores. Originais continuam associados à versão, sem duplicação persistente por ambiente. Configuração/documentação em [BLENDER.md](BLENDER.md).
- Filas de manutenção/default separadas de rendering; um render por processo e RENDER_WORKERS configurável. Worker de desenvolvimento reiniciado após conferir zero tarefas queued/processing; não foram interrompidas tarefas do usuário.
- Metronic original preservado: composição Demo 1, sidebar/cores/ícones, dashboard com atalhos, projeto/ambiente com abas por tarefa, ações secundárias recolhidas, seleção visual de objetos/cenas, regiões com seis campos numéricos, focal/FOV vinculados, escolha explícita de Blender/simulação e ajustes de mobile.

## Validação

- `RUN_BLENDER_SPECS=1 bundle exec rspec`: **128 exemplos, zero falhas**. Sem a variável, apenas os três testes de executável são opcionais; os demais não dependem de Blender.
- Integração real: imagem, MP4, panorama 512×256, GLB, importação de arquivos glTF/OBJ ZIP, hashes de saída e preservação do original. Câmera salva, iluminação de estúdio e os sete canais de textura PBR exercitados com arquivo real.
- Testes de cancelamento encerram subprocesso em execução sem publicar arquivos; falha na publicação reverte conclusão; leases inválidos não publicam e novas tentativas preservam adapter/snapshot.
- API: usuários diferentes/IDs externos, autenticação, CSRF inválido e válido, erros tipados, idempotência entre executores, rate limiting e configuração sem enfileiramento.
- `bun run build`: TypeScript/Vite aprovados; aviso conhecido do chunk compartilhado Three.js, com visualizadores carregados sob demanda.
- RuboCop: **146 arquivos, nenhuma infração**. Zeitwerk aprovado. Brakeman: **zero erros, zero alertas** (diagnóstico de extensão opcional concurrent_ruby_ext não impede a execução do scanner).
- Sintaxe Python verificada e executada pelo Blender **5.2.2 LTS** instalado nesta máquina.
- Migração de adapters aplicada em desenvolvimento/teste, com restrição de banco para simulation/blender.
- Chromium: projeto/ambiente em abas, associação manual, seleção de região por coordenadas, escolha entre simulação e Blender, submissão de lote real, galeria de quatro saídas reais, reprodução MP4, panorama e downloads privados. Desktop 1440×1000 e mobile 390×844 sem overflow ou erros JavaScript.
- Verificação final em desenvolvimento: login, dashboard Metronic, API HTTP 200, navegação mobile e galeria, somente leitura; nenhuma fixture/projeto/renderização inserida na conta do usuário.
- Fixtures do navegador foram criadas somente em `render_studio_test`, com conta `blender-test@example.test`, e removidas após a validação. Servidor test da porta 3101 encerrado. Dados de desenvolvimento preservados.

Evidências temporárias: `/tmp/render-blender-project.png`, `/tmp/render-blender-association.png`, `/tmp/render-blender-submit.png`, `/tmp/render-blender-gallery.png`, `/tmp/render-blender-mobile.png`, `/tmp/render-blender-development-dashboard.png` e `/tmp/render-blender-development-mobile.png`. Fluxo de navegador em `/tmp/render-blender-ui.cjs` e `/tmp/render-blender-development.cjs`.

## Limites explícitos

A integração usa CPU e não foi aferida com modelos arquitetônicos de grande porte em produção. DAE deve ser convertido para GLB; SKP depende da extensão futura. O GLB otimiza texturas sem decimar geometria; navegação VR fica em metadados, sem WebXR. Câmera automática enquadra limites e pode ficar fora de salas fechadas: cadastrar câmera de interiores quando necessário. O subprocesso recebe ambiente reduzido, autoexec desativado e modo offline, mas isso não representa sandbox completo do sistema operacional. API atual é interna por sessão; autenticação da futura extensão/worker remoto precisa de contrato específico. Não houve deploy.
