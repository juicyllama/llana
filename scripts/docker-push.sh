#!/bin/bash

cd docker/images/base

# Set the DOCKER_REPO to the name of your Docker repository

DOCKER_REPO=juicyllama/llana

# Get the latest version from package.json
VERSION=$(node -p -e "require('../../.././package.json').version")

# Break version down to create docker tags as: latest, vx.x.x, vx.x, v.x

docker image tag $DOCKER_REPO $DOCKER_REPO:latest
docker image tag $DOCKER_REPO $DOCKER_REPO:v$VERSION
docker image tag $DOCKER_REPO $DOCKER_REPO:v${VERSION%.*}
docker image tag $DOCKER_REPO $DOCKER_REPO:v${VERSION%%.*}

docker image push --all-tags $DOCKER_REPO

cd ../../..