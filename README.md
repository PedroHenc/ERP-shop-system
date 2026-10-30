<p align="center">
  <img src="./app/public/favicon.png" alt="Logo ERP Lojas" width="120" />
</p>

# ERP Lojas — Sistema de Controle de Lojas

Sistema ERP para gestão de operações de loja(s): estoque, vendas, financeiro, clientes, fornecedores, usuários e relatórios gerenciais. Projeto full stack, dividido em **API** (backend) e **Front** (aplicação web).

> Este documento descreve o escopo geral do projeto. Ele deve evoluir conforme novas decisões forem tomadas — trate como fonte única de verdade sobre "o que o sistema faz" e "como está organizado".

---

## 1. Visão Geral

O objetivo é oferecer uma plataforma unificada para controle operacional de loja(s) de pequeno/médio porte, cobrindo o ciclo:

```
Cadastro (produtos, fornecedores, clientes)
   → Estoque (entrada/saída, inventário)
   → Vendas (PDV / pedidos)
   → Financeiro (contas a pagar/receber, caixa)
   → Relatórios (indicadores gerenciais)
```

### 1.1 Objetivos do produto

- Centralizar controle de estoque e evitar divergências entre estoque físico e sistêmico.
- Registrar vendas e movimentações financeiras de forma auditável.
- Dar visibilidade gerencial (dashboards e relatórios) para tomada de decisão.
- Suportar múltiplos perfis de usuário com permissões distintas (admin, gerente, operador de caixa/estoque).
- Ser extensível para múltiplas lojas/filiais no futuro (multi-tenant ou multi-loja lógico).

### 1.2 Fora de escopo (nesta fase)

- Integração fiscal (emissão de NF-e/NFC-e) — pode entrar em fase futura.
- Aplicativo mobile nativo (o front web deve ser responsivo, mas não haverá app dedicado inicialmente).
- Integração com marketplaces externos (Mercado Livre, Shopee etc.).

---

## 2. Módulos do Sistema

| Módulo | Descrição resumida |
|---|---|
| **Autenticação & Usuários** | Login, controle de sessão, papéis (roles) e permissões |
| **Produtos** | Cadastro de produtos, categorias, unidades, preços, SKU/código de barras |
| **Estoque** | Entradas, saídas, transferências, ajustes de inventário, alertas de estoque mínimo |
| **Fornecedores** | Cadastro e histórico de compras por fornecedor |
| **Clientes** | Cadastro de clientes, histórico de compras |
| **Vendas / PDV** | Registro de vendas, formas de pagamento, descontos, cancelamento/estorno |
| **Financeiro** | Contas a pagar/receber, fluxo de caixa, conciliação simples |
| **Relatórios & Dashboard** | Indicadores de vendas, estoque, financeiro (gráficos e exportação) |
| **Configurações** | Parâmetros gerais do sistema, dados da loja, unidades de medida |

Cada módulo deve ter, no mínimo: CRUD completo, validações de negócio, e tela de listagem com filtros/paginação no front.

---

## 3. Arquitetura Geral

```
┌─────────────────────┐        HTTPS / REST (JSON)        ┌─────────────────────┐
│   Front (React/TS)  │ ───────────────────────────────▶ │   API (Spring Boot)  │
│   SPA + shadcn/ui    │ ◀─────────────────────────────── │   Java 25             │
└─────────────────────┘                                   └──────────┬──────────┘
                                                                       │
                                                                 ┌─────▼─────┐
                                                                 │  Banco de  │
                                                                 │   Dados    │
                                                                 └───────────┘
```

- Comunicação via **REST API** (JSON), autenticação stateless via **JWT**.
- Front consome a API através de camada de serviços dedicada (ex.: `services/`, com `fetch` + TanStack Query para cache/estado assíncrono).
- Separação clara de responsabilidades: front não contém regra de negócio, apenas orquestração de UI e chamadas à API.

---

## 4. Escopo do Front-end

### 4.1 Stack

- **React** + **TypeScript**
- **Vite** + **Tailwind CSS v4**
- **shadcn/ui** (Radix) como biblioteca de componentes
- **TanStack Query** para gerenciamento de estado assíncrono/cache de requisições
- **React Hook Form** + **Zod** para formulários e validação
- **TanStack Table** para listagens tabulares (estoque, produtos, vendas etc.)
- Roteamento via **React Router**
- **react-i18next** para i18n (inglês como idioma principal; pt-BR suportado)
- Testes com **Vitest**, Testing Library e MSW

### 4.2 Estrutura de telas (alto nível)

- Login (recuperação de senha: não implementada, fora do escopo por ora)
- Dashboard inicial (indicadores resumidos)
- Produtos: listagem, cadastro, edição, detalhes
- Estoque: movimentações, ajuste de inventário, alertas
- Fornecedores: listagem e cadastro
- Clientes: listagem e cadastro
- Vendas: nova venda (PDV), histórico, detalhe de venda
- Financeiro: contas a pagar/receber, fluxo de caixa
- Relatórios: filtros por período, exportação (CSV/PDF)
- Configurações: dados da loja, usuários e permissões

### 4.3 Requisitos não funcionais do front

- Componentização consistente (evitar duplicação de UI entre módulos).
- Tipagem forte — evitar uso de `any`.
- Testes automatizados (unitários para lógica, testes de componente para telas críticas).
- Acessibilidade básica (labels, foco, contraste) nas telas principais.
- Atenção a Web Vitals (carregamento de listas grandes, paginação no backend em vez de carregar tudo no front).

---

## 5. Escopo do Back-end (API)

### 5.1 Stack

- **Java 25**
- **Spring Boot** (Web, Security, Data JPA)
- **Maven**
- **Lombok**
- Banco relacional (ex.: PostgreSQL/MySQL — a definir)
- **Flyway** para versionamento de schema (migrations em `api/src/main/resources/db/migration`)

**Configuração para o front:** a API libera CORS para as origens definidas em `APP_CORS_ALLOWED_ORIGINS` (separadas por vírgula; padrão `http://localhost:5173`). Todos os endpoints de negócio exigem JWT (apenas `POST /auth/login`, `/auth/refresh`, `/auth/logout` e `/actuator/health` são públicos); as permissões por perfil estão na seção 6.

### 5.2 Responsabilidades da API

- Expor endpoints REST para todos os módulos listados na seção 2.
- Regras de negócio e validações centralizadas no backend.
- Autenticação/autorização via Spring Security + JWT.
- Paginação, filtros e ordenação padronizados (uso de `Page<T>` do Spring Data).
- Auditoria mínima: quem criou/alterou registros e quando (ex.: campos `createdAt`, `updatedAt`, `createdBy`).

**Configuração de autenticação** (variáveis de ambiente):

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `APP_JWT_SECRET` | sim | — | Segredo de assinatura do JWT, com no mínimo 32 bytes. Sem ele (ou com menos de 32 bytes) a API não sobe |
| `APP_JWT_ACCESS_TTL` | não | `PT15M` | Validade do access token |
| `APP_AUTH_REFRESH_TTL` | não | `P7D` | Validade do refresh token (e do cookie) |
| `APP_AUTH_COOKIE_SECURE` | não | `false` | Marca o cookie de refresh como `Secure` |
| `APP_AUTH_COOKIE_SAME_SITE` | não | `Lax` | Atributo `SameSite` do cookie de refresh |
| `APP_AUTH_COOKIE_PATH` | não | `/auth` | Caminho do cookie de refresh. Use `/api/auth` quando o front acessa a API pelo proxy `/api` (deploy na Vercel) |
| `APP_BOOTSTRAP_ADMIN_EMAIL` | não | vazio | E-mail do primeiro admin, criado na subida se não houver usuários |
| `APP_BOOTSTRAP_ADMIN_PASSWORD` | não | vazio | Senha do primeiro admin (8 caracteres a 72 bytes) |
| `APP_SIGNUP_ENABLED` | não | `true` | Permite que qualquer pessoa crie uma loja nova na tela de login ("Criar conta"). Com `false`, só entra quem tem convite de uma loja existente |
| `JPA_DDL_AUTO` | não | `validate` | Modo `ddl-auto` do Hibernate. O schema é gerenciado pelo Flyway (migrations em `api/src/main/resources/db/migration`); o Hibernate apenas valida |

Se não houver usuários e as variáveis de bootstrap não estiverem definidas, a API registra um aviso e ninguém consegue entrar.

**Como a sessão funciona:** o login devolve um access token JWT de 15 minutos, que o front guarda apenas em memória, e um refresh token em cookie `httpOnly` (`erp_refresh`) de 7 dias. A cada renovação o refresh token é rotacionado. Reutilizar um token já substituído pela rotação fora da janela de 30 s (ou reutilizá-lo pela segunda vez dentro dela) revoga todas as sessões do usuário; um token encerrado por logout ou revogação é simplesmente recusado. Cinco falhas seguidas de login bloqueiam a conta por 15 minutos.

> **Atenção:** se o front e a API estiverem em domínios diferentes, é obrigatório usar HTTPS com `APP_AUTH_COOKIE_SAME_SITE=None` e `APP_AUTH_COOKIE_SECURE=true`; mesmo assim, navegadores que bloqueiam cookies de terceiros podem impedir a sessão de sobreviver a um recarregamento. O recomendado é servir front e API no mesmo site (por exemplo, subdomínios do mesmo domínio).

### 5.2.1 Deploy (API no Render, front na Vercel)

O `render.yaml` na raiz cria a API (`erp-shop-api`, Docker) no plano grátis do Render. O front vai para a Vercel, e o `app/vercel.json` repassa `/api/*` para a API: o navegador vê um único domínio, então o cookie de refresh é de primeira parte e não há CORS.

**API (Render)**

1. Antes do primeiro deploy, crie o schema no Supabase (**SQL Editor**): `CREATE SCHEMA IF NOT EXISTS shop_api;`.
2. No Render, **New → Blueprint**, escolha este repositório e confirme.
3. Preencha as variáveis pedidas: `DB_URL`, `DB_USERNAME` e `DB_PASSWORD` (Supabase → **Connect → Session pooler**; a URL começa com `jdbc:postgresql://` e termina com `?sslmode=require`) e `APP_BOOTSTRAP_ADMIN_EMAIL`/`APP_BOOTSTRAP_ADMIN_PASSWORD`. O `APP_JWT_SECRET` é gerado pelo Render.
4. Depois do primeiro deploy, confira a URL pública da API. Se não for `https://erp-shop-api.onrender.com`, atualize o destino da regra `/api/:path*` no `app/vercel.json`.

**Front (Vercel)**

1. Na Vercel, **Add New → Project**, importe este repositório e defina **Root Directory** como `app`. Instalação, build e rotas vêm do `app/vercel.json`.
2. Em **Environment Variables**, defina `VITE_API_URL=/api` **sem marcar "Sensitive"**. O build roda no GitHub com `vercel pull`, que não lê variáveis sensíveis: elas viriam como `[SENSITIVE]`. O workflow descarta esse valor e o app usa o padrão `/api`, mas um valor diferente só funciona se a variável não for sensível. Variáveis `VITE_*` vão para o JavaScript público, então nunca são segredo.
3. Faça o deploy, entre com o admin de bootstrap e, depois, remova as duas variáveis `APP_BOOTSTRAP_ADMIN_*` no Render.
4. Configure o deploy de produção pelo GitHub Actions (abaixo): crie um token em **Account Settings → Tokens** e salve no GitHub, em **Settings → Secrets and variables → Actions**, os secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` (o *Team ID*, em **Team Settings → General**) e `VERCEL_PROJECT_ID` (**Project Settings → General → Project ID**).

**Ordem dos deploys.** A Vercel não publica a `main` sozinha (`"git": { "deploymentEnabled": { "main": false } }` no `app/vercel.json`). Quem publica o front em produção é o workflow `.github/workflows/deploy-app.yml`, com a CLI da Vercel:

- push na `main` que não mexe em `api/`: o front sai na hora (o Render só refaz o deploy quando `api/` muda);
- push que mexe em `api/`: o front espera o Render terminar o deploy da API com sucesso e então publica esse mesmo commit. Se o deploy da API falhar, o front fica como estava;
- **Actions → Deploy app → Run workflow** publica a `main` atual à mão.

Assim um front novo nunca vai ao ar chamando rotas que a API em produção ainda não tem. Os previews de pull request continuam automáticos. Sem os três secrets, o workflow falha e o front não é publicado.

No plano grátis a API hiberna após 15 minutos sem uso; a primeira requisição depois disso leva cerca de um minuto.

### 5.2.2 Lojas (multi-loja)

O sistema atende várias lojas no mesmo banco. Os dados de cada loja (produtos, marcas, fornecedores, produto-fornecedor, usuários e refresh tokens) têm a coluna `store_id`, filtrada automaticamente pelo Hibernate (`@TenantId`); a loja vem da claim `store` do access token.

- **Queries nativas não passam por esse filtro** e precisam restringir `store_id` à mão. Hoje as únicas são as checagens de e-mail do `UserRepository`, globais de propósito.
- A migration `V2__stores.sql` cria `tb_stores` e move todos os dados existentes para a loja 1 ("Loja principal").
- Loja suspensa (`tb_stores.active = false`) não consegue entrar nem renovar a sessão (403).
- **Faça backup do banco no Supabase antes do primeiro deploy com a V2.** Depois que a V2 roda, a versão anterior da API não pode voltar ao ar: as entidades dela não têm `store_id` e o `ddl-auto=update` dela recriaria os uniques globais. O caminho de volta é corrigir para frente ou restaurar o backup.
- Antes do deploy, rode a nova build uma vez contra um branch do Supabase ou uma cópia restaurada do banco e confira os uniques que existem de fato:

  ```sql
  select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint where contype='u' and connamespace='shop_api'::regnamespace;
  ```

### 5.3 Padrões de projeto

- Camadas: `controller` → `service` → `repository`, com DTOs para entrada/saída (não expor entidades JPA diretamente).
- Tratamento de erros centralizado (`@ControllerAdvice`) com respostas padronizadas.
- Conventional Commits para histórico de mudanças.

### 5.4 Exemplos de recursos (endpoints de alto nível)

```
POST   /auth/login
GET    /produtos?page=&size=&filtro=
POST   /produtos
PUT    /produtos/{id}
DELETE /produtos/{id}

GET    /brands
GET    /brands/page
GET    /brands/{id}
POST   /brands
PUT    /brands/{id}
PATCH  /brands/{id}/status

GET    /suppliers/page
GET    /suppliers/{id}
POST   /suppliers
PUT    /suppliers/{id}
PATCH  /suppliers/{id}/status

GET    /stock-movements/page?productId=&type=&from=&to=
POST   /products/{id}/stock-movements

POST   /sales
GET    /sales/page?status=&paymentMethod=&number=&from=&to=
GET    /sales/summary?from=&to=
GET    /sales/{id}
POST   /sales/{id}/cancel

GET    /store
PUT    /store

POST   /scan-sessions
GET    /scan-sessions/{id}
POST   /scan/preview
POST   /scan/submit

GET    /financeiro/contas-a-pagar
GET    /financeiro/contas-a-receber

GET    /reports/sales?from=&to=&zone=
GET    /reports/stock?from=&to=&zone=
```

Marcas (`/brands`) e fornecedores (`/suppliers`) não possuem `DELETE`: são desativados via `PATCH .../status`.

**Estoque.** Depois de criado, o estoque de um produto só muda por movimentações: `ENTRY` (soma), `EXIT` (subtrai) e `ADJUSTMENT` (o estoque passa a ser a quantidade contada; a diferença fica registrada), cada uma com um motivo e observação opcional. O `stockQuantity` do `POST /products` vira a movimentação `INITIAL`; no `PUT /products/{id}` ele é ignorado. Uma saída que deixaria o estoque negativo é recusada (400 em `errors.quantity`), a menos que o produto permita estoque negativo. Cada movimentação trava a linha do produto, então movimentações simultâneas não vendem mais do que existe. Mover o estoque não muda a `version` do produto, e um formulário de edição aberto continua salvando.

**Vendas.** O `POST /sales` recebe só produtos, quantidades e descontos. O preço cobrado é sempre o atual do cadastro, nunca um valor vindo do navegador. A venda:
- recebe um número sequencial por loja (1, 2, 3…);
- copia SKU, nome, unidade e preço de cada item, para o histórico não mudar se o produto for editado ou excluído;
- tira o estoque com uma saída "Venda" por item, ligada à venda.

Regras:
- produtos inativos, estoque insuficiente (a menos que o produto permita negativo) e frações de produtos vendidos por unidade, caixa ou peça são recusados;
- em dinheiro, o valor recebido precisa cobrir o total, e a diferença vira troco;
- os produtos são travados em ordem de id, então vendas, cancelamentos e movimentações simultâneas não vendem além do estoque nem se travam entre si.

O cancelamento (Gerente e Admin) devolve o estoque como entrada "Devolução de cliente" e mantém a venda no histórico. `GET /products/page?search=` acha produtos por nome, por SKU ou pelo código de barras exato; é a busca do caixa.

**Resumo e relatório de vendas.** `GET /sales/summary` traz faturamento, número de vendas, ticket médio e canceladas de um período. Quem vende pode ver; é o que alimenta "Vendas de hoje" no painel e o topo da página Vendas. `GET /reports/sales` (Admin e Gerente) traz os mesmos totais e os descontos, uma série diária no fuso de quem consulta, os 10 mais vendidos e o faturamento por forma de pagamento. Vendas canceladas ficam fora dos valores. Os mais vendidos contam cada item com o próprio desconto, antes do desconto na venda inteira.

**Nome e logo da loja.** O topo do app mostra o nome e o logo da loja de quem está logado (`GET /store`, todos os perfis). Em "Minha loja", no menu do usuário, o Admin troca os dois (`PUT /store` com `name` e `logo`; `logo: null` volta ao ícone padrão). O navegador recorta o centro da imagem em quadrado, reduz para 256×256 e converte para WebP antes de enviar, então uma foto de vários MB vira poucos KB. A API aceita só PNG, JPEG ou WebP em data URL, até 256 KB, e guarda o logo na própria tabela da loja (o disco do Render não é permanente).

**Leitura do código de barras pelo celular.** Em Produtos, "Novo produto" pergunta como começar: cadastrar direto, ler com o celular ou (num celular ou tablet) ler com a câmera do próprio aparelho. No campo "Código de barras" do formulário também há um botão de câmera.
- Para ler com o celular, o computador cria uma sessão (`POST /scan-sessions`, quem cadastra produtos) e mostra um QR code com o link `/scan#<token>`. O celular abre a página sem entrar no sistema: o token no fragmento da URL é a credencial (o navegador não o manda para servidores na URL).
- A página do celular confere o link (`POST /scan/preview`, que devolve o nome da loja), abre a câmera traseira, lê o código (EAN-13, EAN-8, UPC-A, UPC-E, ITF-14 e Code 128 com GTIN) e o envia. Só aceita um código com o dígito verificador correto e lido duas vezes seguidas, o que descarta dígitos trocados (`POST /scan/submit`). Se a câmera for negada, dá para digitar o código.
- O computador consulta `GET /scan-sessions/{id}` a cada 1,5 s. Quando o código chega, abre `/products/new?barcode=…` já preenchido; se o código já for de um produto, oferece abrir esse produto.
- Cada token vale **uma leitura e 10 minutos**, só a sessão de quem a criou pode ser consultada, e o banco guarda apenas o hash do token.
- A leitura usa o `BarcodeDetector` nativo onde existe (Chrome no Android) e, nos outros navegadores (Safari no iPhone, Firefox), um leitor ZXing em WebAssembly servido pelo próprio app e carregado só quando a câmera abre. A câmera exige HTTPS (ou `localhost`).

**Relatórios.** `GET /reports/stock` resume um período de até um ano: valor que entrou e que saiu (quantidade × preço de venda atual, já que ainda não há preço de custo), uma série diária agrupada no fuso `zone` (IANA) de quem consulta, os produtos que mais saíram, perdas e avarias, movimentações por motivo e o valor do estoque de hoje por categoria. `from` (inclusivo) e `to` (exclusivo) são instantes, e o navegador os calcula a partir dos dias locais. No app, cada lista (produtos, marcas, fornecedores, usuários e movimentações) e cada seção dos relatórios exporta CSV com os filtros atuais e todas as páginas, até 10 mil linhas. Em pt-BR o arquivo usa `;` e vírgula decimal, que é o que o Excel espera.

(Lista ilustrativa — detalhar por módulo conforme o desenvolvimento avança.)

---

## 6. Perfis de Usuário e Permissões

Os perfis são `ADMIN` (Admin), `MANAGER` (Gerente), `STOCK` (Estoque) e `CASHIER` (Caixa).

| Recurso | Admin | Gerente (`MANAGER`) | Estoque (`STOCK`) | Caixa (`CASHIER`) |
|---|---|---|---|---|
| Produtos: ler | ✔ | ✔ | ✔ | ✔ |
| Vendas: vender e consultar | ✔ | ✔ | — | ✔ |
| Vendas: cancelar | ✔ | ✔ | — | — |
| Produtos: criar, editar, excluir | ✔ | ✔ | ✔ | — |
| Marcas: ler (inclui `GET /brands`) | ✔ | ✔ | ✔ | ✔ |
| Marcas: criar, editar, status | ✔ | ✔ | ✔ | — |
| Estoque: movimentar e ver o histórico | ✔ | ✔ | ✔ | — |
| Fornecedores: ler | ✔ | ✔ | ✔ | — |
| Fornecedores: criar, editar, status | ✔ | ✔ | — | — |
| Relatórios | ✔ | ✔ | — | — |
| Usuários: tudo | ✔ | — | — | — |
| `/auth/me` e troca da própria senha | ✔ | ✔ | ✔ | ✔ |

Controle de acesso a nível de rota (front) e endpoint (backend, via `@PreAuthorize`), com o perfil validado no token JWT.

---

## 7. Roadmap Sugerido

### Fase 1 — Fundação

- Autenticação/usuários e permissões (entregue)
- Cadastro de produtos, fornecedores (entregue) e clientes
- Estrutura base do front (layout, navegação, tema shadcn/ui + Tailwind)

### Fase 2 — Operação

- Estoque (entradas/saídas/inventário)
- Vendas / PDV

### Fase 3 — Gestão

- Financeiro (contas a pagar/receber, caixa)
- Relatórios e dashboard

### Fase 4 — Evolução

- Multi-loja/filial
- Integrações externas (fiscal, pagamentos)
- Melhorias de performance e observabilidade (logs, métricas)

---

## 8. Convenções do Projeto

- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:` etc.)
- **Branches**: `main` (estável), `develop` (integração), `feature/*`, `fix/*`
- **Tipagem**: proibido uso de `any` no front sem justificativa explícita
- **PRs**: descrição clara do que muda e por quê, vinculando à issue/tarefa correspondente
- **Idioma**: rotas, código e idioma principal da interface em inglês; pt-BR suportado

---

## 9. Estrutura de Repositório (sugestão)

```
erp-lojas/
├── api/            # Backend Spring Boot (Java 25)
│   ├── src/main/java/...
│   └── pom.xml
├── app/            # Frontend React + TypeScript
│   ├── src/
│   └── package.json
└── README.md       # este arquivo
```

---

## 10. Próximos Passos

- [ ] Definir banco de dados (PostgreSQL vs MySQL)
- [ ] Detalhar modelo de dados (entidades e relacionamentos) por módulo
- [ ] Especificar contratos de API por módulo (OpenAPI/Swagger)
- [ ] Definir estratégia de deploy (ambiente, CI/CD)
- [ ] Detalhar regras de negócio de estoque (ex.: custo médio, FIFO?) e financeiro
