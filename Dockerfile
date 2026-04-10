# --- Etapa 1: Build ---
FROM node:18 AS build
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY . .
RUN npm run build


FROM node:18-slim AS production
WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

COPY .env .env

ENV PORT=8080
EXPOSE 8080

CMD ["node", "/app/dist/index.js"]
