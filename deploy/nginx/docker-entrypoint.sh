#!/bin/sh
set -e

# Substitute only $DOMAIN in the template, preserving Nginx variables like $host, $uri, etc.
envsubst '${DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# If SSL certs don't exist yet, start HTTP-only so certbot can complete the ACME challenge
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "SSL certs not found — starting in HTTP-only mode for initial certificate setup"
    # Remove the HTTPS server block entirely
    sed -i '/^# HTTPS$/,$d' /etc/nginx/conf.d/default.conf
    # Remove the HTTPS redirect so port 80 just serves the ACME challenge
    sed -i '/return 301 https/d' /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
