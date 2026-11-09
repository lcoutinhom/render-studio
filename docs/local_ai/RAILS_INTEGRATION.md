# Integração ComfyUI no Rails

Implementada em 03/11/2026. Novas solicitações da tela do arquivo GLB usam o
executor `comfyui` por padrão. Gemini e Blender continuam disponíveis no código;
snapshots antigos e suas novas tentativas mantêm seu executor original.

## Configuração

```env
DEFAULT_RENDER_ENGINE=comfyui
LOCAL_AI_ENABLED=true
COMFYUI_URL=http://127.0.0.1:8188
COMFYUI_TIMEOUT_SECONDS=900
COMFYUI_PIPELINE=flux2_klein
COMFYUI_DIFFUSION_MODEL=flux-2-klein-4b-fp8.safetensors
COMFYUI_TEXT_ENCODER=qwen_3_4b.safetensors
COMFYUI_VAE=flux2-vae.safetensors
BLENDER_RENDER_ENABLED=false
```

Após validar a GPU e iniciar somente o serviço local, baixar os modelos nativos:

```bash
python3 script/local_ai/download_flux_models.py
```

Esse download usa revisões/checksums fixos do manifesto e não instala dependências.
Depois, execute a migration e reinicie a stack:

```bash
bin/rails db:migrate
bin/dev
```

`bin/dev` inicia Rails, Vite, Solid Queue e o ComfyUI validado no [guia local](SETUP.md),
além de PostgreSQL/Mailpit. O código Rails não instala pacotes/modelos nem chama
Gemini/Blender no caminho ComfyUI. `LOCAL_AI_ENABLED=false` bloqueia novas solicitações
e a execução de tarefas locais; não transforma tarefas existentes em outro motor.
A flag não consulta a rede: disponibilidade e GPU são verificadas pelo worker.

## Fluxo da aplicação

1. Na tela do arquivo, selecionar cenas/enquadramentos GLB.
2. Opcionalmente informar instruções de iluminação/estilo fotográfico.
3. Clicar em Renderizar. O navegador captura cada referência com os materiais completos.
4. `FileRender` valida cenas e cria configuração; ignora switches antigos de
   vídeo/panorama/VR para a geração local de fotografias.
5. `Submit` valida as referências PNG e preserva prompt inglês padrão, preferências,
   versão do workflow, modelos/checksums, seed e parâmetros de cada tarefa.
6. Solid Queue executa `Adapters::Comfyui`. A API local deve confirmar ROCm e GPU AMD;
   serviços CPU são recusados. A edição FLUX.2 Klein usa ReferenceLatent com os pixels
   originais, 4 passos, CFG 1, seed 626 e batch 1; não é geração por texto puro.
7. Após conclusão, a imagem PNG é baixada para `StoreOutput`/Active Storage. A galeria
   do arquivo e a tela de processamento exibem o resultado normalmente.

A UI mantém somente o prompt opcional, sem configurações Blender no fluxo local.
O detalhe da tarefa mostra o prompt preservado em vez de parâmetros Cycles não usados.

## Seleção de motores

`Rendering::Engines` centraliza nomes, disponibilidade, rótulos, executor e padrão.
`FileRender`, o controller do arquivo e `ProcessRenderJob` usam esse registro.
Os endpoints antigos de simulação continuam com seus padrões explícitos; o padrão
local se aplica à geração real pela tela de arquivos. Uma troca de configuração do
padrão afeta novas submissões, sem reescrever o histórico.

Para voltar a usar Gemini em novas fotografias, configurar `DEFAULT_RENDER_ENGINE=gemini`
e sua flag/modelo/chave; isso é opcional, não é fallback automático do motor local.

## Execução HTTP e idempotência

`LocalAi::Client` só aceita HTTP loopback, sem proxy, credenciais, redirects ou
URL definida pelo usuário. Usa `/system_stats`, `/upload/image`, `/prompt`,
`/history/:uuid`, `/queue` e `/view`. Valida limites de resposta, assinatura/dimensões
PNG e nomes de artefatos. Usa conexão de 3 s, leitura/escrita de 20 s e até três
leituras em caso de erro de rede. POST /prompt nunca tem retry automático.

`ComfyExecution` registra um UUID **antes** de submeter o workflow. O cliente envia
esse UUID no `prompt_id`, suportado pela instalação ComfyUI 0.42.5 validada. A API
não faz deduplicação automática de POSTs com o mesmo UUID; o adapter controla isso.
Estados: prepared → submitting → submitted → completed, com failed/uncertain.
O workflow exato e as versões do runtime também ficam registrados.

Se a confirmação do POST for interrompida ou o worker encerrar após submeter,
uma nova tentativa consulta história/fila pelo UUID já salvo, sem repetir a geração.
Se o UUID ainda não for localizado, o erro permanece explícito; não há reenvio cego.
Um timeout de polling mantém a execução submetida para retomada. Se apenas o download
falhar, a tentativa seguinte baixa a imagem já gerada. Erros definitivos do workflow
permitem nova execução em uma nova tentativa. Um reinício do ComfyUI pode perder sua
fila/história: nesse caso a aplicação não presume que seja seguro gerar novamente.

O polling renova o lease Rails, sem manter locks SQL durante chamadas HTTP.
Cancelamento impede publicação de artefatos, mas não usa `/interrupt`, pois essa
operação global poderia interromper outro usuário. A GPU pode concluir a execução
cancelada; o resultado não é publicado. ComfyUI executa sua fila sequencialmente;
o worker `rendering` também usa um consumidor por padrão.

No snapshot: referência, motor, prompt/versão, seed, steps, CFG, sampler,
modelo de difusão, encoder, VAE, workflow e checksums disponíveis no manifesto local.
Snapshots SDXL mantêm também denoise, ControlNet e checkpoint originais.
No resultado: parâmetros, GPU/versões, UUID remoto e checksum da referência.
Parâmetros de referência, snapshot, workflow e prompt entram nos filtros de logs.
Não expor o ComfyUI publicamente. Em containers, loopback é o próprio container;
a rede precisará ser resolvida explicitamente antes de mudar essa implantação.

Para submissão API de configurações com várias câmeras no mesmo ambiente,
`submission.reference_images` deve usar chaves `environment_id:camera_id`.
Para uma câmera ou a câmera automática, a chave é `environment_id`. A tela do
arquivo já fornece uma referência por cena/enquadramento de maneira consistente.

## Validação

Testes simulam a API e cobrem entrada inválida, GPU CPU recusada, erros HTTP,
confirmação perdida, cancelamento, timeout, retomada, download e persistência.
Há testes de request para padrão ComfyUI, idempotência, referências e isolamento
entre usuários. A suíte não depende da GPU nem de modelos grandes.

A validação real pelo Rails/Solid Queue gerou a tarefa #197, lote #27, resultado
#52 (PNG 1024x768, 527.037 bytes), com RX 9060 XT. A referência foi reaproveitada
localmente de um GLB existente; nenhum dado foi enviado ao Gemini.
Os IDs são evidência deste ambiente de desenvolvimento, não configuração do sistema.

Limites: prompts e ControlNet não garantem fidelidade absoluta; o resultado ainda
exige revisão visual. O SDXL/Canny anterior continua executável pelos snapshots e por
`COMFYUI_PIPELINE=sdxl`. A edição FLUX substitui o padrão conservador para melhorar a
aparência fotográfica, sem aplicar um ControlNet de arquitetura incompatível.
Veja [comparações de qualidade](QUALITY.md) antes de atribuir fidelidade absoluta.


A atualização de qualidade posterior usa FLUX.2 Klein por referência, validada na
tarefa #200 / resultado #55. A validação #197 acima pertence ao pipeline SDXL inicial,
que continua preservado para reexecução do histórico. Ver [QUALITY.md](QUALITY.md).
