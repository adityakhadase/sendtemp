# Stage 1: Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma Client & compile TypeScript
RUN npx prisma generate
RUN npm run build

# Prune dev dependencies for production runtime
RUN npm prune --production

# Stage 2: Production Runtime Stage
FROM node:22-alpine AS runner

# Install OpenSSL and compatibility libraries required by Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create ephemeral storage directories and assign ownership to non-root node user
RUN mkdir -p /app/tmp/sendtemp-storage /app/tmp/sendtemp-staging && \
    chown -R node:node /app

# Copy production node_modules, generated Prisma client, and built files
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/package*.json ./

# Switch to non-root user
USER node

EXPOSE 8080

CMD ["node", "dist/index.js"]
