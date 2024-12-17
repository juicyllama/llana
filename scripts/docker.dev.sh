#!/bin/bash
docker compose -f ./docker/docker-compose.dev.yml down  --remove-orphans --volumes
docker compose -f ./docker/docker-compose.dev.yml rm 
docker compose -f ./docker/docker-compose.dev.yml up --build --detach