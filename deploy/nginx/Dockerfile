# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app

COPY src/Client/timesheets-web/package.json src/Client/timesheets-web/package-lock.json ./
RUN npm ci

COPY src/Client/timesheets-web/ ./

# Empty string makes API calls use relative paths (same origin)
ENV VITE_API_BASE_URL=""
RUN npm run build

# Stage 2: Nginx
FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our Nginx configs
COPY deploy/nginx/nginx.conf /etc/nginx/nginx.conf
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Copy entrypoint script (envsubst for DOMAIN variable)
COPY deploy/nginx/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built frontend
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
