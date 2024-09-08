###################
# BUILD FOR PRODUCTION
###################

ARG NODE_VERSION=22

# Use a builder step to download various dependencies
FROM node:${NODE_VERSION}-alpine AS build

# Install git and other OS dependencies
RUN apk add --no-cache git

WORKDIR /usr/src/app

COPY . /usr/src/app

# Install the dependencies
RUN npm install

# Run the build command which creates the production bundle
RUN npm run build

# Set NODE_ENV environment variable
ENV NODE_ENV=production

# Running `npm ci` removes the existing node_modules directory and passing in --only=production ensures that only the production dependencies are installed. This ensures that the node_modules directory is as optimized as possible
RUN npm ci --only=production && npm cache clean --force

USER node

###################
# PRODUCTION
###################

FROM node:${NODE_VERSION}-alpine AS production

# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/.env ./.env

USER node

# Start the server using the production build node dist/main.js
CMD [ "node", "dist/main.js" ]