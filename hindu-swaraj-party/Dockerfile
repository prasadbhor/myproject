# ============================================================
# Hindu Swaraj Party — Dockerfile
# ============================================================
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Data directory for NeDB
RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV ADMIN_TOKEN=hsp-admin-2024

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
