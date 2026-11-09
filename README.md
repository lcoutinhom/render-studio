# Render Studio

Plataforma interna de renderização arquitetônica. Monólito Rails 8 + PostgreSQL, React/TypeScript com Inertia e interface TailAdmin. RSpec e Solid Queue, sem Redis.

**Fluxo ativo: Cliente → Projeto → Arquivos → Cenas e fotografias com checkbox → Configuração → Renderizar → Resultados do projeto.** Cada projeto aceita vários uploads; apenas os arquivos têm revisões. Não é necessário cadastrar ambientes ou câmeras antes de renderizar.

Configure por formulário, presets salvos, Gemini ou JSON validado. Novos projetos herdam uma cópia do padrão geral. Cada renderização preserva a revisão do arquivo, os enquadramentos e o JSON utilizado. Imagens, vídeos, panoramas e GLB/WebXR ficam vinculados ao projeto e ao arquivo. O fluxo e os dados anteriores foram preservados.

Veja [o passo a passo e a arquitetura do fluxo simplificado](docs/SIMPLE_PROJECT_WORKFLOW.md), [Gemini](docs/GEMINI.md) e [VR/WebXR](docs/WEBXR.md). A extensão SketchUp permanece fora do escopo.

**VR e tour 360° ficam no projeto:** escolha o arquivo principal e prepare o passeio com a última revisão dele. VR gera um único modelo completo com pontos de entrada; tour gera panoramas conectados pelos pontos escolhidos. Revisões novas indicam atualização disponível sem substituir os passeios anteriores. Veja [Passeios por projeto](docs/PROJECT_EXPERIENCES.md). O envio de cenas do arquivo fica dedicado a imagens e vídeos.

## Executar localmente

Requisitos: Ruby 4.0.7, Bundler, Bun 1.4.4 e Docker Compose. O Rails roda no host; PostgreSQL 17 e Mailpit rodam em containers próprios.

```bash
cd render-studio
cp .env.example .env
bundle config set --local path vendor/bundle
bundle install
bun install --frozen-lockfile
docker compose up -d postgres mailpit
bin/rails db:prepare
bin/rails db:seed
bun run build
bin/dev
```

Aplicação interna em http://localhost:3100, sem cadastro público. O seed cria uma conta já confirmada:

- E-mail: `admin@renderstudio.local`
- Senha local inicial: `RenderStudio@2026!`

Você pode definir `SEED_USER_NAME`, `SEED_USER_EMAIL` e `SEED_USER_PASSWORD` no `.env` antes de executar o seed. Reexecutá-lo não altera uma conta existente, inclusive sua senha. Em produção, `SEED_USER_PASSWORD` é obrigatório para criar a conta; não há fallback de senha.

E-mails de recuperação e reconfirmação ficam no Mailpit em http://localhost:58025. As credenciais do Compose são exclusivamente de desenvolvimento local.

`bin/dev` inicia PostgreSQL/Mailpit via Compose, Rails, Vite com HMR, o worker
Solid Queue e o ComfyUI local em um único terminal. Ele carrega o `.env` antes de
resolver as portas e os caminhos. `Ctrl+C` encerra os processos que iniciou;
os containers permanecem disponíveis. Logs por serviço ficam em `log/dev/`.
Se um processo falhar, os demais também são encerrados.

Para pular componentes, use `DEV_COMFYUI=false`, `DEV_JOBS=false` ou
`DEV_DATABASE=false` no ambiente ou `.env`. O ComfyUI precisa estar previamente
instalado; `bin/dev` não instala modelos, drivers ou dependências e não muda o
motor de renderização configurado. Configure seus caminhos com `COMFYUI_SOURCE`,
`COMFYUI_PYTHON` e `COMFYUI_DATA`. Encerre instâncias avulsas antes de iniciar a stack.
 As filas configuradas são `default`, `rendering` e `maintenance`; o processamento simulado do Step 4 precisa desse worker ativo. O scheduler do Solid Queue executa a recuperação de pendências a cada minuto em desenvolvimento e produção.

`bin/setup --skip-server` instala dependências, prepara os bancos e faz o build; os containers precisam estar ativos. `bin/rails server` usa a porta padrão do Rails; prefira `bin/dev` para respeitar `APP_PORT` e os links de e-mail.

## Verificar

```bash
RAILS_ENV=test bin/rails db:prepare
bundle exec rspec
bun run build
bin/rails zeitwerk:check
RUBOCOP_CACHE_ROOT=tmp/rubocop bin/rubocop
bin/brakeman --quiet --no-pager
```

RSpec usa exclusivamente os bancos `render_studio_test*` e transações, sem apagar bancos de outros projetos. Os testes de infraestrutura exercitam Solid Queue e Solid Cache reais no PostgreSQL; os demais testes usam os adapters de teste/memória para manter isolamento.

## Estrutura

- `app/controllers`: autenticação Inertia, perfil, projetos, ambientes, versões e downloads privados.
- `app/controllers/concerns/authorization.rb`: autenticação e verificação de policies/scopes.
- `app/models`, `app/policies`: identidade, projetos, ambientes, versões e autorização restrita ao proprietário.
- `app/services/{projects,environments,project_versions}`: duplicação, ordenação e inspeção/criação de uploads.
- `app/javascript`: páginas React, layouts e componentes Metronic originais.
- `app/channels/application_cable`: conexão autenticada, sem canais funcionais nesta entrega.
- `config/{queue,cache,cable}.yml`: serviços Solid sobre PostgreSQL.
- `db`: migrações incrementais de identidade, Active Storage e domínio, além dos schemas separados de infraestrutura.
- `spec`: models, policies, requests e infraestrutura.

## Escopo e decisões

Devise com sessão, recuperação/alteração de senha, reconfirmação de e-mail e perfil. Não há GET de signup nem POST público de criação; as rotas de registro foram desabilitadas, mantendo apenas PUT/PATCH autenticado para edição da própria conta. CSRF ativo, cookies HttpOnly/SameSite e Secure em produção, rate limiting persistido via Solid Cache. Tokens e senhas não são expostos nas props; os logs filtram parâmetros sensíveis. Rotas públicas padrão do Active Storage permanecem desabilitadas; os originais são baixados por uma rota autenticada e autorizada, com streaming e Cache-Control privado/no-store.

O padrão do Dogtrainer foi inspecionado: controllers enxutos, concern de autorização, policies com negação por padrão e scopes. Não copiamos módulos de contas, pagamentos, impersonação ou integrações próprios daquele domínio. RSpec/Factory Bot substituem Minitest por instrução posterior. Não há Redis, Sidekiq, backend Node, Blender ou extensão SketchUp.

Arquivos do Active Storage usam disco local em desenvolvimento; a interface permite configurar S3 no futuro. Configuração SMTP local aponta para Mailpit. Produção requer as quatro URLs de PostgreSQL (`DATABASE_URL`, `QUEUE_DATABASE_URL`, `CACHE_DATABASE_URL`, `CABLE_DATABASE_URL`), `SECRET_KEY_BASE`, host/porta públicos, SMTP real e storage persistente. Não houve deploy.

A configuração de CI está em `.github/workflows/ci.yml` deste diretório, preparada para um repositório que mantenha `render-studio/`. GitHub só a executará se for instalada em `.github/workflows` na raiz desse repositório; ela não foi publicada.

Leia [requisitos](docs/REQUIREMENTS.md), [arquitetura](docs/ARCHITECTURE.md), [plano](docs/IMPLEMENTATION_PLAN.md) e [validação](docs/VALIDATION.md). A continuação depende de autorização por step.

O shell e o login reaproveitam a composição visual do Fenix: fundo original, sidebar de 260px, header fixo, breadcrumbs, avatar/menu da conta, temas claro/escuro e menu mobile. Foram adaptados somente os elementos compartilhados, sem módulos financeiros. Veja [proveniência](app/javascript/styles/PROVENANCE.md).

## Projetos, ambientes e versões

Abra **Projetos e ambientes** na sidebar. Você pode criar, pesquisar, filtrar, ordenar, editar, duplicar, arquivar e excluir projetos. Ambientes têm nome, descrição, tipo, status, ordem e configurações próprias em formulários. A edição parcial preserva configurações não enviadas. A configuração guiada e a resolução da herança estão implementadas no Step 3.

Envie o arquivo na seção **Versões do projeto**. O número é atribuído sob lock do projeto. O original pertence à ProjectVersion e é compartilhado por todos os ambientes daquela versão; duplicar um projeto reutiliza os blobs existentes. Exclusões de projetos/ambientes são lógicas, preservando versões e associações.

Cada nova versão começa sem ambientes associados. Abra um ambiente, escolha a versão e informe seus seletores: objetos, cena, região espacial, tag, grupo, componente ou parte do modelo. Confirme manualmente quando estiver correto. Os nós/cenas encontrados no GLB são listados como referência, sem inferir ambientes pelos nomes. O identificador estável do ambiente não muda entre versões.

O visualizador GLB permite rotação, zoom, pan e reset. Seletores de objetos/cenas ajustam o enquadramento; regiões ajustam o foco quando usam o sistema de coordenadas `model`. A geometria original completa permanece preservada. Outros seletores são armazenados para as integrações futuras. GLB sem geometria, formatos incompatíveis ou WebGL indisponível mostram mensagens próprias.

A seleção individual/múltipla/todos habilita somente ambientes ativos com associação confirmada à versão atual em projetos ativos. A seleção é local à página e é limpa ao trocar de versão. **Configurar seleção** abre o wizard do Step 3; salvar cria uma configuração imutável, sem submissão à fila ou execução de renderizações.

### Uploads suportados e limites

- GLB 2 autocontido, sem dependências externas ou extensões obrigatórias. MIME `model/gltf-binary` ou octet-stream, cabeçalho/chunks/JSON e limites de buffers verificados.
- ZIP contendo exatamente um glTF 2 ou OBJ e suas dependências. Referências relativas seguras são aceitas; faltantes, URLs externas, caminhos fora do pacote, links simbólicos, criptografia e executáveis são rejeitados.
- DAE XML com raiz COLLADA e geometria, sem DTD/entidades ou texturas externas. Inspeção estrutural básica; não há validação integral dos schemas 3D.
- Até **1 GiB por upload (1024 MiB)**, **512 entradas por ZIP**, **2 GiB expandidos**, até 1 GiB por entrada e limite de expansão por entrada. Checksum e validação binária em blocos, sem extrair ou executar arquivos; manifestos JSON/MTL limitados a 64 MiB.

GLB pode ser visualizado; ZIP glTF/OBJ e DAE são preservados para download, com aviso de visualização não suportada. SKP, conversão de modelos, decodificadores de compressão GLB, Blender e SketchUp permanecem futuros. Os originais têm checksum SHA-256 e validações de extensão, MIME e estrutura. Pundit e chaves estrangeiras compostas impedem vínculos entre projetos diferentes.

## Configurar renderizações (Step 3)

Na sidebar, abra **Configurar renderização** → **Nova configuração** ou selecione os ambientes de um projeto e clique em **Configurar seleção**. Um ambiente individual oferece **Configurar este ambiente** quando sua associação está confirmada.

O **Modo simples** orienta projeto → versão → ambientes → qualidade/preset → iluminação → imagens → resolução → vídeo/panorama/VR → revisão → salvar. O **Modo personalizado** usa abas de Geral, Materiais, Iluminação, Câmeras, Imagens, Vídeo, Panorama e VR. A revisão exibe os valores efetivos por ambiente e sua origem. Salvar configurações não cria jobs. Na página da configuração salva, você pode enfileirar uma simulação pelo Step 4.

A precedência é **sistema → preset inicial → projeto → ambiente → ajustes da versão do ambiente → solicitação**. Em configurações gerais e por ambiente, marque **Personalizar** para definir um valor próprio; desmarque para voltar à herança. **Restaurar toda a herança** limpa as sobrescritas da camada. Campos não alterados no wizard permanecem herdados. Trajetórias são listas substituídas por inteiro: uma lista vazia solicita trajetória automática. Valores nulos são rejeitados.

Em **Presets**, os globais Rápido/Padrão/Profissional são somente leitura. Você pode criar, editar e excluir presets pessoais ou salvar os valores efetivos de um ambiente de uma configuração como novo preset. Reexecute `bin/rails db:seed` em instalações existentes para criar os globais sem alterar a conta interna.

Em **Materiais**, cadastre propriedades PBR e texturas por canal. PNG/JPEG privados têm limite de 20 MiB e 16384 px por dimensão, com inspeção estrutural, MIME/extensão, integridade e dimensões. Substituições/remoções preservam revisões e blobs anteriores. O modelo 3D não recebe os materiais visualmente nesta fase; isso pertence à integração futura.

Na página do projeto, os mapeamentos podem ser gerais da versão ou específicos de um ambiente presente nela. O específico prevalece para o mesmo nome de material de origem. Nomes de origem são associados manualmente; nomes encontrados no GLB são apenas sugestões.

Na página de um ambiente, escolha a versão e cadastre suas câmeras, com posição nas unidades do modelo, rotação em graus, distância focal, campo de visão e projeção. Um ID de nó de origem é opcional e deve existir naquela versão. Câmeras não são transferidas automaticamente para modelos novos. Se nenhuma câmera for escolhida para um ambiente na solicitação, a configuração registra enquadramento automático para o futuro executor.

Configurações salvas preservam versão/checksum do modelo, seletores, valores efetivos, origens, câmeras, materiais e revisões de texturas. **Criar revisão desta configuração** salva um novo registro; não modifica o anterior. Alterar versão ou perder referências apresenta aviso e remove câmeras indisponíveis da nova seleção. Os vínculos com ambiente/versão são protegidos por constraints compostas.

Leia [validação do Step 3](docs/STEP_3_VALIDATION.md) para arquivos, testes e limites. **Step 6 e integração Blender implementados.**

## Processamento simulado (Step 4)

Execute a stack completa, que já inclui o worker:

```bash
bin/dev
```

Abra uma configuração salva em `/renderings/:id`. Em **Solicitar simulação**, escolha um ambiente, vários ou todos os ambientes daquela configuração e clique em **Enfileirar simulação**. Para incluir todos os ambientes elegíveis de um projeto, selecione-os no wizard e salve a configuração antes de enviar. A seleção não inclui automaticamente ambientes criados depois de salvar.

Acompanhe o lote e cada tarefa em **Processamento e histórico** (`/render_batches`). O status se atualiza por polling a cada 2 segundos enquanto há processamento, pausando em abas ocultas. Há histórico também no projeto e no ambiente/versão. Tarefas podem ser canceladas individualmente ou em lote; as já concluídas permanecem intactas.

Para experimentar falhas parciais, marque **Demonstrar falha na primeira tentativa** em um ambiente. As outras tarefas continuam. **Tentar novamente** cria uma nova tentativa; **Reprocessar falhas e cancelamentos** repete as tarefas atuais que falharam ou foram canceladas, sem modificar as anteriores. A falha controlada ocorre somente na primeira tentativa. Para executar uma configuração concluída novamente por intenção, faça uma nova solicitação na página da configuração.

Cada combinação ambiente/câmera/tipo de saída gera uma tarefa; uma tarefa de imagens processa a quantidade configurada como conjunto, sem criar uma tarefa por imagem ou quadro de vídeo. Limite: **2000 tarefas por solicitação**. Os parâmetros preservados vêm do snapshot, incluindo a versão/checksum, seletores, câmera, materiais e texturas. Alterar os cadastros não altera os jobs existentes.

Submissões usam chave de idempotência por usuário, com unicidade e lock no banco. Reenvios equivalentes retornam o mesmo lote; usar a mesma chave com parâmetros diferentes é recusado. Cancelamento é cooperativo: o estado é registrado imediatamente, e o executor para no próximo checkpoint, sem sobrescrever a tarefa cancelada.

As linhas de jobs são uma outbox persistente no banco principal. O envio ao banco separado do Solid Queue ocorre depois do commit. Falhas de publicação permanecem pendentes e são recuperadas pelo scheduler; entregas repetidas são neutralizadas pela reivindicação atômica da tarefa. Tentativas em execução sem heartbeat por 2 minutos são marcadas como interrompidas e podem receber nova tentativa. Consulte os eventos e confirme que `bin/jobs` está ativo se a solicitação ficar na fila.

`SIMULATION_STEP_SECONDS` define a pausa entre checkpoints (padrão 0.75 s, limitado a 0–5 s); pode ser configurado no `.env` antes de iniciar o worker. Nenhum arquivo 3D é executado ou alterado. Estados concluídos significam somente **simulação concluída**, sem resultados reais. Não há implementação de Blender, SketchUp ou galeria de resultados neste step.

Evidências e arquivos em [STEP_4_VALIDATION.md](docs/STEP_4_VALIDATION.md). Para abrir o sistema em outra máquina ou produção, configure e mantenha os processos web/worker e os quatro bancos descritos anteriormente; não houve deploy nesta entrega.


## Resultados e visão geral (Step 5)

Abra **Visão geral** para consultar projetos/ambientes, lotes em andamento, concluídos e com falhas, arquivos disponíveis e histórico recente da sua conta. Lotes contam solicitações, sem somar retentativas como novos lotes. Projetos excluídos logicamente saem dos totais de projetos/ambientes, mas seu histórico e arquivos permanecem acessíveis.

Em **Resultados**, filtre por projeto, ambiente, versão, tipo ou status da tarefa. Também há links diretos na página do projeto, ambiente, lote e tentativa. Cada resultado identifica versão, ambiente, tentativa, SHA-256 e configurações utilizadas. PNG/JPEG têm prévia, MP4/WebM usam os controles do navegador e panoramas PNG/JPEG equiretangulares 2:1 podem ser explorados em 360°; EXR e GLB ficam disponíveis para download. Reprodução de vídeo depende dos codecs do navegador. Não há WebXR.

Arquivos de resultado são privados, com downloads autorizados e suporte a byte ranges. `Rendering::StoreOutput` é uma fronteira **interna**, para registrar arquivos fornecidos por um executor confiável: verifica tamanho (até 1 GiB por arquivo), assinatura do formato, coerência com a tarefa concluída, SHA-256 e repetição idempotente. Não é um decodificador completo de mídia nem um endpoint de upload. Não executa Blender. A gravação preserva cada arquivo; não substitui resultados anteriores. O adapter de simulação não chama esse serviço, portanto sua galeria continuará vazia enquanto não houver resultados reais. Fixtures usadas nos testes não são inseridas na conta de desenvolvimento.

Veja [validação do Step 5](docs/STEP_5_VALIDATION.md). API interna versionada e revisão de segurança entregues no Step 6; integração real documentada abaixo.


## Blender real, API interna e interface Metronic

1. Verifique o executável: `blender --version`. Nesta máquina, Blender 5.2.2 LTS em `/snap/bin/blender`.
2. Configure BLENDER_BIN, BLENDER_THREADS, BLENDER_TIMEOUT_SECONDS e RENDER_WORKERS conforme `.env.example`. Padrão: Cycles/CPU, dois threads, um render simultâneo e timeout de uma hora.
3. Execute `bin/rails db:prepare` e mantenha `bin/jobs` ativo. As filas default/maintenance e rendering têm consumidores separados. Reinicie o worker depois de mudanças de código/configuração.
4. No projeto, use as abas **Modelo e versões**, **Ambientes**, **Materiais**, **Configurações** e **Histórico**. Associe objetos/cenas manualmente pelo nome; regiões usam campos X/Y/Z.
5. Configure os ambientes e salve. Na tela da configuração, escolha **Blender · arquivos reais** e clique em **Renderizar com Blender**. Para interiores, prefira uma câmera cadastrada dentro da sala.
6. Acompanhe o lote/ambientes e consulte a galeria. Imagens, vídeo MP4, panorama 360° e GLB preservam a versão e a tentativa utilizadas. A aba **Simulação · testar fluxo** continua sem gerar arquivos.

Importação real: GLB, glTF ZIP e OBJ ZIP. DAE deve ser convertido para GLB para renderizar nesta integração; SKP depende da futura extensão. Não há GPU/CUDA configurada nem WebXR. O GLB para VR preserva geometria e otimiza texturas; navegação walk/teleport fica como metadado, não como runtime.

A API `/api/v1` usa a sessão Devise existente, CSRF e Pundit; não aceita bearer arbitrário e não fornece callbacks públicos de worker. Leia [contrato da API](docs/API_V1.md), [operação Blender](docs/BLENDER.md) e [validação](docs/STEP_6_AND_BLENDER_VALIDATION.md).

Para repetir as verificações com o executável real: `RUN_BLENDER_SPECS=1 bundle exec rspec`. Sem essa variável, testes de executável são opcionais e o restante da suíte independe de Blender. Nenhum arquivo de teste é criado na conta de desenvolvimento.


## Interface TailAdmin e criação guiada de renders

A interface ativa usa o TailAdmin React do workspace, mantendo React + Rails/Inertia. O login, menu, cards, botões, campos, temas e navegação foram adaptados ao template. A composição Metronic anterior ficou no histórico de entregas; seus estilos não são mais carregados.

Clique em **Novo render** e siga: **Escolha o ambiente → Encontre o melhor ângulo → Dê o seu toque → Confira e renderize**. O padrão é Teste rápido, com uma imagem pequena para conferir a câmera. Boa qualidade e Apresentação aumentam a definição; ajustes técnicos continuam opcionais. A revisão permite gerar os arquivos diretamente ou salvar para depois, com proteção contra clique duplo e sem alterar configurações anteriores.

[Decisões, perfis e validação TailAdmin](docs/TAILADMIN_UX.md). **132 testes passando**, incluindo Blender real; projetos e imagens existentes preservados.

O menu **Como começar** abre o [guia do primeiro render](http://localhost:3100/help), com o roteiro para um quarto em GLB e dicas de posicionamento da câmera. As mesmas dicas aparecem na aba Câmeras do ambiente e na etapa de escolher o ângulo.

### Executor Gemini opcional e prompts

Na tela do arquivo GLB, o navegador captura cada cena selecionada usando Three.js,
com os materiais e texturas completos. Para usar o executor Gemini opcional, defina
`DEFAULT_RENDER_ENGINE=gemini`; a configuração padrão atual é ComfyUI local.
O executor Gemini não inicia o Blender. Configure `GEMINI_API_KEY`,
`GEMINI_IMAGE_MODEL` com um modelo de geração de imagens disponível na conta e
`GEMINI_RENDER_ENABLED=true`. O modelo de sugestão de configurações continua separado.
Execute `bin/rails db:migrate` para habilitar o novo executor no banco.

`BLENDER_RENDER_ENABLED=false` mantém o executor legado desabilitado na interface,
na submissão e no worker. Ative explicitamente para voltar a usá-lo.
O Gemini aceita somente imagens de GLB; vídeo, panorama e VR não são gerados por ele.
As telas antigas de configuração continuam permitindo simulação; use a tela do arquivo
para gerar imagens Gemini com a referência correspondente.

O prompt opcional aceita até 2000 caracteres. Pedidos explícitos para alterar o projeto
ou substituir regras são rejeitados. As regras fundamentais são enviadas separadamente
como instruções de sistema, acima das preferências. O modelo deve recusar pedidos
incompatíveis sem gerar imagem; filtros textuais e instruções não garantem fidelidade
visual absoluta, e os resultados devem ser revisados.
Cada snapshot preserva referência, modelo, prompt base, versão, preferências e prompt
final; novas tentativas reutilizam esses dados, sem atualizar tarefas antigas.

Formato da integração: [documentação de geração de imagens Gemini](https://ai.google.dev/gemini-api/docs/image-generation).

### Pipeline de IA local (integrado à geração GLB)

Novas fotografias GLB usam edição por referência com FLUX.2 Klein 4B no ComfyUI
local (RX 9060 XT). O SDXL/Canny antigo permanece disponível para históricos:
[instalação e diagnóstico](docs/local_ai/SETUP.md),
[integração Rails e configuração](docs/local_ai/RAILS_INTEGRATION.md),
[comparações de qualidade e limitações](docs/local_ai/QUALITY.md).
Inicie com `script/local_ai/start` e acesse `http://127.0.0.1:8188`.
