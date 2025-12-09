#!/bin/bash
# TraceSafe Fabric Network - Full Startup Script

set -e

cd "$(dirname "$0")/.."

echo "=========================================="
echo "   TraceSafe Hyperledger Fabric Network   "
echo "=========================================="

# Check for Fabric binaries
if ! command -v cryptogen &> /dev/null; then
    echo "Fabric binaries not found. Installing..."
    curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/bootstrap.sh | bash -s -- 2.5.0 1.5.7 -d -s
    export PATH=$PWD/bin:$PATH
fi

# Step 1: Generate crypto materials
echo ""
echo "Step 1: Generating crypto materials..."
./scripts/generate-crypto.sh

# Step 2: Start Docker containers
echo ""
echo "Step 2: Starting Docker containers..."
docker-compose up -d

# Wait for containers to be ready
echo "Waiting for containers to start..."
sleep 10

# Step 3: Create channel and join peers
echo ""
echo "Step 3: Creating channel and joining peers..."
./scripts/create-channel.sh

# Step 4: Deploy chaincode
echo ""
echo "Step 4: Deploying chaincode..."
./scripts/deploy-chaincode.sh

echo ""
echo "=========================================="
echo "   TraceSafe Network Started Successfully "
echo "=========================================="
echo ""
echo "Network Components:"
echo "  - Orderer: orderer.tracesafe.com:7050"
echo "  - FarmerOrg Peer: peer0.farmerorg.tracesafe.com:7051"
echo "  - DriverOrg Peer: peer0.driverorg.tracesafe.com:8051"
echo "  - RetailerOrg Peer: peer0.retailerorg.tracesafe.com:9051"
echo "  - RegulatorOrg Peer: peer0.regulatororg.tracesafe.com:10051"
echo ""
echo "CouchDB Instances:"
echo "  - FarmerOrg: http://localhost:5984"
echo "  - DriverOrg: http://localhost:6984"
echo "  - RetailerOrg: http://localhost:7984"
echo "  - RegulatorOrg: http://localhost:8984"
echo ""
echo "Channel: tracesafe-channel"
echo "Chaincode: tracesafe"
echo ""
