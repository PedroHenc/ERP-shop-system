# Fundação do Front + CRUD de Produtos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajustar a API (segurança provisória, erros padronizados, controle de versão, `GET /brands`) e substituir o template do Vite em `app/` por um front shadcn com i18n, moeda e CRUD completo de Produtos.

**Architecture:** A API segue o padrão `controller → service → repository` com `ProblemDetail`. O front é organizado por feature (`src/features/*`), com camada compartilhada em `src/shared`, providers em `src/app` e componentes shadcn gerados em `src/components/ui`. Os dados fluem página → hook TanStack Query → função de `api.ts` → `shared/api/http.ts`.

**Tech Stack:** Spring Boot 4.1 / Java 25 / JUnit 5 / MockMvc · React 19 / TypeScript / Vite 8 / shadcn (Radix, Tailwind v4) / React Router / TanStack Query + Table / React Hook Form + Zod / react-i18next / Vitest + Testing Library + MSW.

**Spec:** [docs/superpowers/specs/2026-10-22-frontend-foundation-design.md](../specs/2026-10-22-frontend-foundation-design.md). Leia junto com este plano: as tabelas de colunas, erros e campos estão lá.

## Pré-requisitos de ambiente (fazer antes da Task 1)

- **JDK 25.** A máquina só tem JDK 27, e o Lombok 1.18.46 (gerenciado pelo Boot 4.1) falha nele com `ExceptionInInitializerError: com.sun.tools.javac.tree.EndPosTable` (verificado com `mvnw test-compile` em 2026-10-22). Instale um JDK 25 (ex.: `winget install EclipseAdoptium.Temurin.25.JDK`) e use `JAVA_HOME` apontando para ele nos comandos `mvnw`. Verificação: `.\mvnw.cmd -q -B test-compile` em `api/` termina sem erro.
- **pnpm.** Não está no PATH; use `corepack pnpm` (Node 24 em `C:\Program Files\nodejs`). Nos comandos abaixo, `pnpm` significa `corepack pnpm`.
- **`ErpApplicationTests.contextLoads`** precisa de um PostgreSQL real e falha sem `DB_URL`. Os comandos deste plano rodam classes de teste específicas; não é regressão se `contextLoads` falhar sem banco.

## Global Constraints

- Java 25; Spring Boot 4.1.0 (pom atual). Em Boot 4, `@WebMvcTest` vem do starter de teste `spring-boot-starter-webmvc-test` e mocks usam `@MockitoBean`.
- Respostas de erro da API sempre como `ProblemDetail`.
- Preset shadcn: `bciy4oxG`, base `radix`. Componentes em `app/src/components/ui/` não são editados à mão.
- Rotas, código e chaves de i18n em inglês. Idioma padrão e fallback: `en`; suportados: `en`, `pt-BR`.
- Moeda só de exibição, sem conversão. Lista: `USD, EUR, BRL, JPY, GBP, CNY, CAD, AUD, CHF, MXN`; padrão `USD`.
- `VITE_API_URL`, padrão `http://localhost:8080`. `APP_CORS_ALLOWED_ORIGINS`, padrão `http://localhost:5173`.
- Chaves de `localStorage`: `erp.language`, `erp.currency`, `erp.theme`.
- TypeScript sem `any`.
- Commits: Conventional Commits, terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **URL com parâmetros inválidos** (`page=-1`, `size=999`, `sortBy=foo`, `direction=up`, `active=maybe`, `brandId=abc`): a listagem cai nos padrões e nunca envia valor inválido à API. Teste: Task 10, `parseListParams`.
2. **Preço digitado com vírgula em pt-BR** (`"10,50"`): aceito como `10.5`; separador de milhar não é aceito. Teste: Task 8, schema.
3. **Campos opcionais vazios ou só com espaços** (barcode, description, subcategory): enviados como `null`, nunca `""`, já que a API valida o barcode por regex. Teste: Task 8, `toProductRequest`.
4. **Idioma ou moeda inválidos no `localStorage`** (`erp.language=fr`, `erp.currency=XYZ`): caem em `en` e `USD`. Testes: Task 6 e Task 7.
5. **Excluir o último item da última página** e **duplo clique em Save**: a listagem volta uma página; o botão fica desabilitado enquanto a mutation está pendente. Testes: Task 10 e Task 11.

---

## API

### Task 1: Infra de teste da API + SecurityConfig provisória

**Files:**
- Modify: `api/pom.xml` (dependências de teste)
- Modify: `api/src/main/java/com/pedrohenc/erp/ErpApplication.java` (remover `@EnableJpaAuditing`)
- Create: `api/src/main/java/com/pedrohenc/erp/config/JpaAuditingConfig.java`
- Create: `api/src/main/java/com/pedrohenc/erp/config/SecurityConfig.java`
- Modify: `api/src/main/resources/application.properties`
- Test: `api/src/test/java/com/pedrohenc/erp/controller/ProductControllerTest.java`

**Interfaces:**
- Produces: `SecurityConfig` (importável em `@WebMvcTest` via `@Import(SecurityConfig.class)`); propriedade `app.cors.allowed-origins`; classe de teste `ProductControllerTest` com `@WebMvcTest(ProductController.class)`, `@Import(SecurityConfig.class)` e `@MockitoBean ProductService productService`, que as Tasks 2 e 3 estendem.

- [ ] **Step 1:** Adicionar ao `pom.xml`, com `scope test`, `spring-boot-starter-webmvc-test` e `spring-boot-starter-security-test`. Mover `@EnableJpaAuditing` para `config/JpaAuditingConfig` (`@Configuration`). Sem isso o `@WebMvcTest` falha com "JPA metamodel must not be empty".
- [ ] **Step 2: Escrever os testes que falham**

```java
@Test void pageEndpointIsPublic() // GET /products/page sem credenciais -> 200 (service mockado devolve ProductPageResponse vazio)
@Test void corsPreflightAllowsConfiguredOrigin()
// OPTIONS /products, Origin: http://localhost:5173, Access-Control-Request-Method: POST
// -> 200 e header Access-Control-Allow-Origin == "http://localhost:5173"
@Test void corsPreflightRejectsUnknownOrigin() // mesmo request com Origin: https://evil.example -> 403
```

- [ ] **Step 3:** Rodar `.\mvnw.cmd -B test -Dtest=ProductControllerTest`. Esperado: FAIL (401 no primeiro, sem header CORS nos outros).
- [ ] **Step 4:** Implementar `SecurityConfig` (`@Configuration`, `@EnableWebSecurity`) com `SecurityFilterChain securityFilterChain(HttpSecurity http)` e `CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") List<String> origins)`. Valores: `permitAll` em `/products/**`, `/brands/**`, `/actuator/health`; `anyRequest().authenticated()`; CSRF off; sessão `STATELESS`; métodos `GET, POST, PUT, DELETE, OPTIONS`; header `Content-Type`. Comentário no topo: provisória até o JWT. Em `application.properties`: `app.cors.allowed-origins=${APP_CORS_ALLOWED_ORIGINS:http://localhost:5173}`.
- [ ] **Step 5:** Rodar o mesmo comando. Esperado: PASS (3 testes).
- [ ] **Step 6:** Commit: `feat(api): add provisional security config with CORS`.

### Task 2: Erros de validação padronizados

**Files:**
- Modify: `api/src/main/java/com/pedrohenc/erp/exception/GlobalExceptionHandler.java`
- Modify: `api/src/main/java/com/pedrohenc/erp/controller/ProductController.java` (remover `@Validated` da classe)
- Test: `api/src/test/java/com/pedrohenc/erp/controller/ProductControllerTest.java`

**Interfaces:**
- Produces: corpo de 400 `{ "status": 400, "detail": "Validation failed", "errors": { "<campo>": "<mensagem>" } }`. Com mais de um erro no mesmo campo, vale o primeiro. O front (Task 5) depende desse formato.

- [ ] **Step 1: Escrever os testes que falham**

```java
@Test void invalidBodyReturns400WithFieldErrors()
// POST /products com sku "" e price -1 (resto válido)
// -> 400, $.detail == "Validation failed", $.errors.sku existe, $.errors.price existe
@Test void invalidPageParamsReturn400WithFieldErrors() // GET /products/page?size=500 -> 400, $.errors.size existe
@Test void malformedBodyReturns400() // POST /products com "unitOfMeasure":"BANANA" -> 400, $.detail == "Malformed request body"
```

- [ ] **Step 2:** Rodar `.\mvnw.cmd -B test -Dtest=ProductControllerTest`. Esperado: FAIL (500).
- [ ] **Step 3:** No `GlobalExceptionHandler`, adicionar handlers para `MethodArgumentNotValidException` e `HandlerMethodValidationException` (400, `"Validation failed"`, propriedade `errors` como `Map<String,String>` preservando a ordem; em `HandlerMethodValidationException` a chave é o nome do parâmetro) e para `HttpMessageNotReadableException` (400, `"Malformed request body"`). Remover `@Validated` do `ProductController`: a validação nativa do Spring MVC já cobre `@Valid`, e o `@Validated` de classe trocaria a exceção por `ConstraintViolationException`.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS.
- [ ] **Step 5:** Commit: `fix(api): return field-level validation errors as 400`.

### Task 3: Controle de versão no update de produto

**Files:**
- Modify: `api/src/main/java/com/pedrohenc/erp/dto/product/ProductRequest.java`
- Modify: `api/src/main/java/com/pedrohenc/erp/service/ProductService.java`
- Modify: `api/src/main/java/com/pedrohenc/erp/exception/GlobalExceptionHandler.java`
- Test: `api/src/test/java/com/pedrohenc/erp/service/ProductServiceTest.java`, `ProductControllerTest.java`

**Interfaces:**
- Produces: `ProductRequest` ganha `Long version` como **último** componente (opcional). Um PUT com versão divergente devolve 409 com `detail` `"The resource was modified by another user"`.

- [ ] **Step 1: Escrever os testes que falham**

```java
// ProductServiceTest (Mockito, sem Spring)
@Test void updateWithStaleVersionThrowsConflict()
// entidade com version 2, request com version 1 -> ObjectOptimisticLockingFailureException; verify(repo, never()).save(any())
@Test void updateWithoutVersionSaves() // request com version null -> save chamado uma vez
// ProductControllerTest
@Test void staleUpdateReturns409()
// service lança ObjectOptimisticLockingFailureException(TbProduct.class, 1L)
// -> 409, $.detail == "The resource was modified by another user"
```

- [ ] **Step 2:** Rodar `.\mvnw.cmd -B test -Dtest="ProductServiceTest,ProductControllerTest"`. Esperado: FAIL (não compila sem `version`).
- [ ] **Step 3:** Adicionar `version` ao record. Em `ProductService.update`, depois de carregar a entidade e antes de validar: se `request.version() != null && !request.version().equals(entity.getVersion())`, lançar `new ObjectOptimisticLockingFailureException(TbProduct.class, id)`. No handler: `OptimisticLockingFailureException` → 409. Ajustar as chamadas existentes do construtor de `ProductRequest` nos testes.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat(api): reject product updates with stale version`.

### Task 4: `GET /brands`

**Files:**
- Create: `api/src/main/java/com/pedrohenc/erp/dto/brand/BrandResponse.java`
- Create: `api/src/main/java/com/pedrohenc/erp/service/BrandService.java`
- Create: `api/src/main/java/com/pedrohenc/erp/controller/BrandController.java`
- Modify: `api/src/main/java/com/pedrohenc/erp/repository/BrandRepository.java`
- Test: `api/src/test/java/com/pedrohenc/erp/controller/BrandControllerTest.java`

**Interfaces:**
- Produces: `GET /brands` → `[{ "id": number, "name": string }]`, só marcas ativas, ordenadas por nome. `BrandRepository.findByActiveTrueOrderByNameAsc(): List<TbBrand>`; `BrandService.findActive(): List<BrandResponse>`; `record BrandResponse(Long id, String name)`.

- [ ] **Step 1: Escrever o teste que falha:** `listsActiveBrands()`. Com o service mockado devolvendo `[BrandResponse(2,"Acme"), BrandResponse(1,"Zeta")]`, `GET /brands` sem credenciais → 200, `$[0].name == "Acme"`, `$.length() == 2`. Usar `@WebMvcTest(BrandController.class)` + `@Import(SecurityConfig.class)`.
- [ ] **Step 2:** Rodar `.\mvnw.cmd -B test -Dtest=BrandControllerTest`. Esperado: FAIL.
- [ ] **Step 3:** Implementar repository, service (`@Transactional(readOnly = true)`) e controller seguindo o padrão do `ProductController`.
- [ ] **Step 4:** Rodar `.\mvnw.cmd -B test -Dtest="*ControllerTest,*ServiceTest"`. Esperado: PASS em todas as classes.
- [ ] **Step 5:** Commit: `feat(api): add read-only brands endpoint`.

---

## Front (`app/`)

### Task 5: Scaffold shadcn + infra de testes + client HTTP

**Files:**
- Delete: `app/src/App.tsx`, `app/src/App.css`
- Modify: `app/package.json`, `app/vite.config.ts`, `app/tsconfig*.json`, `app/src/index.css`, `app/src/main.tsx` (via `shadcn init` e ajustes)
- Create: `app/components.json` (gerado), `app/src/components/ui/*` (gerados), `app/src/lib/utils.ts` (gerado)
- Create: `app/.env.example`, `app/vitest.config.ts` (ou bloco `test` no `vite.config.ts`)
- Create: `app/src/test/setup.ts`, `app/src/test/server.ts`
- Create: `app/src/shared/api/http.ts`
- Test: `app/src/shared/api/http.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; title?: string; detail?: string; errors?: Record<string, string> }` (`status: 0` = falha de rede)
  - `isApiError(error: unknown): error is ApiError`
  - `request<T>(path: string, options?: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; query?: Record<string, string | number | boolean | null | undefined>; body?: unknown; signal?: AbortSignal }): Promise<T>`
  - `test/server.ts`: `export const API = 'http://localhost:8080'` e `export const server = setupServer()` (MSW). O setup faz `listen({ onUnhandledRequest: 'error' })`, `resetHandlers` e `close`.

- [ ] **Step 1:** Em `app/`: `pnpm dlx shadcn@latest init --preset bciy4oxG --base radix`. Depois, `pnpm dlx shadcn@latest add sidebar button input textarea select switch field label table badge card skeleton alert alert-dialog dropdown-menu popover command sonner separator tooltip sheet`. Instalar as dependências e devDependencies listadas na spec §4.1. Apagar `App.tsx` e `App.css`; `main.tsx` passa a renderizar um placeholder até a Task 7. Criar `.env.example` com `VITE_API_URL=http://localhost:8080`. Configurar Vitest (`environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, alias `@`) e os scripts `"test": "vitest run"` e `"test:watch": "vitest"`. O `setup.ts` registra jest-dom, os polyfills do Radix (`ResizeObserver`, `Element.prototype.hasPointerCapture`, `releasePointerCapture`, `scrollIntoView`) e o ciclo de vida do MSW.
- [ ] **Step 2: Escrever os testes que falham** em `http.test.ts`

```ts
it('omits null, undefined and empty-string query values')
// request('/products/page', { query: { page: 0, name: '', sku: null, active: false } })
// -> URL requisitada == `${API}/products/page?page=0&active=false`
it('sends JSON body and returns parsed JSON')
it('returns undefined on 204')
it('throws ApiError with field errors from ProblemDetail')
// 400 { detail: 'Validation failed', errors: { sku: 'must not be blank' } }
// -> ApiError status 400, errors.sku == 'must not be blank'
it('throws ApiError with status 0 on network failure') // handler HttpResponse.error()
```

- [ ] **Step 3:** Rodar `pnpm vitest run src/shared/api/http.test.ts`. Esperado: FAIL (módulo não existe).
- [ ] **Step 4:** Implementar `http.ts`. A base vem de `import.meta.env.VITE_API_URL ?? 'http://localhost:8080'`, e o header `Content-Type: application/json` só vai quando há body.
- [ ] **Step 5:** Rodar o mesmo comando (PASS) e depois `pnpm build`. Esperado: build sem erros.
- [ ] **Step 6:** Commit: `feat(app): scaffold shadcn app with test setup and http client`.

### Task 6: i18n

**Files:**
- Create: `app/src/app/i18n.ts`, `app/src/app/i18next.d.ts`
- Create: `app/src/locales/en/common.json`, `app/src/locales/en/products.json`, `app/src/locales/pt-BR/common.json`, `app/src/locales/pt-BR/products.json`
- Test: `app/src/app/i18n.test.ts`

**Interfaces:**
- Produces: `export const SUPPORTED_LANGUAGES = ['en', 'pt-BR'] as const`; `export type Language = (typeof SUPPORTED_LANGUAGES)[number]`; `export const LANGUAGE_STORAGE_KEY = 'erp.language'`; `export default i18n` (já inicializado, `initAsync: false` para os testes serem síncronos). Namespaces `common` e `products`; as tasks seguintes adicionam chaves nos dois idiomas.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it('every key in en exists in pt-BR and vice versa') // percorre os JSON recursivamente, por namespace
it('falls back to en for an unsupported stored language') // localStorage 'erp.language' = 'fr', re-init -> i18n.resolvedLanguage === 'en'
it('maps pt to pt-BR')
it('updates <html lang> on language change') // changeLanguage('pt-BR') -> document.documentElement.lang === 'pt-BR'
```

- [ ] **Step 2:** Rodar `pnpm vitest run src/app/i18n.test.ts`. Esperado: FAIL.
- [ ] **Step 3:** Implementar conforme a spec §5: detector com `order: ['localStorage', 'navigator']`, `lookupLocalStorage: LANGUAGE_STORAGE_KEY`, `caches: ['localStorage']`; `supportedLngs`, `fallbackLng: 'en'`, `nonExplicitSupportedLngs: true`, `load: 'currentOnly'`; recursos importados estaticamente; listener `languageChanged` que atualiza `document.documentElement.lang`. O `i18next.d.ts` declara `CustomTypeOptions` com `defaultNS: 'common'` e `resources` tipados a partir dos JSON de `en`. O `setup.ts` passa a fazer `await i18n.changeLanguage('en')` e `localStorage.clear()` antes de cada teste.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat(app): add i18n with English default and pt-BR`.

### Task 7: Moeda e tema

**Files:**
- Create: `app/src/app/currencies.ts`, `app/src/app/currency-provider.tsx`, `app/src/app/theme-provider.tsx`
- Test: `app/src/app/currency-provider.test.tsx`, `app/src/app/theme-provider.test.tsx`

**Interfaces:**
- Produces:
  - `SUPPORTED_CURRENCIES` (a lista de Global Constraints, `as const`), `type CurrencyCode`, `DEFAULT_CURRENCY = 'USD'`, `CURRENCY_STORAGE_KEY = 'erp.currency'`
  - `<CurrencyProvider>`; `useCurrency(): { currency: CurrencyCode; setCurrency(code: CurrencyCode): void; formatMoney(value: number | string): string }`. `formatMoney` usa o `minimumFractionDigits` padrão da moeda e `maximumFractionDigits: 2` (a precisão da API), no idioma atual do i18n. A moeda não afeta validação.
  - `type Theme = 'light' | 'dark' | 'system'`, `THEME_STORAGE_KEY = 'erp.theme'`, `<ThemeProvider>`, `useTheme(): { theme: Theme; setTheme(theme: Theme): void }`. Aplica a classe `dark` em `<html>`; em `system` segue `matchMedia('(prefers-color-scheme: dark)')`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it('formats USD by default') // formatMoney(1234.5) === '$1,234.50' (en)
it('formats JPY without hiding stored cents') // setCurrency('JPY') -> formatMoney(10) === '¥10' e formatMoney(9.99) === '¥9.99'
it('falls back to USD when stored currency is invalid') // localStorage 'erp.currency' = 'XYZ'
it('persists the selected currency') // setCurrency('EUR') -> localStorage === 'EUR'
it('applies dark class for dark theme and removes it for light')
```

- [ ] **Step 2:** Rodar `pnpm vitest run src/app/currency-provider.test.tsx src/app/theme-provider.test.tsx`. Esperado: FAIL.
- [ ] **Step 3:** Implementar os dois providers.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat(app): add currency and theme providers`.

### Task 8: Camada de dados e schema de Produtos e Marcas

**Files:**
- Create: `app/src/features/products/types.ts`, `api.ts`, `queries.ts`, `schema.ts`
- Create: `app/src/features/brands/types.ts`, `api.ts`, `queries.ts`
- Create: `app/src/app/query-client.ts`
- Create: `app/src/test/fixtures.ts`
- Test: `app/src/features/products/schema.test.ts`, `app/src/app/query-client.test.ts`

**Interfaces:**
- Consumes: `request`, `ApiError`, `isApiError` (Task 5).
- Produces:
  - `types.ts`: `UNITS_OF_MEASURE` (os 9 valores do enum Java, `as const`), `type UnitOfMeasure`; `interface Product` (campos do `ProductResponse`; decimais como `number`; datas como `string`); `interface ProductRequest` (campos do `ProductRequest` + `version: number | null`); `interface ProductPage { content: Product[]; page; size; totalElements; totalPages; last }`; `type ProductSortField = 'name' | 'sku' | 'price' | 'category' | 'active'`; `interface ProductListParams { page: number; size: number; sortBy: ProductSortField; direction: 'ASC' | 'DESC'; name?: string; sku?: string; category?: string; brandId?: number; active?: boolean }`.
  - `api.ts`: `fetchProductsPage(params, signal?)`, `fetchProduct(id: number, signal?)`, `createProduct(body: ProductRequest)`, `updateProduct(id: number, body: ProductRequest)`, `deleteProduct(id: number): Promise<void>`.
  - `queries.ts`: `productKeys = { all: ['products'], list: (p) => [...all, 'list', p], detail: (id) => [...all, 'detail', id] }`; `useProductsPage(params)` (com `keepPreviousData`), `useProduct(id: number | undefined)`, `useCreateProduct()`, `useUpdateProduct(id: number)`, `useDeleteProduct()`. Todas as mutations invalidam `productKeys.all`.
  - Marcas: `interface Brand { id: number; name: string }`, `fetchBrands(signal?)`, `brandKeys.all = ['brands']`, `useBrands()` (`staleTime: 5 * 60_000`).
  - `query-client.ts`: `createQueryClient(): QueryClient` e `shouldRetry(failureCount: number, error: unknown): boolean`.
  - `schema.ts`: `productFormSchema` (preço com até 2 casas, independente da moeda); `type ProductFormValues` (campos numéricos como `string`, `brandId: number | null`); `productFormDefaults: ProductFormValues`; `toProductRequest(values: ProductFormValues, version: number | null): ProductRequest`; `toProductFormValues(product: Product): ProductFormValues`. As mensagens são chaves `products:validation.<regra>`, adicionadas nos dois JSON.
  - `fixtures.ts`: `productFixture(overrides?: Partial<Product>): Product` e `productPageFixture(content: Product[], overrides?: Partial<ProductPage>): ProductPage`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
// schema.test.ts
it('accepts a valid product')
it('requires sku, name and category')
it('rejects barcode with 9 digits and accepts 8, 12, 13, 14')
it('accepts comma as decimal separator') // price '10,50' -> toProductRequest(...).price === 10.5
it('rejects thousands separators') // price '1.000,50' -> erro
it('limits price to 2 decimals regardless of currency') // '9.99' ok; '10.555' -> erro
it('rejects negative quantities and more than 3 decimals')
it('sends blank optional texts as null') // barcode '  ', description '', subcategory '' -> null em toProductRequest
it('round-trips a product through form values') // toProductRequest(toProductFormValues(p), p.version) mantém os valores
// query-client.test.ts
it('does not retry 4xx ApiErrors') // shouldRetry(0, new ApiError(404...)) === false
it('retries other errors once') // shouldRetry(0, new ApiError(0...)) === true; shouldRetry(1, ...) === false
```

- [ ] **Step 2:** Rodar `pnpm vitest run src/features/products/schema.test.ts src/app/query-client.test.ts`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. O schema valida as strings numéricas por regex (`^\d+([.,]\d{1,N})?$`, com N conforme o campo) e converte trocando `,` por `.`. As regras de tamanho e o barcode seguem a spec §7.2. `createQueryClient` usa `staleTime: 30_000`, `retry: shouldRetry` e `refetchOnWindowFocus: false`.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat(app): add products and brands data layer`.

### Task 9: Shell da aplicação

**Files:**
- Create: `app/src/app/providers.tsx`, `app/src/app/router.tsx`
- Modify: `app/src/main.tsx`
- Create: `app/src/shared/layout/AppLayout.tsx`, `AppSidebar.tsx`, `nav-items.ts`, `HeaderControls.tsx`
- Create: `app/src/shared/components/PageHeader.tsx`, `NotFoundPage.tsx`, `RouteErrorPage.tsx`
- Create: `app/src/features/dashboard/DashboardPage.tsx`
- Create: `app/src/test/render.tsx`
- Test: `app/src/shared/layout/AppLayout.test.tsx`

**Interfaces:**
- Consumes: Tasks 5–8.
- Produces:
  - `routes: RouteObject[]` exportado de `router.tsx` (o `main.tsx` usa `createBrowserRouter(routes)`). `/products` aponta para um placeholder até a Task 10. `<AppProviders>{children}</AppProviders>`.
  - `renderRoute(path: string): { user: UserEvent; router: Router }`: monta `createMemoryRouter(routes, { initialEntries: [path] })` dentro de `AppProviders`, com um `QueryClient` novo e `retry: false`.
  - `<PageHeader title: string; actions?: ReactNode />`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it('renders Home at / with sidebar links to Home and Products')
it('renders the 404 page for unknown routes')
it('switches UI language from the header') // escolher "Português (Brasil)" -> link do menu "Produtos"
it('switches currency from the header') // escolher "Euro" -> localStorage 'erp.currency' === 'EUR'
```

- [ ] **Step 2:** Rodar `pnpm vitest run src/shared/layout`. Esperado: FAIL.
- [ ] **Step 3:** Implementar: providers na ordem Theme → Currency → QueryClient → children + `<Toaster />`; rotas da spec §4.3, com `AppLayout` e `RouteErrorPage` na raiz; sidebar `collapsible="icon"` a partir de `nav-items.ts` (`{ to: string; labelKey: string; icon: RemixiconComponentType }`); `HeaderControls` com os três `dropdown-menu`. Os nomes de moeda vêm de `new Intl.DisplayNames([language], { type: 'currency' })`.
- [ ] **Step 4:** Rodar o mesmo comando (PASS) e `pnpm build`.
- [ ] **Step 5:** Commit: `feat(app): add app shell with sidebar, language, currency and theme controls`.

### Task 10: Listagem de Produtos

**Files:**
- Create: `app/src/features/products/list-params.ts`
- Create: `app/src/features/products/pages/ProductListPage.tsx`
- Create: `app/src/features/products/components/ProductFilters.tsx`, `ProductTable.tsx`, `ProductColumns.tsx`, `DeleteProductDialog.tsx`, `BrandCombobox.tsx`
- Create: `app/src/shared/components/DataTablePagination.tsx`
- Modify: `app/src/app/router.tsx`
- Test: `app/src/features/products/list-params.test.ts`, `app/src/features/products/pages/ProductListPage.test.tsx`

**Interfaces:**
- Consumes: Tasks 5–9.
- Produces:
  - `parseListParams(search: URLSearchParams): ProductListParams` e `toSearchParams(params: ProductListParams): URLSearchParams` (omite valores padrão e vazios).
  - `<BrandCombobox value={number | null} onChange={(id: number | null) => void} allowNone?: boolean />`, usado também pela Task 11.
  - `<DeleteProductDialog product={Product | null} onOpenChange onDeleted={() => void} />`.
- Textos fixados pela spec (chaves em `common`/`products`, valores em `en`): "New product", "Clear filters", "No products found", "Try again", "Low stock", "Active", "Inactive".

- [ ] **Step 1: Escrever os testes que falham**

```ts
// list-params.test.ts
it('returns defaults for empty params') // { page: 0, size: 20, sortBy: 'name', direction: 'ASC' }
it('falls back to defaults on invalid values')
// page=-1&size=999&sortBy=foo&direction=up&active=maybe&brandId=abc -> mesmos defaults, sem active/brandId
it('accepts allowed sizes only') // size=50 ok; size=30 -> 20
it('round-trips through toSearchParams and omits defaults')
// ProductListPage.test.tsx (MSW em `${API}/products/page` e `${API}/brands`)
it('lists products from the API with formatted price') // productFixture({ price: 10 }) -> '$10.00' na linha
it('shows Low stock badge when stockQuantity <= minimumStock')
it('updates the URL and refetches when typing a name filter') // após debounce: router.state.location.search contém name=ab, e o handler recebeu name=ab
it('shows empty state') // content [] -> 'No products found'
it('shows error state with Try again') // 500 -> 'Try again'; clicar refaz o fetch
it('goes back one page after deleting the last item of the last page')
// path /products?page=2, page com 1 item; excluir pelo menu de ações + confirmar
// -> DELETE chamado e location.search contém page=1
```

- [ ] **Step 2:** Rodar `pnpm vitest run src/features/products`. Esperado: FAIL.
- [ ] **Step 3:** Implementar conforme a spec §7.1 e §7.3. O estado fica só na URL (`useSearchParams` + `parseListParams`/`toSearchParams`); mudar um filtro zera `page`; o debounce é de 300 ms nos campos nome e SKU; a TanStack Table usa `manualPagination` e `manualSorting`, e o sorting mapeia o id da coluna `status` para `active`. Durante refetch (`isPlaceholderData`), a tabela fica com `opacity-60`. Um 404 na exclusão vira `toast.error` + refetch.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat(app): add products list with server-side filters and delete`.

### Task 11: Formulário de Produto (novo e edição)

**Files:**
- Create: `app/src/features/products/components/ProductForm.tsx`
- Create: `app/src/features/products/pages/ProductFormPage.tsx`
- Modify: `app/src/app/router.tsx` (rotas `/products/new` e `/products/:id/edit`)
- Test: `app/src/features/products/pages/ProductFormPage.test.tsx`

**Interfaces:**
- Consumes: schema e hooks (Task 8), `BrandCombobox` (Task 10) e `renderRoute` (Task 9).
- Produces: `<ProductForm defaultValues={ProductFormValues} onSubmit={(values: ProductFormValues) => Promise<void>} submitting: boolean />`.
- Textos fixados: "Product not found", "This product was changed by someone else", "Reload", "Save".

- [ ] **Step 1: Escrever os testes que falham**

```ts
it('creates a product and navigates to /products')
// preencher sku, name, category, price '10,50'; Save
// -> POST com { sku, name, category, price: 10.5, barcode: null, unitOfMeasure: 'UNIT', active: true, version: null, ... }
// -> location.pathname === '/products' e toast de sucesso visível
it('marks fields from a 400 response') // 400 { errors: { sku: 'SKU already used' } } -> texto ao lado do campo SKU
it('shows a form-level alert for 400 without field errors') // detail 'A product with this SKU already exists'
it('disables Save while the request is pending') // handler com delay; Save fica disabled; só 1 POST após dois cliques
it('loads the product for editing and sends its version') // GET /products/7 version 3 -> PUT com version: 3
it('shows Product not found for 404')
it('shows the conflict alert on 409 and reloads on Reload') // depois do Reload, o GET é refeito e o formulário volta aos dados do servidor
it('asks for confirmation when leaving with unsaved changes') // editar campo, clicar no link Products da sidebar -> alert-dialog visível
```

- [ ] **Step 2:** Rodar `pnpm vitest run src/features/products/pages/ProductFormPage.test.tsx`. Esperado: FAIL.
- [ ] **Step 3:** Implementar conforme a spec §7.2 e §8. Erros: `ApiError` 400 com `errors` → `setError` para os nomes que existem em `ProductFormValues` (o resto vai para o alert geral); 400 sem `errors` → alert com `detail`; 409 → alert de conflito; status 0 / 5xx → `toast.error` com a chave `common:errors.unexpected`. O `useBlocker` fica ativo quando `isDirty && !isSubmitSuccessful`.
- [ ] **Step 4:** Rodar o mesmo comando. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat(app): add product create and edit form`.

### Task 12: Documentação e verificação final

**Files:**
- Modify: `README.md`, `app/README.md`

- [ ] **Step 1:** Atualizar os READMEs conforme a spec §10.
- [ ] **Step 2:** Rodar em `app/`: `pnpm test` (todos os testes PASS) e `pnpm build` (sem erros).
- [ ] **Step 3:** Rodar em `api/`: `.\mvnw.cmd -B test -Dtest="*ControllerTest,*ServiceTest"`. Esperado: PASS.
- [ ] **Step 4:** Teste manual com a API apontando para um Postgres: `pnpm dev`, criar, editar, filtrar e excluir um produto; trocar idioma, moeda e tema; abrir em largura de celular e conferir a sidebar em Sheet.
- [ ] **Step 5:** Commit: `docs: update READMEs for frontend foundation`.
