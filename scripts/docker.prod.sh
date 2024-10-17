#!/bin/bash
docker-compose rm -f ./docker/docker-compose.test.prod.yml
docker compose -f ./docker/docker-compose.test.prod.yml up --build