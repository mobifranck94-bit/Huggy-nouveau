# ✅ Remplace node:18-alpine par node:20-alpine
FROM node:20-alpine AS base
WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json package-lock.json* ./

# ✅ Clean install avec --include=optional pour oxide (Tailwind v4)
RUN rm -rf node_modules package-lock.json \
    && npm install --include=optional

# Copie de tout le code source pour le build
COPY . .

# ✅ Build du frontend avec limite de mémoire augmentée
RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Copie de l'application complète (incluant dist et node_modules)
COPY --from=base /app ./

# Exposition du port (Railway utilise souvent 3001 ou injecte PORT)
EXPOSE 3001

# Lancement du serveur
CMD ["npm", "start"]
