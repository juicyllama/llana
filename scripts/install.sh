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

## generate randomly secure config auth details for the .env file if ! exists

if [ -z "${CONFIG_AUTH_USERNAME}" ]; then
    echo "Generating a secure CONFIG_AUTH_USERNAME"
    CONFIG_AUTH_USERNAME=$(node -e "console.log(require('crypto').randomBytes(8).toString('hex'));")
    sed -i -e "s/CONFIG_AUTH_USERNAME=/CONFIG_AUTH_USERNAME=${CONFIG_AUTH_USERNAME}/" .env
    rm -rf .env-e
fi

if [ -z "${CONFIG_AUTH_PASSWORD}" ]; then
    echo "Generating a secure CONFIG_AUTH_PASSWORD"
    CONFIG_AUTH_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'));")
    sed -i -e "s/CONFIG_AUTH_PASSWORD=/CONFIG_AUTH_PASSWORD=${CONFIG_AUTH_PASSWORD}/" .env
    rm -rf .env-e
fi

if [ -z "${CONFIG_AUTH_REALM}" ]; then
    echo "Generating a secure CONFIG_AUTH_REALM"
    CONFIG_AUTH_REALM=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'));")
    sed -i -e "s/CONFIG_AUTH_REALM=/CONFIG_AUTH_REALM=${CONFIG_AUTH_REALM}/" .env
    rm -rf .env-e
fi


    echo "Checking config files"

if [ ! -f src/config/auth.config.ts ]; then
    cp src/config/auth.config.example.ts src/config/auth.config.ts
fi

if [ ! -f src/config/roles.config.ts ]; then
    cp src/config/roles.config.example.ts src/config/roles.config.ts
fi