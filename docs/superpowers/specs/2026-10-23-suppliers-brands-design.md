# Cadastros de Fornecedores e Marcas — Design

- **Data:** 2026-10-23
- **Status:** aprovado em conversa, aguardando revisão da spec escrita
- **Branch:** `feature/suppliers-brands`, criada a partir de `feature/frontend-foundation` (PR #3 ainda aberto; o PR desta branch fica empilhado sobre o #3)
- **Base:** segue a spec `2026-10-22-frontend-foundation-design.md` (stack, i18n, moeda, padrões de erro e testes). O que não for dito aqui segue aquela spec.

## 1. Objetivo

Adicionar os cadastros de **Marcas** e **Fornecedores** (API + telas) no mesmo padrão da feature de Produtos. Ao mesmo tempo, extrair para `shared/` as peças que passam a ter três consumidores.

**Critério de sucesso:**
- Listar, criar, editar, desativar e reativar marcas e fornecedores pelo app.
- Nome de marca e `taxId` duplicados aparecem como erro no próprio campo.
- Edição concorrente devolve 409.
- Produtos continua funcionando igual, e todos os testes passam.

**Fora deste trabalho:**
- Vínculo produto↔fornecedor (`TbProductSupplier`), que entra junto com Estoque/Compras.
- Exclusão definitiva de marcas e fornecedores.
- Validação de documento fiscal por país.
- Autenticação.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Exclusão | Não há `DELETE`. Marcas e fornecedores são desativados e reativados (`active`). |
| taxId | Genérico: opcional, único e com até 14 caracteres depois de normalizado. A normalização remove `.`, `-`, `/` e espaços e converte para maiúsculas. Aceita letras e dígitos. |
| Edição de marca | Em um Dialog sobre a listagem, sem página própria. |
| Edição de fornecedor | Em página própria, como Produtos. |
| Duplicados | Viram erro de campo (`errors.<campo>`) via `FieldErrorException`. Vale também para SKU e barcode de Produtos. |
| Código repetido | Extraído para `shared/`, e Produtos migra para as versões compartilhadas sem mudar de comportamento. |

## 3. API

### 3.1 Entidades

- `TbBrand` e `TbSupplier` ganham `@Version` com `@Column(nullable = false, columnDefinition = "bigint default 0")`. Com `ddl-auto=update`, o Postgres preenche as linhas existentes com 0; sem esse padrão, o Hibernate falharia ao atualizar registros antigos com versão nula.
- Fora isso, as entidades não mudam.

### 3.2 `FieldErrorException`

- `exception/FieldErrorException(String field, String message)`: erro de regra de negócio ligado a um campo (valor duplicado ou inválido depois de normalizar).
- O `GlobalExceptionHandler` a converte em 400 `ProblemDetail` com `detail: "Validation failed"` e `errors: { <field>: <message> }`, no mesmo formato da validação de campos.
- `ProductService.validateUniqueIdentifiers` passa a lançá-la, com `sku` → `"A product with this SKU already exists"` e `barcode` → `"A product with this barcode already exists"`.

### 3.3 Marcas (`/brands`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/brands` | Inalterado: ativas, ordenadas por nome (combobox do produto) |
| GET | `/brands/page` | `page`, `size` (1–100, padrão 20), `sortBy` (`name` \| `active`, padrão `name`), `direction`, `name` (contém, sem diferenciar maiúsculas), `active` |
| GET | `/brands/{id}` | 404 se não existir |
| POST | `/brands` | 201 + `Location` |
| PUT | `/brands/{id}` | Com `version`; versão divergente → 409 |
| PATCH | `/brands/{id}/status` | Corpo `{ "active": boolean }` → 200 com a marca; ignora versão |

- **DTOs:**
  - `BrandRequest(@NotBlank @Size(max=100) String name, @NotNull Boolean active, Long version)`.
  - `BrandDetailResponse(Long id, Long version, String name, Boolean active, LocalDateTime createdDate, LocalDateTime lastModifiedDate)`.
  - `BrandPageRequest` e `BrandPageResponse` no formato dos de produto.
  - `StatusRequest(@NotNull Boolean active)`, compartilhado com fornecedores.
  - O `BrandResponse(id, name)` existente continua sendo usado por `GET /brands`.
- **Nome único:** compara depois do `trim`, sem diferenciar maiúsculas. Duplicado → `FieldErrorException("name", "A brand with this name already exists")`.

### 3.4 Fornecedores (`/suppliers`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/suppliers/page` | `page`, `size`, `sortBy` (`legalName` \| `tradeName` \| `active`, padrão `legalName`), `direction`, `name` (contém em `legalName` OU `tradeName`), `taxId` (contém, comparado já normalizado), `active` |
| GET | `/suppliers/{id}` | 404 se não existir |
| POST | `/suppliers` | 201 + `Location` |
| PUT | `/suppliers/{id}` | Com `version`; versão divergente → 409 |
| PATCH | `/suppliers/{id}/status` | `{ "active": boolean }` |

- **`SupplierRequest`:**
  - `@NotBlank @Size(max=150) legalName`
  - `@Size(max=150) tradeName`
  - `@Size(max=32) taxId`: o limite vale antes da normalização. Depois dela, o valor precisa ter até 14 letras ou dígitos; senão o service lança `FieldErrorException("taxId", "Tax ID must have up to 14 letters or digits")`.
  - `@Email @Size(max=150) email`
  - `@Size(max=20) phone`
  - `@NotNull Boolean active`
  - `Long version`
- **Normalização no service:** texto vazio ou só com espaços vira `null`. O `taxId` normalizado é único: duplicado → `FieldErrorException("taxId", "A supplier with this tax ID already exists")`.
- `SupplierResponse` com todos os campos, mais `version`, `createdDate` e `lastModifiedDate`.

### 3.5 Segurança

- `/suppliers/**` entra no `permitAll` da `SecurityConfig` provisória, junto com `/brands/**`.
- `PATCH` entra nos métodos permitidos pelo CORS.

### 3.6 Testes da API

- **`@WebMvcTest` de `BrandController` e `SupplierController`:**
  - 400 com `errors` (validação e duplicado);
  - 409 por versão divergente;
  - 404;
  - `PATCH /status`;
  - CORS preflight com `PATCH`.
- **Testes de service (Mockito):**
  - duplicado sem diferenciar maiúsculas (marca);
  - normalização e duplicado do `taxId`;
  - `taxId` acima de 14 caracteres depois de normalizado;
  - versão divergente não salva;
  - mudança de status.
- **`ProductControllerTest`:** SKU duplicado → `errors.sku`.

## 4. Front

### 4.1 Peças compartilhadas (extraídas de Produtos)

| Novo arquivo | Conteúdo |
|---|---|
| `shared/list/list-params.ts` | `createListParams<Sort, Filters>(config)` → `{ parse(search): Params, toSearchParams(params): URLSearchParams }`. O `config` define os campos de ordenação permitidos, a ordenação padrão e os filtros (texto, booleano ou id inteiro seguro). Mantém as regras atuais: tamanhos 10/20/50/100, `page` de 0 a 2147483647 e valores inválidos voltando ao padrão. |
| `shared/list/useDebouncedText.ts` | O hook atual de `ProductFilters`, com debounce de 300 ms. |
| `shared/list/useListSearchParams.ts` | Liga `parse`/`toSearchParams` ao `useSearchParams`. Filtro de texto usa `replace: true`; mudar qualquer filtro volta para `page = 0`. |
| `shared/forms/applyServerErrors.ts` | Distribui um `ApiError` 400/404/409 entre os campos do formulário e o alerta geral, com a lógica atual do `ProductForm` generalizada pela lista de campos do formulário. |
| `shared/components/UnsavedChangesDialog.tsx` | Movido de `features/products`. |
| `shared/components/StatusBadge.tsx` | Badge Active/Inactive. |
| `shared/components/SetStatusDialog.tsx` | Confirmação de desativação, reutilizável. |

- `features/products` passa a usar todas essas peças. Os testes de Produtos que já existem não podem mudar, salvo imports.

### 4.2 Navegação e rotas

- `nav-items.ts`: Home, Products, Suppliers, Brands, nessa ordem. Ícones Remix: `RiTruckLine` para fornecedores e `RiPriceTag3Line` para marcas.
- Rotas: `/brands`, `/suppliers`, `/suppliers/new` e `/suppliers/:id/edit`.

### 4.3 Marcas

- **Listagem `/brands`:**
  - Filtros: nome (com debounce) e status.
  - Colunas: Name (ordenável), Status (ordenável por `active`) e ações (Edit, Deactivate/Activate).
  - Paginação, estados de carregando, vazio e erro iguais aos de Produtos.
- **`BrandDialog`** (criar e editar):
  - Campos: Name e o switch Active.
  - Na edição, carrega `GET /brands/{id}` ao abrir, mostra um skeleton até a primeira busca terminar e guarda a `version` no momento do carregamento.
  - Usa `applyServerErrors`: nome duplicado aparece no campo; 409 mostra o alerta com Reload; 404 mostra a mensagem no alerta.
  - Fechar com alterações pendentes pede confirmação.
  - Ao salvar: notificação, fecha o dialog e invalida `brandKeys.all`. Isso também atualiza o combobox de Produtos.
- **Query keys:**
  - `brandKeys.all = ['brands']`;
  - `brandKeys.active = ['brands','active']`, para o `GET /brands` (o hook `useBrands` atual passa a usar essa chave);
  - `brandKeys.list(params)` e `brandKeys.detail(id)`.

### 4.4 Fornecedores

- **Listagem `/suppliers`:**
  - Filtros: nome e taxId (ambos com debounce) e status.
  - Colunas: Legal name (com o nome fantasia abaixo, em texto secundário; ordenável), Tax ID, Email, Phone, Status (ordenável) e ações (Edit, Deactivate/Activate).
- **Formulário (`/suppliers/new` e `/suppliers/:id/edit`):**
  - Switch Active no topo.
  - Card **Identification:** legal name, trade name e tax ID.
  - Card **Contact:** email e phone.
  - Schema Zod espelha o backend. O `taxId` é aceito com separadores, e a validação de até 14 caracteres alfanuméricos é feita depois de normalizar.
  - Comportamento igual ao de Produtos: skeleton até a primeira busca da montagem, versão guardada no carregamento, erros por campo, 404, 409 com Reload, `useBlocker` e botão Save com estado de carregamento.
- **Query keys:** `supplierKeys.all`, `supplierKeys.list(params)` e `supplierKeys.detail(id)`.

### 4.5 Desativar e reativar

- Ação no menu de cada linha.
- Desativar abre o `SetStatusDialog` ("<nome> ficará indisponível para seleção"); reativar é direto.
- Em ambos: `PATCH /status`, notificação de sucesso e invalidação da lista. Um 404 vira `toast.error` e recarrega a lista.

### 4.6 Ajuste em Produtos

- O `BrandCombobox` recebe a prop opcional `fallbackLabel?: string`.
- O `ProductForm` passa `product.brandName`, então uma marca desativada continua aparecendo pelo nome no produto que a usa.

### 4.7 i18n

- Namespaces `brands` e `suppliers` em `en` e `pt-BR`.
- As chaves de navegação e o rótulo de status ficam em `common`.
- O teste de paridade cobre os novos arquivos automaticamente.

### 4.8 Testes do front (Vitest + MSW)

- **Unitários:**
  - `createListParams`: as regras atuais, agora parametrizadas, e uma configuração de fornecedor;
  - `applyServerErrors`;
  - schema de fornecedor (normalização do `taxId`, e-mail, tamanhos).
- **Marcas:**
  - a lista renderiza as linhas da API;
  - o filtro de nome atualiza a URL;
  - criar pelo Dialog;
  - nome duplicado aparece no campo;
  - editar envia a versão carregada;
  - desativar confirma e chama o `PATCH`.
- **Fornecedores:**
  - lista e filtros;
  - criar com o taxId `"12.345.678/0001-90"` enviado como digitado (quem normaliza é o backend);
  - editar envia a versão;
  - 409 mostra o alerta com Reload;
  - 404 mostra "Supplier not found";
  - sair sem salvar pede confirmação.
- **Produtos:** os testes que já existem passam sem alteração de comportamento, e um teste novo cobre o `fallbackLabel` de marca desativada.

## 5. Documentação

- `README.md`, seção 7: marcar "Cadastro de fornecedores" como entregue na Fase 1.
- `README.md`, seção 5.4: incluir os endpoints `/brands` e `/suppliers`.

## 6. Riscos e observações

- **`@Version` com default 0:** depende do `ddl-auto=update` no Postgres. Se o banco de produção for gerenciado manualmente, é preciso rodar `ALTER TABLE tb_brands ADD COLUMN version bigint NOT NULL DEFAULT 0` (e o equivalente em `tb_suppliers`).
- **Endpoints públicos:** continuam sem autenticação até o JWT, como em Produtos.
- **Coluna `taxId` com 14 caracteres:** não comporta alguns VATs longos. Aumentar exige migração manual.
- **`TbProductSupplier.active` nasce `false`:** inconsistente, mas fica para a feature que usar o vínculo.
