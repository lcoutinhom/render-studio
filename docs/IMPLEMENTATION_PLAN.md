# Revisão ativa — fluxo simplificado de clientes e arquivos

O fluxo principal foi atualizado conforme [SIMPLE_PROJECT_WORKFLOW.md](SIMPLE_PROJECT_WORKFLOW.md): clientes, projetos, múltiplos uploads com revisões por arquivo, checkboxes de cenas/fotografias, configuração única por formulário/Gemini/preset/JSON e resultados no projeto. Cadastro manual de ambientes deixa de ser obrigatório. Os registros técnicos e o histórico das etapas abaixo permanecem como base e compatibilidade; não representam mais a navegação principal.

---

> Atualização de UI autorizada: a interface ativa usa TailAdmin React e o fluxo guiado documentado em [TAILADMIN_UX.md](TAILADMIN_UX.md). A referência a Metronic nas entregas anteriores fica como histórico. React/Inertia e Rails foram mantidos.

# Fase 1 — plano incremental

Steps 1 a 6 implementados. O usuário autorizou também a Fase 2 (integração Blender) e a revisão de UI/UX Metronic. A extensão SketchUp não está autorizada nesta entrega. O requisito completo está em [REQUIREMENTS.md](REQUIREMENTS.md); a instrução posterior substitui Minitest por RSpec e determina reutilizar os padrões do Dogtrainer, com serviços Solid sem Redis/Sidekiq.

Antes de iniciar cada step, apresentar o escopo. Ao concluir, registrar alterações, validações e limitações e aguardar autorização para o seguinte. A decisão anterior de adiar Blender foi substituída pela autorização de seguir até a integração real. A Fase 3 (extensão SketchUp) permanece fora do escopo.

## Step 1 — Foundation

Entregue:

- Rails 8, PostgreSQL, React/Inertia, TypeScript, Vite e Tailwind.
- Componentes reais Metronic e composição compartilhada de login/navbar/sidebar do Fenix, sem finanças, com proveniência documentada; layout responsivo com sidebar, header, navegação, menu da conta, notificações vazias, modal de saída, feedback e loading de navegação/formulários.
- Aplicação interna sem signup público; conta inicial confirmada via seed idempotente. Devise com login/logout por sessão, reconfirmação de e-mail, recuperação e alteração de senha.
- Perfil do usuário com autorização Pundit, policies com negação por padrão e scope por usuário.
- Solid Queue, Cache e Cable sobre PostgreSQL, filas default/rendering/maintenance e conexão Cable autenticada, sem canais funcionais antecipados.
- Active Storage preparado com armazenamento local e rotas públicas desabilitadas.
- Docker Compose exclusivo para PostgreSQL e Mailpit, documentação e verificações RSpec.

Aceite: aplicação executável, conta interna provisionada por seed, perfil autorizado e verificações básicas aprovadas. Evidências em [VALIDATION.md](VALIDATION.md). Visão geral inicial sem indicadores fictícios; dashboard de negócio permanece no Step 5.

## Step 2 — Projects & Environments

**Implementado e validado.** O frontend permite selecionar ambientes elegíveis; enfileiramento e renderização continuam no Step 4. Materiais, câmeras, configurações guiadas e resultados exibem estados vazios até seus respectivos steps.

- CRUD de projetos com pesquisa, filtros, ordenação, duplicação e arquivamento.
- CRUD de ambientes com tipos completos, configurações próprias, duplicação, ordenação e exclusão preservando histórico.
- Versões e uploads via Active Storage, sem duplicar arquivo por ambiente; validar extensão, MIME, tamanho, integridade e estrutura dos formatos suportados.
- EnvironmentVersion: associação, seletores, metadados, região espacial e validação de pertencimento ao mesmo projeto.
- Identidade estável do ambiente, associação manual e indicação de ausências entre versões; não mapear tags ou nomes automaticamente.
- Página do projeto com ambientes e página individual com versões, materiais, câmeras, configurações, histórico e resultados conforme forem entregues.
- Visualizador GLB com Three.js, rotação, zoom, pan, reset, loading/erro e aviso para formatos não visualizáveis.
- Seleção individual/múltipla/todos os ambientes elegíveis, preparada para submissão no Step 4.

Aceite: vários ambientes compartilham o arquivo de uma versão. Uma segunda versão pode ter apenas parte deles, preservando identidade e referências anteriores. Isolamento entre usuários/projetos, uploads e associações verificados em RSpec.

## Step 3 — Render Configuration

**Implementado e validado.** Wizard simples, abas personalizadas Metronic, herança tipada, presets globais/pessoais, biblioteca PBR/texturas privadas, mapeamentos e câmeras por ambiente/versão. RenderConfiguration é uma solicitação ainda não enfileirada, imutável após salvar; revisões criam novos registros. Vínculos de seleção usam RenderConfigurationEnvironment e snapshots preservam os dados utilizados. Evidências em [STEP_3_VALIDATION.md](STEP_3_VALIDATION.md).

- Wizard simples: projeto, versão, ambientes, qualidade, iluminação, quantidade, resolução, vídeo/panorama/VR, revisão e submissão preparada para Step 4.
- Modo personalizado com abas geral, materiais, iluminação, câmeras, imagens, vídeo, panorama e preparação para VR, sem WebXR.
- RenderConfiguration com JSONB validado, versão explícita e snapshots por solicitação; evitar FKs circulares obrigatórias entre configuração/job (usar uma única relação de propriedade).
- RenderPreset global/pessoal, presets rápido/padrão/profissional e salvamento de configurações reutilizáveis.
- CRUD de materiais com propriedades PBR e texturas privadas; MaterialMapping global por versão ou específico por ambiente.
- Múltiplas RenderCamera por ambiente e versão; referências inválidas identificadas após atualização.
- Herança e sobrescritas de configurações, prévia efetiva e opção de voltar ao valor herdado.

Aceite: ambientes herdam configurações gerais e aplicam ajustes independentes; configurações persistidas e validadas, sem aplicar materiais via Blender.

## Step 4 — Rendering Management

**Implementado e validado com simulação, conforme decisão do usuário de deixar Blender para depois.** Lotes, tarefas por ambiente/câmera/saída, outbox/dispatch Solid Queue, progresso, cancelamento cooperativo, retentativas imutáveis, histórico, idempotência e recuperação de interrupções. Nenhum arquivo de resultado é gerado. Evidências em [STEP_4_VALIDATION.md](STEP_4_VALIDATION.md).

- RenderJob/RenderBatch, usuário, projeto, versão e EnvironmentVersion coerentes; jobs individuais por ambiente/câmera/saída quando necessário.
- Submissão individual, seleção múltipla e todos os elegíveis; seleção e snapshots congelados ao enviar.
- Services para validar, criar, enfileirar, atualizar progresso, registrar eventos, cancelar, falhar e reprocessar.
- Solid Queue e adapter de simulação, sem Blender, com idempotência, transições válidas e tentativas registradas sem sobrescrever histórico.
- Estado por job/ambiente e estado agregado do lote, incluindo falha parcial.

Aceite: falha em um ambiente não impede os demais, reenvio não duplica jobs e alterações futuras não mudam snapshots anteriores. Simulação explícita, sem resultados falsos.

## Step 5 — Results & Dashboard

**Implementado.** RenderOutput imutável, armazenamento privado, galeria, prévias de imagens/vídeos/panoramas, download com byte ranges e dashboard por conta. A simulação continua sem gerar arquivos. Evidências em [STEP_5_VALIDATION.md](STEP_5_VALIDATION.md).

- RenderOutput privado via Active Storage, galeria de imagens/vídeos/panoramas suportados e downloads autorizados.
- Filtros por projeto, ambiente, versão e status; histórico individual e de lotes, com estado vazio na ausência de arquivos.
- Dashboard com totais reais do banco, projetos recentes e histórico, sem dados fictícios.
- Preservar resultados ao atualizar modelos, editar configurações ou arquivar ambientes.
- Refinamentos de UX, mobile, feedback, loading e estados de erro.

Aceite: resultados rastreáveis ao ambiente, versão e snapshot; versões coexistem sem sobrescrita e acesso cruzado é negado.

## Step 6 — Quality & Preparation

**Implementado.** API `/api/v1` com sessão/CSRF/Pundit, contratos documentados, limites de submissão e cobertura ampliada. A integração real segue como Fase 2 autorizada, sem misturar o adapter simulado com resultados reais. Evidências em [STEP_6_AND_BLENDER_VALIDATION.md](STEP_6_AND_BLENDER_VALIDATION.md).

- Ampliar cobertura RSpec de models, services, policies, requests, jobs, uploads e transições.
- Verificar batch, idempotência, cancelamento, retentativas, herança e preservação de histórico.
- Revisar segurança, arquivos privados, parâmetros, rate limiting, CSRF, logs e isolamento entre usuários.
- API REST versionada com contratos de autenticação/autorização apropriados às integrações futuras.
- Documentar contrato do futuro Blender Worker e referências SketchUp (tags, grupos, componentes, cenas, metadados e associação manual).

Aceite do Step 6: verificações aprovadas, operação reproduzível e contratos documentados. Execução Blender entregue separadamente na Fase 2 autorizada; extensão SketchUp não desenvolvida.


## Fase 2 — Blender e revisão de UI/UX

**Integração inicial implementada e validada com executável real.** Cycles/CPU em background na fila rendering, importação GLB/glTF ZIP/OBJ ZIP, referências manuais, materiais PBR/texturas, câmeras, iluminação, PNG/JPEG/EXR, MP4, panoramas e GLB com otimização de texturas. Cancelamento termina subprocessos; heartbeat/timeout e publicação transacional preservam histórico e originais. DAE requer conversão para GLB; GPU e WebXR não são configurados nesta entrega. Detalhes em [BLENDER.md](BLENDER.md).

UI compõe os componentes originais Metronic 9.5: abas por tarefa em projeto/ambiente, seleção visual de objetos, região por campos X/Y/Z, editor focal/FOV vinculado, envio com escolha explícita de executor, menu/cores/indicadores e melhorias mobile. Sem extensão SketchUp, signup ou módulos financeiros.


## Revisão TailAdmin — experiência de criação

Implementada após a solicitação de substituir Metronic e tornar as configurações mais amigáveis. Login/shell/componentes TailAdmin adaptados, criação em quatro etapas, perfis de qualidade com padrões menores, câmera sugerida, parâmetros avançados opcionais e revisão com envio direto idempotente. Sem migração desnecessária para Next/SPA, alterações de autenticação, extensão SketchUp ou reprocessamento das imagens existentes. Validação em TAILADMIN_UX.md.
