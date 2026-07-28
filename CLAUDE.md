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
  tsc limpo).
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

- Commits pequenos, um por mudança lógica (ex: uma tabela por commit num refactor de DB).
- Mensagem minúscula, direta, sem atribuição de IA.
- Usar Conventional Commit messages (sempre em inglês)
- **Nunca commitar ou dar push sem pedido explícito** ("comita", "da push").
- **Avisar ANTES de implementar** se um pedido não encaixa bem no modelo atual (ex: overlap
  de tabelas, escopo ambíguo) — não implementar e descobrir o problema no meio.

## Deploy

Scripts relevantes: `npm run migrate:deploy` (`prisma migrate deploy`), `npm run seed`
(`prisma/seed.ts`), `postinstall` já roda `prisma generate` automático.
