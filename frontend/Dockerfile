# frontend/Dockerfile

# 1. Use a lightweight Node image
FROM node:18-alpine

# 2. Create app directory
WORKDIR /usr/src/app

# 3. Install dependencies
COPY package*.json ./
RUN npm ci

# 4. Copy source
COPY . .

# 5. Build the Next.js app
RUN npm run build

# 6. Expose the port Next.js uses
EXPOSE 3000

# 7. Start the production server
CMD ["npm", "start"]
