FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json tsconfig.json .env ./

RUN apk --update add imagemagick

RUN npm install