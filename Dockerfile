FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Railway Volume mounts to /app/data
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/index.js"]
