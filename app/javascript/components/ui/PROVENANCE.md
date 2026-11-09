# TailAdmin React — interface do Render Studio

Base visual: `tailadmin/free-react-tailwind-admin-dashboard-main`, versão 2.5.0, licença MIT, copiada em `docs/licenses/TAILADMIN.txt`.

`styles/tailadmin/tokens.css` preserva os tokens @theme do TailAdmin. Cards e variantes dos botões foram adaptados de `ComponentCard` e `ui/button.tsx`; layout, campos e navegação seguem os padrões da distribuição React. Os componentes deste diretório são adaptações locais, não cópias inalteradas.

O template original usa Base UI/React Router. Nesta integração mantemos os primitives Radix já instalados e os contratos Inertia (`asChild`, sessões/CSRF e navegação Rails). Não importamos rotas de demonstração, signup, dados financeiros fictícios, providers ou dependências do template que a aplicação não usa. Não modificamos o template fonte. Os antigos estilos Metronic não são mais importados.
