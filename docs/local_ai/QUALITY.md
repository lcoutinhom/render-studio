# Qualidade fotográfica e fidelidade — comparação de 03/11/2026

A primeira integração validou infraestrutura GPU, mas usava SDXL Base, image-to-image
com denoise 0,25, Canny forte e 12 passos. Essa combinação conservava o aspecto plano
da captura GLB. Concluir uma imagem nesse fluxo não comprovava qualidade fotográfica.

## Comparação controlada

Os testes usaram a imagem original, a mesma câmera, 1024x768 e o mesmo projeto da
saída #52. Não se compararam ângulos diferentes. Arquivos e grafos completos ficam
em `/home/lcoutinho/ai/render-studio-local/quality-comparison/`.

- Captura PBR com environment map/ACES: melhorou exposição, mas lavou alguns
  acabamentos escuros. Uma variação com oclusão/sombras também criou manchas em
  superfícies finas. Ambas foram descartadas; a captura GLB original foi mantida.
- SDXL com 28 passos e referência PBR: continuou com aparência artificial.
- RealVisXL V5 FP16: não resolveu o problema e modificou um objeto na bancada.
- FLUX.2 Klein 4B destilado, referência original: trouxe um ganho grande de luz,
  reflexos e profundidade. Uma segunda instrução com luz neutra/difusa evitou
  sombras solares duras e reforçou preservação de materiais e ferragens.
- Inicialização parcial pelo latent original: a variação mais fraca quase não
  melhorou o aspecto; a intermediária ainda apresentou mudanças de detalhes.
- Referência adicional de contornos: não eliminou alterações de marcenaria.
- FLUX.2 Klein Base, 50 passos/CFG 4: gerou contraste/texturas artificiais e cores
  inadequadas nesta comparação; não foi escolhido como padrão.
- Transferência apenas da iluminação para os pixels originais: preservou mais
  detalhes, mas trouxe halos e não atingiu o acabamento desejado; não foi aplicada.

## Padrão escolhido

`COMFYUI_PIPELINE=flux2_klein`: edição nativa por referência com
`flux-2-klein-4b-fp8.safetensors`, encoder `qwen_3_4b.safetensors` e
`flux2-vae.safetensors`, 4 passos, Euler, CFG 1, seed 626. A seed fixa torna a
comparação de preferências mais reproduzível. Os três componentes selecionados
estão sob Apache 2.0 segundo os repositórios oficiais; revisões e SHA256 ficam no
manifesto de modelos local. Não foram alterados drivers, kernel ou pacotes Python.

O prompt `architectural-local-v2` mantém integralmente as regras anteriores e
adiciona instruções fotográficas, luz difusa neutra e preservação de divisões,
ferragens, formatos e materiais. Preferências opcionais podem alterar a iluminação,
mas não substituem as regras de preservação.

O fluxo usa VAEEncode da imagem real → ReferenceLatent nas condições positiva e
negativa → amostragem nativa de edição. O latent vazio representa o destino do
sampler; a geração não é baseada apenas em texto. Resolução e proporção são lidas
da referência com GetImageSize, sem mudar o enquadramento. Não se aplica um
ControlNet SDXL incompatível à arquitetura FLUX. O Canny/SDXL anterior permanece
reproduzível pelos snapshots antigos ou com `COMFYUI_PIPELINE=sdxl`.

A primeira edição FLUX levou 103 s, incluindo carregamento; a comparação de luz
neutra levou 46 s. Inferência observada na RX 9060 XT, com pico global amostrado
próximo de 14,5 GiB. Tempos dependem de cache e uso do host; não são promessa de SLA.

## Limite real

Há melhoria visual grande, mas o modelo ainda pode modificar detalhes, inclusive
ferragens/divisões de armários. O prompt não impõe preservação geométrica matemática.
Não se declara cópia exata de texturas, veios ou geometria. A interface pede revisão
dos materiais e detalhes; o usuário deve comparar o resultado com a referência.
Para fidelidade exata será necessário um renderizador determinístico com importação
correta dos materiais; aumentar passos/prompt de IA não oferece essa garantia.
Blender continua preservado e desabilitado no fluxo atual.

Fontes: [modelo/licença BFL](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B),
[workflow oficial de edição](https://github.com/Comfy-Org/workflow_templates/blob/main/templates/image_flux2_klein_image_edit_4b_distilled.json),
[parâmetros RealVisXL](https://huggingface.co/SG161222/RealVisXL_V5.0).

## Validação pela aplicação

O padrão foi atualizado e a execução real pelo Rails/Solid Queue concluiu a tarefa
#200, lote #29, resultado #55: PNG 1024x768, 898.686 bytes. O arquivo foi baixado do
Active Storage e inspecionado; o resultado é a edição de luz neutra comparada acima.
Os três hashes dos componentes e a versão `architectural-local-v2` foram confirmados
nos metadados. A imagem anterior #52 permanece no histórico para comparação.

Validação final: 55 testes Ruby passaram, TypeScript validado e o parser de cenas
GLB continua com seus testes frontend aprovados. Pedidos como “sem alterar materiais”
não são mais confundidos com pedidos para trocar os materiais.
