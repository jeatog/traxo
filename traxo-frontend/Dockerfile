# Fase 1: build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:prod

# Fase 2: serve con Nginx
FROM nginx:alpine
COPY --from=builder /app/dist/traxo-frontend/browser /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
