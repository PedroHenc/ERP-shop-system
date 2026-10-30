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

Além das variáveis de autenticação, a API exige as do banco (`DB_URL`, `DB_USERNAME` e `DB_PASSWORD`, sem valores padrão) e o JDK 25. No PowerShell, a partir de `../api`:

```powershell
$env:JAVA_HOME = '<caminho-do-jdk-25>'
$env:DB_URL = 'jdbc:postgresql://localhost:5432/erp'
$env:DB_USERNAME = '<usuario-do-banco>'
$env:DB_PASSWORD = '<senha-do-banco>'
$env:APP_JWT_SECRET = '<segredo-com-pelo-menos-32-bytes>'
$env:APP_BOOTSTRAP_ADMIN_EMAIL = 'admin@example.com'
$env:APP_BOOTSTRAP_ADMIN_PASSWORD = '<senha-de-8-a-72-caracteres>'
.\mvnw.cmd spring-boot:run
```

Em bash, use `export NOME=valor` para as mesmas variáveis e `./mvnw spring-boot:run`.

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

## Design e animações

O visual segue o design system Modernist, adaptado no Claude Design (cores, fonte Archivo, cartões arredondados, pílulas e as animações). Antes de criar uma tela ou um componente visual, leia o [`DESIGN.md`](DESIGN.md): ele lista os tokens, os componentes compartilhados (`Panel`, `SegmentedControl`, `Pill`, `ProgressBar`, avatares) e as regras de movimento, incluindo movimento reduzido.

## Adicionar um componente shadcn

```bash
pnpm dlx shadcn@latest add <component>
```

`src/components/ui` é gerado pela CLI; não edite esses arquivos à mão.

## Adicionar uma tradução

Inclua a chave nos dois arquivos, `src/locales/en` e `src/locales/pt-BR`. Um teste de paridade falha se alguma chave existir em só um idioma.
