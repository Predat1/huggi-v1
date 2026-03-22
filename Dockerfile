# Build front (Vite)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime : API + fichiers statiques
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
RUN mkdir -p /data/sites
EXPOSE 8080
ENV PORT=8080
ENV SITES_DIR=/data/sites
CMD ["node", "server/index.mjs"]
