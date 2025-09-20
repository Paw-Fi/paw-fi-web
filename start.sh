#!/bin/bash

# Debug script to understand the runtime environment
echo "Current working directory: $(pwd)"
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