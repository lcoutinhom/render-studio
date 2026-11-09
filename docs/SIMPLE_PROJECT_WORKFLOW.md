# Fluxo principal: clientes, projetos, arquivos e cenas

O fluxo ativo é **Cliente → Projeto → Uploads → Cenas/fotografias marcadas → Configuração → Renderização → Resultados do projeto**. Não é necessário cadastrar ambientes, fazer associações manuais ou criar câmeras antes de enviar.

## Operação

1. Abra Clientes, cadastre o contato e crie um projeto dentro dele. Projetos antigos sem cliente continuam disponíveis.
2. Em Arquivos e cenas, adicione arquivos independentes. Cada arquivo abre sua própria página, com original privado e revisões.
3. Abra o visualizador e marque os checkboxes das cenas e fotografias desejadas. Pesquisa, paginação e mudança de cena 3D preservam a seleção. Câmeras exportadas preservam sua lente; pontos recuperados usam lente estimada de 35 mm. Você pode escolher uma cena inteira com câmera automática ou capturar uma vista manual.
4. Confira a lista completa de itens selecionados. Use preset, formulário, Gemini ou importação JSON para preencher o mesmo conjunto de parâmetros. Apenas o que estiver marcado será enviado.
5. Clique em Renderizar cenas selecionadas. Blender gera arquivos reais; Simulação testa o fluxo sem gerar imagens. Acompanhe o lote e abra os resultados no próprio projeto/arquivo.
6. Para atualizar o modelo, use Enviar nova revisão dentro do arquivo correspondente. A seleção anterior é limpa e o próximo envio usa a nova revisão. Para outro arquivo independente, use Adicionar arquivo no projeto.

## Configuração única

O menu Padrão de renderização configura os valores gerais da conta. Novos projetos recebem uma cópia desse padrão; alterações futuras no padrão não modificam projetos existentes. No projeto, presets e campos manuais editam o mesmo objeto de parâmetros. Gemini sugere alterações para revisão explícita, sem alterar cenas, poses, materiais ou geometria.

Importação e exportação usam um documento único:

```json
{
  "schema_version": 1,
  "settings": {
    "samples": 16,
    "lighting": "sunset",
    "resolution_width": 800,
    "resolution_height": 600
  }
}
```

O servidor valida chaves, tipos, limites e relações entre parâmetros e completa os valores ausentes. JSON inválido não é aplicado. A exportação do formulário também valida e normaliza os valores. Importar ou aplicar preset/Gemini não salva nem renderiza automaticamente. Salvar configurações do projeto altera seu padrão; a renderização preserva os valores efetivamente utilizados. Presets pessoais e padrão geral são os únicos itens de configuração reutilizáveis entre projetos; uploads, vistas, câmeras e resultados não são globais.

## Arquitetura e compatibilidade

`Client → Project → ProjectFile → ProjectVersion (revisão do arquivo)` define a navegação. A revisão é sequencial por arquivo (`file_revision`). O contador antigo `version_number` permanece como identidade interna para compatibilidade com FKs e snapshots existentes; o usuário não precisa versionar o projeto inteiro nem as configurações.

A migração acrescenta identidades de arquivo aos uploads existentes sem alterar bytes, checksums, metadados originais ou snapshots. Cada upload histórico passa a ser um arquivo independente, pois não se presume que nomes diferentes sejam revisões do mesmo modelo. Novas revisões são explicitamente enviadas dentro de um arquivo. Clientes antigos são derivados do nome de cliente existente por conta. FKs compostas impedem vínculos de cliente/arquivo entre contas ou projetos diferentes.

O executor existente é reaproveitado: cada escolha selecionada ganha um alvo interno ligado ao arquivo e uma associação à cena 3D correta. Câmeras são específicas da revisão e da escolha, com origem da lente registrada. Esses registros internos não exigem CRUD de ambientes na interface e não duplicam o original. Cada envio preserva arquivo, revisão, escolhas, câmera e parâmetros em snapshots imutáveis. Reenvios com a mesma chave são idempotentes; escolhas diferentes com a mesma chave são recusadas. Falhas de validação revertem a preparação inteira.

Os caminhos anteriores continuam disponíveis em Dados do fluxo anterior, sem excluir associações, câmeras ou histórico. A duplicação de projetos recria identidades de arquivos para o projeto copiado e compartilha os blobs originais existentes, preservando isolamento e evitando cópias binárias desnecessárias. Arquivamento mantém resultados e downloads históricos. A galeria do projeto e a do arquivo têm paginação; o arquivo reúne resultados de todas as suas revisões.

GLB permite a seleção visual e as prévias. ZIP glTF/OBJ permite renderização automática da cena/modelo; DAE permanece armazenável, mas precisa ser convertido para um formato aceito pelo Blender. A proporção de imagem definida na configuração pode alterar o recorte das câmeras. As limitações documentadas de WebXR e da recuperação de lentes continuam válidas.

## Validação

Regressão completa: 159 exemplos RSpec aprovados, incluindo Blender real e um novo teste que gera imagem e GLB VR a partir de arquivo GLB/OBJ pelo fluxo simplificado. Verificações adicionais de cliente arquivado, projetos e resultados: 20 exemplos sem falhas. Frontend: 13 testes, TypeScript e build aprovados. RuboCop em 168 arquivos e Brakeman sem alertas de segurança.

Chromium percorreu cliente, projeto, upload, fotografia recuperada e câmera formal com checkbox, pesquisa, troca entre cenas, importação/exportação JSON, preset, aplicação Gemini, envio exato de três vistas, uploads independentes, revisões e mobile. A chamada inicial ao Gemini foi real, com texto/parametrização de teste; a repetição visual usou resposta interceptada. Um teste adicional confirmou que uma revisão enviada limpa os checkboxes e usa a nova revisão, sem reutilizar escolhas antigas. Todas as fixtures do navegador foram removidas do banco test; os projetos reais não receberam renderizações de teste.
