#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

rsync -r \
    --exclude=".git/" \
    --exclude="dist/" \
    --exclude="node_modules/" \
    --exclude="reports/" \
    --exclude="public/" \
    --exclude="copy-template.sh" \
    "$DIR/" "$1"
