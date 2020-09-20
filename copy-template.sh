#!/usr/bin/env sh

rsync -r --exclude=.git --exclude=dist --exclude=node_modules/ --exclude=out --exclude=.nyc_output --exclude=coverage --exclude=copy-template.sh . "$1"
