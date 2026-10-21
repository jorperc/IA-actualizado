# Multi-stage Dockerfile for Google Cloud Run deployment
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy sources and build client
COPY . .
RUN npm run build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend assets
COPY --from=builder /app/dist ./dist
# Copy server files
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Install tsx globally in runner for production execution
RUN npm install -g tsx

# Expose standard Cloud Run port
EXPOSE 8080

CMD ["tsx", "server.ts"]
