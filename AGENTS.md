# AGENTS.md

Este arquivo define instruções simples para quem for ajudar neste projeto.

## Objetivo

- Sistema de gestao de pedidos para confeitaria, simples, rapido e direto.
- Cadastro de clientes, criacao de pedidos em 3 etapas, produtos e complementos, dashboard, lista e kanban de pedidos, tags configuraveis.
- Multi-lojas: produtos, tags e clientes compartilhados; pedidos e usuarios separados por loja. Usuarios com permissao podem acessar mais de uma loja.

## Stack

- Frontend: React (Horizon), Vite, Tailwind.
- Backend: Supabase.

## Regras gerais

- Use Node.js conforme indicado em `.nvmrc`.
- Respeite o estilo de formatação do Prettier.
- Use ESLint para checar erros quando possível.
- Não altere `.env` nem dados sensíveis.
- Evite mudanças grandes sem conversar antes.

## Como rodar

- Instalar dependencias: `npm install`
- Rodar local: `npm run dev`
- Lint: `npm run lint`

## Fluxo sugerido

- Antes de editar, verifique o que o usuário quer.
- Após editar, rode `npm run lint` se fizer sentido.
- Explique o que foi feito e onde.

## Estrutura por feature

- `src/features/*/pages`: telas principais por dominio.
- `src/features/*/components`: componentes especificos da feature.
- `src/features/*/services`: chamadas de API e regras da feature.
- `src/shared/components`: componentes reutilizaveis.
- `src/shared/ui`: UI base (botoes, inputs, dialogs).
- `src/shared/lib`: utilitarios comuns (utils, apiBase, supabase).
- `src/shared/hooks`: hooks compartilhados.

## Padroes de import

- Use alias `@` para evitar caminhos relativos longos.
- UI base: `@/shared/ui/...`
- Utilitarios: `@/shared/lib/...`
- Services por dominio: `@/features/<feature>/services/...`
- Componentes de feature: `@/features/<feature>/components/...`


## Regras de multi-lojas

- Produtos, tags e clientes sao globais.
- Pedidos e usuarios sao separados por loja.
- Usuarios com permissao podem acessar mais de uma loja.

## Notas de UI/UX

- Interface simples e direta, com foco em velocidade.
- Evitar passos desnecessarios no fluxo de pedidos.
