#!/bin/sh

set -e

npm run lint

npm version patch
docker build --tag titarenko/buhoi-migrator .

docker push titarenko/buhoi-migrator
git push
git push --tags