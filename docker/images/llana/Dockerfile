###################
# PRODUCTION
###################

ARG LLANA_VERSION=latest

FROM juicyllama/llana:${LLANA_VERSION}

USER node

RUN cd /usr/src/app

CMD [ "npm", "run", "start" ]