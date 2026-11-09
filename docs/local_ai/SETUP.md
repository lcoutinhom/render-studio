# IA arquitetônica local — Pop!_OS / RX 9060 XT

Diagnóstico realizado em 03/11/2026. Validação GPU local e integração Rails
descrita em [RAILS_INTEGRATION.md](RAILS_INTEGRATION.md).

## Compatibilidade e decisão

A AMD lista a RX 9060 XT/gfx1200 em suas matrizes. A documentação ROCm 7.14.1
lista para Radeon Ubuntu 22.04.5 HWE 6.8, Ubuntu 24.04.4 HWE 6.17 e Ubuntu 26.04
GA 7.0; **Pop!_OS 22.04 + kernel 7.1.1 não é uma combinação oficialmente validada**.
Não é correto declarar suporte oficial porque Pop!_OS deriva de Ubuntu.
Fontes: [AMD 7.14.1](https://rocm.docs.amd.com/en/docs-7.14.1/about/release-notes.html#operating-system-support)
e [matriz Radeon 7.2.1](https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/compatibility/compatibilityrad/native_linux/native_linux_compatibility.html).

Como alternativa a instalar drivers/repositórios no host, foi reaproveitado o
ComfyUI já existente em ambiente virtual, validando GPU e geração na prática.
Isso demonstra funcionamento observado neste host, sem tornar a combinação
oficialmente suportada. Uma opção oficialmente validada exigiria uma instalação
separada de Ubuntu/kernel listados pela AMD; isso não foi executado nem é necessário
para reproduzir os testes locais concluídos aqui.

## Diagnóstico

| Item | Resultado |
| --- | --- |
| Distribuição | Pop!_OS 22.04 LTS, jammy |
| Kernel | 7.1.1-76070101-generic |
| GPU PCI | 1002:7590, subsistema XFX 1eae:8601, driver amdgpu |
| GPU ROCm | Radeon RX 9060 XT, gfx1200, 32 CUs, 17.095.983.104 bytes de VRAM |
| Memória | 31 GiB RAM / 19 GiB swap |
| Espaço antes dos downloads | 669 GiB disponíveis no filesystem principal |
| Dispositivos host | /dev/kfd e /dev/dri/renderD128 acessíveis |
| Usuário | membro de render (110) e video (44), sem alteração de grupos |
| Vulkan | vkCreateInstance e enumeração bem-sucedidos; RADV GFX1200 e llvmpipe enumerados |
| Mesa/Vulkan | Mesa 25.1.5 / libvulkan 1.3.280; RADV avisou implementação não conformante |
| Python do sistema | 3.10.12; pip, ensurepip e torch globais ausentes |
| ROCm anterior | .runtime/rocm-7.0.2 no Rails; rocminfo executou e enumerou gfx1200 |
| ComfyUI anterior | /home/lcoutinho/ComfyUI-Installs/ComfyUI/ComfyUI, v0.42.5 |
| Ambiente virtual existente | .venv, Python 3.13.12, PyTorch 2.12.0+rocm7.14.0, HIP 7.14.60850 |
| Teste de cálculo GPU | matriz 1024x1024 em cuda:0, resultado finito, 0,51 s; pico torch 95.420.416 bytes |

O nome `cuda:0` é a interface do PyTorch também para ROCm e não indica uso de GPU
NVIDIA. Os testes exigem `torch.version.hip` e disponibilidade da Radeon.
O sandbox esconde os devices/grupos; as verificações reais foram executadas no host.

Foram encontrados modelos Wan de vídeo no diretório compartilhado do ComfyUI.
Eles não foram removidos, substituídos ou usados para geração arquitetônica.
Nenhum serviço ComfyUI estava ativo no início do diagnóstico. Docker já existia;
não foi instalado ou usado para o pipeline de IA.

## O que foi preparado

Nenhum driver, kernel, bootloader, repositório APT, permissão global ou Python global
foi alterado. Nenhuma dependência Python foi instalada ou atualizada: o ambiente
existente já continha tudo necessário. Foram criados diretórios de dados separados,
baixados pesos em safetensors e preparados scripts de teste/configuração.

Código/venv reaproveitados:
`/home/lcoutinho/ComfyUI-Installs/ComfyUI/ComfyUI`.

Dados isolados:
`/home/lcoutinho/ai/render-studio-local/{models,input,output,user,temp,validation}`.

A versão do prompt local é `architectural-local-v1`; os relatórios novos registram
motor, versão ComfyUI, hash do workflow e hash da referência.

O script inicializa em loopback, desativa custom nodes e usa `--offline`, que também
desativa nós de APIs pagas. Não abre porta pública e não usa Gemini ou Blender.
A configuração de partida usa `--disable-dynamic-vram --disable-pinned-memory`
`--fp32-vae --reserve-vram 2 --cache-none`, escolhida após observar artefatos na
configuração dinâmica. Esses switches afetam apenas este processo ComfyUI.
Não há fallback de inferência por CPU. Offload/armazenamento de pesos em RAM pelo
ComfyUI pode ocorrer; o cálculo do modelo permanece na GPU.

## Atualização de qualidade da aplicação

A aplicação passou a usar FLUX.2 Klein 4B para edição por referência. Os testes e
modelos SDXL abaixo documentam a validação inicial de infraestrutura e o pipeline
legado, não o padrão fotográfico atual. Para preparar os modelos atuais:

```bash
script/local_ai/start
# Em outro terminal, somente após confirmar a GPU:
python3 script/local_ai/download_flux_models.py
```

Depois encerre a instância avulsa e use `bin/dev`. A comparação de qualidade,
componentes e limitações está em [QUALITY.md](QUALITY.md). A captura GLB original
continua sendo usada; alterações de materiais/texturas da cena não são aplicadas.

## Modelos legados de validação

| Modelo | Arquivo local | Peso aproximado | Licença indicada |
| --- | --- | --- | --- |
| SDXL base 1.0 | models/checkpoints/sd_xl_base_1.0.safetensors | 6,94 GB | Open RAIL++ |
| ControlNet Canny SDXL | models/controlnet/sdxl-canny-fp16.safetensors | 2,50 GB | Open RAIL++ |
| ControlNet Depth SDXL | models/controlnet/sdxl-depth-fp16.safetensors | 2,50 GB | Open RAIL++ |
| Depth Anything V2 Small | models/depth-anything-v2-small/model.safetensors | 99 MB | Apache 2.0 |

Origens oficiais: [SDXL](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0),
[Canny](https://huggingface.co/diffusers/controlnet-canny-sdxl-1.0),
[Depth](https://huggingface.co/diffusers/controlnet-depth-sdxl-1.0),
[estimador Small](https://huggingface.co/depth-anything/Depth-Anything-V2-Small-hf).
Revisões fixas e SHA256 dos três pesos principais estão em `models-manifest.json`
no diretório de dados; a origem/revisão do estimador está em seu `source.json`.
Os downloads somente começaram após operação GPU real e inicialização ComfyUI.

A [licença SDXL Open RAIL++](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/LICENSE.md)
permite hospedagem SaaS sujeita às condições, avisos e restrições de uso que devem
ser refletidos nos termos dos usuários. Os cards dos ControlNets indicam Open RAIL++.
Isso não equivale a autorização irrestrita sobre dados/saídas nem substitui revisão
dos termos para distribuição comercial. O estimador selecionado é especificamente
a variante Small, Apache 2.0; outras variantes podem ter licenças diferentes.
O código ComfyUI usa GPLv3, separada das licenças dos pesos.

## Iniciar e testar

Para iniciar a stack completa (Rails, Vite, worker, banco e ComfyUI), use `bin/dev`.

Para iniciar somente o serviço de IA, sem outra instância ativa na porta 8188:

```bash
script/local_ai/start
```

Acessar http://127.0.0.1:8188. O script exige aceleração AMD antes de iniciar.
Os caminhos podem ser substituídos com `COMFYUI_SOURCE`, `COMFYUI_PYTHON` e
`COMFYUI_DATA`. Não iniciar duas instâncias na mesma porta.

Teste de infraestrutura/geração simples, sem reconstruir uma cena por texto:

```bash
python3 script/local_ai/test_workflow.py --steps 8
```

Antes do primeiro teste arquitetônico, verificar reconstrução VAE (o processo falha
se o erro médio ou a variância indicarem corrupção):

```bash
/home/lcoutinho/ComfyUI-Installs/ComfyUI/ComfyUI/.venv/bin/python \
  script/local_ai/validate_vae.py /caminho/referencia.png
```

Teste arquitetônico usando uma referência local PNG do GLB:

```bash
python3 script/local_ai/test_workflow.py \
  --reference /caminho/referencia.png --steps 12 --denoise 0.25
```

Mapa de profundidade local (usar Python do ambiente virtual):

```bash
/home/lcoutinho/ComfyUI-Installs/ComfyUI/ComfyUI/.venv/bin/python \
  script/local_ai/depth_map.py /caminho/referencia.png /caminho/depth.png
python3 script/local_ai/test_workflow.py \
  --reference /caminho/referencia.png --depth-map /caminho/depth.png \
  --steps 12 --denoise 0.25
```

Opcionalmente `--custom-prompt "Soft neutral daylight"`. O texto padrão inglês
está em `config/local_ai/base_prompt.txt`, sempre incluído. O workflow usa
VAEEncode da referência, ControlNet força 0,85 e KSampler denoise 0,25, seed 626,
CFG 5, sampler Euler. O denoise é limitado a 0,4 no CLI; o padrão é 0,25.
Os parâmetros iniciais priorizam conservação da referência, não intensidade estética.

`test_workflow.py` faz upload local, submete o grafo, salva prompt_id imediatamente,
acompanha `/history` e baixa `/view`. Não repete automaticamente um POST incerto.
Em timeout, pode haver execução em andamento: consultar o prompt_id salvo antes
de repetir. Resultados, grafos, histórico e métricas ficam em `validation/`.
O pico registrado por sysfs é amostrado a cada ~1 s, inclui VRAM global do desktop,
pesos e caches; não é um pico exato de alocação do PyTorch. Tempos incluem fila,
carregamento e execução até a resposta da API; dependem de cache e do uso do host.

Os scripts `download_models.py` e `download_depth_model.py` permitem reproduzir os
downloads por revisão fixa, exigindo primeiro ComfyUI ativo e GPU reconhecida.
Não é preciso executá-los novamente nos arquivos já preparados.

## Limitações observadas

Os resultados iniciais com carregamento dinâmico foram apenas diagnósticos.
A primeira execução Depth retornou sucesso HTTP mas apresentou artefatos fortes;
um roundtrip VAE produziu uma imagem quase uniforme. Isso motivou o teste
`validate_vae.py`, que verifica erro absoluto e variância da reconstrução antes de
aceitar image-to-image. Não confundir conclusão da API com qualidade numérica.

Os primeiros resultados são validação técnica. Com denoise baixo, a referência
escura permanece escura, e detalhes decorativos/móveis podem mudar. Prompt e
ControlNet não asseguram fidelidade absoluta, nem o resultado atual comprova
qualidade comercial fotorrealista. A comparação humana com a referência é obrigatória.
A reconstrução VAE com a configuração conservadora passou: MAE 0,00852 e razão
de variância 0,9664 na referência testada. Os artefatos da configuração inicial
ficaram preservados em `validation/initial-dynamic/` para comparação.
Canny conserva contornos; Depth auxilia volumes e perspectiva. Para o produto,
prefira gerar a profundidade diretamente do GLB/câmera em vez de estimá-la da foto.
Começar com batch 1 e uma tarefa por GPU: 1024x768 com ControlNet se aproxima do
limite de 16 GB; aumentar resolução ou empilhar dois ControlNets exige nova medição.

O runtime existente emitiu avisos sobre libnuma, banco MIOpen e kernels de atenção
experimentais; nenhuma variável de bypass/arquitetura foi forçada. Os testes devem
ser avaliados pelos resultados e pelos logs, não só pela interface ter aberto.

## Resultados medidos

| Teste | Configuração | Tempo | VRAM observada | Resultado |
| --- | --- | --- | --- | --- |
| Operação matricial | PyTorch/ROCm, matriz 1024² | 0,51 s | 91 MiB torch | GPU reconhecida, resultado finito |
| SDXL smoke | 512², 8 passos, configuração inicial | 17,09 s pela API | 8,74 GiB global amostrada | PNG gerado; teste de infraestrutura |
| Estimador Depth Small | 1024x768, GPU | 18,70 s inferência | 702 MiB torch | Mapa de profundidade salvo |
| VAE roundtrip | 1024x768, FP32, conservador | 47,04 s pela API | não medida neste teste | MAE 0,00852, variância relativa 0,9664 |
| Img2img + Canny | 1024x768, 12 passos, denoise 0,25, conservador | 52,72 s pela API | 14,38 GiB global amostrada | PNG gerado e inspecionado |
| Img2img + Depth | 1024x768, 12 passos, denoise 0,25, conservador | 57,88 s pelo histórico do servidor | pico não recuperável | PNG gerado e inspecionado |

A primeira instância ComfyUI terminou por SIGTERM depois de salvar os resultados
iniciais. Não foi registrado OOM no trecho de journal consultado. Ela foi reiniciada;
não se atribui esse sinal a uma falha de driver sem evidência.
O cliente do último teste Depth também terminou por SIGTERM, mas o servidor concluiu
a geração. O resultado foi recuperado por GET /history e GET /view com o mesmo
prompt_id, sem uma segunda submissão. O pico de VRAM desse cliente não estava salvo;
não foi estimado a partir de outras execuções.

Relatórios completos ficam em `/home/lcoutinho/ai/render-studio-local/validation/`.
O teste Canny final tem sufixo `architecture-canny_00002_`; o Depth final foi
recuperado em `recovered-7-architecture-depth_00002_.png`. As imagens iniciais não
aprovadas visualmente estão em `initial-dynamic/`.

Recuperar uma execução cujo cliente parou (não cria nova geração):

```bash
python3 script/local_ai/recover_report.py \
  /home/lcoutinho/ai/render-studio-local/validation/img2img-depth-report.json
```

Validação dos scripts sem GPU/API:

```bash
python3 script/local_ai/test_workflow_unit.py
python3 -m py_compile script/local_ai/*.py
bash -n script/local_ai/start
```

Quatro testes verificam referência em VAEEncode, ControlNet Canny, alternativa Depth,
prompt padrão preservado e rejeição de preferências explicitamente incompatíveis.
O filtro textual não é um mecanismo completo de segurança semântica.
A integração Rails e sua estratégia de testes simulados estão em
[RAILS_INTEGRATION.md](RAILS_INTEGRATION.md).
