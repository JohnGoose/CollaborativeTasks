# backend/Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# 1) Copy only package files & Prisma schema first
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

# 2) Install deps (including prisma) and generate client for linux-musl
RUN npm install
RUN npx prisma generate

# 3) Copy the rest of your source
COPY . .

# 4) Build your TS
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]
