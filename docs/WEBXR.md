# Exportação VR e exploração WebXR

O resultado VR é um GLB privado do projeto, vinculado ao arquivo/versão e à tarefa usados na geração. Não há cadastro global de cenas ou modelos VR, nem link público de Active Storage. O download GLB existente continua disponível para aplicativos compatíveis.

## Usar

1. Em Novo render, selecione o resultado **Modelo VR / WebXR** e use Blender para gerar o arquivo.
2. Após a conclusão, abra esse resultado na galeria do projeto.
3. Clique em **Abrir visualizador VR**. O arquivo só é baixado nesse momento, usando a sessão autenticada.
4. No computador, arraste para girar, use a rodinha para aproximar e o botão direito para mover. Ajuste o ponto de partida antes de entrar em VR.
5. Nos óculos, acesse o sistema por HTTPS, entre na conta e abra o resultado. Clique em **Entrar em VR** e conceda a permissão do navegador.

WebXR requer navegador/dispositivo compatível e contexto seguro. `localhost` funciona no próprio computador; nos óculos, localhost aponta para os óculos, não para o computador do desenvolvedor. Para acessar o sistema pela rede, configure um endereço HTTPS alcançável pelo dispositivo. Esta entrega não publica o site nem cria infraestrutura/certificados automaticamente.

## Navegação

A cabeça controla o olhar no modo imersivo. **Teletransporte** usa o gatilho do controle apontado para a primeira superfície horizontal visível atingida em até 30 unidades do modelo; o anel indica o destino. **Movimento livre** usa o analógico na direção horizontal do olhar, com zona morta e velocidade limitada. A movimentação física do usuário é compensada no teletransporte. O ponto inicial aproveita a câmera preservada na tarefa quando disponível; caso contrário, começa pela vista geral ajustável.

Não há colisões, navmesh ou classificação automática do piso. Uma superfície de móvel também pode ser um destino horizontal. As unidades seguem o GLB exportado; modelos fora da escala métrica precisam ser conferidos. Câmeras ortográficas de renderização não definem a projeção dos óculos: a projeção imersiva é controlada pelo dispositivo.

## Implementação e acesso

Three.js carrega o GLB exportado pelo Blender, preservando a geometria e materiais disponíveis. No desktop há órbita e caminhada: ative **Caminhar no computador**, mantenha o foco no modelo e use WASD/setas; arraste o botão esquerdo para olhar e Esc para sair. Movimento fica no plano horizontal, com velocidade limitada e sem colisões. Perder foco ou ocultar a página limpa as teclas pressionadas. A posição e orientação iniciais usam os eixos XYZ da câmera salva. O visualizador usa ambiente neutro de reflexos (RoomEnvironment/PMREM) e ACES para materiais PBR; não é iluminação Cycles pré-calculada e não modifica o GLB baixado. WebXR usa `immersive-vr`, referência `local-floor`, `renderer.xr` e `setAnimationLoop`; só solicita sessão no clique do usuário. A opção de navegação inicial vem dos metadados do resultado e pode ser mudada localmente sem alterar o arquivo ou configurações salvas. Sem WebXR ou com permissão recusada, a exploração 3D e o download continuam disponíveis.

O visualizador usa a rota privada de download já existente (sessão, policy, byte ranges, cache private/no-store); não altera permissões ou habilita prévia pública de GLB. Recursos externos do GLB são bloqueados; somente dados/URLs blob internas são aceitos. O código Three é carregado sob demanda. Ao fechar, cancela download pendente, encerra sessão XR, para animação e libera controles, geometrias, materiais, texturas, bitmaps e canvas. No desktop, desenha apenas quando a vista muda; VR desenha a cada frame do dispositivo.

## Validação e limites da evidência

Build/TypeScript e testes de matemática de navegação aprovados. Testes Rails verificam acesso privado ao GLB, ranges, projeto/versão, ausência de acesso anônimo e isolamento de contas. Chromium verifica GLB, abertura sob demanda, fallback sem dispositivo, suporte XR simulado com permissão recusada, alteração de navegação, mobile e liberação do canvas. Respostas de resultado/GLB foram interceptadas somente no navegador; nenhum resultado real foi alterado. **Não houve teste em óculos físicos nem validação de rastreamento/controladores reais**; é necessário conferir entrada, saída, conforto, escala e desempenho no hardware de destino.

Referências: [Three.js WebXR](https://threejs.org/manual/pages/webxr-basics.html), [WebXR — W3C](https://www.w3.org/TR/webxr/).
