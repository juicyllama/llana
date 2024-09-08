#!/bin/bash
docker-compose rm -f docker-compose.test.prod.build.yml
docker compose -f docker-compose.test.prod.build.yml up --build