# Redesign visual PIBB Kids (handoff Claude Design) + temas (fase 2)

## Context

O designer entregou `PIBB Kids App design.zip` com um restyle das telas principais.
O app hoje é funcional mas visualmente cru: grid de atalhos com quadrados de borda 1px,
listas com linhas divididas, tabs sublinhadas, login genérico. O redesign troca isso por
tiles coloridos, cards brancos com sombra suave, tabs pill-segmented e avatares — **sem
mexer em dado, permissão ou fluxo**.

**Viabilidade: alta, sem troca de framework.** O handoff foi escrito em cima do código
real e quase tudo que ele pede já existe:

- `globals.css` já tem todos os tokens citados (`--primary` terracota, `--secondary` teal,
  `--accent` amarelo, `--radius: 1rem` + escala `--radius-sm`…`--radius-4xl`).
- Baloo 2 já está carregado como `--font-heading` (`layout.tsx:16`) e já aplicado em
  `h1,h2,h3` no `@layer base`.
- `Tabs` do Base UI já tem `variant="default"` que é exatamente o pill-segmented
  (`tabs.tsx:33` — track `bg-muted`, ativo `data-active:bg-background`); as telas hoje
  usam o `variant="line"`. Trocar de variante já entrega boa parte do visual pedido.
- FAB, Dialog, MultiSelect, Card já existem e são os mesmos dos mockups.

Nada aqui precisa de React Native ou biblioteca nova. O app é um PWA já instalado no
celular do usuário; migrar pra RN jogaria fora todo o server-side (Prisma, NextAuth,
rotas) por ganho zero num redesign que é 100% CSS/markup. **Recomendação: ficar em
Next + Tailwind + Base UI.** A única adição que talvez valha é `framer-motion`, e só se
quisermos animar transição de tab/card — não é requisito de nenhum mockup.

### Decisões tomadas

1. **Escopo agora: só o restyle visual.** Ficam de fora (backlog): evento multi-dia,
   upload de banner, página de detalhe de evento especial, hero de contagem regressiva
   no dashboard, "Novo evento" em tela cheia.
2. **`--secondary` continua teal**, como nos mockups. O verde de sucesso vira token
   próprio `--success`, e o dourado `#c9922f` vira `--gold`. Isso **corrige** o plano de
   temas antigo (que previa `--secondary` = verde) — a fase 2 abaixo já está ajustada.
3. **Redesign primeiro, temas/dark depois.** Regra durante todo o redesign: **nenhuma cor
   literal nova** (`bg-orange-500`, `#c9922f`, `text-green-600`). Tudo via token. Assim a
   fase 2 aplica em cima sem retrabalho.

### Erros do handoff a corrigir na execução

- **`endDate` NÃO é data final de evento multi-dia.** Hoje é a *hora* de término do mesmo
  dia (`events-client.tsx:80`: `endDate: fromDateTimeInputs(form.date, form.endTime)`).
  O README afirma o contrário. Multi-dia exigiria separar `endDate` de `endTime` no
  schema — mais um motivo pra deixar fora deste escopo.
- Os "striped boxes" são placeholders de asset. `/logo.png` existe; banners do Doity não.
- Não existe nenhuma camada de storage/upload no app hoje (nem Supabase Storage) — o
  campo "Banner" do mockup é infra nova, não só UI.

## Parte 1 — Tokens novos

Em `src/app/globals.css`, adicionar ao `@theme inline` e aos blocos `:root`/`.dark`:

- `--success` / `--success-foreground` — o verde que hoje é `bg-green-600` à mão.
- `--gold` / `--gold-foreground` — `#c9922f` do handoff, convertido pra oklch.
- `--warning` / `--warning-foreground` — âmbar dos avisos (hoje `orange-*`/`yellow-*`).
- `--info` / `--info-foreground` — azul das observações (hoje `blue-*`).

Uma sombra compartilhada, já que ela aparece em toda tela do redesign:

```css
--shadow-card: 0 2px 10px -4px rgb(0 0 0 / 0.08);
```

## Parte 2 — Varredura de cores chumbadas (pré-requisito)

Antes de restilizar, trocar os ~38 literais de cor existentes pelos tokens da Parte 1.
É o que permite dark mode e temas depois sem uma segunda passada.

| Hoje | Vira |
|---|---|
| `bg-green-600 text-white` | `bg-success text-success-foreground` |
| `text-green-600` | `text-success` |
| `bg-orange-50 dark:bg-orange-950 border-orange-200 …` | `bg-warning/10 border-warning/30` |
| `text-orange-*` / `text-yellow-*` (+ pares `dark:`) | `text-warning` |
| `bg-yellow-400 text-yellow-950` (status "Aprovado") | `bg-warning text-warning-foreground` |
| `bg-blue-*` / `text-blue-*` (observações) | `bg-info/10`, `border-info/30`, `text-info` |
| `bg-blue-500 text-white` (status "Comprado") | `bg-info text-info-foreground` |

Usar opacidade (`/10`, `/30`) elimina os pares `bg-x-50 dark:bg-x-950` — os `dark:`
manuais **saem**.

Arquivos com literais (conferir os números de linha, eles se movem):
`attendance/attendance-client.tsx`, `occurrences/occurrences-client.tsx`,
`purchase-requests/purchase-requests-client.tsx`, `class-journal/class-journal-client.tsx`,
`volunteers/volunteers-client.tsx`, `children/children-client.tsx`, `dashboard/page.tsx`,
`components/dashboard/birthdays-section.tsx`, `components/dashboard/events-calendar.tsx`.

Portão final: `grep -rnE '\-(green|orange|blue|yellow|amber|red)-[0-9]' src/` sem
resultado fora de `src/components/ui/`.

Exceção proposital: `qrcodes-client.tsx:13` `BRAND_ORANGE = "#ea580c"` fica fixo — o QR é
gerado em canvas e impresso; seguir tema geraria QR ilegível no papel. Documentar com
comentário.

## Parte 3 — Componentes compartilhados (antes das telas)

Três peças em `src/components/ui/`, porque 5 das 6 telas dependem delas:

1. **`avatar-initial.tsx`** (novo) — círculo com a inicial. Cor derivada de hash estável
   do nome sobre uma paleta fixa de tokens (`primary`/`secondary`/`gold`/`accent`), pra a
   mesma pessoa ter sempre a mesma cor. Usado em Crianças, Voluntários e no header.
2. **`card.tsx`** — adicionar variante "elevated" (`border-0` + `--shadow-card`),
   mantendo a borda atual como padrão pra não quebrar usos existentes.
3. **`badge.tsx`** — variantes novas `success`, `gold`, `info`, `warning`, em vez de criar
   um componente de pill novo.

Ajuste transversal: trocar `variant="line"` por `variant="default"` nos `TabsList` de
Crianças, Voluntários e Escala — já é o pill-segmented do mockup.

## Parte 4 — Telas (ordem de execução)

Cada item mantém copy, lógica de agrupamento, permissões e ações **exatamente** como
estão. É restyle de markup/classe.

1. **Login** (`src/app/(auth)/login/page.tsx`, 99 linhas — o menor, bom pra validar os
   tokens): painel superior `bg-primary` com cantos inferiores arredondados, logo +
   wordmark em branco, card branco do form sobrepondo a borda (`-mt-*` + sombra).
   Mesmos campos e links.
2. **Dashboard** (`src/app/(app)/dashboard/page.tsx` + `src/components/dashboard/*`):
   - Header "Bom dia, {nome}" + avatar. **Atenção:** a saudação hoje vive no `BackHeader`
     (`back-header.tsx:70`, "Olá, {nome}!") e o `ProfileMenu` é o ícone à direita. Não
     duplicar: o avatar do mockup **é** o trigger do `ProfileMenu`.
   - Tiles de atalho coloridos ciclando primary/secondary/gold. Precisa respeitar o
     `dashboard_columns` (3/4/5) já implementado em `resolveLayout` — o mockup mostra 3.
   - Alerta de lanche vira pill `bg-accent` sem borda; `NextSundaySchedule`,
     `EventsCalendar` e `BirthdaysSection` viram cards elevados.
   - Calendário: dia selecionado usa `--primary`; pontos de evento/aniversário mantêm a
     lógica atual, só trocam de literal pra `--warning`/`--success`.
3. **Crianças** (`children-client.tsx`): `ChildCard` vira card elevado + avatar; botões
   aprovar/rejeitar viram ícones em fundo tinto (`bg-success/15`, `bg-destructive/10`);
   indicadores de alergia/restrição viram bolinhas coloridas.
4. **Voluntários** (`volunteers-client.tsx`): mesmo shell de card. `ROLE_LABELS` vira
   `Badge` colorida por papel (Coordenação=secondary, Professor=gold, …);
   `FUNCTION_LABELS` vira chips `bg-muted` em vez de string com vírgulas.
5. **Escala** (`schedule-client.tsx`): slot de Coordenação vira card `bg-primary` com
   texto branco (hoje `border-primary bg-primary/5`); demais `SlotRow` viram cards
   elevados; labels de seção mantêm o small-caps muted.
6. **Resto do app** (Presença, Aulas, Compras, Materiais, Lanches, Ocorrências, Diário,
   Revistas): o handoff não desenhou essas telas, mas todas usam os mesmos padrões
   (lista + tabs + FAB + Dialog). Aplicar o mesmo shell de card/tab/badge — sem isso o
   app fica metade novo, metade velho.

## Verificação

1. `npx tsc --noEmit`.
2. `preview_start` + conta `test` (devolver pra `RECEPTIONIST` no fim). Percorrer as 6
   telas do handoff comparando com os PNGs, e mais uma tela não desenhada (Compras) pra
   conferir consistência.
3. Testar com cada papel (ADMIN, COORDINATOR, TEACHER, RECEPTIONIST, SUPPORT): os tiles
   coloridos precisam ciclar bem com 3, 4 e 5 colunas e com contagens diferentes de item.
4. Conferir que nenhuma ação mudou: aprovar/rejeitar criança, criar slot na escala,
   busca e filtros.
5. `grep` da Parte 2 sem resultado.
6. Simulador iOS: alvos de toque (tiles e ícones circulares ≥ 44pt) e cards com sombra
   sem vazamento horizontal.

---

# Fase 2 (depois) — Temas + dark mode

Plano guardado, **corrigido** pela decisão de tokens acima. Só executar após o redesign.

- **Base já pronta**: `@custom-variant dark (&:is(.dark *))` (`globals.css:5`), bloco
  `.dark` completo, `next-themes` já é dependência e `sonner.tsx:8` já usa `useTheme()`.
  Falta só o wiring — não existe `ThemeProvider` em lugar nenhum.
- **Literais**: já resolvido na Parte 2 do redesign. A fase 2 não repete esse trabalho.
- **Presets**: `src/lib/theme.ts` com `{ id, label, swatch }` (~5 paletas prontas, sem
  color picker). As cores ficam no CSS, um bloco `[data-theme="x"]` por preset em
  `globals.css`, mais `.dark [data-theme="x"]`. Cada preset precisa redefinir também
  `--ring` e `--chart-1/2` (`globals.css:69-71`), senão o anel de foco fica laranja num
  tema azul. `--success`/`--warning`/`--info` **não** mudam com o preset — sucesso e
  alerta precisam de significado estável. `--gold` acompanha o preset.
- **Wiring**: `suppressHydrationWarning` no `<html>`, novo
  `src/components/theme-provider.tsx` (wrapper client), e `data-theme={preset}` cuspido
  server-side pelo `src/app/(app)/layout.tsx`, que já carrega `userSettings` — zero
  request extra, sem flash.
- **Persistência sem migration**: estender `AppSettings` em `src/lib/navigation.ts:162`
  com `theme_preset: string` e `color_mode: "light"|"dark"|"system"`. O
  `parseAppSettings` tolerante já ignora chave desconhecida. `PATCH /api/settings` valida
  os dois → 422. Banco é a fonte de verdade; `ThemeSelect` chama `setTheme()` **e** PATCH.
- **UI**: seções "Tema" (grid de swatches) e "Aparência" (Claro/Escuro/Automático) no
  `src/components/customize-dialog.tsx` que já existe.
- **Fora do CSS**: `layout.tsx:36` `themeColor` vira array com media query;
  `manifest.ts:10-11` fica no laranja padrão (manifest é único pra todos);
  `qrcodes-client.tsx:13` fica fixo de propósito.
