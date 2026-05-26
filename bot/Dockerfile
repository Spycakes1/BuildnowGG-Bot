# Wooting Competitive Discord Bot — Docker Image
FROM node:22-alpine

WORKDIR /app

# Install native build deps for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
