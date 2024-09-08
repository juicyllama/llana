#!/bin/bash
docker-compose rm -f docker-compose.dev.yml
docker compose -f docker-compose.dev.yml up --build --build 