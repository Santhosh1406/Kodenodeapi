FROM node:14-alpine
ENV NODE_ENV=devlive
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
CMD npm start
