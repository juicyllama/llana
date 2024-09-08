#!/bin/bash

# Get the latest version from package.json
VERSION=$(node -p -e "require('./package.json').version") || die "Failed to get version from package.json"

docker buildx build . \
  -t juicyllama/llana \
  -f docker/images/base/Dockerfile \
  --provenance=true \
  --sbom=true \
  --tag juicyllama/llana:latest \
  --tag juicyllama/llana:v$VERSION \
  --tag juicyllama/llana:v${VERSION%.*} \
  --tag juicyllama/llana:v${VERSION%%.*} \
  --push \
  || die "Failed to build base image"