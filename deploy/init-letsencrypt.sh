#!/bin/bash
# Bootstrap SSL certificates from Let's Encrypt.
# Run once on first deployment, then certbot sidecar handles renewal.
set -e

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DOMAIN" ] || [ -z "$CERTBOT_EMAIL" ]; then
  echo "Error: DOMAIN and CERTBOT_EMAIL must be set in .env"
  exit 1
fi

echo "==> Obtaining SSL certificate for $DOMAIN ..."

# 1. Start Nginx in HTTP-only mode (it will fail on the HTTPS block if
#    certs don't exist yet, so we create a self-signed placeholder first).
echo "==> Creating temporary self-signed certificate ..."
mkdir -p ./certbot/conf/live/$DOMAIN
docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "==> Starting Nginx with temporary certificate ..."
docker compose up -d nginx

echo "==> Removing temporary certificate ..."
docker compose run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "==> Requesting real certificate from Let's Encrypt ..."
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN"

echo "==> Reloading Nginx with real certificate ..."
docker compose exec nginx nginx -s reload

echo "==> Done! SSL certificate obtained for $DOMAIN"
