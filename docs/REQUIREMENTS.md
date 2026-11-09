# Revisão ativa — fluxo simplificado de clientes e arquivos

O fluxo principal foi atualizado conforme [SIMPLE_PROJECT_WORKFLOW.md](SIMPLE_PROJECT_WORKFLOW.md): clientes, projetos, múltiplos uploads com revisões por arquivo, checkboxes de cenas/fotografias, configuração única por formulário/Gemini/preset/JSON e resultados no projeto. Cadastro manual de ambientes deixa de ser obrigatório. Os registros técnicos e o histórico das etapas abaixo permanecem como base e compatibilidade; não representam mais a navegação principal.

---

> **Atualização de interface mais recente:** usar TailAdmin do workspace, substituindo o layout Metronic, e simplificar as configurações em um passo a passo amigável. A separação Next/React + API foi permitida como opção; a implementação mantém React/Inertia com Rails, integrando TailAdmin sem duplicar autenticação/rotas. Requisitos funcionais anteriores permanecem.

> **Autorização mais recente (prevalece):** concluir o Step 6 e seguir até a integração real com Blender; depois melhorar UI/UX usando o padrão Metronic. A decisão anterior de adiar Blender foi substituída. RSpec, Rails, Pundit, aplicação interna, Solid Queue/Cache/Cable sem Redis e os requisitos de múltiplos ambientes permanecem. Extensão SketchUp e WebXR continuam fora desta entrega. O texto abaixo preserva os requisitos e decisões anteriores como histórico.

> Correção mais recente: a aplicação é **interna**, sem signup público. Provisionar uma conta inicial por seed idempotente; reutilizar navbar, sidebar, login e elementos compartilhados do Fenix, sem o módulo financeiro. Manter recuperação de senha, perfil e reconfirmação de e-mail.

> Atualizações posteriores do usuário (prevalecem sobre o texto original): usar **RSpec**, com os padrões de arquitetura/autorização do Dogtrainer. Usar **Solid Queue, Solid Cache e Solid Cable**, sem Redis nem Sidekiq. A autorização inicial abrangia somente Step 1; posteriormente foram autorizados os steps seguintes e a integração Blender, conforme atualização acima.

# Projeto: Plataforma de Renderização Arquitetônica Automatizada

Você é um engenheiro de software sênior especializado em Ruby on Rails, React, Inertia.js, TypeScript, arquitetura de software, processamento assíncrono e aplicações de computação gráfica.

Desenvolva uma plataforma web para gerenciamento e renderização automatizada de projetos arquitetônicos criados no SketchUp.

A aplicação deverá permitir que arquitetos e designers de interiores organizem projetos com múltiplos ambientes, configurem renderizações e, futuramente, utilizem Blender para gerar imagens fotorrealistas, vídeos, panoramas 360° e experiências de realidade virtual.

## REGRA PRINCIPAL

O desenvolvimento será dividido em três fases:

1. **Aplicação web:** Rails 8 + React + Inertia.js + Metronic.
2. **Renderização:** integração com Blender no Pop!_OS.
3. **SketchUp:** extensão Ruby para SketchUp Desktop no Windows.

**Implemente somente a FASE 1 neste momento.**

Dentro da Fase 1, trabalhe incrementalmente, concluindo um step por vez.

Não implemente Blender nem a extensão SketchUp agora.

---

# 1. Stack tecnológica

Utilize a mesma abordagem arquitetural do projeto Dogtrainer.

## Backend

- Ruby on Rails 8.
- PostgreSQL.
- Solid Queue para processamento assíncrono.
- Solid Cache para cache.
- Solid Cable para atualizações em tempo real, quando necessário.
- Devise para autenticação.
- Devise Confirmable para confirmação de e-mail.
- Devise Recoverable para recuperação de senha.
- Pundit para autorização.
- Active Storage para arquivos.
- Minitest para testes automatizados.
- API REST versionada para futuras integrações.

Não utilizar Redis nem Sidekiq.

## Frontend

- React.
- TypeScript.
- Inertia.js.
- Tailwind CSS.
- Metronic Tailwind.
- Componentes reutilizáveis.
- Interface responsiva.
- Layout mobile-first.

A aplicação deverá seguir o padrão visual do Metronic, incluindo sidebar, header, formulários, tabelas, cards, dropdowns, modais e notificações.

Utilize componentes reais do Metronic quando estiverem disponíveis no repositório.

Não invente componentes proprietários nem copie arquivos de fontes não autorizadas.

## Ambiente

- Pop!_OS como sistema operacional principal.
- Docker Compose para PostgreSQL e serviços auxiliares.
- Aplicação Rails executada localmente.
- Active Storage com armazenamento local em desenvolvimento.
- Compatibilidade futura com S3.

---

# 2. Arquitetura

Utilizar um monólito modular em Rails.

O Rails será responsável por:

- Autenticação.
- Autorização.
- Regras de negócio.
- Gerenciamento de projetos.
- Gerenciamento de ambientes.
- Versionamento.
- Configurações de renderização.
- Biblioteca de materiais.
- Gerenciamento de câmeras.
- Jobs assíncronos.
- Histórico de processamento.
- Armazenamento de resultados.
- API de integração.

O React com Inertia.js será responsável pela interface.

Não criar um backend separado em Node.js.

Não criar microserviços nesta fase.

Organizar o código utilizando:

- Models.
- Controllers.
- Services.
- Jobs.
- Policies.
- Components.
- Pages.
- Layouts.

Controllers devem permanecer enxutos.

Services devem concentrar operações de negócio que envolvam múltiplos models ou integrações.

Jobs devem orquestrar tarefas assíncronas.

Evitar abstrações prematuras.

---

# 3. Modelo de domínio

A aplicação deverá suportar projetos com múltiplos ambientes.

Exemplo:

```text
Projeto: Apartamento João e Maria
│
├── Sala de Estar
│   ├── Câmeras
│   ├── Materiais
│   ├── Configurações
│   └── Renderizações
│
├── Cozinha
│   ├── Câmeras
│   ├── Materiais
│   ├── Configurações
│   └── Renderizações
│
├── Quarto de Casal
│   ├── Câmeras
│   ├── Materiais
│   ├── Configurações
│   └── Renderizações
│
└── Banheiro
    ├── Câmeras
    ├── Materiais
    ├── Configurações
    └── Renderizações
```

Um projeto poderá possuir um único arquivo SketchUp contendo todos os ambientes.

Não exigir um arquivo separado para cada ambiente.

O arquivo original deverá permanecer associado à versão do projeto.

Os ambientes funcionarão como divisões lógicas, permitindo identificar regiões, cenas, grupos ou componentes do modelo.

## Models principais

### User

Representa o usuário da plataforma.

Campos:

- name
- email
- encrypted_password
- confirmed_at
- confirmation_token
- reset_password_token
- reset_password_sent_at

Utilizar Devise.

### Project

Representa um projeto arquitetônico.

Campos:

- user_id
- name
- description
- client_name
- status
- archived_at

Relacionamentos:

- belongs_to :user
- has_many :environments
- has_many :project_versions
- has_many :render_jobs

Permitir criar, editar, duplicar, arquivar e excluir projetos.

### Environment

Representa um ambiente de um projeto.

Campos:

- project_id
- name
- description
- environment_type
- position
- status

Tipos iniciais:

- living_room
- kitchen
- bedroom
- bathroom
- office
- dining_room
- laundry
- outdoor
- custom

Relacionamentos:

- belongs_to :project
- has_many :render_jobs
- has_many :render_cameras

Um ambiente deverá manter sua identidade entre diferentes versões do projeto.

### ProjectVersion

Representa uma versão do modelo arquitetônico.

Campos:

- project_id
- version_number
- description
- metadata
- created_at

Utilizar Active Storage para armazenar o arquivo 3D.

Aceitar inicialmente:

- GLB.
- glTF com dependências empacotadas.
- OBJ com dependências empacotadas.
- DAE.

Preparar a arquitetura para suportar arquivos SKP futuramente, sem assumir que o Blender conseguirá importá-los diretamente.

Cada versão deverá preservar o arquivo original.

### EnvironmentVersion

Representa a associação de um ambiente com uma versão específica do projeto.

Campos:

- environment_id
- project_version_id
- source_reference
- metadata
- bounding_box

Esse model permitirá identificar quais ambientes estão presentes em determinada versão.

A referência ao ambiente poderá apontar futuramente para uma cena, tag, grupo, componente ou região espacial.

### RenderJob

Representa uma solicitação de renderização.

Campos:

- project_id
- project_version_id
- environment_id
- user_id
- render_configuration_id
- status
- progress
- started_at
- completed_at
- error_message

Status:

- draft
- queued
- processing
- completed
- failed
- cancelled

Uma renderização poderá pertencer a um ambiente específico.

Para renderizações de múltiplos ambientes, criar uma estrutura de processamento em lote, como `RenderBatch`, com jobs individuais associados.

Não criar registros inconsistentes que misturem ambientes de versões diferentes.

### RenderBatch

Representa uma solicitação para renderizar múltiplos ambientes.

Campos:

- project_id
- project_version_id
- user_id
- status
- created_at

Relacionamentos:

- has_many :render_jobs

Permitir acompanhar individualmente o progresso de cada ambiente.

### RenderConfiguration

Armazena as configurações de renderização.

Campos:

- render_job_id
- mode
- settings

Utilizar JSONB para configurações específicas.

Modos:

- simple
- custom

Validar a estrutura das configurações.

### RenderPreset

Representa configurações reutilizáveis.

Campos:

- user_id
- name
- description
- category
- settings
- system

Permitir presets globais e personalizados.

### Material

Representa um material da biblioteca.

Campos:

- user_id
- name
- category
- description
- base_color
- roughness
- metallic
- transmission
- ior
- metadata

Utilizar Active Storage para texturas.

### MaterialMapping

Associa materiais importados do modelo aos materiais da biblioteca.

Campos:

- project_version_id
- environment_id
- source_material_name
- material_id

Permitir associações globais por versão e específicas por ambiente.

### RenderCamera

Representa uma câmera de renderização.

Campos:

- environment_id
- project_version_id
- name
- position
- rotation
- focal_length
- field_of_view
- projection_type
- metadata

### RenderOutput

Representa um arquivo produzido por uma renderização.

Campos:

- render_job_id
- output_type
- format
- metadata

Tipos:

- image
- video
- panorama
- model_3d
- vr

Utilizar Active Storage para os arquivos.

---

# 4. Funcionalidades da aplicação

## 4.1. Autenticação

Implementar:

- Cadastro.
- Login.
- Logout.
- Confirmação de e-mail.
- Recuperação de senha.
- Alteração de senha.
- Perfil do usuário.

Utilizar Devise integrado ao React com Inertia.js.

Usar autenticação por sessão para a aplicação web.

## 4.2. Dashboard

Criar dashboard utilizando Metronic.

Exibir:

- Total de projetos.
- Total de ambientes.
- Renderizações pendentes.
- Renderizações em andamento.
- Renderizações concluídas.
- Renderizações com erro.
- Projetos recentes.
- Histórico de renderizações.

Os dados deverão vir do banco de dados.

## 4.3. Projetos

Implementar CRUD completo.

Permitir:

- Criar projetos.
- Editar projetos.
- Arquivar projetos.
- Duplicar projetos.
- Excluir projetos.
- Pesquisar.
- Filtrar.
- Ordenar.

Na página de detalhes, apresentar os ambientes pertencentes ao projeto.

## 4.4. Ambientes

Implementar CRUD completo de ambientes.

Permitir:

- Criar ambientes.
- Editar ambientes.
- Duplicar ambientes.
- Excluir ambientes.
- Reordenar ambientes.
- Selecionar ambientes para renderização.

Cada ambiente deverá possuir sua própria página.

Apresentar:

- Informações gerais.
- Versões disponíveis.
- Materiais.
- Câmeras.
- Configurações.
- Renderizações.
- Resultados.

## 4.5. Versionamento

Permitir enviar novas versões do modelo.

Cada versão deverá possuir:

- Número.
- Descrição.
- Arquivo.
- Data de criação.
- Ambientes associados.

Não sobrescrever arquivos anteriores.

Renderizações deverão permanecer vinculadas à versão utilizada.

## 4.6. Uploads

Implementar uploads com Active Storage.

Validar:

- Extensão.
- MIME type.
- Tamanho.
- Integridade básica.
- Estrutura dos formatos suportados, quando possível.

Não executar arquivos enviados pelo usuário.

Não confiar apenas na extensão do arquivo.

## 4.7. Visualizador 3D

Utilizar Three.js.

Criar um componente React reutilizável para visualizar modelos GLB.

Funcionalidades:

- Rotacionar.
- Zoom.
- Pan.
- Resetar câmera.
- Loading.
- Tratamento de erros.

Não implementar WebXR nesta etapa.

Para formatos não suportados diretamente pelo visualizador, apresentar mensagem informativa.

## 4.8. Renderização — Modo Simples

Criar um wizard.

Passos:

1. Selecionar projeto.
2. Selecionar versão.
3. Selecionar um ou vários ambientes.
4. Escolher qualidade.
5. Escolher iluminação.
6. Selecionar quantidade de imagens.
7. Selecionar resolução.
8. Escolher vídeo, panorama ou VR.
9. Revisar.
10. Enfileirar.

Presets iniciais:

- Rápido.
- Padrão.
- Profissional.

## 4.9. Renderização — Modo Personalizado

Criar interface com abas:

### Geral
- Resolução.
- Qualidade.
- Samples.
- Denoising.

### Materiais
- Biblioteca.
- Mapeamento.
- Texturas.
- Propriedades PBR.

### Iluminação
- Presets.
- Temperatura.
- Intensidade.
- Posição do sol.

### Câmeras
- Seleção.
- Posição.
- Rotação.
- Campo de visão.

### Imagens
- Quantidade.
- Formato.
- Resolução.

### Vídeo
- Duração.
- FPS.
- Resolução.
- Trajetória.

### Panorama
- Resolução.
- Projeção equiretangular.

### VR
- Preparação para WebXR.
- Qualidade de texturas.
- Navegação.
- Otimização.

As configurações deverão ser persistidas.

Permitir salvar configurações como presets.

## 4.10. Biblioteca de materiais

Implementar CRUD de materiais.

Categorias:

- Madeira.
- Vidro.
- Espelho.
- Metal.
- Pedra.
- Porcelanato.
- Tecido.
- Pintura.
- Plástico.

Permitir upload de texturas PBR.

Permitir associação de materiais importados com materiais da biblioteca.

A aplicação dos materiais no modelo será implementada na Fase 2.

## 4.11. Renderizações

Implementar gerenciamento completo.

Permitir:

- Criar.
- Configurar.
- Enfileirar.
- Cancelar.
- Reprocessar.
- Consultar progresso.
- Consultar erros.
- Visualizar histórico.

Utilizar Solid Queue.

Criar um adapter de simulação para a Fase 1.

Não executar Blender ainda.

A simulação deverá atualizar o status do job e registrar eventos de processamento.

Não criar resultados fictícios apresentados como renderizações reais.

## 4.12. Resultados

Criar galeria de resultados.

Permitir:

- Visualizar imagens.
- Reproduzir vídeos.
- Visualizar panoramas quando suportados.
- Baixar arquivos.
- Filtrar por ambiente.
- Filtrar por versão.
- Consultar histórico.

As interfaces deverão funcionar mesmo quando ainda não existirem resultados.

---

# 5. Processamento assíncrono

Utilizar Solid Queue.

Configurar filas:

- default
- rendering
- maintenance

Criar services responsáveis por:

- Criar solicitações.
- Validar configurações.
- Enfileirar renderizações.
- Atualizar status.
- Registrar progresso.
- Cancelar jobs.
- Tratar falhas.
- Executar retentativas.

Implementar idempotência.

Evitar jobs duplicados.

Não executar processamento pesado dentro de controllers.

Preparar interface de adapter para o futuro Blender Worker.

---

# 6. Interface Metronic

A aplicação deverá utilizar Metronic Tailwind.

Criar layout principal com:

- Sidebar.
- Header.
- Breadcrumbs.
- Menu do usuário.
- Notificações.
- Modais.
- Toasts.
- Loading states.
- Empty states.

## Navegação

```text
Dashboard

Projetos
  ├── Todos os projetos
  ├── Novo projeto
  └── Ambientes

Renderizações
  ├── Todas
  ├── Nova renderização
  └── Histórico

Biblioteca
  ├── Materiais
  └── Presets

Configurações
  └── Perfil
```

## Rotas

```text
/dashboard

/projects
/projects/new
/projects/:id
/projects/:id/edit
/projects/:id/versions

/projects/:project_id/environments
/projects/:project_id/environments/new
/projects/:project_id/environments/:id
/projects/:project_id/environments/:id/edit

/renderings
/renderings/new
/renderings/:id
/renderings/:id/configuration
/renderings/:id/results

/materials
/materials/new
/materials/:id/edit

/presets

/settings
/profile
```

---

# 7. Segurança

Implementar:

- Devise.
- Pundit.
- Proteção CSRF.
- Validação de uploads.
- Autorização por recurso.
- Isolamento de dados entre usuários.
- Proteção de arquivos privados.
- Rate limiting em endpoints sensíveis.
- Validação de parâmetros.
- Logs sem dados sensíveis.

Não permitir que um usuário acesse projetos, ambientes, versões ou renderizações pertencentes a outro usuário.

---

# 8. Testes

Utilizar Minitest.

Cobrir:

- Models.
- Services.
- Policies.
- Controllers.
- Jobs.
- Autenticação.
- Autorização.
- Uploads.
- Versionamento.
- Ambientes.
- Configurações.
- Presets.
- Renderizações.
- Processamento em lote.
- Idempotência.
- Transições de status.

Não depender de Blender nos testes da Fase 1.

---

# 9. Organização da implementação

A Fase 1 deverá ser dividida nos seguintes steps.

## Step 1 — Foundation

Implementar:

- Rails 8.
- PostgreSQL.
- React.
- Inertia.js.
- TypeScript.
- Tailwind.
- Metronic.
- Devise.
- Pundit.
- Solid Queue.
- Solid Cache.
- Layout principal.
- Autenticação.
- Perfil do usuário.

## Step 2 — Projects & Environments

Implementar:

- Projetos.
- Ambientes.
- Versionamento.
- Uploads.
- Associação entre ambientes e versões.
- CRUD completo.
- Visualizador 3D inicial.

## Step 3 — Render Configuration

Implementar:

- Modo simples.
- Modo personalizado.
- Configurações.
- Presets.
- Biblioteca de materiais.
- Mapeamento de materiais.
- Câmeras.

## Step 4 — Rendering Management

Implementar:

- Render jobs.
- Render batches.
- Solid Queue.
- Adapter de simulação.
- Status.
- Progresso.
- Cancelamento.
- Retentativas.
- Histórico.

## Step 5 — Results & Dashboard

Implementar:

- Galeria de resultados.
- Downloads.
- Dashboard.
- Indicadores.
- Histórico.
- Melhorias de UX.

## Step 6 — Quality & Preparation

Implementar:

- Testes.
- Segurança.
- Refatoração.
- Documentação.
- Contratos para integração com Blender.

---

# 10. Fase 2 — Blender

NÃO IMPLEMENTAR AGORA.

A integração deverá utilizar:

- Blender.
- Python.
- Cycles.
- Execução em background.
- Materiais PBR.
- Câmeras.
- Iluminação.
- Exportação GLB.

Funcionalidades:

- Importar modelos.
- Identificar ambientes.
- Aplicar materiais.
- Configurar iluminação.
- Configurar câmeras.
- Gerar imagens.
- Gerar vídeos.
- Gerar panoramas 360°.
- Otimizar modelos para VR.
- Exportar resultados.
- Atualizar progresso no Rails.

Preservar a geometria original.

Não alterar dimensões ou posições de elementos arquitetônicos.

---

# 11. Fase 3 — SketchUp

NÃO IMPLEMENTAR AGORA.

Desenvolver uma extensão Ruby para SketchUp Desktop no Windows.

Funcionalidades:

- Autenticação.
- Seleção de projeto.
- Seleção de ambientes.
- Exportação de geometria.
- Exportação de materiais.
- Exportação de texturas.
- Exportação de cenas.
- Envio para API Rails.
- Consulta de renderizações.
- Acompanhamento de status.
- Acesso aos resultados.

Adicionar um botão:

**Enviar para renderização**

---

# 12. Regras de implementação

Antes de escrever código:

1. Inspecione o repositório.
2. Identifique a estrutura existente.
3. Verifique dependências instaladas.
4. Verifique componentes Metronic disponíveis.
5. Identifique padrões arquiteturais.
6. Apresente o plano do Step 1.

Se o repositório estiver vazio, inicialize a aplicação Rails 8 com PostgreSQL.

Se já existir uma aplicação, preserve a arquitetura e reutilize os componentes disponíveis.

Não recrie funcionalidades existentes.

Não invente detalhes do Dogtrainer caso seu código não esteja disponível.

Não implementar todas as funcionalidades de uma vez.

Não utilizar Redis.

Não utilizar Sidekiq.

Não criar backend Node.js separado.

Não criar microserviços.

Não implementar Blender na Fase 1.

Não implementar a extensão SketchUp na Fase 1.

---

# 13. Critérios de qualidade

O código deverá ser:

- Legível.
- Testável.
- Modular.
- Seguro.
- Consistente.
- Bem organizado.
- Fácil de manter.

Utilizar convenções Rails.

Utilizar TypeScript adequadamente.

Evitar duplicação de código.

Evitar abstrações desnecessárias.

Garantir tratamento de erros.

Executar os testes após cada step.

---

# 14. Instrução de execução

Comece pelo **Step 1 — Foundation**.

Primeiro, inspecione o repositório e apresente um plano resumido.

Depois, implemente:

1. Estrutura Rails 8.
2. PostgreSQL.
3. React + Inertia.js.
4. TypeScript.
5. Tailwind CSS.
6. Metronic.
7. Devise com confirmação e recuperação de senha.
8. Pundit.
9. Solid Queue.
10. Solid Cache.
11. Layout principal.
12. Páginas de autenticação.
13. Perfil do usuário.
14. Testes.

Ao concluir, informe:

- O que foi implementado.
- Arquivos criados e modificados.
- Como executar o projeto.
- Testes executados.
- Problemas encontrados.
- Próximo step.

**Não avance para o Step 2 sem minha autorização.**