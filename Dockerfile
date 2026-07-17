FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S camera && adduser -S camera -G camera
COPY --from=build --chown=camera:camera /app/.next/standalone ./
COPY --from=build --chown=camera:camera /app/.next/static ./.next/static
COPY --from=build --chown=camera:camera /app/public ./public
COPY --from=build --chown=camera:camera /app/prisma ./prisma
USER camera
EXPOSE 3000
CMD ["node", "server.js"]
