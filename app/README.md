# ERP Lojas — Front-end

SPA em React + TypeScript que consome a API em `../api`. O idioma principal da interface é o inglês (fallback); pt-BR também é suportado.

## Pré-requisitos

- Node 24
- pnpm via corepack (`corepack enable`)

## Como rodar

```bash
cp .env.example .env   # ajuste VITE_API_URL se a API não estiver em http://localhost:8080
pnpm install
pnpm dev               # http://localhost:5173
```

Outros comandos:

- `pnpm test` — testes (Vitest + Testing Library + MSW)
- `pnpm build` — checagem de tipos e build de produção

## Stack

Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui (Radix), React Router, TanStack Query, TanStack Table, React Hook Form + Zod, react-i18next.

## Estrutura

```
src/
├── app/          # providers, router, i18n, tema e moeda
├── features/     # uma pasta por feature (products, brands, dashboard)
├── shared/       # api (client HTTP), layout e componentes compartilhados
├── components/ui # componentes shadcn (gerados)
└── locales/      # traduções (en, pt-BR)
```

## Adicionar um componente shadcn

```bash
pnpm dlx shadcn@latest add <component>
```

`src/components/ui` é gerado pela CLI; não edite esses arquivos à mão.

## Adicionar uma tradução

Inclua a chave nos dois arquivos, `src/locales/en` e `src/locales/pt-BR`. Um teste de paridade falha se alguma chave existir em só um idioma.
