#!/bin/bash
# TraceSafe Fabric Network - Generate Crypto Materials

set -e

FABRIC_BIN=${FABRIC_BIN:-/usr/local/bin}
export PATH=$FABRIC_BIN:$PATH

cd "$(dirname "$0")/.."

echo "========== Generating Crypto Materials =========="

# Clean up previous artifacts
rm -rf crypto-config
rm -rf channel-artifacts/*

# Generate crypto materials
cryptogen generate --config=./crypto-config.yaml --output="crypto-config"

echo "========== Crypto materials generated =========="

echo "========== Generating Channel Artifacts =========="

mkdir -p channel-artifacts

# Generate genesis block
configtxgen -profile TraceSafeOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

# Generate channel transaction
configtxgen -profile TraceSafeChannel -outputCreateChannelTx ./channel-artifacts/tracesafe-channel.tx -channelID tracesafe-channel

# Generate anchor peer transactions
configtxgen -profile TraceSafeChannel -outputAnchorPeersUpdate ./channel-artifacts/FarmerOrgMSPanchors.tx -channelID tracesafe-channel -asOrg FarmerOrgMSP
configtxgen -profile TraceSafeChannel -outputAnchorPeersUpdate ./channel-artifacts/DriverOrgMSPanchors.tx -channelID tracesafe-channel -asOrg DriverOrgMSP
configtxgen -profile TraceSafeChannel -outputAnchorPeersUpdate ./channel-artifacts/RetailerOrgMSPanchors.tx -channelID tracesafe-channel -asOrg RetailerOrgMSP
configtxgen -profile TraceSafeChannel -outputAnchorPeersUpdate ./channel-artifacts/RegulatorOrgMSPanchors.tx -channelID tracesafe-channel -asOrg RegulatorOrgMSP

echo "========== Channel artifacts generated =========="
echo "Genesis block: channel-artifacts/genesis.block"
echo "Channel tx: channel-artifacts/tracesafe-channel.tx"
