# Fundação do Front + CRUD de Produtos — Design

- **Data:** 2026-10-22
- **Status:** aprovado em conversa, aguardando revisão da spec escrita
- **Fase do roadmap:** Fase 1 — Fundação (estrutura base do front + cadastro de produtos)

## 1. Objetivo

Substituir o template do Vite em `app/` pela fundação real do front e validá-la com uma primeira feature completa: o CRUD de Produtos consumindo a API Spring que já existe.

**Critério de sucesso:** com a API rodando localmente, `pnpm dev` abre um app com sidebar em que é possível listar (paginado, filtrado e ordenado no servidor), criar, editar e excluir produtos. A interface funciona em inglês e pt-BR, com moeda selecionável, e os testes de front e API passam.

**Fora deste trabalho:** login/JWT, CRUD de marcas, demais módulos (estoque, vendas etc.), CI/CD, conversão de câmbio e tradução das mensagens de erro do backend.

## 2. Decisões

| Tema | Decisão |
|---|---|
| UI | **shadcn/ui** com preset **`bciy4oxG`** (style Nova, base zinc, tema lime, fonte Inter, ícones Remix Icon, raio medium, menu default-translucent, destaque sutil), sobre **Radix** |
| Estilo | Tailwind CSS v4 via `@tailwindcss/vite` (configurado pelo `shadcn init`) |
| Roteamento | React Router (`react-router`), data router com `createBrowserRouter` |
| Estado assíncrono | TanStack Query |
| Tabelas | TanStack Table + componente `table` do shadcn (padrão *data-table*) |
| Formulários | React Hook Form + Zod (`@hookform/resolvers`) |
| i18n | `react-i18next`; **inglês é o idioma principal** e fallback; pt-BR suportado |
| Moeda | Selecionável pelo usuário (só exibição, sem conversão); padrão USD |
| Rotas e código | Em inglês |
| Organização | Por feature (`src/features/*`) + `src/shared` |
| Client HTTP | Wrapper próprio sobre `fetch`; tipos TS escritos à mão espelhando os records Java |
| Testes | Vitest + Testing Library + jsdom + MSW (front); `@WebMvcTest` (API) |

**Alternativas descartadas:** Axios (dependência sem ganho hoje; interceptors são triviais com `fetch`); tipos gerados de OpenAPI com springdoc + orval (vale quando houver mais módulos; a migração é possível sem mexer nas telas, que só conhecem os hooks); MUI (trocado por shadcn, por ser mais moderno e customizável).

## 3. Mudanças na API

### 3.1 `config/SecurityConfig` (provisória)

- `permitAll` em `/products/**`, `/brands/**` e `/actuator/health`; o resto exige autenticação.
- CSRF desabilitado (API stateless) e sessão `STATELESS`.
- CORS liberado para as origens em `app.cors.allowed-origins` (`APP_CORS_ALLOWED_ORIGINS`, separadas por vírgula; padrão `http://localhost:5173`), métodos `GET, POST, PUT, DELETE, OPTIONS`, header `Content-Type`.
- Comentário no topo da classe: provisória, será substituída pela configuração JWT.

### 3.2 `GlobalExceptionHandler`

Respostas sempre em `ProblemDetail`. Novos handlers (o Spring escolhe o handler mais específico, então o genérico de `Exception` deixa de capturá-los):

| Exceção | Status | Corpo |
|---|---|---|
| `MethodArgumentNotValidException` | 400 | `detail: "Validation failed"`, propriedade `errors: { campo: mensagem }` |
| `HandlerMethodValidationException` | 400 | idem, com os erros de parâmetro |
| `OptimisticLockingFailureException` (inclui `ObjectOptimisticLockingFailureException`) | 409 | `detail: "The resource was modified by another user"` |
| `HttpMessageNotReadableException` | 400 | `detail: "Malformed request body"` (ex.: enum inválido) |

Os handlers existentes (404, `IllegalArgumentException` → 400, genérico → 500) continuam.

### 3.3 Controle de versão no update de produto

- `ProductRequest` ganha `Long version` (opcional).
- Em `ProductService.update`, se `request.version() != null` e for diferente de `entity.getVersion()`, lança `ObjectOptimisticLockingFailureException(TbProduct.class, id)` → 409.
- O front sempre envia a `version` que carregou.

### 3.4 `GET /brands`

- `dto/brand/BrandResponse(Long id, String name)`.
- `BrandService.findActive()` → marcas com `active = true`, ordenadas por nome (`BrandRepository.findByActiveTrueOrderByNameAsc()`).
- `BrandController` em `/brands`, somente leitura.

### 3.5 Testes da API

- `@WebMvcTest(ProductController)`: POST inválido → 400 com `errors.sku`; PUT com versão divergente → 409.
- `@WebMvcTest(BrandController)`: `GET /brands` devolve a lista do serviço.
- Teste unitário de `ProductService.update` com versão divergente.

## 4. Estrutura do front

### 4.1 Setup

- `pnpm dlx shadcn@latest init --preset bciy4oxG --base radix` em `app/` (instala Tailwind v4, alias `@/` no Vite e no tsconfig, variáveis de tema no `index.css` e `components.json`).
- Componentes shadcn: `sidebar`, `button`, `input`, `textarea`, `select`, `switch`, `field`, `label`, `table`, `badge`, `card`, `skeleton`, `alert`, `alert-dialog`, `dropdown-menu`, `popover`, `command`, `sonner`, `separator`, `tooltip`, `sheet`.
- Dependências: `react-router`, `@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers`, `i18next`, `react-i18next`, `i18next-browser-languagedetector`, `@remixicon/react`.
- Dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw`.
- Removidos: `App.tsx`, `App.css` e `src/assets/` do template.
- `.env.example` com `VITE_API_URL=http://localhost:8080`.

### 4.2 Pastas

```
app/src/
├── main.tsx                    # <AppProviders><RouterProvider/></AppProviders>
├── index.css                   # Tailwind + variáveis do preset
├── app/
│   ├── providers.tsx           # ThemeProvider, I18n, CurrencyProvider, QueryClientProvider, Toaster
│   ├── router.tsx              # rotas
│   ├── i18n.ts                 # init i18next + tipagem (CustomTypeOptions)
│   ├── theme-provider.tsx      # light | dark | system, classe .dark no <html>, salvo no localStorage
│   ├── currency-provider.tsx   # CurrencyProvider + useCurrency()
│   ├── currencies.ts           # lista de moedas suportadas
│   └── query-client.ts         # QueryClient com defaults
├── components/ui/              # gerados pelo shadcn CLI (não editar à mão)
├── shared/
│   ├── api/http.ts             # client fetch + ApiError
│   ├── layout/AppLayout.tsx    # SidebarProvider + AppSidebar + header + <Outlet/>
│   ├── layout/AppSidebar.tsx
│   ├── layout/nav-items.ts     # { to, labelKey, icon }
│   ├── layout/HeaderControls.tsx  # idioma, moeda, tema
│   └── components/             # PageHeader, NotFoundPage, RouteErrorPage, DataTablePagination
├── features/
│   ├── dashboard/DashboardPage.tsx
│   ├── brands/{types,api,queries}.ts
│   └── products/
│       ├── types.ts
│       ├── api.ts
│       ├── queries.ts
│       ├── schema.ts
│       ├── pages/{ProductListPage,ProductFormPage}.tsx
│       └── components/{ProductFilters,ProductTable,ProductColumns,ProductForm,DeleteProductDialog,BrandCombobox}.tsx
├── locales/
│   ├── en/{common,products}.json
│   └── pt-BR/{common,products}.json
└── test/
    ├── setup.ts                # jest-dom, polyfills Radix, MSW server
    ├── server.ts               # MSW handlers base
    └── render.tsx              # render com todos os providers + rota
```

### 4.3 Rotas

| Rota | Tela |
|---|---|
| `/` | Home (placeholder com saudação e atalho para Products) |
| `/products` | Listagem |
| `/products/new` | Cadastro |
| `/products/:id/edit` | Edição |
| `*` | 404 |

A rota raiz usa `AppLayout` como `element` e `RouteErrorPage` como `errorElement`.

### 4.4 Layout

- `sidebar` do shadcn com `collapsible="icon"` no desktop e Sheet no mobile; botão `SidebarTrigger` no header.
- O menu vem de `nav-items.ts` e mostra só o que existe (Home e Products). O item ativo é marcado pela rota atual.
- O header mostra o título da página e os `HeaderControls`: idioma (`dropdown-menu`: English, Português (Brasil)), moeda (`dropdown-menu` com os nomes vindos de `Intl.DisplayNames`) e tema (light / dark / system).

### 4.5 Camada de dados

- **`http.ts`:** `request<T>(path, { method, query, body, signal })` monta a URL a partir de `import.meta.env.VITE_API_URL` (padrão `http://localhost:8080`), ignora `query` nulo ou vazio, serializa JSON e devolve `undefined` em 204. Em resposta não-ok, lê o `ProblemDetail` e lança `ApiError { status, title, detail, errors?: Record<string,string> }`. Em falha de rede lança `ApiError` com `status: 0`.
- **Query keys:** `productKeys.all = ['products']`, `productKeys.list(params)`, `productKeys.detail(id)`; `brandKeys.all = ['brands']`.
- **Hooks:** `useProductsPage(params)` (com `placeholderData: keepPreviousData`), `useProduct(id)`, `useCreateProduct()`, `useUpdateProduct(id)`, `useDeleteProduct()` (todas as mutations invalidam `productKeys.all`) e `useBrands()` (`staleTime` de 5 min).
- **QueryClient:** `staleTime: 30_000`; `retry` de no máximo 1 vez, e nunca quando `ApiError.status` for 4xx; `refetchOnWindowFocus: false`.

## 5. i18n

- `i18next` + `react-i18next` + `LanguageDetector` (ordem: `localStorage` → `navigator`). `supportedLngs: ['en', 'pt-BR']`, `fallbackLng: 'en'`, `load: 'currentOnly'`, `nonExplicitSupportedLngs: true` (então `pt` vira `pt-BR`).
- Namespaces `common` (layout, ações, erros genéricos, 404) e `products`. Cada nova feature traz o próprio JSON.
- Recursos importados de forma estática (sem backend HTTP de traduções).
- Chaves tipadas via `CustomTypeOptions` usando `en` como referência.
- O `<html lang>` acompanha o idioma atual.
- Mensagens do Zod são chaves de tradução (ex.: `products:validation.skuRequired`) e o formulário traduz ao exibir. Mensagens vindas da API são exibidas como chegam (em inglês).
- Datas e números são formatados com `Intl` no idioma atual.
- **Teste de paridade:** falha se uma chave de `en` não existir em `pt-BR` (e vice-versa).

## 6. Moeda

- **Só exibição:** trocar a moeda não converte valores. O preço é um número sem moeda na API.
- `currencies.ts`: `['USD', 'EUR', 'BRL', 'JPY', 'GBP', 'CNY', 'CAD', 'AUD', 'CHF', 'MXN']`.
- `CurrencyProvider` com o valor salvo no `localStorage` (padrão `USD`; um valor inválido salvo cai no padrão). `useCurrency()` expõe `currency`, `setCurrency`, `fractionDigits` e `formatMoney(value)`.
- `formatMoney` usa `Intl.NumberFormat(language, { style: 'currency', currency })`.
- `fractionDigits` vem de `resolvedOptions().maximumFractionDigits` e vale 0 para JPY. O campo de preço e o schema Zod aceitam no máximo `min(fractionDigits, 2)` casas, porque a API guarda 2.
- Futuro: quando existir o módulo de Configurações, a moeda vira dado da loja no backend. A interface `useCurrency()` se mantém.

## 7. Telas de Produtos

### 7.1 Listagem (`/products`)

- `PageHeader` com título e botão **New product** (link para `/products/new`).
- **Filtros** (`ProductFilters`): nome e SKU (debounce de 300 ms), categoria (texto, igualdade exata na API), marca (`BrandCombobox`) e status (All / Active / Inactive). Botão "Clear filters" quando houver algum filtro ativo.
- **Estado na URL:** `page`, `size`, `sortBy`, `direction`, `name`, `sku`, `category`, `brandId` e `active` ficam nos search params. Mudar um filtro volta para `page=0`. Valores inválidos na URL caem nos padrões (`page 0`, `size 20`, `sortBy name`, `direction ASC`).
- **Tabela** (`ProductTable`, TanStack Table com `manualPagination` e `manualSorting`):

  | Coluna | Conteúdo | Ordenável |
  |---|---|---|
  | SKU | `sku` | sim |
  | Name | `name` | sim |
  | Category | `category` | sim |
  | Brand | `brandName` ou "—" | não |
  | Price | `formatMoney(price)` | sim |
  | Stock | quantidade + unidade traduzida; `badge` "Low stock" se `stockQuantity ≤ minimumStock` | não |
  | Status | `badge` Active / Inactive | sim (`active`) |
  | Actions | `dropdown-menu`: Edit, Delete | não |

- Clicar na linha abre a edição. A paginação (`DataTablePagination`) tem tamanhos 10, 20, 50 e 100, contagem total e navegação primeira/anterior/próxima/última.
- **Estados:** skeleton de linhas no primeiro carregamento; tabela com opacidade reduzida durante refetch; vazio ("No products found", com link para limpar os filtros se houver algum); erro com `alert` e botão **Try again**.

### 7.2 Formulário (`/products/new` e `/products/:id/edit`)

Um único `ProductForm` recebe `defaultValues` e `onSubmit`. Os campos ficam em três `card`s:

1. **Identification:** SKU*, Barcode, Name*, Description (textarea).
2. **Classification:** Category*, Subcategory, Brand (`BrandCombobox` com opção "No brand").
3. **Pricing & stock:** Price*, Unit of measure* (`select` com rótulos traduzidos), Stock quantity*, Minimum stock*, Reorder point*, Allow negative stock (`switch`), Active (`switch`).

- **Schema Zod** (espelha o backend): `sku` obrigatório, ≤ 64; `barcode` vazio → `null`, senão `^(\d{8}|\d{12,14})$`; `name` obrigatório, ≤ 150; `description` ≤ 1000; `category` obrigatório, ≤ 100; `subcategory` ≤ 100; `price` ≥ 0 com casas limitadas pela moeda; quantidades ≥ 0 com até 3 casas; `unitOfMeasure` no enum. Campos de texto opcionais vazios são enviados como `null`. Os campos numéricos ficam como string no formulário e são convertidos no submit.
- **Padrões no cadastro:** `active: true`, `allowNegativeStock: false`, `unitOfMeasure: 'UNIT'`, quantidades `0`.
- **Edição:** skeleton enquanto carrega; 404 mostra "Product not found" com link para `/products`. O formulário envia a `version` carregada.
- **Submit:** botão com estado de carregamento. Em caso de sucesso, `toast.success` e navegação para `/products`.
- **Sair sem salvar:** `useBlocker` quando `formState.isDirty` e o formulário não foi enviado, com `alert-dialog` de confirmação.

### 7.3 Exclusão

- `DeleteProductDialog` (`alert-dialog`) mostra o nome do produto e avisa que a exclusão é permanente, sugerindo desativar o produto como alternativa.
- Em caso de sucesso, `toast.success`. Se era o único item da página e `page > 0`, a listagem volta uma página.

## 8. Tratamento de erros na interface

| Caso | Comportamento |
|---|---|
| 400 com `errors` | `setError` em cada campo correspondente; campos desconhecidos vão para o alerta geral |
| 400 sem `errors` (ex.: SKU/barcode duplicado) | `alert` destrutivo no topo do formulário com `detail` |
| 404 (edição) | estado "Product not found" |
| 404 (exclusão) | `toast.error` e recarga da lista |
| 409 | `alert`: "This product was changed by someone else", com botão **Reload** (refaz o fetch e reseta o formulário) |
| Rede (`status 0`) / 5xx | `toast.error` com mensagem traduzida; na listagem, estado de erro com **Try again** |
| Erro de renderização | `RouteErrorPage` (mensagem amigável + link para Home) |

## 9. Testes do front

- **Infra:** `vitest` com `environment: 'jsdom'` e `setupFiles: src/test/setup.ts`. O setup registra jest-dom, os polyfills que o Radix exige no jsdom (`ResizeObserver`, `Element.prototype.hasPointerCapture`, `releasePointerCapture` e `scrollIntoView`), o MSW (`onUnhandledRequest: 'error'`) e fixa o idioma em `en` e a moeda em `USD`.
- **Scripts:** `test` (`vitest run`) e `test:watch` (`vitest`).
- **Unitários:**
  - `http.ts`: monta a query sem valores vazios; converte `ProblemDetail` em `ApiError` com `errors`; trata 204 e falha de rede.
  - `schema.ts`: casos válidos e inválidos; barcode; JPY rejeita decimais.
  - `currency-provider`: `formatMoney` em USD e JPY; valor inválido no `localStorage` cai em USD.
  - Paridade de chaves `en` × `pt-BR`.
- **Componentes (MSW):**
  - `ProductListPage`: renderiza as linhas da API; digitar no filtro de nome atualiza a URL e refaz a busca; mostra o estado vazio.
  - `ProductFormPage` (novo): 400 com `errors.sku` marca o campo; sucesso faz POST com o corpo esperado e navega para `/products`.
  - `ProductFormPage` (edição): 409 mostra o alerta de conflito.

## 10. Documentação

- `README.md`:
  - Seção 1.2: remover "Multi-idioma" de fora de escopo.
  - Seção 4.1: trocar MUI / MUI X / Formik pela stack desta spec.
  - Seção 8: adicionar "rotas, código e idioma principal em inglês; pt-BR suportado".
  - Seção 9: `front/` → `app/`.
- `app/README.md`: substituir o texto do template por como rodar (`pnpm install`, `.env`, `pnpm dev`, `pnpm test`) e por como adicionar componentes shadcn (`pnpm dlx shadcn@latest add <component>`).

## 11. Riscos e observações

- **Segurança provisória:** os endpoints de produtos e marcas ficam públicos até o JWT. Não é aceitável em produção: o deploy no Render fica exposto até a fase de autenticação.
- **Exclusão definitiva:** a API apaga o registro. Quando houver vendas e movimentações referenciando produtos, isso precisa virar soft delete ou ser bloqueado.
- **Filtro de categoria** é por igualdade exata (comportamento atual da API); não muda neste trabalho.
