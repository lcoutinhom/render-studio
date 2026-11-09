# Revisão ativa — fluxo simplificado de clientes e arquivos

O fluxo principal foi atualizado conforme [SIMPLE_PROJECT_WORKFLOW.md](SIMPLE_PROJECT_WORKFLOW.md): clientes, projetos, múltiplos uploads com revisões por arquivo, checkboxes de cenas/fotografias, configuração única por formulário/Gemini/preset/JSON e resultados no projeto. Cadastro manual de ambientes deixa de ser obrigatório. Os registros técnicos e o histórico das etapas abaixo permanecem como base e compatibilidade; não representam mais a navegação principal.

---

# Arquitetura proposta — Etapa 1

Status: Steps 1 a 4 implementados. RenderBatch/RenderJob e execução simulada em Solid Queue estão disponíveis. Resultados e dashboard permanecem no Step 5; Blender continua na Fase 2.

## Fundação implementada e referências

Rails 8.1.4, Ruby 4.0.7, PostgreSQL 17, React/TypeScript, Inertia Rails com Vite, Tailwind e componentes originais do Metronic 9.5.0. Monólito modular usando as convenções Rails: models, controllers, services, jobs, policies, components, pages e layouts, sem serviços separados em Node.

O código do Dogtrainer foi inspecionado para reutilizar o padrão de Devise, concern de autorização, policies com negação por padrão e scopes. A autenticação é exigida por padrão; ações privadas devem chamar `authorize` e listagens devem usar `policy_scope`. A busca de recursos será explícita, evitando inferência automática de classe por nome de controller. O domínio inicial pertence a User; contas corporativas e permissões daquele outro produto não foram introduzidas.

Devise implementa sessão, recuperação e alteração de senha e confirmação/reconfirmação de e-mail. A aplicação é interna: signup público e exclusão de conta via Devise não são roteados. Somente PUT/PATCH de edição da própria conta são expostos; `registerable` permanece como suporte ao controller nativo de atualização. A conta inicial é provisionada por seed idempotente, já confirmada, sem regravar credenciais existentes. O perfil é autorizado por UserPolicy e sempre deriva o usuário da sessão. React/Inertia consome apenas os campos públicos do usuário. Senha atual é obrigatória para alterações. CSRF e rate limiting estão ativos.

Solid Queue, Solid Cache e Solid Cable usam bancos PostgreSQL separados, provisionados por `db:prepare`. Testes usam RSpec/Factory Bot, com adapters de teste onde apropriado e verificações de persistência real dos serviços Solid. Nenhum Redis ou Sidekiq.

Active Storage está instalado com disco local, sem rotas públicas de arquivos. Uploads e downloads privados dos originais estão implementados no Step 2; resultados serão tratados no Step 5. Configuração futura de S3 deve manter arquivos privados.

O [requisito completo](REQUIREMENTS.md), com a correção posterior para RSpec, complementa este documento. APIs REST versionadas, services de domínio, renderização e indicadores serão adicionados nos steps correspondentes, sem antecipar recursos.

## Domínio e hierarquia

A navegação principal será `Project → ProjectVersion → Environment → RenderJob → RenderOutput`. A persistência distingue a identidade do ambiente, pertencente ao projeto, de sua participação em uma versão:

```text
Project
├── Environment (identidade estável)
└── ProjectVersion (modelo original compartilhado)
    └── EnvironmentVersion (associação com Environment)
        └── RenderJob
            └── RenderOutput
```

Um modelo pode conter vários ambientes. O arquivo original fica associado exclusivamente à versão do projeto, sem cópia por ambiente. `EnvironmentVersion` permite que um ambiente esteja ausente de determinada versão e preserva os dados necessários para identificar sua geometria naquela versão.

## Entidades propostas

| Entidade | Responsabilidade e campos principais |
| --- | --- |
| Project | Nome, descrição, status e configurações gerais de renderização. |
| ProjectVersion | Projeto, número único no projeto, arquivo original, formato, checksum, metadados de importação, status e datas. Versões publicadas para renderização preservam seu arquivo e mapeamentos usados. |
| Environment | Projeto, identificador estável, nome, descrição, tipo, status, ordem de exibição e configurações próprias. |
| EnvironmentVersion | Projeto, versão, ambiente, status de associação, seletores do modelo e configurações específicas daquela versão. Par ambiente/versão único. |
| RenderBatch | Projeto, versão explícita, ambientes selecionados, solicitante, status agregado e datas. Criado também para a seleção de todos os ambientes. |
| RenderJob | Associação EnvironmentVersion, versão explícita, lote opcional, tipo de saída, estado, progresso, tentativa, erro e snapshot das configurações efetivas. |
| RenderOutput | Job, tipo, localização do artefato, metadados, checksum e data de criação. |

Todos os vínculos devem garantir que projeto, versão e ambiente pertencem ao mesmo projeto. Um job não pode apontar para uma versão diferente da registrada em sua associação. Autorização e isolamento dos dados devem ser verificados no servidor.

### Ambientes

Tipos: sala de estar (`living_room`), cozinha, quarto, banheiro, escritório, sala de jantar (`dining_room`), lavanderia (`laundry`), área externa e personalizado. O tipo personalizado admite rótulo próprio. Estados propostos: ativo e arquivado; o estado de renderização pertence aos jobs, não ao cadastro do ambiente.

Operações: criar, editar, excluir, duplicar, reordenar e visualizar individualmente. A duplicação cria nova identidade, copia configurações e, quando solicitado, associações com versões do mesmo projeto; não copia modelos, jobs ou resultados. Nomes iguais não implicam identidade compartilhada.

A exclusão de um ambiente com histórico será lógica, preservando suas associações e resultados. Um ambiente sem vínculos históricos poderá ser removido fisicamente. Alterações de ordem serão atômicas, restritas ao projeto. Arquivar um ambiente não altera jobs já submetidos.

### Associação com versões

Seletores suportam parte do modelo, lista de objetos, cena ou região espacial. Cada associação registra o tipo de seletor, identificadores da origem, sistema de coordenadas quando aplicável, metadados e situação: pendente, validada ou inválida.

Uma nova versão não recebe automaticamente todos os ambientes da anterior. Associações sugeridas por identificadores persistentes exigem validação; nomes são apenas pistas. Ambientes não encontrados ficam sem associação ou pendentes, e o usuário pode associá-los manualmente. Seletores de versões anteriores permanecem preservados.

Câmeras, associações de materiais, iluminação e presets podem ser definidos por ambiente. Referências a objetos e câmeras do modelo são registradas por EnvironmentVersion, pois podem mudar entre versões. Recursos visuais binários compartilhados são referenciados, sem cópias desnecessárias.

## Configurações e renderizações

Precedência proposta: padrões do sistema → preset inicial escolhido → configurações gerais do projeto → configurações do ambiente → ajustes da associação com a versão → ajustes explícitos da solicitação. Campos ausentes herdam o valor anterior; remoções explícitas devem ter representação distinta de ausência. A combinação de estruturas e listas deve ser definida no contrato de validação.

Na submissão, cada job congela a versão, seletores, câmeras, materiais, iluminação, preset, formato e demais configurações efetivas. O snapshot inclui as revisões dos recursos referenciados. Edições posteriores não modificam jobs ou resultados existentes. Atualizar o modelo cria uma nova ProjectVersion; não substitui o arquivo da versão anterior.

O usuário pode renderizar um ambiente, vários selecionados ou todos os ambientes elegíveis da versão escolhida. A seleção “todos” é resolvida no momento da submissão e fica registrada. A interface informa ambientes ausentes, arquivados ou com associação inválida; uma solicitação com itens inelegíveis é rejeitada com motivos por ambiente, para o usuário corrigir ou reenviar apenas os elegíveis.

Um lote tem jobs separados por ambiente e, quando necessário, por câmera/tipo de saída. A interface agrega o estado por ambiente e exibe os jobs individuais. Estados de job: rascunho (`draft`), enfileirado (`queued`), em execução (`processing`), concluído (`completed`), falhou (`failed`) e cancelado (`cancelled`). O lote distingue pendente, em execução, concluído, parcialmente concluído, falhou e cancelado, conforme os estados dos seus jobs. Falhar em um ambiente não cancela os demais. Novas tentativas geram novos registros vinculados à tentativa anterior, sem sobrescrever outputs. A submissão deve aceitar uma chave de idempotência para evitar lotes duplicados por reenvio.

Saídas previstas no domínio: imagens, vídeos, panoramas 360°, modelos 3D e preparação para VR. A Fase 1 permite configurar os fluxos com executor simulado, que atualiza status e eventos sem produzir renderizações reais. A galeria suporta estados vazios; não se criam resultados fictícios apresentados como reais. Não implementar WebXR nesta fase.

## Interface proposta

Detalhes do projeto incluem versões, configurações gerais e uma seção de ambientes ordenados, por exemplo: Sala de Estar, Cozinha, Quarto de Casal e Banheiro. A versão selecionada fica visível; ambientes ausentes dela são identificados e não podem ser renderizados nessa versão.

Ao abrir um ambiente: visualização 3D, configurações, materiais, câmeras, histórico e resultados. O histórico permite filtrar por versão e preserva resultados anteriores. Ações incluem CRUD, duplicação, reordenação, associação manual com versões e renderização individual. A seleção múltipla permite renderizar ambientes selecionados ou todos os elegíveis, com progresso por ambiente.

No Step 2, a visualização GLB será implementada com Three.js (rotação, zoom, pan e reset da câmera), loading e tratamento de erros. Uploads iniciais: GLB, glTF/OBJ com dependências empacotadas e DAE, com validação de extensão, MIME, tamanho, integridade e estrutura quando possível. Outros formatos aceitos para armazenamento exibem aviso quando não visualizáveis. SKP permanece futuro, sem presumir importação direta pelo Blender. O Step 1 não implementa uploads ou visualizador.

## Preparação para integrações futuras

SketchUp: os seletores poderão registrar tags, grupos, componentes, cenas e metadados da extensão. Tags não equivalem automaticamente a ambientes. A associação manual deve admitir múltiplos seletores por ambiente e preservar identificadores da origem e sua procedência.

Blender: o futuro executor carregará a geometria completa da versão e aplicará os seletores do ambiente, sem criar cópias do modelo por ambiente. Isolamento de visibilidade e participação de geometria externa em sombras, reflexos e iluminação serão configurações explícitas da futura integração.

O contrato do executor recebe a referência do modelo compartilhado, a versão, os seletores e o snapshot do job. Nesta etapa haverá apenas contrato e simulação; Blender, importadores nativos e extensão SketchUp estão fora do escopo.

## Composição visual interna

Login, navbar, sidebar e menu da conta adaptam o shell do Fenix, mantendo os componentes Metronic reais. O shell inclui temas claro/escuro, navegação mobile e foco acessível. Nenhum componente ou fluxo financeiro é incorporado.

## Persistência entregue no Step 2

Project pertence a User. Environment tem UUID estável e pertence a Project; EnvironmentVersion guarda seletores, região e estado da associação por ProjectVersion. Chaves estrangeiras compostas garantem o mesmo projeto para ambos os lados, inclusive fora do Active Record. Pares ambiente/versão e números de versão por projeto são únicos.

O upload passa por InspectUpload e por Create, com blob privado Active Storage, checksum SHA-256, formato e catálogo limitado de referências. O serviço de criação usa lock do projeto para numerar versões e limpa blobs sem associação em caso de falha. Não existe rota para sobrescrever o arquivo de uma versão. Metadados/identificação da versão são readonly no model; a troca de anexo é recusada após a criação.

Duplicação usa transação/lock e reidentifica ambientes, preservando referências entre as cópias e compartilhando os blobs. A duplicação de ambiente pode copiar associações explicitamente. Exclusão é sempre lógica nesta entrega, sem apagar os vínculos do domínio.

Downloads usam sessão e Pundit em rota própria, sem URLs de serviço de storage nas props. A resposta é transmitida em chunks, attachment/nosniff e no-store. O visualizador obtém o GLB pela mesma rota; dependências externas também são bloqueadas no cliente. Three.js é carregado sob demanda somente para versões GLB. O preview mantém a geometria completa e enquadra seletores de nós/cenas/regiões do sistema `model`; não implementa extração de ambientes nem renderização.

Configurações gerais/próprias já são JSONB persistido com raiz objeto e limite de 16 KiB. O schema tipado e a combinação efetiva das sobrescritas estão implementados no Step 3. A seleção começa temporária na UI e, ao salvar, é registrada em RenderConfigurationEnvironment e no snapshot imutável. Jobs continuam no Step 4.

## Domínio entregue no Step 3

Rendering::Settings centraliza definições, opções, limites, defaults, normalização e validação de configurações JSONB. O frontend recebe esse contrato do servidor e usa formulários reutilizáveis, sem JSON para parâmetros de renderização. Vídeo suporta trajetória automática ou de 2 a 200 pontos, cada um com posição/rotação. Panorama equiretangular exige proporção 2:1; VR permanece preparação, sem WebXR. A qualidade legada `high` é normalizada para `professional`.

Rendering::Resolve aplica sistema → preset → projeto → ambiente → EnvironmentVersion.settings → ajustes da solicitação. Chaves omitidas herdam; nulos são inválidos; arrays de trajetória substituem o valor anterior, inclusive `[]`. Configurações são validadas novamente após a combinação. A resolução exige projeto ativo, versão com original e ambientes ativos/associados/confirmados, todos do mesmo projeto.

RenderConfiguration pertence ao usuário, projeto e versão, com preset e configuração anterior opcionais. Não há FK circular com RenderJob. O registro e seu snapshot são imutáveis após a criação; editar pela UI gera revisão. RenderConfigurationEnvironment referencia associações da mesma versão por constraints compostas. Nenhuma operação de salvamento de configuração do Step 3 enfileira renderizações. A submissão é explícita no Step 4.

Snapshots preservam checksum/blob do original, identidades estáveis, seletores, ajustes efetivos e origem, revisão do preset/associação, propriedades das câmeras, materiais e IDs/checksums de revisões de texturas. O futuro worker deve consumir o snapshot, sem reler parâmetros mutáveis das bibliotecas.

RenderPreset global é somente leitura por policy; presets pessoais pertencem ao usuário. Material e RenderCamera são excluídos logicamente. MaterialMapping tem unicidade inclusive no escopo global sem ambiente (NULLS NOT DISTINCT) e FK para a associação ambiente/versão quando específico; específicos substituem gerais de mesmo nome de origem. Materiais de outro usuário são rejeitados. MaterialTexture é append-only para os dados do arquivo: substituir um canal aposenta a revisão anterior e cria outra, mantendo seus blobs anexados. Remover da biblioteca não altera snapshots existentes.

Câmeras pertencem explicitamente à associação ambiente/versão e armazenam unidades do modelo/graus. Referências opcionais a nós são validadas; ao revisar em outra versão, câmeras indisponíveis são desmarcadas com aviso. Materiais permanecem mapeamentos de dados, sem aplicação ao preview 3D nesta fase. Duplicações coerentes de projetos/ambientes agora incluem câmeras, mapeamentos e ajustes de associação, mas não solicitações ou resultados.

Texturas PNG/JPEG usam rotas privadas por usuário, com nosniff/no-store, MIME/extensão, dimensões e inspeção estrutural. PNG verifica chunks/CRC; JPEG verifica segmentos/dimensões e delimitadores. A verificação não é um decoder integral de imagens. Metadados de dimensões já são salvos como analisados, sem acionar ferramentas externas para análise. Sem Redis, Sidekiq, Blender ou extensão SketchUp.

## Processamento entregue no Step 4

RenderBatch referencia usuário, projeto, versão e RenderConfiguration com FK composta para manter a identidade. A solicitação registra seleção normalizada, chave de idempotência, digest e modo de simulação. RenderJob repete as referências e possui FK composta para o lote e para a associação EnvironmentVersion/Environment/ProjectVersion. Chaves de trabalho e números de tentativa são únicos; cada tentativa anterior admite no máximo um sucessor. Snapshots e identidades dos jobs são readonly.

Rendering::Submit valida a configuração e elegibilidade dos ambientes antes de criar um lote. O lock do usuário serializa submissões de mesma chave; a unicidade no banco reforça a idempotência. O digest inclui a configuração imutável, ambientes e opções de falha simulada. A expansão é ambiente × câmeras daquele ambiente × tipos habilitados, com até 2000 tarefas. Imagens são uma tarefa por câmera para a quantidade configurada, sem expansão por quadro/imagem.

As linhas RenderJob em estado queued e sem dispatched_at são uma outbox no banco principal. Rendering::QueueKick é chamado após todas as transações confirmarem e agenda DispatchRenderBatchJob em maintenance. O dispatcher publica ProcessRenderJob em rendering, em grupos de 100, com Active Job ID estável. Os dois bancos não compartilham transação distribuída: a publicação é pelo menos uma vez, com detecção de entregas existentes e reivindicação atômica para impedir execução lógica duplicada. Não se afirma atomicidade entre commits dos dois bancos.

Rendering::Lifecycle centraliza transições e eventos sob lock do lote, sempre na mesma ordem. A reivindicação queued → processing gera token e lease de dois minutos. Checkpoints avançam monotonicamente e renovam o lease; conclusão/falha exige o token atual. Cancelar remove o token e torna a tentativa terminal, impedindo escritas posteriores do worker antigo. Retentar cria outro registro com snapshot igual, attempt incrementado e novo token de entrega, sem resetar o anterior.

O adapter Simulation recebe o payload preservado e emite checkpoints cooperativos. Falha controlada pode ser selecionada por ambiente e ocorre somente na tentativa 1. Erros internos são apresentados em mensagem segura; os logs registram classe/ID, sem payload ou segredos. O adapter não lê/executa originais, não chama Blender e não cria RenderOutput ou blobs.

Rendering::Aggregate usa somente a tentativa mais recente de cada unidade de trabalho. Conclusões/falhas/cancelamentos contam como trabalho finalizado no progresso agregado, com estados completed/partially_completed/failed/cancelled distintos. Tentativas anteriores continuam no histórico e nos eventos. Reprocessar um lote considera apenas falhas/cancelamentos atuais.

ReconcileRenderingJob roda a cada minuto em maintenance. Recupera publicações pendentes, entregas desaparecidas e execuções da fila que falharam antes de iniciar o domínio; leases expirados são finalizados como falha, permitindo nova tentativa explícita. Não há repetição cega de um worker possivelmente ativo. Todas as alterações de estado emitem RenderEvent na mesma transação principal.

A interface usa polling de 2 s em páginas de lote/job enquanto ativos. Há isolamento Pundit por proprietário inclusive para histórico de projetos excluídos logicamente; o link para a configuração atual é omitido quando o projeto foi excluído. Configuração, projeto e ambiente oferecem acesso ao histórico. Nenhuma API de controles aceita parâmetros de estado/progresso arbitrários; CSRF continua ativo.


## Step 5 — resultados privados e dashboard

`RenderOutput → RenderJob → RenderBatch/RenderConfiguration/EnvironmentVersion` mantém a cadeia até projeto, versão e snapshot. O resultado não duplica identidades de projeto/usuário/ambiente: usa a identidade imutável da tarefa, protegida pelas FKs compostas do Step 4. Cada resultado possui tipo, nome, MIME, tamanho, checksum SHA-256, metadados e um único arquivo Active Storage. Não se anexa um resultado de outro tipo à tarefa. Campos e attachment são imutáveis após criação; duplicatas do mesmo arquivo/nome por tentativa são bloqueadas pelo índice único. Novos arquivos são registros distintos. RenderJob restringe exclusão enquanto houver resultados; arquivamentos/exclusões lógicas e novas versões não removem os blobs.

`Rendering::StoreOutput` recebe IO de um executor confiável, exige tarefa concluída, limita 1 GiB, verifica assinatura inicial/MIME/extensão, calcula SHA-256 em blocos e grava sob lock da tarefa. Chamadas repetidas retornam o mesmo registro; metadados conflitantes são recusados e blobs sem vínculo são removidos em falhas. É apenas fronteira de armazenamento, sem decodificação completa de conteúdo, upload público, autenticação de workers ou integração Blender. O adapter Simulation nunca chama esse serviço. Preparar esse armazenamento não altera a decisão de adiar Blender.

RenderOutputPolicy deriva o proprietário da tarefa. Todas as consultas, downloads e prévias passam por Pundit e sessão; rotas públicas de Active Storage continuam desabilitadas. Respostas são private/no-store e nosniff. Downloads usam attachment; somente PNG/JPEG/MP4/WebM podem ser inline. Range único é servido em blocos de até 1 MiB; ranges inválidos/múltiplos retornam 416, sem baixar o arquivo inteiro em memória. PNG/JPEG, vídeo e panoramas 2:1 têm prévias com loading/fallback; Three.js é carregado sob demanda para o panorama, sem WebXR. EXR/GLB têm download sem execução no navegador.

A galeria aceita filtros por projeto, ambiente, versão, tarefa, lote, tipo e status, paginando 24 arquivos. Opções são limitadas à conta, incluindo identidades históricas excluídas logicamente. O histórico de lotes mantém seus filtros ao paginar; filtro de ambiente usa subconsulta, sem duplicar lotes com múltiplas tentativas. Dashboard consulta totais reais, seis projetos recentes e oito lotes recentes do usuário. Totais de lotes são por solicitação, não por tentativa; conclusão simulada não implica arquivo. Nenhum indicador ou resultado é fabricado.


## API v1 e executor Blender autorizado

A Fase 2 acrescenta adapter blender ao RenderBatch, snapshots e idempotência; lotes antigos permanecem simulation. Os dois adapters compartilham Submit, Lifecycle e a fila, mas somente Blender produz arquivos. ProcessRenderJob escolhe o adapter preservado, e retentativas mantêm essa escolha. O executável local recebe apenas caminhos temporários e JSON, sem shell nem segredos Rails no ambiente. Heartbeat mantém o lease durante Cycles; cancelamento/timeout encerram o grupo de processos. Conclusão e publicação dos arquivos ficam sob lock/transação do lote; tokens inválidos não publicam. Blobs temporários sem vínculo e pasta de trabalho são removidos em falhas. Originais e geometria completa permanecem preservados.

A API `/api/v1` atende clientes internos autenticados pela mesma sessão Devise, com CSRF e policies existentes. Oferece leitura de projetos/versões/associações, criação/leitura de configurações e submissão/consulta/cancelamento/retentativa de lotes. Resultados reutilizam rotas privadas. Não há autenticação improvisada de worker remoto ou CORS público. Limites de submissão são 20/minuto por conta, além dos limites de ambientes/tarefas já existentes. Contratos em API_V1.md e BLENDER.md.

UI/UX usa os componentes originais Metronic 9.5 sem alterar os arquivos vendor: composição Demo 1 com navegação azul, cards, abas orientadas a tarefa e formulários de referências por nomes/limites espaciais. Ações destrutivas ficam recolhidas, escolhas de execução são explícitas e abas longas rolam dentro do painel mobile. Nenhuma geração visual fictícia é usada na galeria; a revisão visual usa fixtures apenas no banco de testes.


## Interface ativa — TailAdmin React

A composição Metronic foi substituída pelo TailAdmin React local. React/Inertia continua sendo o frontend; Rails continua responsável por sessão, CSRF, policies, dados, uploads e renderização. Não há segundo router/provider de autenticação, CORS público ou migração de banco associada à troca visual. Tokens TailAdmin e adapters locais com Radix são documentados em components/ui/PROVENANCE.md, com licença MIT preservada.

O wizard de quatro etapas trabalha sobre os mesmos snapshots e o mesmo schema tipado. Perfis pequenos em Rendering::GuidedProfiles fornecem defaults novos sem mutar configurações antigas. Rendering::CreateAndSubmit trata o envio direto: lock por usuário, criação de configuração e lote na mesma transação, replay idempotente validando as escolhas, rollback integral em falhas e outbox após commit. Salvar sem enviar e as rotas de integração existentes permanecem disponíveis. Detalhes em TAILADMIN_UX.md.


## Contexto de cenas na associação visual

O visualizador apresenta cenas reais do GLB e permite selecionar objetos/grupos sem duplicar o modelo. Referências de objetos aceitam o campo opcional `source_reference.scene_id`, validado contra as cenas da versão. Blender importa a cena selecionada, infere o contexto para referências antigas e preserva a geometria completa na exportação VR. A preparação modifica apenas a cópia temporária de importação. Veja [associação visual](SCENE_ASSOCIATION.md).


## WebXR nos resultados privados

A tela do resultado VR carrega sob demanda um visualizador Three.js sobre a rota privada de download do GLB. As identidades de projeto, arquivo/versão e tarefa continuam no resultado imutável. Desktop usa OrbitControls; imersão usa sessão WebXR explicitamente solicitada pelo usuário, com local-floor, teletransporte e movimento livre. A preferência de navegação é local ao viewer, não cria cadastros globais nem altera snapshots. Falta de suporte/permissão mantém o acesso desktop. Detalhes e limites de hardware em WEBXR.md.
