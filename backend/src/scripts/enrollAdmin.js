
import { Wallets } from 'fabric-network';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ORGS = [
    { name: 'farmerorg', mspId: 'FarmerOrgMSP', domain: 'farmerorg.tracesafe.com' },
    { name: 'driverorg', mspId: 'DriverOrgMSP', domain: 'driverorg.tracesafe.com' },
    { name: 'retailerorg', mspId: 'RetailerOrgMSP', domain: 'retailerorg.tracesafe.com' },
    { name: 'regulatororg', mspId: 'RegulatorOrgMSP', domain: 'regulatororg.tracesafe.com' },
];

async function enrollOrg(org) {
    try {
        const walletPath = path.join(__dirname, `../../../fabric/wallets/${org.name}`);
        const cryptoConfigPath = path.join(__dirname, '../../../fabric/crypto-config');

        // Ensure wallet directory exists
        if (!fs.existsSync(walletPath)) {
            fs.mkdirSync(walletPath, { recursive: true });
        }

        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if already enrolled
        const identity = await wallet.get('Admin');
        if (identity) {
            console.log(`✅ ${org.name}: Admin identity already exists`);
            return;
        }

        // Path to the certificate and private key
        const certPath = path.join(cryptoConfigPath, `peerOrganizations/${org.domain}/users/Admin@${org.domain}/msp/signcerts/Admin@${org.domain}-cert.pem`);
        const keyDir = path.join(cryptoConfigPath, `peerOrganizations/${org.domain}/users/Admin@${org.domain}/msp/keystore`);

        if (!fs.existsSync(certPath)) {
            console.log(`⚠️ ${org.name}: Certificate not found at ${certPath}`);
            return;
        }

        const keyFiles = fs.readdirSync(keyDir);
        if (keyFiles.length === 0) {
            console.log(`⚠️ ${org.name}: No private key found in ${keyDir}`);
            return;
        }
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
            mspId: org.mspId,
            type: 'X.509',
        };

        // Import the identity into the wallet
        await wallet.put('Admin', x509Identity);
        console.log(`✅ ${org.name}: Successfully imported Admin identity`);

    } catch (error) {
        console.error(`❌ ${org.name}: Failed to enroll - ${error.message}`);
    }
}

async function main() {
    console.log('🔐 Enrolling Admin identities for all organizations...\n');

    for (const org of ORGS) {
        await enrollOrg(org);
    }

    console.log('\n✅ Enrollment complete!');
}

main();
