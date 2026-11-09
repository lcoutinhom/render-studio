# Sugestões de renderização com Gemini

Na etapa **Dê o seu toque**, escreva o resultado desejado em **Descreva como você quer a imagem** e clique em **Sugerir configurações com Gemini**. Confira o resumo, os valores e as limitações. **Aplicar sugestão** altera apenas o formulário atual; a renderização só é enviada na confirmação final. As alterações se aplicam aos ambientes selecionados, sem modificar configurações já salvas, câmera, materiais ou geometria.

A chave fica em `GEMINI_API_KEY` no `.env` privado (ignorado pelo Git). `GEMINI_MODEL` escolhe o modelo; o padrão é `gemini-3.5-flash-lite`, seguindo a configuração do Fenix. Reinicie o servidor após configurar. Nenhuma chave é enviada ao frontend ou escrita nos logs. A chave usada na validação foi configurada pelo usuário diretamente no `.env` do Render Studio; nenhuma credencial de conta do Fenix foi copiada.

Rails usa a API generateContent, com JSON Schema, HTTPs, chave em cabeçalho e timeouts. A rota POST `/renderings/suggest` exige sessão, CSRF, Pundit, projeto/versão da conta e ambientes renderizáveis, com limite de 5 pedidos por minuto por conta. O serviço envia somente a descrição (3–2000 caracteres) e parâmetros técnicos permitidos. Não envia arquivos 3D, imagens, nomes de projetos ou dados de outras contas. O texto da descrição é filtrado dos logs de parâmetros.

A resposta só pode sugerir qualidade, resolução, samples, denoising, exposição e parâmetros existentes de iluminação. Todas as chaves/tipos/intervalos são validados novamente por Rails; não se executam scripts nem comandos do modelo. Limites das sugestões: 512 samples e 4096 pixels por dimensão. A validação aceita somente resumo limitado, objeto não vazio de parâmetros permitidos e até cinco limitações curtas. Falhas do provedor têm mensagens seguras e não alteram o formulário.

O Gemini não analisa a geometria nem garante fotorrealismo. Pedidos de móveis, materiais específicos ou fontes de luz locais não são representáveis por esses parâmetros e devem aparecer como limitações. Mais samples/resolução podem aumentar muito o tempo no Cycles. Uma sugestão não inicia nem reduz automaticamente o custo de renderizar.

Documentação: [respostas estruturadas Gemini](https://ai.google.dev/gemini-api/docs/structured-output). A integração segue o cliente HTTP do Fenix, adaptado ao schema permitido do Render Studio, sem suas funções financeiras.
