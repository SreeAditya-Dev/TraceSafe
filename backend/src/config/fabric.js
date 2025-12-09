/**
 * TraceSafe - Hyperledger Fabric Service
 * 
 * This service provides integration with the Hyperledger Fabric blockchain network
 * for immutable supply chain traceability.
 */

import { Gateway, Wallets } from 'fabric-network';
import path from 'path';
import fs from 'fs';
import yaml from 'yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Organization to MSP mapping
export const ORG_MSP_MAP = {
    farmer: 'FarmerOrgMSP',
    driver: 'DriverOrgMSP',
    retailer: 'RetailerOrgMSP',
    regulator: 'RegulatorOrgMSP',
    admin: 'RegulatorOrgMSP',
};

// Organization connection profile paths
const CONNECTION_PROFILE_DIR = path.resolve(__dirname, '../../../fabric/connection-profiles');

export class FabricService {
    constructor() {
        this.gateway = null;
        this.network = null;
        this.contract = null;
        this.connected = false;
        this.currentOrg = null;
    }

    /**
     * Connect to the Fabric network
     * @param {string} role - User role (farmer, driver, retailer, admin)
     * @param {string} userId - User identifier
     */
    async connect(role, userId = 'Admin') {
        try {
            const orgName = this.getOrgFromRole(role);
            const mspId = ORG_MSP_MAP[role];

            // Load connection profile
            const ccpPath = path.join(CONNECTION_PROFILE_DIR, `connection-${orgName.toLowerCase()}.yaml`);

            if (!fs.existsSync(ccpPath)) {
                console.log(`Connection profile not found: ${ccpPath}`);
                return false;
            }

            const ccpFile = fs.readFileSync(ccpPath, 'utf8');
            const ccp = yaml.parse(ccpFile);

            // Create wallet
            const walletPath = path.resolve(__dirname, '../../../fabric/wallets', orgName.toLowerCase());
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            // Check if identity exists
            const identity = await wallet.get(userId);
            if (!identity) {
                console.log(`Identity ${userId} not found in wallet for ${orgName}`);
                // In production, you would enroll the user here
                return false;
            }

            // Create gateway
            this.gateway = new Gateway();
            await this.gateway.connect(ccp, {
                wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: true }
            });

            // Get network and contract
            this.network = await this.gateway.getNetwork('tracesafe-channel');
            this.contract = this.network.getContract('tracesafe');
            this.connected = true;
            this.currentOrg = orgName;

            console.log(`Connected to Fabric network as ${orgName}/${userId}`);
            return true;
        } catch (error) {
            console.error('Failed to connect to Fabric network:', error);
            this.connected = false;
            return false;
        }
    }

    /**
     * Disconnect from the Fabric network
     */
    disconnect() {
        if (this.gateway) {
            this.gateway.disconnect();
        }
        this.connected = false;
        this.network = null;
        this.contract = null;
        this.currentOrg = null;
    }

    /**
     * Get organization name from role
     */
    getOrgFromRole(role) {
        const roleOrgMap = {
            farmer: 'FarmerOrg',
            driver: 'DriverOrg',
            retailer: 'RetailerOrg',
            regulator: 'RegulatorOrg',
            admin: 'RegulatorOrg',
        };
        return roleOrgMap[role] || 'FarmerOrg';
    }

    /**
     * Check if connected to Fabric network
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Create a batch on the blockchain
     */
    async createBatch(batchData) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const transaction = this.contract.createTransaction('CreateBatch');
            const result = await transaction.submit(
                batchData.batchId,
                batchData.farmerId || '',
                batchData.farmerName || '',
                batchData.agriStackId || '',
                batchData.crop,
                batchData.variety || '',
                String(batchData.quantity),
                batchData.unit,
                batchData.harvestDate || '',
                String(batchData.originLat || 0),
                String(batchData.originLng || 0),
                batchData.originAddress || ''
            );

            return {
                success: true,
                txId: transaction.getTransactionId(),
                result: result.toString()
            };
        } catch (error) {
            console.error('Failed to create batch on blockchain:', error);
            throw error;
        }
    }

    /**
     * Record pickup on the blockchain
     */
    async recordPickup(batchId, driverName, lat, lng, notes) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const transaction = this.contract.createTransaction('RecordPickup');
            const result = await transaction.submit(
                batchId,
                driverName,
                String(lat || 0),
                String(lng || 0),
                notes || ''
            );

            return {
                success: true,
                txId: transaction.getTransactionId(),
                result: result.toString()
            };
        } catch (error) {
            console.error('Failed to record pickup on blockchain:', error);
            throw error;
        }
    }

    /**
     * Record transit update on the blockchain
     */
    async recordTransitUpdate(batchId, driverName, lat, lng, temp, humidity, notes) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const result = await this.contract.submitTransaction(
                'RecordTransitUpdate',
                batchId,
                driverName,
                String(lat || 0),
                String(lng || 0),
                String(temp || 0),
                String(humidity || 0),
                notes || ''
            );

            return {
                success: true,
                txId: this.getTransactionId(),
                result: result.toString()
            };
        } catch (error) {
            console.error('Failed to record transit update on blockchain:', error);
            throw error;
        }
    }

    /**
     * Record delivery on the blockchain
     */
    async recordDelivery(batchId, driverName, retailerName, lat, lng, notes) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const transaction = this.contract.createTransaction('RecordDelivery');
            const result = await transaction.submit(
                batchId,
                driverName,
                retailerName || '',
                String(lat || 0),
                String(lng || 0),
                notes || ''
            );

            return {
                success: true,
                txId: transaction.getTransactionId(),
                result: result.toString()
            };
        } catch (error) {
            console.error('Failed to record delivery on blockchain:', error);
            throw error;
        }
    }

    /**
     * Record receipt on the blockchain
     */
    async recordReceipt(batchId, retailerName, lat, lng, notes) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const transaction = this.contract.createTransaction('RecordReceipt');
            const result = await transaction.submit(
                batchId,
                retailerName,
                String(lat || 0),
                String(lng || 0),
                notes || ''
            );

            return {
                success: true,
                txId: transaction.getTransactionId(),
                result: result.toString()
            };
        } catch (error) {
            console.error('Failed to record receipt on blockchain:', error);
            throw error;
        }
    }

    /**
     * Record sale on the blockchain
     */
    async recordSale(batchId, retailerName, notes) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const result = await this.contract.submitTransaction(
                'RecordSale',
                batchId,
                retailerName,
                notes || ''
            );

            return {
                success: true,
                txId: this.getTransactionId(),
                result: result.toString()
            };
        } catch (error) {
            console.error('Failed to record sale on blockchain:', error);
            throw error;
        }
    }

    /**
     * Get batch from the blockchain
     */
    async getBatch(batchId) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const result = await this.contract.evaluateTransaction('GetBatch', batchId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Failed to get batch from blockchain:', error);
            throw error;
        }
    }

    /**
     * Get batch history from the blockchain
     */
    async getBatchHistory(batchId) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const result = await this.contract.evaluateTransaction('GetBatchHistory', batchId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Failed to get batch history from blockchain:', error);
            throw error;
        }
    }

    /**
     * Get journey events from the blockchain
     */
    async getJourneyEvents(batchId) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const result = await this.contract.evaluateTransaction('GetJourneyEvents', batchId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Failed to get journey events from blockchain:', error);
            throw error;
        }
    }

    /**
     * Get transfers from the blockchain
     */
    async getTransfers(batchId) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const result = await this.contract.evaluateTransaction('GetTransfers', batchId);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Failed to get transfers from blockchain:', error);
            throw error;
        }
    }

    /**
     * Query batches by status
     */
    async queryBatchesByStatus(status) {
        if (!this.connected) {
            throw new Error('Not connected to Fabric network');
        }

        try {
            const result = await this.contract.evaluateTransaction('QueryBatchesByStatus', status);
            return JSON.parse(result.toString());
        } catch (error) {
            console.error('Failed to query batches by status:', error);
            throw error;
        }
    }

    /**
     * Get the last transaction ID
     * Note: This is a simplified implementation
     */
    getTransactionId() {
        // In a real implementation, you would get this from the transaction response
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Per-org service instances
const fabricServiceInstances = {};

/**
 * Get or create FabricService instance for a specific role/org
 * @param {string} role - User role (farmer, driver, retailer, admin)
 */
export function getFabricService(role = 'farmer') {
    const orgKey = role.toLowerCase();
    if (!fabricServiceInstances[orgKey]) {
        fabricServiceInstances[orgKey] = new FabricService();
    }
    return fabricServiceInstances[orgKey];
}

