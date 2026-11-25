#!/usr/bin/env bash
# Sube el código al servidor y reconstruye el contenedor.
# Uso: bash scripts/deploy.sh            (código)
#      bash scripts/deploy.sh --env      (además, regenera el .env del servidor a partir de .env.local)
set -euo pipefail

HOST="${DEPLOY_HOST:-root@82.223.202.30}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/aosoft_deploy}"
DIR="${DEPLOY_DIR:-/opt/repocast}"
SITE_URL="${SITE_URL:-https://repocast.82-223-202-30.sslip.io}"
SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes "$HOST")

cd "$(dirname "$0")/.."
"${SSH[@]}" "mkdir -p $DIR"

if [[ "${1:-}" == "--env" ]]; then
  # El servidor no necesita la conexión directa a Postgres (solo la usan las migraciones).
  { grep -vE '^(SUPABASE_DB_URL|BD_PW|NEXT_PUBLIC_SITE_URL)=' .env.local; echo "NEXT_PUBLIC_SITE_URL=$SITE_URL"; } \
    | "${SSH[@]}" "umask 077 && cat > $DIR/.env"
  echo "· .env actualizado"
fi

# Ficheros versionados y nuevos no ignorados (respeta .gitignore: nunca sube .env.local ni el PDF).
git ls-files -co --exclude-standard -z | tar --null -T - -czf - | "${SSH[@]}" "tar -xzf - -C $DIR"
echo "· código subido"

"${SSH[@]}" "set -e; cd $DIR && docker compose up -d --build && docker image prune -f >/dev/null && docker compose ps"
