# Build
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package.json tsconfig.json ./
COPY ./src ./src
RUN npm install
RUN npm run build

# Run
FROM node:18-alpine
WORKDIR /usr/src/app
RUN mkdir -p /usr/src/app/public/images/trash
RUN mkdir -p /usr/src/app/public/images
COPY package.json ./
COPY .prod.env .env
RUN apk --update add imagemagick
RUN npm install --omit=dev
COPY --from=builder /usr/src/app/dist ./dist