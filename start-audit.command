#!/bin/bash

# Simple launcher for the Operations & Systems Audit

cd "$(dirname "$0")" || exit 1

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (one-time)..."
  npm install
fi

echo "Starting local audit site on http://localhost:3000 ..."
npm run dev

