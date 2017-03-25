#!/bin/sh

set -e

docker build --tag titarenko/buhoi-migrator .
docker push titarenko/buhoi-migrator