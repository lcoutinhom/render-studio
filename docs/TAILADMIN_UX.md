# TailAdmin React e fluxo guiado

A interface ativa passou a usar o TailAdmin React 2.5.0 disponível em `../tailadmin/free-react-tailwind-admin-dashboard-main`. A autorização substitui a composição Metronic anterior. O template fonte não foi modificado; licença MIT em `licenses/TAILADMIN.txt`, adaptações descritas em `app/javascript/components/ui/PROVENANCE.md`.

## Arquitetura mantida

Frontend React 19 com Inertia, TypeScript, Vite e Tailwind 4, servido pelo Rails. Não foi criada uma aplicação Next/SPA independente: a interface React já permite compor o TailAdmin preservando autenticação Devise, CSRF, Pundit, uploads privados e navegação da aplicação. API v1 e contratos de integração continuam disponíveis. Não há novas dependências, Redis, signup público ou dados de demonstração financeiros.

A composição do TailAdmin usa os tokens originais da distribuição, cards/botões adaptados, shell com sidebar recolhível, menu mobile, breadcrumb, conta, temas e login em dois painéis. Os primitives interativos mantêm Radix e os contratos `asChild`/Inertia existentes; não é uma cópia inalterada dos componentes Base UI/React Router do template. Os estilos Metronic não são mais importados. A confirmação de saída, acessibilidade dos diálogos e feedback continuam presentes.

## Quatro etapas

1. **Escolha o ambiente:** projeto, versão e um ou mais ambientes prontos. Ambientes pendentes mostram como prepará-los e ficam desabilitados para envio.
2. **Encontre o melhor ângulo:** câmeras cadastradas ou vista geral automática, com explicação do enquadramento exterior. Uma câmera disponível é pré-selecionada por ambiente em configurações novas; revisões preservam as escolhas salvas.
3. **Dê o seu toque:** perfis compreensíveis e quatro climas de iluminação. Parâmetros técnicos, trajetórias, presets e saídas adicionais ficam em disclosures/abas avançadas. Os materiais originais/mapeamentos continuam sendo usados.
4. **Confira e renderize:** resumo por ambiente, nome, executor e aviso de custo/tempo em CPU. **Gerar meu render** salva e submete; **Salvar para depois** só persiste a configuração.

Perfis em `Rendering::GuidedProfiles`: Teste rápido (800×600, 16 samples), Boa qualidade (1600×1200, 64) e Apresentação (2048×1536, 128), todos com redução de ruído. Esses valores são novos padrões guiados; não reescrevem presets, snapshots ou resultados anteriores. O render de apresentação 2400×1800/512 já produzido permanece intacto. Resolução/samples maiores continuam disponíveis nos ajustes avançados, com aviso de tempo de processamento. Não são prometidos ETAs de render.

O modo guiado inicia com teste rápido, uma imagem PNG e vídeo/panorama/GLB desligados. O usuário pode habilitar saídas adicionais, com indicação de esforço e contagem de quadros na revisão. Toda herança e validação continuam resolvidas no backend; a revisão mostra valores efetivos por ambiente, incluindo diferenças entre ambientes.

## Integridade do envio

`Rendering::CreateAndSubmit` salva configuração/snapshot e lote na mesma transação principal, sob lock do usuário. Mesma chave e escolhas retornam o lote existente; chave reutilizada com escolhas diferentes é recusada. Submissão inválida reverte a configuração nova, sem deixar solicitação órfã. Publicação na fila continua após commit pelo outbox existente. O fluxo anterior de salvar e enviar posteriormente e a API v1 seguem compatíveis. O endpoint web de configurações também limita envios a 20/minuto por conta.

As escolhas técnicas invalidam a revisão; editar nome ou executor mantém o resumo, sem recalcular geometria. Quantidade inválida de imagens mostra erro acessível com foco. Mudanças de etapa reposicionam o painel, links de preparação abrem a aba apropriada de ambiente/projeto e a UI não exige entender JSON, samples ou herança para criar a primeira imagem.

## Validação

- **132 exemplos RSpec, zero falhas**, executados com `RUN_BLENDER_SPECS=1`, incluindo os três testes reais pequenos de Blender e quatro testes novos de perfis, envio idempotente, rollback, isolamento e salvar para depois.
- TypeScript/Vite aprovados. Continua o aviso de chunk compartilhado Three.js, carregado sob demanda para os visualizadores.
- RuboCop: **149 arquivos, nenhuma infração**. Zeitwerk aprovado. Brakeman: **zero erros e zero alertas**; permanece o diagnóstico inofensivo da extensão opcional concurrent_ruby_ext durante o scanner.
- Chromium desktop/mobile: login, sidebar recolhível, seleção de ambiente/câmera, quatro etapas, escolha de perfis, revisão editável e submissão de simulação. Temas claro/escuro e viewport 390×844 sem overflow ou erros JavaScript.
- Fixtures criadas exclusivamente no banco test e removidas após a validação; servidor test da porta 3101 encerrado. Em desenvolvimento, navegação até revisão sem envio e download privado da imagem de apresentação existente verificados com HTTP 200.
- Últimos ajustes conferidos: validação com foco no erro, edição do nome sem perder resumo e confirmação/cancelamento da saída.

Evidências temporárias: `/tmp/render-tailadmin-login.png`, `/tmp/render-tailadmin-step1.png`, `/tmp/render-tailadmin-step3.png`, `/tmp/render-tailadmin-review.png`, `/tmp/render-tailadmin-mobile.png`, `/tmp/render-tailadmin-mobile-dark.png` e `/tmp/render-tailadmin-development-wizard.png`.

## Ajuste dos índices — listas e filtros em modal

As listagens de projetos, materiais, configurações salvas, estilos, processamento e resultados usam linhas de lista em vez de cards individuais. Resultados mantêm miniaturas compactas, visualização e download. Dashboard e escolhas do passo a passo mantêm suas composições próprias.

Filtros existentes de projetos, materiais, processamento e resultados foram movidos para um modal compartilhado. Abrir carrega os filtros ativos; cancelar/Escape descarta alterações; aplicar atualiza a listagem a partir da primeira página; limpar remove os filtros. Paginação utiliza os critérios já aplicados. Opções de ambiente/versão são limitadas à conta e filtradas por projeto dentro do modal, sem navegar ao mudar cada campo.

Validação: build/TypeScript aprovados; nove testes de requests de resultados/processamento sem falhas e RuboCop dos controllers sem infrações. Chromium verificou as seis listas, aplicar/limpar/cancelar, filtros dependentes, Escape e viewport 390×844 sem overflow ou erros JavaScript, somente consultando dados existentes. Evidências: `/tmp/render-list-projects.png`, `/tmp/render-list-filter.png`, `/tmp/render-list-results.png` e `/tmp/render-list-mobile-modal.png`.

## Guia de primeiros passos e dicas de câmera

A página autenticada `/help`, disponível como **Como começar** no menu e por um atalho na visão geral, reúne o fluxo do GLB do quarto até a galeria: criar projeto, enviar versão, cadastrar/associar ambiente, preparar câmera, testar e refinar. Explica onde os resultados ficam e a preservação de originais/histórico.

`CameraTips` compartilha orientações entre o guia completo, o cadastro de câmeras e a segunda etapa do wizard. Inclui altura relativa ao piso, espaço livre, enquadramento, distância focal, eixos/rotações, exemplo condicionado à origem/escala e resolução de problemas comuns. Esclarece que navegar pelo visualizador não salva uma câmera. Nenhuma coordenada é aplicada automaticamente e nenhum modelo/câmera existente é alterado.

Build/TypeScript e RuboCop aprovados. Verificação de navegador somente leitura: visitante redirecionado ao login, guia acessível após autenticação, links/contextos de câmera e viewport 390×844 sem overflow ou erros JavaScript. Evidências em `/tmp/render-help-camera.png` e `/tmp/render-help-mobile.png`.
