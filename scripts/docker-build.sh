#!/bin/bash
cd docker/images/base || exit
docker build -t juicyllama/llana .
cd ../../.. || exit