# Fluxo simplificado de clientes, projetos e arquivos

**159 exemplos RSpec da regressão completa passaram**, com Blender real, incluindo imagem e GLB VR gerados por arquivos GLB/OBJ sem cadastro manual de ambientes. Após os ajustes finais, **20 exemplos direcionados passaram**. **13 testes frontend**, TypeScript/build, RuboCop em 168 arquivos e Brakeman sem alertas aprovados.

Chromium confirmou o fluxo Cliente → Projeto → Upload → Checkboxes de cenas recuperadas e câmeras formais → JSON/preset/Gemini → Renderização, com seleção mantida entre pesquisa e cenas e exatamente três vistas enviadas. Confirmados uploads independentes, revisão por arquivo, limpeza obrigatória de seleção ao mudar revisão e uso da nova revisão. Mobile sem transbordamento ou erros de página. Fixtures removidas somente do banco test; nenhum render de teste foi enviado nos projetos reais.

Detalhes em [SIMPLE_PROJECT_WORKFLOW.md](SIMPLE_PROJECT_WORKFLOW.md).

---

# VR e WebXR nos resultados do projeto

TypeScript/build aprovados. **7 exemplos RSpec de resultados privados e 4 exemplos de integração com Blender real passaram**, incluindo exportação GLB com geometria preservada. **13 testes frontend passaram**, com compensação do deslocamento da cabeça no teletransporte, zona morta, direção e limite de movimento por frame.

Chromium validou GLB sob demanda, navegação desktop, fallback sem suporte XR, suporte XR simulado com permissão recusada, fechamento/liberação de canvas e mobile sem transbordamento ou erros de página. Os testes de interface usaram respostas interceptadas, sem alterar resultados reais. Download privado por conta/projeto/versão e ranges foram verificados no banco test.

**Óculos físicos não foram testados**: entrada imersiva bem-sucedida, rastreamento, controladores e conforto/desempenho precisam ser conferidos no hardware. O viewer não possui colisões/navmesh nem classificação automática de piso. Operação e requisitos em [WEBXR.md](WEBXR.md).

---

# Seleção múltipla de cenas para câmeras

11 exemplos RSpec direcionados passaram, incluindo criação atômica, repetição sem duplicatas, referências inválidas, rollback, limites, isolamento de conta/versão e edição/exclusão lógica. TypeScript/build aprovados. Chromium confirmou checkboxes, seleção por página, limpeza, persistência entre filtros/páginas, envio das duas câmeras escolhidas e limpeza após sucesso, sem gravações antecipadas, novo download do GLB, erros de página ou transbordamento mobile. O POST foi interceptado no navegador para preservar dados reais; a persistência foi verificada separadamente no banco test.

---

# Galeria de cenas recuperadas

TypeScript/build e 11 testes frontend aprovados. Chromium validou geração progressiva das prévias, limite de 12 por página, paginação, pesquisa, visualização sem criar câmera, preparação do formulário com nome/pose/lente de 35 mm e ausência de gravações automáticas. Um único download do GLB, sem erros de página ou transbordamento mobile. No arquivo real da versão 16 (248,8 MiB), JANTAR 1 e JANTAR 2 geraram prévias, com apenas um download e sem gravação de dados. A galeria é uma exceção intencional aos índices em lista, pois apresenta enquadramentos para comparação visual.

---

# Classificação de cenas, objetos e pontos nomeados

Validado no GLB real recém-enviado (versão 16, aproximadamente 248,8 MiB): uma cena real, zero câmeras formais. Os nomes COZINHA/JANTAR/SALA aparecem como nós vazios com transformações, separados de geometria. A classificação usa apenas cabeçalho/JSON e cache, sem baixar a parte binária nem modificar os metadados persistidos.

**17 exemplos RSpec direcionados e 11 testes frontend, zero falhas**; TypeScript/build aprovados e RuboCop sem infrações nos arquivos alterados. Chromium verificou a classificação na página real, a exclusão dos marcadores da lista de objetos, o padrão Cena em associações novas e, com fixture interceptada, recuperação manual de pose mundial com lente aproximada de 35 mm. Sem alterações nos dados reais, erros de página ou transbordamento mobile.

---

# Miniaturas exportadas e sugestões Gemini

**142 exemplos RSpec, zero falhas**, com `RUN_BLENDER_SPECS=1`, e **10 testes frontend, zero falhas** (`bun test spec/frontend`). TypeScript/build aprovados; RuboCop nos seis arquivos Ruby alterados sem infrações; Brakeman sem erros ou avisos.

Chromium verificou GLB com câmeras em duas cenas, miniaturas, transformações de grupos, seleção e captura do enquadramento, um único download e mobile sem transbordamento. O arquivo usado foi interceptado apenas no navegador, sem alterar os dados reais. Duas chamadas reais Gemini foram concluídas: uma pelo serviço e outra pelo formulário, com revisão, aplicação explícita e preview validado pelo backend. Nenhuma configuração ou renderização foi gravada/enviada no teste. A chave foi configurada pelo usuário no `.env` privado do Render Studio, sem copiar credenciais de outras contas.

A ausência de câmeras reais no GLB é informada; nós vazios não viram miniaturas. A importação de enquadramentos é para perspectiva; ortográficas exportadas têm limitação explícita. Miniaturas são prévias WebGL e não resultados finais. Detalhes em [associação visual](SCENE_ASSOCIATION.md) e [Gemini](GEMINI.md).

---

# Pendências por ambiente

Oito testes de preparação para renderização passaram (`bun test spec/frontend/render-readiness.test.ts`), incluindo versões distintas, associações, arquivamento, original ausente e precedência de materiais. TypeScript/build aprovados. A interface usa o mesmo cálculo para a lista de pendências e a seleção dos ambientes. As validações autoritativas existentes do backend foram preservadas.

---

# Câmera por enquadramento visual

TypeScript/build aprovados e 5 exemplos RSpec da biblioteca sem falhas. Chromium verificou captura, navegação por arraste, nova captura explícita, lente/FOV para sensor de 36 mm e payload do formulário, interceptando o POST para não salvar no projeto real. Não houve erros de página. Coordenadas avançadas permanecem disponíveis; o fluxo principal usa prévia 4:3, nome e salvamento explícito. Detalhes em [associação e câmera visual](SCENE_ASSOCIATION.md).

---

# Visualizador — otimização de carregamento

TypeScript e build aprovados. Chromium confirmou que não há download antes de abrir, que o modo leve não decodifica texturas, que a opção completa carrega texturas e que fechar remove o canvas. Instrumentação WebGL registrou zero desenhos durante o período ocioso verificado. No GLB real de aproximadamente 163 MiB, a prévia leve ficou pronta em cerca de 3,7 segundos no ambiente local; esse tempo não é uma garantia para outras máquinas/conexões. Seleção de grupos, isolamento, preenchimento da associação e mobile passaram sem erros no console nem gravação nos dados reais. Nenhuma alteração no backend ou no executor Blender nesta otimização.

---

# Estado atual — associação visual por cenas e objetos

[Associação visual](SCENE_ASSOCIATION.md): **134 exemplos RSpec, zero falhas**, executados com `RUN_BLENDER_SPECS=1`, incluindo Blender real para cenas além da primeira e preservação do original. TypeScript/build aprovados. Chromium validou abas, seleção, isolamento, salvamento explícito, reabertura e mobile; o GLB real foi verificado sem salvar alterações. RuboCop: 151 arquivos sem infrações. Brakeman: zero erros e avisos.

---

# Estado atual — TailAdmin React e fluxo guiado

[Validação atual](TAILADMIN_UX.md): **132 exemplos RSpec, zero falhas**, incluindo Blender real. Interface TailAdmin com quatro etapas, perfis de qualidade, envio direto idempotente, mobile e temas verificados no Chromium. TypeScript/build, RuboCop, Zeitwerk e Brakeman aprovados. Dados e renders existentes preservados.

---

# Estado atual — Step 6, Blender real e UI Metronic

[Validação atual](STEP_6_AND_BLENDER_VALIDATION.md): **128 testes RSpec, zero falhas**, incluindo três testes com Blender real. API com sessão/CSRF/Pundit, renderização de imagens/vídeo/panorama/GLB, materiais/câmeras, cancelamento e UI Metronic verificados. Build/TypeScript, RuboCop, Zeitwerk e Brakeman aprovados. Fase 1 concluída e integração inicial da Fase 2 entregue; extensão SketchUp permanece fora desta entrega.

Os registros abaixo preservam as validações anteriores.

---

# Estado atual — Step 5 concluído

Verificações em [STEP_5_VALIDATION.md](STEP_5_VALIDATION.md): **115 testes RSpec, sem falhas**, build/TypeScript, RuboCop, Zeitwerk e Brakeman aprovados. Navegação/mobile verificados em desenvolvimento; imagem, vídeo e panorama verificados com fixtures isoladas no banco test e removidas após a validação. A simulação continua sem gerar arquivos. Step 6 aguarda autorização; Blender permanece para depois.

Os registros abaixo descrevem entregas anteriores.

---

# Estado atual — Step 4 concluído com simulação

Verificações em [STEP_4_VALIDATION.md](STEP_4_VALIDATION.md): **108 testes RSpec, sem falhas**, build/TypeScript, RuboCop, Zeitwerk, Brakeman e fluxo real de worker/Chromium aprovados, incluindo quatro submissões concorrentes idempotentes. Nenhum arquivo foi renderizado. Step 5 aguarda autorização; Blender permanece para depois.

Os registros abaixo descrevem entregas anteriores.

---

# Estado atual — Step 3 concluído

Evidências em [STEP_3_VALIDATION.md](STEP_3_VALIDATION.md): **85 exemplos RSpec, sem falhas**, TypeScript/build, RuboCop, Zeitwerk, Brakeman e fluxo completo no Chromium aprovados. Step 4 aguarda autorização.

Os registros abaixo descrevem as entregas anteriores.

---

Limite de upload atualizado para **1 GiB**; verificação atual: **60 exemplos RSpec, sem falhas**, TypeScript/build e RuboCop aprovados. Detalhes em [STEP_2_VALIDATION.md](STEP_2_VALIDATION.md).

# Estado atual — Step 2 concluído

Verificações mais recentes em [STEP_2_VALIDATION.md](STEP_2_VALIDATION.md): **59 exemplos RSpec, sem falhas**, build/TypeScript, RuboCop, Zeitwerk, Brakeman e fluxo completo no Chromium aprovados. Step 3 aguarda autorização.

Os registros abaixo descrevem a entrega anterior da fundação.

---

# Atualização — aplicação interna e shell Fenix

A verificação mais recente substitui o fluxo de signup da entrega inicial abaixo:

- RSpec: **30 exemplos, 0 falhas**; cobertura adicional para signup/criação/exclusão não roteados, edição autenticada e seed idempotente que preserva senha e nome após alterações.
- TypeScript/build aprovados. RuboCop: **49 arquivos, nenhuma infração**.
- Seed executado no banco local: `admin@renderstudio.local`, já confirmado. Credenciais e configuração em README e `.env.example`.
- Chromium: login com conta seed, signup indisponível (404), alternância de tema, perfil, sidebar mobile, fechamento com Escape, menu da conta e logout. Sem erros JavaScript ou overflow horizontal mobile.
- Login e shell adaptam somente a composição compartilhada do Fenix; nenhum lançamento financeiro foi incorporado. Proveniência em `app/javascript/styles/PROVENANCE.md`.

O Step 2 permanece pendente de autorização.

---

# Validação — Step 1 Foundation

Verificado em 28/10/2026, no Pop!_OS. Escopo: somente fundação da Fase 1. Rails e frontend foram executados localmente, sem deploy.

## Verificações automatizadas

- `bundle exec rspec`: **29 exemplos, 0 falhas**, executados com PostgreSQL real.
- `bun run build`: verificação TypeScript e build Vite aprovados.
- `bin/rails zeitwerk:check`: carregamento das constantes aprovado.
- `RUBOCOP_CACHE_ROOT=tmp/rubocop bin/rubocop`: **48 arquivos, nenhuma infração**.
- `bin/brakeman --quiet --no-pager`: **0 erros e 0 alertas de segurança**.
- `bin/rails db:prepare`: bancos exclusivos de desenvolvimento/teste e infraestrutura criados; migrações de Devise e Active Storage aplicadas.

RSpec cobre validações do usuário, confirmação de e-mail, autenticação, proteção das páginas privadas, logout, validação dos formulários, erro de login no Inertia, recuperação/redefinição de senha e expiração de token, alteração de perfil com senha atual, reconfirmação de novo e-mail, parâmetros injetados, isolamento de usuário por policy/scope, negação por padrão, CSRF, rate limiting, persistência de Queue/Cache e autenticação das conexões Cable.

Queue e Cache são exercitados com seus adapters reais no banco de teste. As demais requests usam cache em memória e Active Job de teste, preservando isolamento. Não há dependência de Blender.

## Navegador e worker

Foi executado um smoke test com Chromium/Playwright disponível no workspace, contra Rails e Mailpit locais, em desktop e viewport 390 × 844:

1. Cadastro e entrega de e-mail no Mailpit.
2. Confirmação pelo link recebido.
3. Login e acesso à visão geral.
4. Edição do perfil com senha atual e limpeza do campo de senha após envio.
5. Navegação mobile e modal de logout.
6. Recuperação pelo e-mail recebido e redefinição de senha.

O fluxo passou sem erros de JavaScript e sem overflow horizontal mobile. Capturas locais em `/tmp/render-studio-desktop.png` e `/tmp/render-studio-mobile.png`. O teste de navegador foi uma verificação pontual com script temporário; a suíte versionada desta entrega é RSpec. As contas temporárias criadas pelo smoke test foram removidas após a verificação.

O worker `bin/jobs` iniciou Supervisor, Dispatcher e Worker nas filas `default,rendering,maintenance`; recebeu SIGTERM após seis segundos e registrou shutdown/deregister limpos. O código de saída 124 veio do `timeout` usado para limitar essa verificação, sem falha do worker.

## Arquivos e decisões

- Fundação: `Gemfile`, `Gemfile.lock`, `.ruby-version`, configuração Rails, `compose.yaml` e `.env.example`.
- Frontend: `package.json`, `bun.lock`, `vite.config.ts`, `tsconfig.json`, `app/javascript/entrypoints`, `pages`, `layouts` e componentes Metronic com proveniência.
- Identidade: `app/models/user.rb`, controllers Devise em `app/controllers/users`, perfil/visão geral, concern de autorização e policies.
- Infraestrutura: configurações Solid, schemas de queue/cache/cable, Active Storage e conexão Cable autenticada.
- Testes: `spec/models`, `spec/policies`, `spec/requests`, `spec/infrastructure`, `spec/channels` e factories.
- Documentação: README, requisitos completos com a correção para RSpec, arquitetura, plano e este registro.

## Problemas resolvidos e limites

A geração inicial identificou uma divergência entre a versão declarada do plugin Vite e a exigida pela gem; a declaração foi alinhada, sem desativar a verificação de compatibilidade. O login inválido foi adaptado para redirect 303; o Devise nativo mantém a lógica de autenticação/tokens. O teste foi corrigido para respeitar o comportamento nativo do token de confirmação do Devise instalado.

Rede e acesso ao PostgreSQL/Docker exigiram execução autorizada fora do sandbox. Dependências foram instaladas no diretório da aplicação e cache temporário. O Brakeman em Ruby 4 emitiu mensagens de tentativa de carregar a extensão opcional de concurrent-ruby, mas concluiu com zero erros e zero alertas.

Não há CRUD de projetos/ambientes, upload funcional, Three.js, biblioteca de materiais, render jobs/batches, indicadores de negócio ou resultados nesta entrega. A visão geral mostra o estado inicial da conta. Solid Cable está configurado e autenticado, sem canais de domínio. A API versionada será construída nos próximos steps, com autenticação apropriada às integrações futuras.

A configuração de CI foi preparada, mas não executada no GitHub nem instalada na raiz do workspace. Produção, SMTP externo, S3 e implantação não foram verificados.

**Próximo: Step 2 — Projects & Environments, somente após autorização explícita.**
