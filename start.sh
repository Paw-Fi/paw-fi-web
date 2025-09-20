#!/bin/bash

# Debug script to understand the runtime environment
echo "Current working directory: $(pwd)"
echo "Environment variables:"
echo "PORT=${PORT:-'not set'}"
echo "NODE_ENV=${NODE_ENV:-'not set'}"

echo "Directory contents:"
ls -la

echo "Checking .output directory:"
if [ -d ".output" ]; then
    echo ".output directory exists"
    ls -la .output/
    if [ -d ".output/server" ]; then
        echo ".output/server directory exists"
        ls -la .output/server/
        if [ -f ".output/server/index.mjs" ]; then
            echo "index.mjs exists, starting server..."
            # Set PORT environment variable if not set (Google Cloud Run uses PORT env var)
            export PORT=${PORT:-8080}
            echo "Starting server on port $PORT"
            node .output/server/index.mjs
        else
            echo "ERROR: .output/server/index.mjs not found"
            exit 1
        fi
    else
        echo "ERROR: .output/server directory not found"
        exit 1
    fi
else
    echo "ERROR: .output directory not found"
    exit 1
fi