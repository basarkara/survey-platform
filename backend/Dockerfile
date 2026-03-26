FROM node:20-alpine

WORKDIR /app

# Bağımlılıkları önce kopyala (cache için)
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
