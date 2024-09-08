#!/bin/bash
docker-compose rm -f docker-compose.test.prod.yml
docker compose -f docker-compose.test.prod.yml up --build