#!/bin/bash

## check if .env file exists, if not create it from .env.example

if [ ! -f .env ]; then
    echo "Creating .env file from .env.example"
    cp .env.example .env

    echo "Print .env to make sure it was copied over"
    cat .env
fi

export $(grep -v '^#' .env | xargs)

## generate a randomly secure JWT_KEY for the .env file if ! exists

if [ -z "${JWT_KEY}" ]; then
    echo "Generating a secure JWT_KEY"
    JWT_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'));")

    ## Replace the JWT_KEY in the .env file
    sed -i -e "s/JWT_KEY=/JWT_KEY=${JWT_KEY}/" .env
    rm -rf .env-e
fi


if [ -z "${JWT_REFRESH_KEY}" ]; then
    echo "Generating a secure JWT_REFRESH_KEY"
    JWT_REFRESH_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'));")

    ## Replace the JWT_REFRESH_KEY in the .env file
    sed -i -e "s/JWT_REFRESH_KEY=/JWT_REFRESH_KEY=${JWT_REFRESH_KEY}/" .env
    rm -rf .env-e
fi
