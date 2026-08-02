#!/usr/bin/env bash
# Runs a Prisma migration command against production, reading DATABASE_URL from
# .env.prod.
#
# The guards exist because of a real incident: `dotenv -e .env.production` (a file that
# does not exist) silently fell through to prisma.config.ts's own `import "dotenv/config"`,
# which loads .env — so the command ran against localhost and reported "no pending
# migrations" while production stayed untouched.
#
#   npm run migration           # apply pending migrations
#   npm run migration:status    # read-only, shows what is pending
#   npm run migration -- migrate resolve --rolled-back <name>   # recover a failed one
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.prod ]; then
  echo "error: .env.prod not found — that file holds the production DATABASE_URL." >&2
  exit 1
fi

DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env.prod | sed -E 's/^DATABASE_URL=//; s/^["'"'"']//; s/["'"'"']$//')"

if [ -z "$DATABASE_URL" ]; then
  echo "error: no DATABASE_URL in .env.prod." >&2
  exit 1
fi

case "$DATABASE_URL" in
  *localhost*|*127.0.0.1*)
    echo "error: .env.prod points at localhost. Refusing — this command is for production." >&2
    exit 1
    ;;
esac

if [ "$#" -eq 0 ]; then
  set -- migrate deploy
fi

# Host only, never the credentials.
echo "→ target: $(printf '%s' "$DATABASE_URL" | sed -E 's#.*@([^/?]+).*#\1#')"
echo

DATABASE_URL="$DATABASE_URL" exec npx prisma "$@"
