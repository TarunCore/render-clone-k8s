FROM node:22.16

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Main Server
EXPOSE 3001
# WebSocket
EXPOSE 8080
CMD ["npm", "run", "dev"]