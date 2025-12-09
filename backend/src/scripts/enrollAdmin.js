
import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    try {
        // Define paths
        const walletPath = path.join(process.cwd(), '../fabric/wallets/farmerorg');
        const cryptoConfigPath = path.join(process.cwd(), '../fabric/crypto-config');

        // Ensure wallet directory exists
        if (!fs.existsSync(walletPath)) {
            fs.mkdirSync(walletPath, { recursive: true });
        }

        // Create a new file system based wallet for managing identities.
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check to see if we've already enrolled the admin user.
        const identity = await wallet.get('Admin');
        if (identity) {
            console.log('An identity for the admin user "Admin" already exists in the wallet');
            return;
        }

        // Path to the certificate and private key
        const certPath = path.join(cryptoConfigPath, 'peerOrganizations/farmerorg.tracesafe.com/users/Admin@farmerorg.tracesafe.com/msp/signcerts/Admin@farmerorg.tracesafe.com-cert.pem');
        const keyDir = path.join(cryptoConfigPath, 'peerOrganizations/farmerorg.tracesafe.com/users/Admin@farmerorg.tracesafe.com/msp/keystore');

        const keyFiles = fs.readdirSync(keyDir);
        const keyPath = path.join(keyDir, keyFiles[0]);

        // Read the certificate and key
        const cert = fs.readFileSync(certPath).toString();
        const key = fs.readFileSync(keyPath).toString();

        // Create the identity
        const x509Identity = {
            credentials: {
                certificate: cert,
                privateKey: key,
            },
            mspId: 'FarmerOrgMSP',
            type: 'X.509',
        };

        // Import the identity into the wallet
        await wallet.put('Admin', x509Identity);
        console.log('Successfully imported admin identity into the wallet');

    } catch (error) {
        console.error(`Failed to enroll admin user "Admin": ${error}`);
        process.exit(1);
    }
}

main();
