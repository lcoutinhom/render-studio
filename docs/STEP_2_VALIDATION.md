# Atualização do limite de upload

Limite ampliado para **1 GiB por arquivo**, com ZIPs de até **2 GiB expandidos**. A validação lê o binário GLB e os recursos ZIP em blocos; JSON/MTL ficam limitados a 64 MiB e DAE usa leitura XML incremental. Os originais continuam privados e as proteções de integridade/caminho permanecem ativas.

Verificação atual: **60 exemplos RSpec, 0 falhas**, incluindo um arquivo GLB real maior que 100 MiB e rejeição acima de 1 GiB; TypeScript/build e RuboCop aprovados. Não foi executado upload de 1 GiB completo pelo navegador.

---

# Step 2 — Projects & Environments

Concluído em 28/10/2026. Implementação incremental; Step 3 não iniciado.

## Implementação

- Models Project, Environment, ProjectVersion e EnvironmentVersion, JSONB, UUID estável dos ambientes, constraints e chaves estrangeiras compostas.
- CRUD, busca/filtros/ordenação/paginação de projetos, duplicação compartilhando blobs, arquivamento e exclusão lógica.
- CRUD de ambientes, tipos completos, configurações próprias, duplicação opcional das associações e reordenação atômica.
- Uploads privados Active Storage, versão numerada sob lock, originais imutáveis e associações manuais independentes entre versões.
- Preview GLB com Three.js, OrbitControls, reset, foco por referência compatível e loading/erro; avisos para os demais formatos.
- Páginas individuais, seletor explícito de versão, downloads autorizados e seleção de ambientes elegíveis para a futura renderização.

Arquivos principais: `db/migrate/20261028235000_create_projects_and_environments.rb`, `app/models/{project,environment,project_version,environment_version}.rb`, policies correspondentes, `app/services/{projects,environments,project_versions}`, controllers do domínio, `app/presenters/project_presenter.rb`, páginas `app/javascript/pages/{projects,environments}` e componentes de preview/upload/associação. Gemfile/lock incluem Rubyzip; package/bun.lock incluem Three.js, tipos e Prettier. Navegação, dashboard inicial e documentação foram atualizados.

## Verificações

- **RSpec: 59 exemplos, 0 falhas**, com PostgreSQL real.
- TypeScript e build Vite aprovados.
- RuboCop: **75 arquivos, nenhuma infração**.
- Zeitwerk aprovado.
- Brakeman: **0 erros, 0 alertas**.
- Migração incremental aplicada em desenvolvimento; banco de teste atualizado pelas verificações do Rails/RSpec.

Cobertura inclui isolamento entre usuários e projetos, injeção de owner/project, constraints compostas no banco, configuração JSON, permanência da identidade, ausência de ambientes entre versões, unicidade, preservação de originais, limpeza de blobs em erro, duplicação sem cópia binária, reordenação e exclusão lógica. Uploads são testados com GLB íntegro/truncado, MIME/extensão forjados, limites, glTF/OBJ empacotados, referências relativas seguras/ausentes/externas, traversal, executáveis, ZIP excessivo/compressão e DAE com entidades.

Chromium com WebGL/SwiftShader verificou o fluxo real de conta seed → projeto → Sala/Cozinha → upload GLB → associações confirmadas → seleção individual/todos → segunda versão apenas com Sala → consulta da versão antiga → reordenação → duplicação de ambiente/projeto → exclusão lógica. Rotação, zoom e reset foram exercitados no canvas. Mobile (390 × 844) sem overflow horizontal; sem erros JS. O menu foi aguardado até concluir a transição antes das capturas. Arquivos temporários de evidência: `/tmp/render-step2-project.png` e `/tmp/render-step2-mobile.png`.

Os projetos criados pelo teste de navegador foram excluídos logicamente ao final, preservando os vínculos conforme a regra do produto. Nenhum dado de outro projeto do workspace foi alterado.

## Limites e operação

Use os comandos de instalação do README, `bin/rails db:prepare` e `bun run build`; abra `/projects` após o login. Conta seed existente preservada. Uploads: GLB 2 autocontido sem extensões obrigatórias, ZIP glTF/OBJ e DAE sem texturas externas, conforme limites documentados no README. A inspeção é básica, sem certificação integral do formato. O visualizador só apresenta GLB e preserva o modelo completo; não recorta ou modifica geometria.

Materiais, câmeras, presets, configuração guiada, jobs, lotes e resultados continuam nos próximos steps. Não há botão funcional de enfileiramento. A seleção local não é persistida e mudar de versão a limpa. Nenhum Blender, extensão SketchUp, WebXR ou conversão de formato foi implementado.

Vite informa que o chunk Three.js excede 500 kB (aproximadamente 631 kB minificado/161 kB gzip); o módulo é carregado somente ao abrir um GLB. A inspeção de ZIP usa leitura em blocos, sem extração. Produção/S3 e CI no GitHub não foram executados.

O wrapper Brakeman passou a usar a versão fixada no Gemfile.lock, removendo a exigência de consulta remota de versão mais recente que falhava sem rede. O scanner de vulnerabilidades continua sendo executado normalmente; nenhuma regra foi suprimida.
