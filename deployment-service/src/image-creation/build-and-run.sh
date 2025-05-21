#!/bin/bash

# Variables
REPO_URL=$1
COMMIT_HASH=$2

# Clone and build
git clone $REPO_URL app
cd app
git checkout $COMMIT_HASH
npm install

# RUN command from params
# node index.js
