#!/bin/bash
cd docker/images/base
docker build -t juicyllama/llana .
cd ../../..