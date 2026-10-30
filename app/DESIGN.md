# Design system (Modernist, via Claude Design)

O visual do app vem do design "Atelier Norte" feito no Claude Design, sobre o design system **Modernist**: tinta sobre um fundo quente, uma única cor de destaque e a fonte Archivo. No design, os cantos retos do Modernist foram trocados por formas arredondadas (cartões de 28px, controles em pílula, avatares redondos), e é essa versão que o app segue.

Este guia diz **o que usar e quando**. Antes de criar um componente visual novo, procure aqui: quase tudo já existe.

## 1. Tokens

Todos ficam em `app/src/index.css`, como variáveis do shadcn, em claro e escuro. Nunca escreva cor, raio ou sombra soltos no código.

| Token | Uso |
| --- | --- |
| `--background` `#f3f2f2` / `--foreground` `#201e1d` | Fundo da página e tinta (texto) |
| `--card` | Superfície dos cartões (branco; `#24221f` no escuro) |
| `--primary` (= `--brand`) | A cor de destaque: vermelho (padrão), cobalto, verde ou âmbar, escolhida em Preferências (`data-accent` no `<html>`) |
| `--accent` / `--accent-foreground` | Tinta leve e texto forte da cor de destaque (fundo de avisos, links) |
| `--muted` / `--muted-foreground` | Trilhos (barras, segmented), texto secundário |
| `--success*`, `--warning*`, `--destructive` | Estados. **Não seguem a cor de destaque**: "Sem estoque" é vermelho com qualquer destaque |
| `--radius` `1.25rem` | `rounded-xl` = 28px (cartões), `rounded-lg` = 20px (controles), `rounded-full` (pílulas, avatares) |
| `--shadow-card` | A sombra suave dos cartões; `shadow-md` no hover |

**Contraste:** texto branco sobre qualquer cor de destaque precisa de pelo menos 4,5:1. Se acrescentar uma cor, confira; o âmbar foi escurecido para `#b45f06` por isso. O vermelho padrão (`#ec3013`, 4,2:1) é a cor do design e é aceito em texto grande e em botões.

### Tipografia

Archivo (`@fontsource-variable/archivo`), números com `tabular-nums`.

| Papel | Classe |
| --- | --- |
| Título da página / saudação | `text-[clamp(30px,4vw,40px)] font-extrabold tracking-[-0.02em] leading-[1.1]` |
| Título de cartão | `text-lg font-extrabold` (o `Panel` já aplica) |
| Número de destaque (KPI) | `text-2xl sm:text-3xl xl:text-[44px] font-extrabold tracking-[-0.03em] leading-none` |
| Rótulo de campo / legenda | `text-[13px] font-semibold` / `text-[13px] text-muted-foreground` |
| Texto | `text-sm` / `text-[15px]` |

## 2. Superfícies

Use o `Panel` (`shared/components/Panel.tsx`):

| Variante | Quando |
| --- | --- |
| `default` | Quase tudo: cartão branco, sem borda, sombra suave, título 18px extrabold |
| `ink` | Um resumo por tela, no máximo (o "Resumo" do painel) |
| `accent` | O único elemento de destaque da tela (o KPI "Valor em estoque", o hero do login) |

Regras: **uma** superfície de destaque por tela; nada de bordas finas (`ring-1`) em cartões, o contraste vem do fundo `#f3f2f2`; espaçamento interno de 24px.

## 3. Componentes

| Componente | Arquivo | Uso |
| --- | --- | --- |
| `Panel` | `shared/components/Panel.tsx` | Cartão com título, descrição e ações; vira `region` nomeada |
| `SegmentedControl` | `shared/components/SegmentedControl.tsx` | Pílula com indicador que desliza (abas do login, filtros de status). ARIA tabs, setas/Home/End |
| `Pill` | `shared/components/Pill.tsx` | Status e variações: `ok`, `warning`, `danger`, `dangerSolid`, `neutral`, `accent`, `onAccent` (sobre o destaque), `ink` |
| `ProgressBar` | `shared/components/ProgressBar.tsx` | Barra que enche a partir de zero; com `label` vira `progressbar` |
| `InitialsAvatar` / `UserAvatar` | `shared/components/UserAvatar.tsx` | Avatar de iniciais; `size="xl"` (44px) nas listas do design; tons `soft`, `neutral`, `accent`, `danger` |
| `KpiCard` | `features/dashboard/components/KpiCard.tsx` | Indicador: rótulo + pílula, número grande com contagem, linha de apoio |
| `HeroSpiral` + `useHeroSwap` | `features/auth/components/` | A troca em espiral do hero do login. Só para o login: é a "assinatura" da entrada |

Do shadcn (`components/ui`, gerado pela CLI, **não edite à mão**): botões, campos, diálogos, menus. Ajustes visuais globais neles vão no `index.css`, por `data-slot` (como já é feito com os overlays).

## 4. Movimento

Tudo passa pelo Motion (`motion/react`) com os tokens de `shared/motion/presets.ts`. A regra geral: **páginas e seções se movem como no design (expressivo, ~0,6s); o que se repete o dia todo (linhas, hovers, alternâncias) é curto.**

| O quê | Como | Tokens |
| --- | --- | --- |
| Entrada das seções de uma página | `Stagger` + `StaggerItem`: sobem 18px e aparecem, 60ms entre seções | `fadeUp`, `STAGGER_STEP`, `EASE_OUT` |
| Linhas de tabela | `useRowMotion`: fade curto, destaque que desliza entre linhas | `softSpring` |
| Hover de cartão clicável | Sobe 4px e ganha sombra | `LIFT_ON_HOVER` |
| Hover de linha clicável (listas do design) | Desliza 4px para a direita | `NUDGE_ON_HOVER` |
| Indicador de pílula / item ativo | `layoutId` com mola leve | `pillSpring` |
| Popovers, menus | Escala a partir do canto de origem | `popSpring` |
| Troca de conteúdo (uma vista sai, outra entra) | Fade + deslize de 24px + blur | `EASE_SWAP` |
| Números | Contagem só na primeira carga (`useCountUp`); depois mostra direto | |
| Barras | Enchem a partir de zero ao montar | `ProgressBar` |

**Movimento reduzido.** O `MotionConfig reducedMotion="user"` (em `app/providers.tsx`) desliga só animações de posição, escala e layout. **Largura, cor e opacidade continuam animando**, então quem anima essas propriedades precisa checar `useReducedMotion()` e já renderizar o estado final (o `ProgressBar` faz isso). No CSS, use `motion-reduce:` nos hovers que movem.

**Não anime** o que não comunica nada (decoração em loop, entrada de cada célula), nem bloqueie a interação esperando uma animação, exceto a entrada do login, que é curta (0,9s) e some com movimento reduzido.

## 5. Acessibilidade

- Contraste de 4,5:1 para texto (ver §1).
- Controles customizados com semântica real: `SegmentedControl` é ARIA tabs; seletores de opção usam `<input type="radio">` dentro do rótulo.
- Avatares e barras são decorativos (`aria-hidden`), porque o texto está ao lado. Barra que é a única informação ganha `label`.
- Telas empilhadas com animação (o login) montam **só a visível**: um único formulário de e-mail e senha para leitores de tela e gerenciadores de senha.
- Foco visível em tudo: `focus-visible:ring-3 focus-visible:ring-ring/50`.

## 6. Faça / não faça

**Faça**
- Use os tokens e os componentes acima; acrescente variantes neles em vez de copiar classes.
- Mantenha uma única cor de destaque por tela, com o resto em tinta sobre fundo.
- Use pílulas `rounded-full` para status e controles curtos, e cartões `rounded-xl`.

**Não faça**
- Hex, raio ou sombra soltos; `ring-1` em cartão.
- Status na cor de destaque (`bg-primary` para "erro"): use os tons semânticos do `Pill`.
- Animações longas em coisas que o usuário vê o tempo todo.

## 7. Checklist de tela nova

1. Título no padrão (§1) e seções em `Panel`, dentro de `Stagger`.
2. Status com `Pill`; progresso com `ProgressBar`; pessoas e itens com avatar de iniciais.
3. Filtros curtos com `SegmentedControl`.
4. Hovers com `LIFT_ON_HOVER` (cartões) ou `NUDGE_ON_HOVER` (linhas).
5. Testado em claro e escuro, com outra cor de destaque, no celular (390px, sem rolagem lateral) e com movimento reduzido.
6. Textos em `en` e `pt-BR`.

## 8. Adoção

Todas as telas seguem o guia:

- login (`features/auth`) e painel (`features/dashboard`), escritos sobre a biblioteca;
- listas: o filtro Todos/Ativos/Inativos (`StatusTabs`) é um `SegmentedControl`, o cartão da lista não tem contorno e os cabeçalhos da tabela são rótulos pequenos e apagados;
- formulários e perfil: o `Card` do shadcn é reestilizado no `index.css` (sem contorno, 24px de respiro, título 18px extrabold), e a barra de estoque do resumo do produto é uma `ProgressBar`;
- barra lateral: marca redonda e item ativo como pílula de tinta que desliza com `pillSpring`;
- títulos de página, estados vazios e de erro em extrabold.

Diálogos e menus já usam os raios e a mola de abertura do tema. Componentes novos usam a biblioteca diretamente; `components/ui` continua intocado (é gerado pelo CLI do shadcn).
