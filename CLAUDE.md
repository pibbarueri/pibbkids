@AGENTS.md

# CLAUDE.md — PIBB Kids

Ferramenta de gestão do ministério infantil da PIBB. Substitui Google Sheets/Notion/Drive
espalhados, com controle de acesso por perfil. PWA mobile-first (maioria do uso é celular).

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
`ADMIN`, `COORDINATOR`, `TEACHER`, `ASSISTANT`, `RECEPTIONIST`

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
- Inputs de texto: `maxLength 70`. Telefone: mascarar só na UI, salvar dígitos puros no banco
  (`src/lib/phone.ts`).
- Modais: título fixo/sticky no scroll vertical.
- Tela de inativos (voluntários/crianças): restaurar e excluir permanente pedem confirmação
  (excluir permanente exige digitar "confirmar exclusão").
- Sliders/dropdowns/etc: reusar primitives de `src/components/ui/`, não reinventar.

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
  mantidos manualmente por SQL. Um reset por reimport já destruiu ~36
  telefones digitados à mão. Se precisar migrar dado em qualquer tabela, `UPDATE`/`ALTER`
  cirúrgico, nunca wipe.
- Reset de senha de usuário: `require_password_change = true` — não precisa mexer em
  `user_sessions` pra isso. Fluxo "Esqueci minha senha" reusa `/first-access`
  (challenge por CPF → mãe → nascimento).
- **Nunca alterar credenciais de usuário real pra teste.** Usar só a conta `test` (ver Testes
  abaixo), alternando role via script quando precisar.
- Não existe mais login `admin/admin` — o usuário admin real foi renomeado para `gustavo`.

### Migrations: armadilhas conhecidas

Todas já aconteceram de verdade, em produção.

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

Conta de teste dedicada: `test` / `test1234` (role trocado via script conforme necessário). Nunca usar contas reais (`gustavo`, etc)
pra testes destrutivos.

Pra forçar re-login após trocar role de um usuário via script (JWT cacheia a role no login,
não pega mudança de DB sozinho):
```js
await prisma.userSession.deleteMany({ where: { userId } });
```
isso invalida a sessão e força login de novo já com a role nova.

Fluxo de verificação de UI: `preview_start` (`.claude/launch.json`, nome `pibbkids-dev`,
porta 3000) → login → navegar → `read_page`/screenshot pra conferir. Preferir `ref_N` de
`read_page` a coordenadas de pixel quando clique não registrar.

## Git / commits

- **Feature branches + PR.** Todo trabalho em branch própria, nunca commit direto em `main`.
  Abrir PR (`gh pr create`) pra revisão/merge — merge de `main` costuma ser feito pelo
  usuário no GitHub, não pelo agente (push direto pra `main` é ação bloqueada pro agente).
- Commits pequenos, um por mudança lógica (ex: uma tabela por commit num refactor de DB).
- Mensagem minúscula, direta, sem atribuição de IA.
- Usar Conventional Commit messages (sempre em inglês)
- **Nunca commitar ou dar push sem pedido explícito** ("comita", "da push").
- **Avisar ANTES de implementar** se um pedido não encaixa bem no modelo atual (ex: overlap
  de tabelas, escopo ambíguo) — não implementar e descobrir o problema no meio.

## Deploy

App na Vercel, buildado automaticamente no push pra `main`. Banco na Supabase.

Migrations em produção:

- `npm run migration:status` — read-only, mostra o que está pendente. **Rodar sempre antes.**
- `npm run migration` — aplica as pendentes.
- `npm run migration -- migrate resolve --rolled-back <nome>` — recovery de migration falha.

Os três passam por `scripts/prod-migrate.sh`, que lê `DATABASE_URL` do `.env.prod`, imprime o
host de destino e se recusa a rodar contra localhost.

**`npm run migration` só roda quando pedido explicitamente.** Com feature branches, o normal é
rodar a migration na hora do merge do PR (pouco antes), não durante o desenvolvimento na
branch — senão prod fica com schema novo e código velho (deployado) incompatível entre si,
gerando erro em produção até o merge acontecer.

**Ordem em deploy que tem migration: migration primeiro, merge depois.** A Vercel builda no
push; se o app novo subir antes do schema, quebra em runtime.

Outros scripts: `npm run seed` (`prisma/seed.ts`), `postinstall` já roda `prisma generate`.

## Sessões na nuvem (claude.ai/code)

O repo também é trabalhado por sessões rodando em container da Anthropic, despachadas do
celular. Se você é uma delas, saiba o que não dá:

- **Sem `.env.prod`** (está no `.gitignore`) → `npm run migration` falha com
  `error: .env.prod not found`. Não contornar, não pedir a credencial. Deixar o SQL da
  migration commitado e avisar que ela roda no PC.
- **Sem banco de produção e sem dev server visível** → nada de verificação por
  `preview_start`. Verificar por `tsc`/lint e descrever o que precisa ser conferido à mão.
- **Escopo**: código, branch, PR. Push pra `main` dispara o deploy na Vercel — isso funciona
  normalmente.

## Redesign

Plano aprovado em `docs/redesign-plan.md` (restyle visual completo; temas/dark mode é Fase 2).
Implementar numa branch `redesign`. Ainda não começou.
