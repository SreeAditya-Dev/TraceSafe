import { Gateway, Wallets } from 'fabric-network';
import path from 'path';
import fs from 'fs';
import yaml from 'yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    try {
        const batchId = process.argv[2];
        if (!batchId) {
            console.log('Usage: node src/scripts/verifyBlockchain.js <BATCH_ID>');
            return;
        }

        // Load connection profile
        const ccpPath = path.resolve(__dirname, '../../../fabric/connection-profiles/connection-farmerorg.yaml');
        const ccp = yaml.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create wallet
        const walletPath = path.resolve(__dirname, '../../../fabric/wallets/farmerorg');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check identity
        const identity = await wallet.get('Admin');
        if (!identity) {
            console.log('Admin identity not found in wallet');
            return;
        }

        // Connect
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'Admin',
            discovery: { enabled: true, asLocalhost: true }
        });

        // Get network and contract
        const network = await gateway.getNetwork('tracesafe-channel');
        const contract = network.getContract('tracesafe');

        console.log(`\n🔍 Querying Blockchain for Batch: ${batchId}...`);

        try {
            const result = await contract.evaluateTransaction('GetBatch', batchId);
            const batch = JSON.parse(result.toString());

            console.log('\n✅ Batch Found on Hyperledger Fabric Ledger:');
            console.log('----------------------------------------');
            console.log(JSON.stringify(batch, null, 2));
            console.log('----------------------------------------');

            // Get History
            console.log('\n📜 Fetching Transaction History...');
            const historyResult = await contract.evaluateTransaction('GetBatchHistory', batchId);
            const history = JSON.parse(historyResult.toString());

            console.log(JSON.stringify(history, null, 2));

        } catch (err) {
            console.error(`\n❌ Batch ${batchId} not found on blockchain or error occurred: ${err.message}`);
        }

        gateway.disconnect();

    } catch (error) {
        console.error(`Error: ${error}`);
    }
}

main();
