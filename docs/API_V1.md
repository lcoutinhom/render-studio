# API interna v1

Base `/api/v1`. Esta API atende a aplicação interna com **sessão Devise**. Não há signup, senha de worker, JWT, bearer token genérico ou acesso anônimo. Cookies devem ser mantidos pelo cliente e mutações exigem `X-CSRF-Token` válido, obtido na página autenticada (meta `csrf-token` ou props Inertia). Enviar `Accept: application/json` e `Content-Type: application/json`. Não habilitar CORS global. Integrações externas e autenticação da futura extensão SketchUp exigirão um contrato próprio na Fase 3.

| Método | Rota | Contrato |
|---|---|---|
| GET | `/projects` | Até 100 projetos não excluídos do usuário |
| GET | `/projects/:id` | Projeto, ambientes estáveis e versões com associações explícitas |
| GET | `/render_configurations` | Até 100 configurações imutáveis da conta |
| GET | `/render_configurations/:id` | Identidades e snapshot preservado |
| POST | `/render_configurations` | Cria configuração; não enfileira |
| GET | `/render_batches` | Histórico paginado (20), filtros project_id/version_id/status |
| POST | `/render_batches` | Submete configuração salva; 202 e identificação do lote |
| GET | `/render_batches/:id` | Agregado, ambientes, tentativas atuais e eventos recentes |
| POST | `/render_batches/:id/cancel` | Cancelamento cooperativo; terminais preservados |
| POST | `/render_batches/:id/retry` | Novas tentativas para falhas/cancelamentos; 202 |
| GET | `/render_jobs/:id` | Tentativa, snapshot e resultados privados |

Configuração:

```json
{"configuration":{"project_id":1,"project_version_id":2,"environment_ids":[3,4],"name":"Interiores","mode":"custom","settings":{"samples":64},"camera_ids":[]}}
```

Campos adicionais aceitos: render_preset_id. Configurações seguem o schema tipado de Rendering::Settings, incluindo herança e limites já usados na interface. IDs devem pertencer à conta e ao mesmo projeto/versão; ambientes precisam estar associados e confirmados. A resposta 201 inclui id e snapshot. Registros não são editados: criar outro preserva o anterior.

Submissão:

```json
{"submission":{"configuration_id":10,"idempotency_key":"uuid-novo-por-intencao","adapter":"blender","environment_ids":[3,4]}}
```

`adapter`: blender ou simulation (padrão da API: simulation para compatibilidade; a UI oferece Blender inicialmente). Omitir environment_ids seleciona todos os ambientes da configuração. Repetir a mesma chave/intenção retorna o mesmo lote; reutilizar a chave com conteúdo diferente retorna 422. failure_environment_ids existe somente para demonstrar falhas no adapter simulation. Limite de 20 submissões/minuto por conta na API e na UI; API retorna 429 ao exceder. O total de tarefas é limitado a 2000 por solicitação.

Erros: 401 sem sessão, 403 sem permissão, 404 para IDs indisponíveis/externos à conta, 422 para parâmetros/CSRF incompatíveis. Não usar IDs fornecidos pelo cliente para alterar progresso, status, lease, usuário ou snapshot. Resultados usam links privados `/outputs/:id/preview` e `/outputs/:id/download`, autenticados pela mesma sessão e política; não expor URLs assinadas públicas de Active Storage. Vídeos suportam Range único; intervalos inválidos/múltiplos retornam 416.

O Blender é iniciado por ProcessRenderJob/Solid Queue dentro da instalação Rails. Não existe endpoint de callback que aceite progresso ou upload de um worker remoto. Esse desenho evita distribuir credenciais da API para um subprocesso local.
