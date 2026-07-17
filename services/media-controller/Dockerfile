FROM node:24-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /controller
COPY package.json package-lock.json ./
RUN npm ci
COPY services/media-controller ./services/media-controller
COPY src/lib/crypto ./src/lib/crypto
COPY scripts ./scripts
COPY prisma ./prisma
RUN npx prisma generate
CMD ["npx", "tsx", "services/media-controller/src/index.ts"]
