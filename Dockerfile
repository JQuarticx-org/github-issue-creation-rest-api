FROM node:alpine
WORKDIR /postMessage
COPY package.json .
RUN npm i
COPY . .
CMD ["node", "main.js"]