#!/bin/bash
# TraceSafe Fabric Network - Create Channel and Join Peers

set -e

cd "$(dirname "$0")/.."

CHANNEL_NAME="tracesafe-channel"
ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/tracesafe.com/orderers/orderer.tracesafe.com/msp/tlscacerts/tlsca.tracesafe.com-cert.pem

echo "========== Creating Channel: $CHANNEL_NAME =========="

# Create channel using osnadmin
docker exec cli osnadmin channel join \
  --channelID $CHANNEL_NAME \
  --config-block /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/tracesafe-channel.block \
  -o orderer.tracesafe.com:7053 \
  --ca-file $ORDERER_CA \
  --client-cert /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/tracesafe.com/orderers/orderer.tracesafe.com/tls/server.crt \
  --client-key /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/tracesafe.com/orderers/orderer.tracesafe.com/tls/server.key

echo "========== Joining FarmerOrg Peer =========="
docker exec -e CORE_PEER_LOCALMSPID=FarmerOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.farmerorg.tracesafe.com:7051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/farmerorg.tracesafe.com/peers/peer0.farmerorg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/farmerorg.tracesafe.com/users/Admin@farmerorg.tracesafe.com/msp \
  cli peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/tracesafe-channel.block

echo "========== Joining DriverOrg Peer =========="
docker exec -e CORE_PEER_LOCALMSPID=DriverOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.driverorg.tracesafe.com:8051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/driverorg.tracesafe.com/peers/peer0.driverorg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/driverorg.tracesafe.com/users/Admin@driverorg.tracesafe.com/msp \
  cli peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/tracesafe-channel.block

echo "========== Joining RetailerOrg Peer =========="
docker exec -e CORE_PEER_LOCALMSPID=RetailerOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.retailerorg.tracesafe.com:9051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailerorg.tracesafe.com/peers/peer0.retailerorg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailerorg.tracesafe.com/users/Admin@retailerorg.tracesafe.com/msp \
  cli peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/tracesafe-channel.block

echo "========== Joining RegulatorOrg Peer =========="
docker exec -e CORE_PEER_LOCALMSPID=RegulatorOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.regulatororg.tracesafe.com:10051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulatororg.tracesafe.com/peers/peer0.regulatororg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulatororg.tracesafe.com/users/Admin@regulatororg.tracesafe.com/msp \
  cli peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/tracesafe-channel.block

echo "========== All peers joined channel: $CHANNEL_NAME =========="
