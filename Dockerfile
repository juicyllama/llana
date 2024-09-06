###################
# BUILD FOR DEVELOPMENT
###################

ARG NODE_VERSION=22

# Use a builder step to download various dependencies
FROM node:${NODE_VERSION}-alpine AS build

# Create app directory
WORKDIR /usr/src/app

COPY ./package*.json /usr/src/app
COPY ./scripts /usr/src/app/scripts
COPY ./.env /usr/src/app/.env
COPY ./.env.example /usr/src/app/.env.example
COPY ./src/config /usr/src/app/src/config

RUN cd /usr/src/app

RUN npm ci

COPY . .

RUN npm run build