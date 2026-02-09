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

# 1. Start services — nginx will detect missing certs and run in HTTP-only mode
echo "==> Starting services (nginx in HTTP-only mode) ..."
docker compose up -d --build

echo "==> Waiting for nginx to be ready ..."
sleep 5

# 2. Request real certificate from Let's Encrypt
echo "==> Requesting certificate from Let's Encrypt ..."
docker compose run --rm --entrypoint "certbot" certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN"

# 3. Restart nginx so it picks up the new cert and enables HTTPS
echo "==> Restarting nginx with SSL certificate ..."
docker compose restart nginx

echo "==> Done! SSL certificate obtained for $DOMAIN"
echo "    Visit https://$DOMAIN"
