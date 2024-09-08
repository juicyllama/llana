###################
# BUILD
###################

ARG NODE_VERSION=22

# Use a builder step to download various dependencies
FROM node:${NODE_VERSION}-alpine AS build

# Install git and other OS dependencies
RUN apk add --no-cache git

WORKDIR /usr/src/app

COPY . .

RUN chown -R node:node /usr/src/app

USER node

RUN cd /usr/src/app

# Install the dependencies
RUN npm ci
RUN npm run build

###################
# PRODUCTION
###################

FROM node:${NODE_VERSION}-alpine AS production

WORKDIR /usr/src/app

# Copy the app from the build stage
COPY --chown=node:node --from=build /usr/src/app .

RUN chown -R node:node /usr/src/app

USER node

RUN cd /usr/src/app

CMD [ "npm", "run", "start" ]

