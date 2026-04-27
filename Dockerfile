FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY index.html ./
COPY admin.html ./
COPY login.html ./
COPY preview.html ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 5173

CMD ["node", "server.js"]
