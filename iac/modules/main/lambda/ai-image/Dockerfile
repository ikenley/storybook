# syntax=docker/dockerfile:1

FROM node:22 AS build

WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# This will use a minimal base image for the runtime
FROM node:22-alpine

WORKDIR /usr/src/app

# Copy results from previous stage
COPY --from=build /usr/src/app/package*.json ./
RUN npm ci --production
COPY --from=build /usr/src/app .

RUN npm prune --production

ENTRYPOINT [ "node", "./src/index.mjs" ]