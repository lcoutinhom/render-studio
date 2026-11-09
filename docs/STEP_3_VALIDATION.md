# Step 3 — Render Configuration

Concluído em 28/10/2026. Step 4 não iniciado; nenhuma renderização foi enfileirada ou produzida.

## Entrega

- Wizard simples de dez passos e modo personalizado com abas reais Metronic/Radix, teclado e painel associado.
- Parâmetros tipados de resolução, qualidade/samples/denoising, iluminação, imagens, vídeo/trajetória, panorama 360° e preparação VR.
- Defaults, presets, herança de projeto/ambiente/versão, sobrescritas por solicitação, restauração de herança e revisão dos valores efetivos/origens por ambiente.
- Presets globais Rápido/Padrão/Profissional idempotentes e somente leitura; CRUD de presets pessoais e salvamento a partir de configuração efetiva.
- Biblioteca PBR: materiais, categorias, cor/rugosidade/metallic/transmissão/IOR e texturas PNG/JPEG privadas por canal, com revisões preservadas.
- Mapeamentos gerais por versão e específicos por ambiente, com precedência do específico.
- Múltiplas câmeras por ambiente/versão, validação de vetores/parâmetros/referências e indicação de indisponibilidade em revisão de novo modelo.
- Configurações imutáveis, revisões independentes, snapshot explícito do modelo/ambientes, câmeras, materiais e texturas. Sem circularidade de FKs com jobs.
- Duplicação de projetos/ambientes preserva os novos relacionamentos de biblioteca/câmeras sem duplicar arquivos de origem.

## Arquivos principais

Migração `db/migrate/20261029000000_create_render_configuration_library.rb`; models `render_configuration`, `render_configuration_environment`, `render_preset`, `material`, `material_texture`, `material_mapping`, `render_camera`.

Services em `app/services/rendering` e `app/services/materials`; controllers de configurações, preferências, presets, biblioteca, texturas, mapeamentos e câmeras; policies e `RenderingPresenter`. Endpoints existentes de projetos/ambientes continuam autorizados por proprietário. As rotas públicas Active Storage permanecem desabilitadas.

Frontend: `app/javascript/pages/renderings`, `materials`, `presets`; componentes `settings-editor`, `render-preferences`, `camera-manager`, `material-mapping-manager`, `configuration-summary`; tipos em `types/rendering.ts`. Páginas de projeto/ambiente, navegação, seeds e documentação atualizados. `components/ui/tabs.tsx` foi copiado sem alterações da distribuição Metronic autorizada, conforme PROVENANCE.md. Nenhum domínio financeiro do Fenix foi incorporado.

## Verificações

- **RSpec: 85 exemplos, zero falhas**, com PostgreSQL real.
- **TypeScript e build Vite aprovados.**
- **RuboCop: 106 arquivos, nenhuma infração.**
- **Zeitwerk aprovado.**
- **Brakeman: zero erros e zero alertas.**
- Migração incremental aplicada e seeds globais executados sem alterar a conta interna existente.

Cobertura: limites/estrutura/tipos, proporção panorâmica e trajetória; precedência e restauração; configurações diferentes entre ambientes; snapshots após edição dos cadastros; câmeras/ambientes de outras versões; associação não confirmada/arquivada/excluída; propriedade dos materiais/presets; CRUD e texturas privadas; PNG corrupto/MIME forjado, JPEG real e limites; preservação das revisões de arquivos; duplicação coerente; constraints compostas; salvamento de preset efetivo; nenhuma criação de job na configuração. O enum legado de qualidade foi normalizado na expectativa do teste HTTP anterior, preservando os demais testes.

Chromium percorreu materiais → textura privada → preset pessoal → preferências herdadas do ambiente → câmera → mapeamento geral/específico → wizard simples com vídeo/panorama/VR → configuração salva → revisão personalizada de dois ambientes/câmera/trajetória → novo preset a partir do snapshot → consulta da configuração original. Sem erros JavaScript, sem overflow horizontal em viewport 390 × 844. A revisão anterior permaneceu intacta. O fluxo também passou após adotar Tabs Metronic/Radix.

Evidências locais: `/tmp/render-step3-simple.png` e `/tmp/render-step3-mobile.png`. Scripts de navegador e contexto são temporários; a suíte versionada é RSpec. Os registros temporários usados nas verificações foram retirados da listagem ao terminar, por exclusão lógica conforme as regras de preservação.

## Como executar e limites

Em instalações existentes: `bundle install`, `bun install --frozen-lockfile`, `bin/rails db:prepare`, `bin/rails db:seed`, `bun run build`, `bin/dev`. Acesse `/renderings/new`, `/materials` e `/presets` após login. A conta seed foi preservada.

Não há geração de resultados nem consumo de fila de renderização. O formulário apenas resolve e salva configurações; jobs, cancelamento, progresso e simulação pertencem ao Step 4. Não houve Blender, SketchUp, WebXR, conversão de modelos ou aplicação visual de materiais.

Configurações usam limites definidos pelo contrato do servidor: até 500 ambientes/câmeras selecionados, trajetória de até 200 pontos, valores finitos e limites de resolução/samples. Texturas: PNG/JPEG até 20 MiB e 16384 px por dimensão, inspeção básica sem decoder completo. Os uploads de modelos continuam até 1 GiB. Câmeras sem seleção explícita deixam o enquadramento automático como contrato para o executor futuro.

As escolhas de renderização não garantem suporte do futuro worker a todos os formatos/modos; a integração deverá validar as capacidades na submissão. Snapshot inclui IDs/checksums de blobs preservados, sem URLs públicas ou tokens. Não houve validação de SMTP externo, S3, deploy ou CI no GitHub. O alerta já conhecido do Vite sobre o chunk Three.js continua, com carregamento sob demanda de GLB.

A primeira execução de testes identificou o uso de helper de jobs fora do contexto request; a verificação passou a consultar explicitamente o adapter de teste. O build inicial também exigiu tipos JSON compatíveis com o formulário Inertia; o contrato TypeScript passou a usar uma união de valores suportados, sem `any` ou desativação de checagens. Todas as verificações acima passaram após os ajustes.

**Próximo: Step 4 — Rendering Management, somente após autorização.**
