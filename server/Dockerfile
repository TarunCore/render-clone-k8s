# Build
FROM node:22.16 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production
FROM node:22.16-slim AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm install -g pm2

COPY --from=builder /app/dist ./dist

# Expose application and WebSocket ports
EXPOSE 3001 8080

CMD ["pm2-runtime", "dist/index.js"]