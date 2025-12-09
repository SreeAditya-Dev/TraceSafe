#!/bin/bash
# TraceSafe Fabric Network - Stop Network

set -e

cd "$(dirname "$0")/.."

echo "=========================================="
echo "   Stopping TraceSafe Fabric Network     "
echo "=========================================="

# Stop all containers
docker-compose down

# Optionally remove volumes (uncomment to reset state)
# docker-compose down -v

echo ""
echo "=========================================="
echo "   TraceSafe Network Stopped             "
echo "=========================================="
