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
- Front consome a API através de camada de serviços dedicada (ex.: `services/`, com Axios ou fetch + TanStack Query para cache/estado assíncrono).
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

- Login / recuperação de senha
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
- **Flyway** ou **Liquibase** para versionamento de schema (recomendado)

**Configuração para o front:** a API libera CORS para as origens definidas em `APP_CORS_ALLOWED_ORIGINS` (separadas por vírgula; padrão `http://localhost:5173`). A configuração de segurança (`SecurityConfig`) é provisória: os endpoints de produtos e marcas ficam públicos até a implementação do JWT.

### 5.2 Responsabilidades da API

- Expor endpoints REST para todos os módulos listados na seção 2.
- Regras de negócio e validações centralizadas no backend.
- Autenticação/autorização via Spring Security + JWT.
- Paginação, filtros e ordenação padronizados (uso de `Page<T>` do Spring Data).
- Auditoria mínima: quem criou/alterou registros e quando (ex.: campos `createdAt`, `updatedAt`, `createdBy`).

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

GET    /estoque/movimentacoes
POST   /estoque/entrada
POST   /estoque/saida

GET    /vendas
POST   /vendas
GET    /vendas/{id}

GET    /financeiro/contas-a-pagar
GET    /financeiro/contas-a-receber

GET    /relatorios/vendas?dataInicio=&dataFim=
```

(Lista ilustrativa — detalhar por módulo conforme o desenvolvimento avança.)

---

## 6. Perfis de Usuário e Permissões

| Perfil | Permissões principais |
|---|---|
| **Admin** | Acesso total, incluindo configurações e usuários |
| **Gerente** | Acesso a vendas, estoque, financeiro e relatórios (sem gestão de usuários) |
| **Operador de Caixa** | Acesso a vendas (PDV) e consulta de produtos/estoque |
| **Operador de Estoque** | Acesso a produtos e movimentações de estoque |

Controle de acesso a nível de rota (front) e endpoint (backend), com roles validadas no token JWT.

---

## 7. Roadmap Sugerido

### Fase 1 — Fundação

- Autenticação/usuários e permissões
- Cadastro de produtos, fornecedores e clientes
- Estrutura base do front (layout, navegação, tema MUI)

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
