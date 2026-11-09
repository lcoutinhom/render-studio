# Integração Blender — Fase 2

Autorizada pelo usuário após o Step 5. A extensão SketchUp continua fora do escopo. O resultado GLB pode ser explorado no [visualizador WebXR](WEBXR.md), autorizado posteriormente.

## Operação

O Blender local foi verificado como **5.2.2 LTS**. Configure BLENDER_BIN (nesta máquina `/snap/bin/blender`), BLENDER_THREADS (padrão 2), BLENDER_TIMEOUT_SECONDS (padrão 3600; entre 30 e 86400) e RENDER_WORKERS (padrão 1). Reinicie `bin/jobs` ao alterar código/configuração dos workers. Solid Queue mantém consumidores separados para default/maintenance e rendering, com um render por processo de rendering, sem Redis.

Fluxo: projeto → versão do modelo → ambientes associados e confirmados → configuração salva → **Blender · arquivos reais** → Renderizar com Blender. Uma solicitação pode incluir um ambiente, vários ou todos; gera tarefas independentes por ambiente/câmera/tipo de saída. A aba Simulação continua disponível para testar o fluxo sem arquivos. A galeria identifica cada tentativa/versão e não sobrescreve saídas anteriores.

O executor usa Cycles com GPU AMD HIP por padrão (`BLENDER_DEVICE=HIP`), sem fallback silencioso para CPU. Configure `BLENDER_HIP_LIBRARY_PATH` com o diretório absoluto das bibliotecas HIP; reinicie os processos após alterar o ambiente. Novas solicitações e novas tentativas usam o dispositivo configurado; os snapshots anteriores são preservados. A importação do modelo e a exportação GLB/VR ainda usam CPU; HIP acelera o cálculo das imagens, vídeos e panoramas. Para cenas de interiores, cadastre câmeras dentro do ambiente; o enquadramento automático prioriza limites do ambiente e pode ficar fora de uma sala fechada. Objetos não selecionados permanecem presentes para contexto, sombras e reflexos.

## Entradas e referências

O preenchimento também aceita `interior_fill_side`: −1 desloca a fonte para a esquerda da câmera, 0 mantém frontal e 1 desloca para a direita. O deslocamento máximo é 0,8 unidade do modelo, com a luz apontada para a frente do enquadramento. Uma checagem por raio reduz o deslocamento do centro da fonte quando encontra geometria no caminho; ela não garante que todo o disco emissor fique livre de interseções. Não detecta automaticamente janelas. Para a cozinha de referência, a prévia lateral usa −1, intensidade 0,3 e exposição 0. Metadados registram a direção usada.

- GLB autossuficiente e glTF/OBJ em ZIP validado. DAE permanece armazenável, mas deve ser convertido para GLB para renderizar nesta integração; a submissão informa essa restrição antes de enfileirar. Não se importa SKP diretamente.
- Original permanece em ProjectVersion. Cada processo baixa uma cópia temporária com checksum verificado; isso não cria outro original/blob por ambiente. ZIP é revalidado antes de extração, com limites e bloqueio de links/traversal; originais não são alterados.
- IDs de nós glTF são anotados apenas na cópia temporária, para corresponder aos IDs já usados nas associações. Seleção de objetos inclui descendentes; cenas usam seus nós-raiz. Região usa coordenadas do modelo e interseção dos limites dos objetos; enquadramento usa a região. Tags/grupos/componentes/partes usam apenas referências manuais explícitas presentes nos nomes/coleções/metadados importados; um nome de tag nunca cria um ambiente automaticamente.
- A transformação de coordenadas Y-up → Z-up é aplicada às câmeras/regiões, acompanhando os importadores. Geometria, dimensões, transformações e posições arquitetônicas permanecem preservadas. O processo verifica matrizes dos meshes antes de publicar artefatos.

## Materiais, câmeras, iluminação e saídas

O perfil experimental `material_profile: conservative_nonmetal` corrige somente o valor metálico constante 0,5 em materiais com nomes explicitamente não metálicos (MDF, madeira, concreto, laca, pintura, tinta, porcelanato, cerâmica ou tecido). Nomes com metal/vidro e nomes genéricos ou apenas cores são preservados; mapas metálicos conectados e outros valores também. Não altera cor, textura ou rugosidade. Aplica-se antes dos mapeamentos manuais, que continuam prioritários. O padrão `original` não corrige nada automaticamente. Disponível no formulário e JSON; cada resultado registra revisão, quantidade e até 40 alterações. Não é classificação física garantida e requer revisão visual antes de adoção por projeto. O original e os resultados anteriores são preservados.

`neutral_daylight` (padrão false) neutraliza a dominante azul do fundo no modo dia. Sem preenchimento, mantém aproximadamente a luminância do céu anterior; não substitui materiais nem adiciona luzes locais. Disponível em JSON, formulário e Gemini. Para comparar a base original da cozinha, a prévia usa preenchimento 0 e exposição 2,0 (original 1,5), preservando sol/intensidade/temperatura/câmera da tarefa 97.

`interior_fill` controla uma luz de área neutra junto à câmera (0 desliga, até 5; comece entre 0.5 e 1.5). Ajuda a clarear interiores fechados sem alterar materiais ou geometria. É iluminação de apresentação, não uma simulação de luminárias físicas do projeto, nem exposição automática. Nos vídeos acompanha a câmera. Com preenchimento e modo dia, o ambiente usa luz neutra para reduzir a dominante azul. Disponível no formulário, JSON e Gemini; o padrão 0 mantém o comportamento anterior. Os resultados registram intensidade de preenchimento e revisão da iluminação nos metadados. `blender/tests/verify_interior_fill.py`, executado pelo Blender, compara uma superfície sem/com preenchimento e verifica preservação de cor e geometria.

Usa snapshots preservados. Materiais PBR substituem os slots explicitamente mapeados nos objetos selecionados, mantendo os demais. Cor, roughness, metallic, transmission e IOR são aplicados ao Principled BSDF; texturas preservadas têm checksum verificado. Normal, AO, canais PBR e altura são conectados; altura usa bump, sem deslocar vértices arquitetônicos. Não mapeia automaticamente materiais por aparência.

Câmeras cadastradas usam posição/rotação (graus) do modelo, projeção e distância focal com sensor de 36 mm; o editor vincula focal/FOV. Iluminação aplica ambiente dia/pôr do sol/noite/estúdio, temperatura, intensidade e direção/elevação do sol, com softboxes em estúdio. Qualidade efetiva segue samples, resolução, redução de ruído e exposição do snapshot.

- Imagens: PNG/JPEG/EXR e quantidade solicitada; câmera automática gera enquadramentos orbitais adicionais. Com câmera explícita, as imagens mantêm a câmera salva.
- Vídeo: MP4/H.264, duração/FPS/resolução, caminho de pontos ou órbita automática. Importação/exportação não altera o original. Blender 5 usa ImageFormatSettings.media_type; compatibilidade de exportação anterior usa FFMPEG.
- Panorama: Cycles equiretangular 2:1 PNG, com prévia 360° no navegador.
- VR: exporta GLB com geometria completa, reduzindo texturas ao limite configurado/perfil. Armazena preferência de navegação como metadado. O visualizador WebXR oferece exploração por mouse, teletransporte e movimento livre; não há colisões, navmesh ou decimação de paredes. Veja WEBXR.md para requisitos e validação de hardware.

## Protocolo local e ciclo de vida

`blender/render.py` é um script confiável do repositório. Recebe caminho de um JSON temporário após `--`, lê somente os dados necessários e emite `RS_PROGRESS N`; grava arquivos e artifacts.json na pasta temporária. O adapter Ruby inicia o processo por array de argumentos, sem shell, com factory-startup, disable-autoexec e offline-mode; não abre .blend do usuário e não envia segredos Rails/DB ao ambiente do subprocesso. Isso não equivale a isolamento completo do sistema operacional: instalar/processar modelos apenas no ambiente interno autorizado.

A cada três segundos o worker renova o lease, mesmo sem novo percentual. Progresso representa etapas/arquivos, não uma previsão exata de tempo do Cycles. Cancelamento invalida o token, termina o grupo de processos e faz escalada a KILL após três segundos, se necessário. Timeout também encerra o grupo. Falhas são apresentadas de forma segura; uma nova tentativa preserva a anterior e o adapter escolhido.

Publicação valida nomes relativos gerados, MIME/assinatura, tamanho e checksum. Conclusão e vínculos dos arquivos ficam na transação do lote: cancelamento/lease vencido não publicam resultados, e erro de armazenamento reverte a conclusão. Blobs sem vínculo e diretório temporário são limpos em falhas. O arquivo privado exige tarefa concluída e usa a mesma política do histórico. A extensão SketchUp, futuramente, enviará exportações/referências explícitas pela API apropriada, sem associar tags automaticamente.

## Verificação reproduzível

`RUN_BLENDER_SPECS=1 bundle exec rspec` executa os testes reais com modelos e resoluções pequenos. Sem essa variável, os testes do executável são opcionais; o restante da suíte continua independente de Blender. Os testes reais verificam imagem, MP4, panorama, GLB, arquivos glTF/OBJ ZIP, SHA-256 e preservação do original. Modelos de teste não são projetos de demonstração na conta de desenvolvimento.

Referências de API: [execução e argumentos](https://docs.blender.org/manual/id/5.1/advanced/command_line/arguments.html), [importação glTF](https://docs.blender.org/api/main/bpy.ops.import_scene.html) e [media_type de imagem/vídeo](https://docs.blender.org/api/5.1/bpy.types.ImageFormatSettings.html).


## Contexto de cenas na associação visual

O visualizador apresenta cenas reais do GLB e permite selecionar objetos/grupos sem duplicar o modelo. Referências de objetos aceitam o campo opcional `source_reference.scene_id`, validado contra as cenas da versão. Blender importa a cena selecionada, infere o contexto para referências antigas e preserva a geometria completa na exportação VR. A preparação modifica apenas a cópia temporária de importação. Veja [associação visual](SCENE_ASSOCIATION.md).
