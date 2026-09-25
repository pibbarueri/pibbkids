@AGENTS.md

# CLAUDE.md — PIBB Kids

Ferramenta de gestão do ministério infantil da PIBB. Substitui Google Sheets/Notion/Drive
espalhados, com controle de acesso por perfil. PWA mobile-first (maioria do uso é celular).

- **use caveman skill if available**
- **use cavecrew skill if available**

## Stack

- Next.js 16 (App Router) + TypeScript
- Prisma 7 + `@prisma/adapter-pg` (driver adapter) + PostgreSQL
- NextAuth v5 (Credentials + JWT, sessão revogável via `user_sessions`)
- shadcn/ui em cima de Base UI (`@base-ui/react/*` — dialog, menu, slider, input...)
- Tailwind v4
- Hosting alvo: Vercel (app) + Supabase (Postgres + Storage)

Sem módulo financeiro — fora de escopo, não propor.

## Papéis e turmas

Roles (`Role` enum):
`ADMIN`, `COORDINATOR`, `TEACHER`, `ASSISTANT`, `RECEPTIONIST`, `SUPPORT`

Turmas (nomes fixos, ordem canônica em `src/lib/classes.ts`):
Berçário, Primeiros Passos, Ovelhinhas, Detetives, Quase Lá

Módulos: Crianças, Voluntários, Turmas, Currículos/Aulas (EBD e Culto por domingo), Escala,
Presença, Diário de Sala, Ocorrências, Solicitação de Compras, Materiais/Estoque, Eventos,
QR Codes de cadastro.

## Convenções de código

- **Idioma**: todo código — arquivos, pastas, variáveis, funções, enums, comentários — em
  inglês. Chat/conversa é em português. UI (labels visíveis) fica em pt-BR;
  só o enum/valor de banco é inglês.
- Componentes client (`"use client"`) + API routes em `src/app/api/**/route.ts` seguem o
  padrão: `auth()` → checar permissão via `src/lib/permissions.ts` → validar body → query.
  Ver `src/app/api/occurrences/` como referência de CRUD completo (list/create/patch/delete,
  soft status, dialog de detalhe, confirm-to-delete).
- Permissões centralizadas em `src/lib/permissions.ts` (`canManage`, `isLeadership`, helpers
  por feature). Nunca checar `role === Role.X` solto num componente — adicionar/usar helper.
- Inputs de texto: `maxLength 70` — já vem por padrão do primitive `src/components/ui/input.tsx`,
  não precisa repetir. **Títulos usam `maxLength={50}` explícito.** `type="url"` e
  `type="email"` são isentos do cap de propósito: URL de pasta do Drive tem ~84 chars, e
  cortar em 70 gera link quebrado silencioso (já aconteceu). Campo que precisar de limite
  diferente passa `maxLength` na mão.
- Telefone: mascarar só na UI, salvar dígitos puros no banco (`src/lib/phone.ts`).
- Modais: título fixo/sticky no scroll vertical.
- **Texto livre de usuário usa `wrap-anywhere`, nunca `break-words`.** Ver "Layout" abaixo.
- Tela de inativos (voluntários/crianças): restaurar e excluir permanente pedem confirmação
  (excluir permanente exige digitar "confirmar exclusão").
- Sliders/dropdowns/etc: reusar primitives de `src/components/ui/`, não reinventar.

### Layout: known issues

- **`break-words` não segura token indivisível dentro de grid/flex — use `wrap-anywhere`.**
  `overflow-wrap: break-word` **não reduz o min-content** da caixa (só `anywhere` reduz), e
  um grid/flex item tem `min-width: auto`, ou seja, piso = min-content. Resultado: uma URL
  colada de 79 chars empurrou o item pra 420px numa content box de 352px, e como o item que
  estourou era o mesmo que continha a fileira de botões, **os botões foram cortados** pelo
  `overflow-x-hidden` do `DialogContent`. `min-w-0` **não resolve** — foi a primeira coisa
  que tentamos. Medido: `break-words` 420px vs `wrap-anywhere` 352px (zero estouro), com
  quebra idêntica em prosa normal (mesmo número de linhas, nenhuma palavra picotada).
  Regra prática: todo campo que renderiza texto que o usuário digitou (descrição, detalhes,
  título) leva `wrap-anywhere`.
- **URL crua em texto de usuário passa por `LinkifiedText`**
  (`src/components/ui/linkified-text.tsx`), que vira link com label encurtado
  (`host/primeiro-segmento/…`) e `href` completo. O texto é fatiado em nós React, nunca
  `dangerouslySetInnerHTML` — e só `http`/`https` casam, então `javascript:`/`data:` colados
  ficam como texto inerte.
- **`line-clamp-*` já traz `overflow: hidden`**, então card de lista com `min-w-0` no pai
  não estoura — mas ainda leva `wrap-anywhere` pra não picotar a URL no meio no preview.

## Banco de dados

- **Mudança de dado (não de schema): direto em SQL/script**, sem precisar tocar TS. Script
  ad-hoc: criar `.mjs` na raiz do repo com
  ```js
  import { PrismaClient } from '@prisma/client';
  import { PrismaPg } from '@prisma/adapter-pg';
  import 'dotenv/config';
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  ```
  rodar com `npx tsx arquivo.mjs`, **apagar o arquivo depois**.
- **Mudança de schema**: editar `prisma/schema.prisma` + `npx prisma migrate dev --name X`
  (dev local) + `npx prisma generate` + `npx tsc --noEmit`. Reiniciar o dev server depois de
  `prisma generate` (Next.js/Turbopack cacheia o client antigo e quebra em runtime mesmo com
  tsc limpo). Sem TTY, ver "Migrations: armadilhas conhecidas" abaixo.
- **NUNCA truncar ou reimportar nenhum dado.** São dados reais,
  mantidos manualmente por SQL. Se precisar migrar dado em qualquer tabela, `UPDATE`/`ALTER`
  cirúrgico, nunca wipe.
- Reset de senha de usuário: `require_password_change = true` — não precisa mexer em
  `user_sessions` pra isso. Fluxo "Esqueci minha senha" reusa `/first-access`
  (challenge por CPF → mãe → nascimento).
- **Nunca alterar credenciais de usuário real pra teste.** Usar só a conta `test` (ver Testes
  abaixo), alternando role via script quando precisar.
- Não existe mais login `admin/admin` — o usuário admin real foi renomeado para `gustavo`.

### Migrations: known issues

- **`prisma migrate dev` é interativo** e trava/falha sem TTY (sessão de agente, CI). Usar
  `npx prisma migrate dev --create-only --name X`, editar o SQL à mão, depois
  `npx prisma migrate deploy`.
- **Coluna `@updatedAt` nova em tabela que já tem linhas** gera `NOT NULL` sem default e
  estoura `23502`. Passa despercebido no local se a tabela estiver vazia. Padrão correto —
  adicionar nullable, backfillar, só então travar (ver
  `prisma/migrations/20260802033851_add_material_details_and_audit/migration.sql`):
  ```sql
  ALTER TABLE "t" ADD COLUMN "updated_at" TIMESTAMP(3);
  UPDATE "t" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
  ALTER TABLE "t" ALTER COLUMN "updated_at" SET NOT NULL;
  ```
- **O pooler da Supabase não preserva a transação do arquivo inteiro.** Migration que falha no
  meio deixa o DDL anterior aplicado — não confiar em rollback automático. Depois de um
  `P3018`, inspecionar o que sobrou (tipo criado, coluna adicionada) e limpar à mão **antes**
  de `npm run migration -- migrate resolve --rolled-back <nome>`. Resolver sem limpar faz a
  tentativa seguinte falhar com `42710 type already exists` ou equivalente.
- **Migration destrutiva ou de conversão de tipo leva guard.** `DO $$ ... RAISE EXCEPTION`
  que aborta com mensagem legível em vez de corromper. Referência:
  `prisma/migrations/20260802042451_schedule_slot_date_as_date/migration.sql`.

### Datas

`ScheduleSlot.date` é coluna `DATE`, não timestamp — um slot pertence a um dia de calendário,
não a um instante. `src/lib/dates.ts` é a fonte única: `today()`, `nextSunday()`, `addDays()`,
`sundaysBetween()`, `utcDate()`, com `APP_TIME_ZONE = "America/Sao_Paulo"`.

**Nunca usar `new Date()` direto para dia de calendário.** O bug "Próxima escala só mostra EBD"
nasceu disso: o mesmo domingo gravado em dois instantes diferentes (meia-noite UTC pelo import,
meia-noite local pelo app), e o filtro de igualdade pegava só um dos conjuntos.

### Categorias de material

`material_categories` é tabela de lookup, não enum. Adicionar categoria é `INSERT` — sem
migration, sem deploy:

```sql
INSERT INTO material_categories (id, name, sort_order) VALUES ('livros', 'Livros', 70);
```

`active = false` esconde do picker sem quebrar os materiais que ainda apontam pra ela.
`Material.categoryId` é nullable — material cadastrado antes das categorias aparece como
"Sem categoria" até alguém editar.

## Testes manuais / contas

Pra forçar re-login após trocar role de um usuário via script (JWT cacheia a role no login,
não pega mudança de DB sozinho):
```js
await prisma.userSession.deleteMany({ where: { userId } });
```
isso invalida a sessão e força login de novo já com a role nova.

Fluxo de verificação de UI: `preview_start` (`.claude/launch.json`, nome `pibbkids-dev`,
porta 3000) → login → navegar → `read_page`/screenshot pra conferir. Preferir `ref_N` de
`read_page` a coordenadas de pixel quando clique não registrar.

## Git Workflow

### Branches

- Crie branches sempre a partir da `main` (nunca commit direto na `main`)
- Todo trabalho em branch própria (feature branch)
- nomes devem seguir o padrão de nomenclatura do [Conventional Branch](https://conventionalbranch.org)
- sempre use `rebase` ao invés de `merge` quando for sincronizar uma branch com a `main`

### Commits

- Commits pequenos, um por mudança lógica (um commit deve ser um "entregável" completo)
- Mensagem sem atribuição de IA, seguindo as convenções do [Conventional Commits](https://www.conventionalcommits.org), sempre em inglês
- Nunca use "co-authored" ou qualquer outra menção de AI em commits/PRs

### Pull Requests

- Mantenha a descrição do PR focada em informações relevantes e fácil de ler rapidamente; não a transforme em um CHANGELOG
- Siga o arquivo `.github/pull_request_template.md` para obter detalhes e preencha-o adequadamente ao criar PRs.
- Busque manter um histórico de commits claro e descrições de PR detalhadas para facilitar as revisões.
- NUNCA mencione que um assistente ou IA trabalhou na alteração, e NUNCA adicione atribuições a IA/assistentes ou rodapés do tipo "Gerado com..." às ​​descrições dos PRs.
- Adote o estilo de PR preferido do repositório:
  - resumo conciso da alteração
  - lista simples de tópicos para comportamentos relevantes, endpoints, efeitos colaterais, documentação, etc
  - screenshot da alteração, se possivel

- **Avisar ANTES de implementar** se um pedido não encaixa bem no modelo atual (ex: overlap
  de tabelas, escopo ambíguo) — não implementar e descobrir o problema no meio.

## Deploy

App na Vercel, banco na Supabase. Repo em `pibbarueri/pibbkids` (org privada no GitHub).

**Deploy de produção acontece no push de uma tag `v*`, não no merge na `main`.** O plano Hobby
da Vercel não conecta em repo privado de organização, então a integração Git da Vercel está
desligada e quem faz o deploy é `.github/workflows/deploy.yml` (`vercel pull` → `vercel build`
→ `vercel deploy --prebuilt --prod`). Merge na `main` não sobe nada sozinho. Pra publicar:

```bash
git checkout main && git pull
git tag vX.Y.Z && git push origin vX.Y.Z
```

Secrets do workflow (Settings → Secrets and variables → Actions): `VERCEL_TOKEN`,
`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Env vars do app continuam no projeto da Vercel, o
`vercel pull` busca de lá.

Migrations em produção:

- `npm run migration:status` — read-only, mostra o que está pendente. **Rodar sempre antes.**
- `npm run migration` — aplica as pendentes.
- `npm run migration -- migrate resolve --rolled-back <nome>` — recovery de migration falha.

Os três passam por `scripts/prod-migrate.sh`, que lê `DATABASE_URL` do `.env.prod`, imprime o
host de destino e se recusa a rodar contra localhost.

**`npm run migration` só roda quando pedido explicitamente.** O normal é rodar a migration
logo antes de criar a tag, não durante o desenvolvimento na branch. Senão prod fica com schema
novo e código velho (deployado) incompatível entre si, gerando erro em produção até a tag sair.

**Ordem em deploy que tem migration: merge, migration, tag.** O workflow builda no push da
tag; se o app novo subir antes do schema, quebra em runtime.

Outros scripts: `npm run seed` (`prisma/seed.ts`), `postinstall` já roda `prisma generate`.

## Sessões na nuvem (claude.ai/code)

O repo também é trabalhado por sessões rodando em container da Anthropic, despachadas do
celular. Se você é uma delas, saiba o que não dá:

- **Sem `.env.prod`** (está no `.gitignore`) → `npm run migration` falha com
  `error: .env.prod not found`. Não contornar, não pedir a credencial. Deixar o SQL da
  migration commitado e avisar que ela roda no PC.
- **Sem banco de produção e sem dev server visível** → nada de verificação por
  `preview_start`. Verificar por `tsc`/lint e descrever o que precisa ser conferido à mão.
- **Escopo**: código, branch, PR. Não criar tag de versão por conta própria: tag dispara deploy
  de produção.

## Redesign

Plano aprovado em `docs/redesign-plan.md` (restyle visual completo; temas/dark mode é Fase 2).
Implementar numa branch `redesign`. Ainda não começou.
