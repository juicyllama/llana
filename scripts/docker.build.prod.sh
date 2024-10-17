#!/bin/bash
docker-compose rm -f ./docker/docker-compose.test.prod.build.yml
docker compose -f ./docker/docker-compose.test.prod.build.yml up --build