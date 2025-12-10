#!/bin/bash
# TraceSafe Chaincode Upgrade Script
# Upgrades the chaincode to a new version with updated logic

set -e

CHAINCODE_NAME="tracesafe"
CHAINCODE_VERSION="1.1"  # Incremented from 1.0
CHAINCODE_SEQUENCE="2"   # Incremented from 1
CHANNEL_NAME="tracesafe-channel"
CHAINCODE_PATH="/opt/gopath/src/github.com/chaincode/tracesafe"

echo "========== Upgrading TraceSafe Chaincode =========="
echo "Chaincode: $CHAINCODE_NAME"
echo "New Version: $CHAINCODE_VERSION"
echo "Sequence: $CHAINCODE_SEQUENCE"

# Package the chaincode
echo "========== Packaging Chaincode =========="
docker exec cli peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz \
  --path $CHAINCODE_PATH \
  --lang golang \
  --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}

# Install on all orgs
echo "========== Installing on FarmerOrg =========="
docker exec -e CORE_PEER_LOCALMSPID=FarmerOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.farmerorg.tracesafe.com:7051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/farmerorg.tracesafe.com/peers/peer0.farmerorg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/farmerorg.tracesafe.com/users/Admin@farmerorg.tracesafe.com/msp \
  cli peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

echo "========== Installing on DriverOrg =========="
docker exec -e CORE_PEER_LOCALMSPID=DriverOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.driverorg.tracesafe.com:8051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/driverorg.tracesafe.com/peers/peer0.driverorg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/driverorg.tracesafe.com/users/Admin@driverorg.tracesafe.com/msp \
  cli peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

echo "========== Installing on RetailerOrg =========="
docker exec -e CORE_PEER_LOCALMSPID=RetailerOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.retailerorg.tracesafe.com:9051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailerorg.tracesafe.com/peers/peer0.retailerorg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailerorg.tracesafe.com/users/Admin@retailerorg.tracesafe.com/msp \
  cli peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

echo "========== Installing on RegulatorOrg =========="
docker exec -e CORE_PEER_LOCALMSPID=RegulatorOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.regulatororg.tracesafe.com:10051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulatororg.tracesafe.com/peers/peer0.regulatororg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulatororg.tracesafe.com/users/Admin@regulatororg.tracesafe.com/msp \
  cli peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

# Get Package ID
echo "========== Getting Package ID =========="
PACKAGE_ID=$(docker exec -e CORE_PEER_LOCALMSPID=FarmerOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.farmerorg.tracesafe.com:7051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/farmerorg.tracesafe.com/peers/peer0.farmerorg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/farmerorg.tracesafe.com/users/Admin@farmerorg.tracesafe.com/msp \
  cli peer lifecycle chaincode queryinstalled | grep "Label: ${CHAINCODE_NAME}_${CHAINCODE_VERSION}" | sed -n 's/^Package ID: //; s/, Label:.*$//p')

echo "Package ID: $PACKAGE_ID"

# Approve for all orgs
echo "========== Approving for FarmerOrg =========="
docker exec -e CORE_PEER_LOCALMSPID=FarmerOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.farmerorg.tracesafe.com:7051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/farmerorg.tracesafe.com/peers/peer0.farmerorg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/farmerorg.tracesafe.com/users/Admin@farmerorg.tracesafe.com/msp \
  cli peer lifecycle chaincode approveformyorg \
  --channelID $CHANNEL_NAME \
  --name $CHAINCODE_NAME \
  --version $CHAINCODE_VERSION \
  --package-id $PACKAGE_ID \
  --sequence $CHAINCODE_SEQUENCE \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/tracesafe.com/orderers/orderer.tracesafe.com/msp/tlscacerts/tlsca.tracesafe.com-cert.pem \
  -o orderer.tracesafe.com:7050

echo "========== Approving for DriverOrg =========="
docker exec -e CORE_PEER_LOCALMSPID=DriverOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.driverorg.tracesafe.com:8051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/driverorg.tracesafe.com/peers/peer0.driverorg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/driverorg.tracesafe.com/users/Admin@driverorg.tracesafe.com/msp \
  cli peer lifecycle chaincode approveformyorg \
  --channelID $CHANNEL_NAME \
  --name $CHAINCODE_NAME \
  --version $CHAINCODE_VERSION \
  --package-id $PACKAGE_ID \
  --sequence $CHAINCODE_SEQUENCE \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/tracesafe.com/orderers/orderer.tracesafe.com/msp/tlscacerts/tlsca.tracesafe.com-cert.pem \
  -o orderer.tracesafe.com:7050

echo "========== Approving for RetailerOrg =========="
docker exec -e CORE_PEER_LOCALMSPID=RetailerOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.retailerorg.tracesafe.com:9051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailerorg.tracesafe.com/peers/peer0.retailerorg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailerorg.tracesafe.com/users/Admin@retailerorg.tracesafe.com/msp \
  cli peer lifecycle chaincode approveformyorg \
  --channelID $CHANNEL_NAME \
  --name $CHAINCODE_NAME \
  --version $CHAINCODE_VERSION \
  --package-id $PACKAGE_ID \
  --sequence $CHAINCODE_SEQUENCE \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/tracesafe.com/orderers/orderer.tracesafe.com/msp/tlscacerts/tlsca.tracesafe.com-cert.pem \
  -o orderer.tracesafe.com:7050

echo "========== Approving for RegulatorOrg =========="
docker exec -e CORE_PEER_LOCALMSPID=RegulatorOrgMSP \
  -e CORE_PEER_ADDRESS=peer0.regulatororg.tracesafe.com:10051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulatororg.tracesafe.com/peers/peer0.regulatororg.tracesafe.com/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulatororg.tracesafe.com/users/Admin@regulatororg.tracesafe.com/msp \
  cli peer lifecycle chaincode approveformyorg \
  --channelID $CHANNEL_NAME \
  --name $CHAINCODE_NAME \
  --version $CHAINCODE_VERSION \
  --package-id $PACKAGE_ID \
  --sequence $CHAINCODE_SEQUENCE \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/tracesafe.com/orderers/orderer.tracesafe.com/msp/tlscacerts/tlsca.tracesafe.com-cert.pem \
  -o orderer.tracesafe.com:7050

# Commit chaincode
echo "========== Committing Chaincode =========="
docker exec cli peer lifecycle chaincode commit \
  --channelID $CHANNEL_NAME \
  --name $CHAINCODE_NAME \
  --version $CHAINCODE_VERSION \
  --sequence $CHAINCODE_SEQUENCE \
  --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/tracesafe.com/orderers/orderer.tracesafe.com/msp/tlscacerts/tlsca.tracesafe.com-cert.pem \
  -o orderer.tracesafe.com:7050 \
  --peerAddresses peer0.farmerorg.tracesafe.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/farmerorg.tracesafe.com/peers/peer0.farmerorg.tracesafe.com/tls/ca.crt \
  --peerAddresses peer0.driverorg.tracesafe.com:8051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/driverorg.tracesafe.com/peers/peer0.driverorg.tracesafe.com/tls/ca.crt \
  --peerAddresses peer0.retailerorg.tracesafe.com:9051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailerorg.tracesafe.com/peers/peer0.retailerorg.tracesafe.com/tls/ca.crt \
  --peerAddresses peer0.regulatororg.tracesafe.com:10051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/regulatororg.tracesafe.com/peers/peer0.regulatororg.tracesafe.com/tls/ca.crt

echo "========== Chaincode Upgraded Successfully =========="
echo "Chaincode: $CHAINCODE_NAME"
echo "New Version: $CHAINCODE_VERSION"
echo "Sequence: $CHAINCODE_SEQUENCE"
echo "Channel: $CHANNEL_NAME"
