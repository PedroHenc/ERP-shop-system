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

## Entrar em desenvolvimento

A API exige login. Para ter um usuário, suba a API com as variáveis do admin de bootstrap definidas (ela cria o admin só se ainda não houver usuários):

```bash
APP_JWT_SECRET=<segredo-com-pelo-menos-32-bytes> \
APP_BOOTSTRAP_ADMIN_EMAIL=admin@example.com \
APP_BOOTSTRAP_ADMIN_PASSWORD=<senha-de-8-a-72-caracteres> \
./mvnw spring-boot:run   # em ../api
```

Depois abra `http://localhost:5173` e entre com esse e-mail e senha. Os demais usuários são criados na tela de usuários, pelo admin.

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
