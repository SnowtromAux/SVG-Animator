set -e

ENV_FILE="/var/www/backend/.env"

if [ -n "${DB_SERVER}" ] || [ -n "${DB_USER}" ] || [ -n "${DB_NAME}" ]; then
  cat > "$ENV_FILE" <<EOF
BASE_PATH=${BASE_PATH:-svganimator/backend/api/}
DB_SERVER=${DB_SERVER}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
DB_PORT=${DB_PORT:-3306}
NUM_OF_ANIMATIONS_PER_PAGE=${NUM_OF_ANIMATIONS_PER_PAGE:-20}
EOF
  chown www-data:www-data "$ENV_FILE" || true
fi

exec "$@"
