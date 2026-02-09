#!/bin/sh
set -e

# Substitute only $DOMAIN in the template, preserving Nginx variables like $host, $uri, etc.
envsubst '${DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
