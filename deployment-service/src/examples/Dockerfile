FROM node:22.15
WORKDIR /app
RUN git clone https://github.com/TarunCore/FFCS-Combogen-Backend

WORKDIR /app/FFCS-Combogen-Backend
RUN npm install

EXPOSE 3000
CMD ["node", "index.js"]