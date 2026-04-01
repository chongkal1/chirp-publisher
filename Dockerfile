FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma/ ./prisma/
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx prisma generate

# Railway Volume mounts to /app/data
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
