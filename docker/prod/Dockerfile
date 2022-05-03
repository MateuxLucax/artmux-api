FROM node:18-alpine

WORKDIR /usr/src/app

COPY ["package.json", "tsconfig.json", ".env", "./"]

COPY ./src ./src

RUN npm install

CMD npm run build && npm run start