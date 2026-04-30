# Étape 1 : build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --include=optional

COPY . .
RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build

# Étape 2 : production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

CMD ["npm", "start"]
