# Associação visual de ambientes

Abra **Projetos → projeto → ambiente → Associação**, escolha a versão GLB e clique em **Abrir visualizador**.

1. Use as abas acima do visualizador para navegar pelas cenas exportadas no arquivo.
2. Para associar parte da cena, clique no modelo ou procure objetos e grupos pela lista. Shift + clique adiciona ou remove objetos.
3. Use **Ver só a seleção** para conferir o recorte. **Ver cena completa** restaura a visualização.
4. Use a ação de associação da cena ou dos objetos para preencher o formulário.
5. Confira as referências, confirme manualmente e salve. A seleção no visualizador não salva automaticamente.

As abas representam cenas reais do GLB e preservam seus nomes originais. Um GLB com apenas uma cena terá uma única aba, mesmo que o projeto original do SketchUp tivesse várias abas. Nesse caso, use objetos/grupos ou exporte as cenas no arquivo. Nós vazios não são convertidos em cenas. Não há associação automática de tags nem extensão SketchUp nesta entrega.

O arquivo é carregado uma vez por versão; trocar abas não baixa o modelo novamente. Isolamento e seleção são locais ao visualizador e não modificam o arquivo, a geometria ou resultados anteriores. O desenho é atualizado conforme a interação para reduzir trabalho ocioso em modelos grandes.

Referências de objetos podem registrar `source_reference.scene_id`, identificando a cena onde foram selecionados. O Blender usa esse contexto ao importar; associações antigas continuam aceitas e têm a cena inferida pelos objetos. Se uma associação antiga reúne objetos de várias cenas, o executor prepara uma cena temporária com suas raízes. A exportação VR preserva a geometria completa. Apenas a cópia temporária de importação é alterada.

Validação: Chromium com duas cenas, seleção por clique e lista, isolamento, preenchimento sem salvar, gravação explícita e reabertura na cena correta; modelo real de aproximadamente 163 MiB e viewport de celular sem transbordamento. Integração Blender verifica cenas além da primeira, objetos com e sem contexto explícito, imagem, VR e checksum do original.

## Carregamento e desempenho

A página não baixa o GLB nem inicia WebGL antes de abrir o visualizador. O modo leve é o padrão: mantém geometria, IDs e cores dos materiais, mas não decodifica/carrega texturas e usa materiais de iluminação simples. A opção de materiais completos recarrega a prévia sob demanda. O modo leve limita a densidade de pixels e dispensa antialiasing; não modifica o original nem a qualidade do Blender.

O renderizador agenda quadros somente quando há interação, carregamento ou redimensionamento, e pausa quando a aba do navegador está oculta. Limites geométricos são reutilizados ao selecionar e reenquadrar. Fechar o visualizador cancela o download em andamento e libera os recursos carregados, incluindo texturas/bitmaps e o canvas.

O download ainda transfere o GLB original completo; esta otimização não cria um modelo reduzido. Arquivos grandes ou com muita geometria ainda dependem da conexão e da capacidade do computador.

## Escolher a câmera visualmente

Na aba **Câmeras**, clique em **Abrir visualizador**, gire/aproxime/mova o modelo até o enquadramento desejado e clique em **Usar esta visão como câmera**. Dê um nome e clique em **Salvar câmera**. Uma nova captura substitui os valores do formulário, mas não grava automaticamente. Posição, rotação, lente e referência de origem ficam em **Configurações avançadas**. A captura usa perspectiva, limpa referências de nó antigas e preenche a lente para sensor de 36 mm. A prévia é 4:3; use a mesma proporção na renderização para manter o enquadramento.

As rotações são convertidas da orientação Three.js para os ângulos XYZ usados pelo Blender (decomposição ZYX no Three). A câmera continua vinculada ao ambiente e à versão selecionados pelas rotas e policies existentes. O modo leve continua disponível para reduzir o custo de navegação.

## O que falta para renderizar

A lista de ambientes e o detalhe de cada ambiente mostram pendências da versão escolhida e links para corrigi-las: projeto/ambiente arquivado, versão ausente, arquivo original ausente, associação ausente/pendente/inválida e materiais excluídos ainda em uso. A seleção em lote considera essas mesmas pendências. Substituições de material específicas do ambiente prevalecem sobre as gerais do projeto. Câmeras, materiais personalizados e presets não são requisitos: há câmera automática, materiais originais e configurações padrão. A checagem descreve os requisitos de cadastro; não identifica móveis ou geometria faltando no arquivo nem substitui a validação final do backend ao enviar.

## Miniaturas dos enquadramentos exportados

Após abrir o visualizador, a seção **Enquadramentos desta cena** mostra miniaturas das câmeras em perspectiva que realmente pertencem à cena ativa no GLB. Os nomes, posição mundial (incluindo transformações dos grupos) e lente vêm do arquivo. Clique na miniatura para assumir o enquadramento; na aba **Câmeras**, clique em **Usar esta visão como câmera**, dê um nome e salve. A troca entre cenas não baixa o GLB novamente. Não há criação automática de ambientes ou gravação automática de câmeras.

As miniaturas são prévias WebGL geradas localmente, usando o modo leve ou completo escolhido, e não fotografias prontas nem resultados Blender. São geradas em páginas de até 12 para limitar o trabalho da GPU, reutilizando a geometria já carregada. Se o GLB não tiver câmeras, a interface explica a ausência; não converte nós vazios em enquadramentos. Câmeras ortográficas exportadas ainda não oferecem importação fiel de enquadramento: use perspectiva ou ajuste manual. A prévia de cadastro continua em 4:3; a lente horizontal é preservada e a proporção de saída deve ser conferida ao renderizar.

## Exportadores que gravam vistas como pontos vazios

Alguns arquivos trazem nomes como COZINHA 1/JANTAR 1/SALA 1 em nós sem mesh, câmera ou lente. Esses nomes não bastam para classificá-los como cenas ou câmeras. O catálogo de associação agora propaga a presença de geometria pelos grupos e exclui nós sem geometria da lista de objetos. Uma associação nova começa pelo seletor Cena quando há cenas reais; mudar o tipo limpa referências anteriores e retorna a revisão para pendente, evitando reutilizar IDs de outro catálogo.

A seção **O que veio neste arquivo** mostra contagens de cenas reais, câmeras formais e pontos nomeados sem geometria. Na aba Câmeras, a opção manual **Usar um ponto nomeado como vista aproximada** permite recuperar posição e rotação mundiais, com lente assumida de 35 mm. O usuário precisa reconhecer o ponto, conferir a direção, capturar e salvar; não há identificação automática de ambientes nem garantia de reproduzir a fotografia original. Pontos vazios também podem representar elementos que não são vistas.

A classificação funciona em arquivos já enviados: lê apenas o cabeçalho e o chunk JSON do GLB via `download_chunk`, usa cache por blob/checksum e enriquece somente a resposta da versão selecionada. Não modifica metadados imutáveis, associações, originais ou snapshots históricos. Versões antigas não precisam ser reenviadas para obter a classificação.

## Galeria de cenas recuperadas (padrão após abrir o visualizador)

Os pontos nomeados do exportador são apresentados primeiro em **Cenas recuperadas do SketchUp**, com pesquisa por nome e páginas de até 12 miniaturas. São vistas aproximadas com lente estimada de 35 mm, e não câmeras formais extraídas do GLB; alguns pontos podem não corresponder a abas do programa de origem. As prévias aparecem progressivamente, reutilizando o modelo já carregado. Trocar página ou pesquisar cancela a geração anterior e não baixa o GLB novamente.

Clique na prévia para conferir o ângulo no visualizador. Na aba **Câmeras**, **Preparar câmera desta cena** preenche nome, pose e lente no formulário e direciona ao nome para revisão. A câmera só é gravada em **Salvar câmera**. Ver ou preparar uma prévia não cria registros, não altera a associação e não envia renderizações. O seletor técnico de pontos permanece recolhido como opção avançada.

## Criar câmeras selecionando várias cenas

Na aba **Câmeras**, abra o visualizador e marque **Usar como câmera** nas cenas recuperadas desejadas. A seleção permanece ao pesquisar e trocar de página. Há ações para selecionar a página atual e limpar a seleção. O resumo lista inclusive os nomes selecionados que ficaram ocultos pelo filtro. Até 100 cenas podem ser confirmadas por vez.

O botão **Criar N câmeras selecionadas** cadastra somente as marcadas, com nome, pose mundial e lente estimada de 35 mm, no ambiente e versão atuais. Marcar caixas ou visualizar não grava dados. A opção de preparar uma câmera individual continua disponível. Não há envio de renderização nesta ação.

A rota POST `.../cameras/bulk_create` usa sessão/CSRF/Pundit e os mesmos escopos de projeto, ambiente e versão do cadastro individual. Valida quantidade, referências de marcadores/cenas e todos os registros. O lote é atômico: um item inválido reverte todos. Um lock do ambiente impede criação duplicada em submissões concorrentes; câmeras ativas já importadas para a mesma referência e versão são reutilizadas, sem sobrescrever edições. A origem é preservada ao editar e uma câmera excluída logicamente pode ser importada novamente. Nenhum resultado ou configuração anterior é alterado.
