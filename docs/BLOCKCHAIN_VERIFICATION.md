# Blockchain & Verification Documentation

This document details the integration of Hyperledger Fabric blockchain within the TraceSafe application, focusing on data integrity, IoT integration, and verification procedures.

## 1. Blockchain Integration Overview

TraceSafe uses **Hyperledger Fabric** to ensure an immutable and transparent supply chain. The network consists of four key organizations:
*   **FarmerOrg**: Originators of the produce batches.
*   **DriverOrg**: Responsible for logistics and transit updates.
*   **RetailerOrg**: Receivers and sellers of the produce.
*   **RegulatorOrg**: Oversees the entire process and manages certification.

### Key Components
*   **Fabric Service** (`backend/src/config/fabric.js`): The core Node.js service that handles all interactions with the Fabric network. It manages gateways, wallets, and contract submissions.
*   **Smart Contract**: The chaincode deployed on the channel `tracesafe-channel` with the name `tracesafe`.

## 2. Smart Contract Interactions

The application records critical supply chain events on the blockchain. Key transactions include:

| Transaction | Description | Key Data Points |
| :--- | :--- | :--- |
| `CreateBatch` | Initializes a new batch. | Batch ID, Farmer ID, Crop, Variety, Quantity, Origin Location. |
| `RecordPickup` | Driver picks up the batch. | Driver Name, Location, Notes. |
| `RecordTransitUpdate` | IoT updates during transit. | **Temperature**, **Humidity**, Location, Notes. |
| `RecordDelivery` | Driver delivers to retailer. | Retailer Name, Location, Notes. |
| `RecordReceipt` | Retailer accepts the batch. | Retailer Name, Location, Notes. |
| `RecordSale` | Retailer sells the batch. | Retailer Name, Notes. |
| `CertifyBatch` | Regulator certifies the batch. | Batch ID. |

## 3. IoT & Data Integrity

IoT data, specifically **temperature** and **location**, is critical for ensuring the quality of the produce.

*   **On-Chain Storage**: Critical IoT metrics (Temperature, Humidity, Location) are stored directly on the blockchain via `RecordTransitUpdate` and other event transactions. This ensures that environmental conditions during transit are immutable.
*   **Off-Chain Storage**: The PostgreSQL database stores the same data for efficient querying and reporting.
*   **Integrity Check**: The system is designed to cross-reference on-chain and off-chain data to detect any tampering.

## 4. Verification Process

We have implemented robust verification mechanisms to ensure data consistency between the local database and the blockchain ledger.

### `verifyIntegrity` Method
Located in `FabricService`, this method compares a local batch record against the authoritative blockchain record. It checks for discrepancies in:
*   **Status**: Ensures the current state (e.g., `in_transit`, `delivered`) matches.
*   **Certification**: Verifies the `isCertified` flag.
*   **Certificate ID**: Checks for mismatches in certificate identifiers, handling potential `null` vs. empty string differences.

### Verification Script
A standalone script is available to manually verify a batch against the blockchain.

**Usage:**
```bash
node backend/src/scripts/verifyBlockchain.js <BATCH_ID>
```

**What it does:**
1.  Connects to the Fabric network as `FarmerOrg`.
2.  Queries the `GetBatch` function to retrieve the current state.
3.  Queries `GetBatchHistory` to retrieve the full immutable history of the batch.
4.  Outputs the raw blockchain data for manual inspection.

## 5. Recent Improvements & Fixes

*   **Certification Fix**: Resolved "Blockchain certification failed" errors by ensuring the `event_type` check constraint in the database includes `certified`.
*   **Null Handling**: Addressed "Certificate ID mismatch" issues where the blockchain returned an empty string while the database had `null`. The verification logic now handles these equivalent values correctly.
*   **Service Availability**: Verified that all Fabric peers and orderers are running correctly in Docker containers.
